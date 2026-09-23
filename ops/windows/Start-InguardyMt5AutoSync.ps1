$ErrorActionPreference = "Stop"

$workspace = "C:\Users\NIMA\Desktop\seafguard journal"
$python = Join-Path $workspace ".venv-mt5\Scripts\python.exe"
$bridgeScript = Join-Path $workspace "workers\mt5_bridge_server.py"
$bridgeArgument = '"' + $bridgeScript + '"'
$identity = Join-Path $env:USERPROFILE ".ssh\inguardy_vultr"
$ssh = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
$runtime = Join-Path $workspace ".runtime"
$supervisorLog = Join-Path $runtime "mt5-autosync.log"
$errorLog = Join-Path $runtime "mt5-autosync-errors.log"

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Set-Location -LiteralPath $workspace

$mutex = New-Object System.Threading.Mutex($false, "Local\InguardyMt5AutoSync")
if (-not $mutex.WaitOne(0, $false)) {
  exit 0
}

function Write-SupervisorLog {
  param([string]$Message)
  "$(Get-Date -Format o) $Message" | Add-Content -LiteralPath $supervisorLog
}

function Test-LocalPort {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutMilliseconds = 750
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne($TimeoutMilliseconds, $false)) {
      return $false
    }
    $client.EndConnect($pending)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Dispose()
  }
}

Write-SupervisorLog "supervisor_started"

try {
  while ($true) {
    $bridge = $null
    $tunnel = $null

    try {
      $bridge = Start-Process `
        -FilePath $python `
        -ArgumentList @($bridgeArgument) `
        -WorkingDirectory $workspace `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $runtime "mt5-bridge.stdout.log") `
        -RedirectStandardError (Join-Path $runtime "mt5-bridge.stderr.log") `
        -PassThru

      $bridgeReady = $false
      for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $bridge.Refresh()
        if ($bridge.HasExited) {
          throw "MT5 bridge exited during startup with code $($bridge.ExitCode)"
        }
        if (Test-LocalPort -HostName "127.0.0.1" -Port 8765) {
          $bridgeReady = $true
          break
        }
        Start-Sleep -Milliseconds 500
      }

      if (-not $bridgeReady) {
        throw "MT5 bridge did not become ready on port 8765"
      }

      Write-SupervisorLog "bridge_ready pid=$($bridge.Id)"

      $tunnel = Start-Process `
        -FilePath $ssh `
        -ArgumentList @(
          "-N",
          "-T",
          "-o", "BatchMode=yes",
          "-o", "ExitOnForwardFailure=yes",
          "-o", "ConnectTimeout=15",
          "-o", "ServerAliveInterval=20",
          "-o", "ServerAliveCountMax=3",
          "-i", $identity,
          "-R", "127.0.0.1:8765:127.0.0.1:8765",
          "mt5tunnel@199.247.31.75"
        ) `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $runtime "mt5-tunnel.stdout.log") `
        -RedirectStandardError (Join-Path $runtime "mt5-tunnel.stderr.log") `
        -PassThru

      Start-Sleep -Seconds 2
      $tunnel.Refresh()
      if ($tunnel.HasExited) {
        throw "MT5 tunnel exited during startup with code $($tunnel.ExitCode)"
      }

      Write-SupervisorLog "tunnel_ready pid=$($tunnel.Id)"

      while (-not $bridge.HasExited -and -not $tunnel.HasExited) {
        Start-Sleep -Seconds 10
        $bridge.Refresh()
        $tunnel.Refresh()
      }

      Write-SupervisorLog "child_exit bridge=$($bridge.HasExited) tunnel=$($tunnel.HasExited)"
    }
    catch {
      "$(Get-Date -Format o) $($_ | Out-String)" | Add-Content -LiteralPath $errorLog
    }
    finally {
      if ($tunnel -and -not $tunnel.HasExited) {
        Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
      }
      if ($bridge -and -not $bridge.HasExited) {
        Stop-Process -Id $bridge.Id -Force -ErrorAction SilentlyContinue
      }
    }

    Start-Sleep -Seconds 5
  }
}
finally {
  Write-SupervisorLog "supervisor_stopped"
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
