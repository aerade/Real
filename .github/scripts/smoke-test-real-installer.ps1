param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf)) {
  throw "Real installer lifecycle smoke test could not find installer '$InstallerPath'."
}

$installDirectory = Join-Path $env:RUNNER_TEMP (
  "real-installer-lifecycle-" + [Guid]::NewGuid().ToString("N")
)
$applicationPath = Join-Path $installDirectory "Real.exe"
$uninstallerPath = Join-Path $installDirectory "Uninstall Real.exe"

function Invoke-InstallerCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string]$Description,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  try {
    $process = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $Arguments `
      -WindowStyle Hidden `
      -Wait `
      -PassThru
  }
  catch {
    throw "Real installer lifecycle smoke test failed during $($Description): $($_.Exception.Message)"
  }

  if ($process.ExitCode -ne 0) {
    throw "Real installer lifecycle smoke test failed during $($Description): process exited with code $($process.ExitCode)."
  }
}

function Assert-InstalledFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  if (-not (Test-Path -LiteralPath $applicationPath -PathType Leaf)) {
    throw "Real installer lifecycle smoke test failed after $($Description): expected application '$applicationPath' was not found."
  }

  if (-not (Test-Path -LiteralPath $uninstallerPath -PathType Leaf)) {
    throw "Real installer lifecycle smoke test failed after $($Description): expected uninstaller '$uninstallerPath' was not found."
  }
}

try {
  Write-Host "Installing Real silently into temporary directory '$installDirectory'."
  Invoke-InstallerCommand `
    -FilePath (Resolve-Path -LiteralPath $InstallerPath).Path `
    -Description "the initial silent install" `
    -Arguments @("/S", "/D=$installDirectory")
  Assert-InstalledFiles -Description "the initial silent install"

  Write-Host "Reinstalling Real silently over the existing installation."
  Invoke-InstallerCommand `
    -FilePath (Resolve-Path -LiteralPath $InstallerPath).Path `
    -Description "the silent reinstall over the existing installation" `
    -Arguments @("/S", "/D=$installDirectory")
  Assert-InstalledFiles -Description "the silent reinstall"

  Write-Host "Uninstalling Real silently."
  Invoke-InstallerCommand `
    -FilePath $uninstallerPath `
    -Description "the silent uninstall" `
    -Arguments @("/S")

  $removalDeadline = [DateTime]::UtcNow.AddSeconds(30)
  while (
    (
      (Test-Path -LiteralPath $applicationPath -PathType Leaf) -or
      (Test-Path -LiteralPath $uninstallerPath -PathType Leaf)
    ) -and
    ([DateTime]::UtcNow -lt $removalDeadline)
  ) {
    Start-Sleep -Milliseconds 500
  }

  if (Test-Path -LiteralPath $applicationPath -PathType Leaf) {
    throw "Real installer lifecycle smoke test failed after the silent uninstall: application '$applicationPath' still exists."
  }

  if (Test-Path -LiteralPath $uninstallerPath -PathType Leaf) {
    throw "Real installer lifecycle smoke test failed after the silent uninstall: uninstaller '$uninstallerPath' still exists."
  }

  Write-Host "Real installer lifecycle smoke test passed: install, reinstall, and uninstall completed."
}
finally {
  if (Test-Path -LiteralPath $installDirectory) {
    Remove-Item -LiteralPath $installDirectory -Recurse -Force -ErrorAction SilentlyContinue
  }
}
