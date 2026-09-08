$ErrorActionPreference = "Stop"

$workspace = "C:\Users\NIMA\Desktop\seafguard journal"
$python = Join-Path $workspace ".venv-mt5\Scripts\python.exe"
$bridgeScript = Join-Path $workspace "workers\mt5_bridge_server.py"
$bridgeArgument = '"' + $bridgeScript + '"'
$identity = Join-Path $env:USERPROFILE ".ssh\inguardy_vultr"
$ssh = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
$runtime = Join-Path $workspace ".runtime"

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Set-Location -LiteralPath $workspace

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

    Start-Sleep -Seconds 2
    if ($bridge.HasExited) {
      throw "MT5 bridge exited during startup"
    }

    $tunnel = Start-Process `
      -FilePath $ssh `
      -ArgumentList @(
        "-N",
        "-T",
        "-o", "BatchMode=yes",
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=3",
        "-i", $identity,
        "-R", "127.0.0.1:8765:127.0.0.1:8765",
        "mt5tunnel@199.247.31.75"
      ) `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $runtime "mt5-tunnel.stdout.log") `
      -RedirectStandardError (Join-Path $runtime "mt5-tunnel.stderr.log") `
      -PassThru

    while (-not $bridge.HasExited -and -not $tunnel.HasExited) {
      Start-Sleep -Seconds 10
      $bridge.Refresh()
      $tunnel.Refresh()
    }
  }
  catch {
    $_ | Out-String | Add-Content -LiteralPath (Join-Path $runtime "mt5-autosync-errors.log")
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
