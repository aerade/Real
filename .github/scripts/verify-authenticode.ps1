[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,

  [string]$ReportPath = $null,

  [switch]$RequireSignature
)

$ErrorActionPreference = "Stop"

if (-not $ReportPath) {
  $ReportPath = Join-Path (
    Join-Path (Get-Location) "artifacts/lead-scout-desktop/release"
  ) "authenticode-report.json"
}

$resolvedInstallerPath = (Resolve-Path -LiteralPath $InstallerPath).Path
$temporaryRoot = if ($env:RUNNER_TEMP) {
  $env:RUNNER_TEMP
} else {
  [IO.Path]::GetTempPath()
}
$installDirectory = Join-Path $temporaryRoot (
  "real-authenticode-" + [Guid]::NewGuid().ToString("N")
)
$signingConfigured = (
  -not [String]::IsNullOrWhiteSpace($env:CSC_LINK) -or
  -not [String]::IsNullOrWhiteSpace($env:WIN_CSC_LINK)
)
$signatureRequired = [bool]($RequireSignature -or $signingConfigured)
$verificationMode = if ($signingConfigured) {
  "signed"
} elseif ($RequireSignature) {
  "release-required"
} else {
  "development-only"
}

$report = [ordered]@{
  schemaVersion = 1
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  policy = [ordered]@{
    mode = $verificationMode
    signingConfigured = $signingConfigured
    signatureRequired = $signatureRequired
  }
  installer = $null
  uninstaller = $null
  result = "failed"
  error = $null
}

function Get-SignerIdentity {
  param(
    [System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate
  )

  if (-not $Certificate) {
    return $null
  }

  return [ordered]@{
    subject = $Certificate.Subject
    issuer = $Certificate.Issuer
    thumbprint = $Certificate.Thumbprint
    serialNumber = $Certificate.SerialNumber
    notBeforeUtc = $Certificate.NotBefore.ToUniversalTime().ToString("o")
    notAfterUtc = $Certificate.NotAfter.ToUniversalTime().ToString("o")
  }
}

function Get-AuthenticodeReport {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactName,

    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return [ordered]@{
      artifact = $ArtifactName
      path = $Path
      exists = $false
      status = "NotFound"
      statusMessage = "The artifact was not found."
      isValid = $false
      signer = $null
    }
  }

  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
  $signature = Get-AuthenticodeSignature -FilePath $resolvedPath
  $isValid = $signature.Status -eq [System.Management.Automation.SignatureStatus]::Valid

  return [ordered]@{
    artifact = $ArtifactName
    path = $resolvedPath
    exists = $true
    status = $signature.Status.ToString()
    statusMessage = $signature.StatusMessage
    isValid = $isValid
    signer = Get-SignerIdentity -Certificate $signature.SignerCertificate
  }
}

function Invoke-SilentProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  $process = Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -Wait `
    -PassThru `
    -WindowStyle Hidden

  if ($process.ExitCode -ne 0) {
    throw "$Description failed with exit code $($process.ExitCode)."
  }
}

try {
  $report.installer = Get-AuthenticodeReport `
    -ArtifactName "installer" `
    -Path $resolvedInstallerPath

  New-Item -ItemType Directory -Force -Path $installDirectory | Out-Null
  Invoke-SilentProcess `
    -FilePath $resolvedInstallerPath `
    -Arguments @("/S", "/D=$installDirectory") `
    -Description "Installing Real to inspect its uninstaller"

  $uninstallerPath = Join-Path $installDirectory "Uninstall Real.exe"
  $report.uninstaller = Get-AuthenticodeReport `
    -ArtifactName "uninstaller" `
    -Path $uninstallerPath

  $invalidArtifacts = @($report.installer, $report.uninstaller) |
    Where-Object { -not $_.isValid }
  if ($signatureRequired -and $invalidArtifacts.Count -gt 0) {
    $failures = ($invalidArtifacts | ForEach-Object {
        "$($_.artifact): $($_.status) ($($_.statusMessage))"
      }) -join "; "
    throw "Authenticode verification failed. Required signatures were not valid: $failures"
  }

  if ($invalidArtifacts.Count -gt 0) {
    Write-Warning (
      "Authenticode verification is development-only because signing is not configured. " +
      "Unsigned artifacts: " +
      (($invalidArtifacts | ForEach-Object { $_.artifact }) -join ", ")
    )
    $report.result = "passed-development-only"
  } else {
    $report.result = "passed"
  }
}
catch {
  $report.error = $_.Exception.Message
  throw
}
finally {
  if (Test-Path -LiteralPath $installDirectory) {
    $uninstallerPath = Join-Path $installDirectory "Uninstall Real.exe"
    if (Test-Path -LiteralPath $uninstallerPath -PathType Leaf) {
      try {
        Invoke-SilentProcess `
          -FilePath $uninstallerPath `
          -Arguments @("/S") `
          -Description "Cleaning up the temporary Real installation"
      }
      catch {
        Write-Warning "Could not run the temporary uninstaller during cleanup: $($_.Exception.Message)"
      }
    }

    Remove-Item -LiteralPath $installDirectory -Recurse -Force -ErrorAction SilentlyContinue
  }

  $reportDirectory = Split-Path -Parent $ReportPath
  if ($reportDirectory) {
    New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
  }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
  Write-Host "Authenticode report written to $ReportPath"
}