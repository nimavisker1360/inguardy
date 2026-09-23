# Run once from an elevated PowerShell session on the local development machine.
# It aligns the local journal_user password with this project's .env, restores
# PostgreSQL authentication immediately, then verifies the connection.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$postgresDir = 'C:\Program Files\PostgreSQL\18'
$dataDir = Join-Path $postgresDir 'data'
$hbaPath = Join-Path $dataDir 'pg_hba.conf'
$backupPath = "$hbaPath.inguardy-backup"
$pgCtlPath = Join-Path $postgresDir 'bin\pg_ctl.exe'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run PowerShell as Administrator to repair the local PostgreSQL role.'
}
$logPath = Join-Path $projectRoot '.runtime\risk-db-repair.log'
Start-Transcript -LiteralPath $logPath -Force | Out-Null
if (-not (Test-Path -LiteralPath $hbaPath) -or -not (Test-Path -LiteralPath $pgCtlPath)) {
  throw 'Expected local PostgreSQL 18 installation was not found.'
}
if (Test-Path -LiteralPath $backupPath) {
  throw "Existing backup found at $backupPath. Inspect it before running this script again."
}

$originalBytes = [IO.File]::ReadAllBytes($hbaPath)
[IO.File]::WriteAllBytes($backupPath, $originalBytes)
$restored = $false
try {
  $temporaryRule = [Text.Encoding]::ASCII.GetBytes("host all postgres 127.0.0.1/32 trust`r`n")
  [IO.File]::WriteAllBytes($hbaPath, [byte[]]($temporaryRule + $originalBytes))
  & $pgCtlPath reload -D $dataDir | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not reload the temporary PostgreSQL rule.' }

  $nodeScript = @'
const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const url = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.username !== 'journal_user' || url.pathname !== '/signal_forex') {
  throw new Error('Unexpected database target in .env');
}
const password = decodeURIComponent(url.password);
if (!password) throw new Error('DATABASE_URL has no password');
const psql = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
function sql(statement, database = 'postgres') {
  const result = spawnSync(psql, ['-w', '-h', '127.0.0.1', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At', '-q'], { input: statement, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'PostgreSQL command failed');
  return result.stdout.trim();
}
const roleExists = sql("SELECT 1 FROM pg_roles WHERE rolname='journal_user';") === '1';
const escapedPassword = password.replaceAll("'", "''");
sql(roleExists ? `ALTER ROLE "journal_user" WITH LOGIN PASSWORD '${escapedPassword}';` : `CREATE ROLE "journal_user" WITH LOGIN PASSWORD '${escapedPassword}';`);
const databaseExists = sql("SELECT 1 FROM pg_database WHERE datname='signal_forex';") === '1';
if (!databaseExists) sql('CREATE DATABASE "signal_forex" OWNER "journal_user";');
sql('GRANT ALL PRIVILEGES ON DATABASE "signal_forex" TO "journal_user";');
sql('GRANT USAGE, CREATE ON SCHEMA public TO "journal_user";', 'signal_forex');
console.log('Local project database role and database are ready.');
'@
  Push-Location $projectRoot
  try {
    $nodeScript | node -
    if ($LASTEXITCODE -ne 0) { throw 'Database role update failed.' }
  } finally { Pop-Location }
}
finally {
  [IO.File]::WriteAllBytes($hbaPath, $originalBytes)
  & $pgCtlPath reload -D $dataDir | Out-Null
  $restored = $LASTEXITCODE -eq 0
  if ($restored) { Remove-Item -LiteralPath $backupPath }
}
if (-not $restored) { throw "Original PostgreSQL rule was restored on disk but could not be reloaded. Backup: $backupPath" }

Push-Location $projectRoot
try {
  'SELECT 1;' | npx prisma db execute --stdin --schema prisma/schema.prisma | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Database connection verification failed.' }
  Write-Output 'Prisma database connection verified.'
} finally { Pop-Location }
Stop-Transcript | Out-Null
