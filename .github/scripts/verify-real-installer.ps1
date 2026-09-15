param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$evidenceDirectory = Join-Path $env:GITHUB_WORKSPACE "artifacts/lead-scout-desktop/release/installer-ui-evidence"
New-Item -ItemType Directory -Force -Path $evidenceDirectory | Out-Null

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public static class RealInstallerWindow {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsZoomed(IntPtr hWnd);

  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll")]
  public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern IntPtr GetDlgItem(IntPtr hWnd, int controlId);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);

  [DllImport("user32.dll")]
  public static extern IntPtr GetDC(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern int ReleaseDC(IntPtr hWnd, IntPtr hdc);

  [DllImport("gdi32.dll")]
  public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

  [DllImport("gdi32.dll")]
  public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int width, int height);

  [DllImport("gdi32.dll")]
  public static extern bool BitBlt(
    IntPtr destination,
    int destinationX,
    int destinationY,
    int width,
    int height,
    IntPtr source,
    int sourceX,
    int sourceY,
    uint rasterOperation
  );

  [DllImport("gdi32.dll")]
  public static extern IntPtr SelectObject(IntPtr hdc, IntPtr objectHandle);

  [DllImport("gdi32.dll")]
  public static extern bool DeleteObject(IntPtr objectHandle);

  [DllImport("gdi32.dll")]
  public static extern bool DeleteDC(IntPtr hdc);

  [DllImport("gdi32.dll")]
  public static extern int GetDIBits(
    IntPtr hdc,
    IntPtr bitmap,
    uint startScan,
    uint scanLines,
    [Out] byte[] pixels,
    ref BITMAPINFO bitmapInfo,
    uint usage
  );

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct BITMAPINFOHEADER {
    public uint Size;
    public int Width;
    public int Height;
    public ushort Planes;
    public ushort BitCount;
    public uint Compression;
    public uint ImageSize;
    public int XPelsPerMeter;
    public int YPelsPerMeter;
    public uint ColorsUsed;
    public uint ColorsImportant;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct BITMAPINFO {
    public BITMAPINFOHEADER Header;
    public uint RedMask;
    public uint GreenMask;
    public uint BlueMask;
    public uint AlphaMask;
  }

  public static void Capture(IntPtr hWnd, string path) {
    RECT rect;
    if (!GetWindowRect(hWnd, out rect)) {
      throw new InvalidOperationException("GetWindowRect failed.");
    }

    int width = rect.Right - rect.Left;
    int height = rect.Bottom - rect.Top;
    if (width <= 0 || height <= 0) {
      throw new InvalidOperationException("Installer window has no drawable bounds.");
    }

    IntPtr screenDc = GetDC(IntPtr.Zero);
    IntPtr memoryDc = CreateCompatibleDC(screenDc);
    IntPtr bitmap = CreateCompatibleBitmap(screenDc, width, height);
    IntPtr previousObject = SelectObject(memoryDc, bitmap);
    try {
      if (!BitBlt(memoryDc, 0, 0, width, height, screenDc, rect.Left, rect.Top, 0x00CC0020)) {
        throw new InvalidOperationException("BitBlt failed.");
      }

      BITMAPINFO bitmapInfo = new BITMAPINFO();
      bitmapInfo.Header.Size = (uint)Marshal.SizeOf(typeof(BITMAPINFOHEADER));
      bitmapInfo.Header.Width = width;
      bitmapInfo.Header.Height = height;
      bitmapInfo.Header.Planes = 1;
      bitmapInfo.Header.BitCount = 32;
      bitmapInfo.Header.Compression = 0;
      bitmapInfo.Header.ImageSize = (uint)(width * height * 4);
      byte[] pixels = new byte[bitmapInfo.Header.ImageSize];
      if (GetDIBits(memoryDc, bitmap, 0, (uint)height, pixels, ref bitmapInfo, 0) == 0) {
        throw new InvalidOperationException("GetDIBits failed.");
      }

      using (FileStream stream = new FileStream(path, FileMode.Create, FileAccess.Write))
      using (BinaryWriter writer = new BinaryWriter(stream)) {
        writer.Write((ushort)0x4D42);
        writer.Write((uint)(14 + Marshal.SizeOf(typeof(BITMAPINFOHEADER)) + pixels.Length));
        writer.Write((ushort)0);
        writer.Write((ushort)0);
        writer.Write((uint)(14 + Marshal.SizeOf(typeof(BITMAPINFOHEADER))));
        writer.Write(bitmapInfo.Header.Size);
        writer.Write(bitmapInfo.Header.Width);
        writer.Write(bitmapInfo.Header.Height);
        writer.Write(bitmapInfo.Header.Planes);
        writer.Write(bitmapInfo.Header.BitCount);
        writer.Write(bitmapInfo.Header.Compression);
        writer.Write(bitmapInfo.Header.ImageSize);
        writer.Write(bitmapInfo.Header.XPelsPerMeter);
        writer.Write(bitmapInfo.Header.YPelsPerMeter);
        writer.Write(bitmapInfo.Header.ColorsUsed);
        writer.Write(bitmapInfo.Header.ColorsImportant);
        writer.Write(pixels);
      }
    } finally {
      SelectObject(memoryDc, previousObject);
      DeleteObject(bitmap);
      DeleteDC(memoryDc);
      ReleaseDC(IntPtr.Zero, screenDc);
    }
  }
}
"@

$windowStyleIndex = -16
$wsMinimizeBox = 0x00020000
$wsMaximizeBox = 0x00010000
$wsThickFrame = 0x00040000
$wmSysCommand = 0x0112
$scClose = 0xF060
$scMinimize = 0xF020
$scMaximize = 0xF030
$scRestore = 0xF120
$wmClose = 0x0010
$wmCommand = 0x0111
$buttonClicked = 0
$nextButtonId = 1
$cancelButtonId = 2
$installDirectory = Join-Path $env:RUNNER_TEMP "real-installer-ui-install"
$uninstallerPath = Join-Path $installDirectory "Uninstall Real.exe"

$process = $null
$uninstallerProcess = $null
$report = [ordered]@{
  installer = (Resolve-Path $InstallerPath).Path
  result = "failed"
  windowTitle = $null
  windowHandle = $null
  windowStyle = $null
  screenshots = @()
  brandingScreenshot = $null
  controls = [ordered]@{
    minimize = "not-run"
    maximize = "not-run"
    restoreAfterMaximize = "not-run"
    close = "not-run"
  }
  uninstaller = [ordered]@{
    path = $null
    result = "not-run"
    processId = $null
    processName = $null
    processPath = $null
    processExited = $null
    processExitCode = $null
    windowTitle = $null
    windowHandle = $null
    windowStyle = $null
    screenshots = @()
    brandingScreenshot = $null
    controls = [ordered]@{
      minimize = "not-run"
      restoreAfterMinimize = "not-run"
      maximize = "not-run"
      restoreAfterMaximize = "not-run"
      close = "not-run"
    }
  }
  error = $null
}

function Wait-ForWindowState {
  param(
    [IntPtr]$Handle,
    [scriptblock]$Predicate,
    [string]$Description
  )

  $deadline = [DateTime]::UtcNow.AddSeconds(8)
  do {
    if (& $Predicate) {
      return
    }
    Start-Sleep -Milliseconds 200
  } while ([DateTime]::UtcNow -lt $deadline)

  throw "Timed out waiting for $Description."
}

function Send-SystemCommand {
  param(
    [IntPtr]$Handle,
    [int]$Command,
    [string]$Description
  )

  if (-not [RealInstallerWindow]::PostMessage($Handle, $wmSysCommand, [IntPtr]$Command, [IntPtr]0)) {
    throw "Could not send $Description to the installer window."
  }
}

function Get-ControlCaption {
  param(
    [IntPtr]$ParentHandle,
    [int]$ControlId
  )

  $control = [RealInstallerWindow]::GetDlgItem($ParentHandle, $ControlId)
  if ($control -eq [IntPtr]::Zero) {
    return ""
  }
  $captionBuilder = New-Object System.Text.StringBuilder 128
  [void][RealInstallerWindow]::GetWindowText($control, $captionBuilder, $captionBuilder.Capacity)
  return $captionBuilder.ToString()
}

function Click-InstallerButton {
  param(
    [IntPtr]$ParentHandle,
    [int]$ControlId
  )

  $control = [RealInstallerWindow]::GetDlgItem($ParentHandle, $ControlId)
  if ($control -eq [IntPtr]::Zero) {
    throw "Installer control $ControlId was not found."
  }
  [void][RealInstallerWindow]::SendMessage(
    $ParentHandle,
    $wmCommand,
    [IntPtr]($buttonClicked -shl 16 -bor $ControlId),
    $control
  )
}

function Find-VisibleWindowForExecutable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath
  )

  $script:realWindowCandidate = [IntPtr]::Zero
  $script:realWindowProcessId = 0
  $callback = [RealInstallerWindow+EnumWindowsProc] {
    param(
      [IntPtr]$CandidateHandle,
      [IntPtr]$Unused
    )

    if (-not [RealInstallerWindow]::IsWindowVisible($CandidateHandle)) {
      return $true
    }

    [uint32]$candidateProcessId = 0
    [void][RealInstallerWindow]::GetWindowThreadProcessId(
      $CandidateHandle,
      [ref]$candidateProcessId
    )
    try {
      $candidateProcess = Get-Process -Id $candidateProcessId -ErrorAction Stop
      if ($candidateProcess.Path -ieq $ExecutablePath) {
        $script:realWindowCandidate = $CandidateHandle
        $script:realWindowProcessId = $candidateProcessId
        return $false
      }
    }
    catch {
      return $true
    }

    return $true
  }

  [void][RealInstallerWindow]::EnumWindows($callback, [IntPtr]::Zero)
  if ($script:realWindowCandidate -eq [IntPtr]::Zero) {
    return $null
  }

  return [pscustomobject]@{
    Handle = $script:realWindowCandidate
    ProcessId = $script:realWindowProcessId
  }
}

function Find-VisibleWindowByTitle {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TitlePattern
  )

  $script:realWindowCandidate = [IntPtr]::Zero
  $script:realWindowProcessId = 0
  $script:realWindowTitle = $null
  $callback = [RealInstallerWindow+EnumWindowsProc] {
    param(
      [IntPtr]$CandidateHandle,
      [IntPtr]$Unused
    )

    if (-not [RealInstallerWindow]::IsWindowVisible($CandidateHandle)) {
      return $true
    }

    $captionBuilder = New-Object System.Text.StringBuilder 256
    [void][RealInstallerWindow]::GetWindowText(
      $CandidateHandle,
      $captionBuilder,
      $captionBuilder.Capacity
    )
    if ($captionBuilder.ToString() -notmatch $TitlePattern) {
      return $true
    }

    [uint32]$candidateProcessId = 0
    [void][RealInstallerWindow]::GetWindowThreadProcessId(
      $CandidateHandle,
      [ref]$candidateProcessId
    )
    $script:realWindowCandidate = $CandidateHandle
    $script:realWindowProcessId = $candidateProcessId
    $script:realWindowTitle = $captionBuilder.ToString()
    return $false
  }

  [void][RealInstallerWindow]::EnumWindows($callback, [IntPtr]::Zero)
  if ($script:realWindowCandidate -eq [IntPtr]::Zero) {
    return $null
  }

  return [pscustomobject]@{
    Handle = $script:realWindowCandidate
    ProcessId = $script:realWindowProcessId
    Title = $script:realWindowTitle
  }
}

try {
  $process = Start-Process `
    -FilePath (Resolve-Path $InstallerPath).Path `
    -ArgumentList "/D=$installDirectory" `
    -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do {
    $process.Refresh()
    $handle = $process.MainWindowHandle
    if ($handle -ne [IntPtr]::Zero) {
      break
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)

  if ($handle -eq [IntPtr]::Zero) {
    throw "The installer did not expose a top-level window within 30 seconds."
  }

  $titleBuilder = New-Object System.Text.StringBuilder 256
  [void][RealInstallerWindow]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity)
  $style = [uint64][RealInstallerWindow]::GetWindowLongPtr($handle, $windowStyleIndex).ToInt64()
  $report.windowHandle = $handle.ToInt64()
  $report.windowTitle = $titleBuilder.ToString()
  $report.windowStyle = "0x{0:X}" -f $style

  if (-not [RealInstallerWindow]::IsWindowVisible($handle)) {
    throw "The installer window is not visible."
  }
  if (($style -band $wsMinimizeBox) -ne $wsMinimizeBox) {
    throw "The installer window is missing WS_MINIMIZEBOX."
  }
  if (($style -band $wsMaximizeBox) -ne $wsMaximizeBox) {
    throw "The installer window is missing WS_MAXIMIZEBOX."
  }
  if (($style -band $wsThickFrame) -ne $wsThickFrame) {
    throw "The installer window is missing WS_THICKFRAME."
  }

  $initialScreenshot = Join-Path $evidenceDirectory "real-installer-initial.bmp"
  [RealInstallerWindow]::Capture($handle, $initialScreenshot)
  $report.screenshots += (Split-Path $initialScreenshot -Leaf)

  Send-SystemCommand $handle $scMinimize "minimize"
  Wait-ForWindowState $handle { [RealInstallerWindow]::IsIconic($handle) } "minimize"
  $report.controls.minimize = "passed"

  Send-SystemCommand $handle $scRestore "restore after minimize"
  Wait-ForWindowState $handle {
    [RealInstallerWindow]::IsWindowVisible($handle) -and -not [RealInstallerWindow]::IsIconic($handle)
  } "restore after minimize"

  Send-SystemCommand $handle $scMaximize "maximize"
  Wait-ForWindowState $handle { [RealInstallerWindow]::IsZoomed($handle) } "maximize"
  $report.controls.maximize = "passed"

  Send-SystemCommand $handle $scRestore "restore after maximize"
  Wait-ForWindowState $handle {
    [RealInstallerWindow]::IsWindowVisible($handle) -and -not [RealInstallerWindow]::IsZoomed($handle)
  } "restore after maximize"
  $report.controls.restoreAfterMaximize = "passed"

  $restoredScreenshot = Join-Path $evidenceDirectory "real-installer-restored.bmp"
  [RealInstallerWindow]::Capture($handle, $restoredScreenshot)
  $report.screenshots += (Split-Path $restoredScreenshot -Leaf)

  Send-SystemCommand $handle $scClose "close"
  Wait-ForWindowState $handle {
    $process.Refresh()
    $process.HasExited -or -not [RealInstallerWindow]::IsWindowVisible($handle)
  } "close"
  $report.controls.close = "passed"
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    $process.WaitForExit(5000)
  }

  $process = Start-Process `
    -FilePath (Resolve-Path $InstallerPath).Path `
    -ArgumentList "/D=$installDirectory" `
    -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do {
    $process.Refresh()
    $handle = $process.MainWindowHandle
    if ($handle -ne [IntPtr]::Zero) {
      break
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  if ($handle -eq [IntPtr]::Zero) {
    throw "The branding evidence installer did not expose a top-level window within 30 seconds."
  }

  $finishPageReached = $false
  for ($page = 0; $page -lt 10; $page++) {
    $nextCaption = Get-ControlCaption $handle $nextButtonId
    if ($nextCaption -match "Finish") {
      $finishPageReached = $true
      break
    }
    if ($nextCaption -notmatch "Next|Install") {
      throw "Unexpected installer next-button caption '$nextCaption' while reaching the finish page."
    }

    Click-InstallerButton $handle $nextButtonId
    Start-Sleep -Seconds 2
    $process.Refresh()
    if ($process.HasExited) {
      throw "The installer exited before its branded finish page was shown."
    }
  }

  if (-not $finishPageReached) {
    $finishDeadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
      $nextCaption = Get-ControlCaption $handle $nextButtonId
      if ($nextCaption -match "Finish") {
        $finishPageReached = $true
        break
      }
      Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $finishDeadline)
  }
  if (-not $finishPageReached) {
    throw "The installer did not reach its branded finish page."
  }

  $finishScreenshot = Join-Path $evidenceDirectory "real-installer-finish.bmp"
  [RealInstallerWindow]::Capture($handle, $finishScreenshot)
  $report.screenshots += (Split-Path $finishScreenshot -Leaf)
  $report.brandingScreenshot = (Split-Path $finishScreenshot -Leaf)

  Click-InstallerButton $handle $nextButtonId
  $finishDeadline = [DateTime]::UtcNow.AddSeconds(30)
  do {
    $process.Refresh()
    if ($process.HasExited) {
      break
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $finishDeadline)
  if (-not $process.HasExited) {
    throw "The installer did not exit after its branded finish page was completed."
  }

  if (-not (Test-Path -LiteralPath $uninstallerPath -PathType Leaf)) {
    throw "The installed Real uninstaller was not found at '$uninstallerPath'."
  }
  $report.uninstaller.path = $uninstallerPath

  $applicationPath = Join-Path $installDirectory "Real.exe"
  Get-Process | ForEach-Object {
    try {
      if ($_.Path -ieq $applicationPath) {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
      }
    }
    catch {
      # The process may exit between enumeration and the path lookup.
    }
  }
  Start-Sleep -Seconds 1

  $uninstallerProcess = Start-Process `
    -FilePath $uninstallerPath `
    -WorkingDirectory $installDirectory `
    -PassThru
  $uninstallerWindowProcess = $null
  $report.uninstaller.processId = $uninstallerProcess.Id
  $report.uninstaller.processName = $uninstallerProcess.ProcessName
  try {
    $report.uninstaller.processPath = $uninstallerProcess.Path
  }
  catch {
    $report.uninstaller.processPath = $null
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do {
    $uninstallerProcess.Refresh()
    $report.uninstaller.processExited = $uninstallerProcess.HasExited
    if ($uninstallerProcess.HasExited) {
      $report.uninstaller.processExitCode = $uninstallerProcess.ExitCode
    }
    $uninstallerHandle = $uninstallerProcess.MainWindowHandle
    if ($uninstallerHandle -eq [IntPtr]::Zero) {
      $window = Find-VisibleWindowForExecutable -ExecutablePath $uninstallerPath
      if ($window) {
        $uninstallerHandle = $window.Handle
        $uninstallerWindowProcess = Get-Process -Id $window.ProcessId -ErrorAction Stop
      }
    }
    if ($uninstallerHandle -eq [IntPtr]::Zero) {
      $window = Find-VisibleWindowByTitle -TitlePattern "Real|Uninstall"
      if ($window) {
        $uninstallerHandle = $window.Handle
        $uninstallerWindowProcess = Get-Process -Id $window.ProcessId -ErrorAction Stop
      }
    }
    if ($uninstallerHandle -ne [IntPtr]::Zero) {
      break
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)

  if ($uninstallerHandle -eq [IntPtr]::Zero) {
    throw "The Real uninstaller did not expose a top-level window within 30 seconds."
  }

  $uninstallerTitleBuilder = New-Object System.Text.StringBuilder 256
  [void][RealInstallerWindow]::GetWindowText(
    $uninstallerHandle,
    $uninstallerTitleBuilder,
    $uninstallerTitleBuilder.Capacity
  )
  $uninstallerStyle = [uint64][RealInstallerWindow]::GetWindowLongPtr(
    $uninstallerHandle,
    $windowStyleIndex
  ).ToInt64()
  $report.uninstaller.windowHandle = $uninstallerHandle.ToInt64()
  $report.uninstaller.windowTitle = $uninstallerTitleBuilder.ToString()
  $report.uninstaller.windowStyle = "0x{0:X}" -f $uninstallerStyle

  if (-not [RealInstallerWindow]::IsWindowVisible($uninstallerHandle)) {
    throw "The Real uninstaller window is not visible."
  }

  $uninstallerInitialScreenshot = Join-Path $evidenceDirectory "real-uninstaller-initial.bmp"
  [RealInstallerWindow]::Capture($uninstallerHandle, $uninstallerInitialScreenshot)
  $report.uninstaller.screenshots += (Split-Path $uninstallerInitialScreenshot -Leaf)
  $report.uninstaller.brandingScreenshot = (Split-Path $uninstallerInitialScreenshot -Leaf)

  if (($uninstallerStyle -band $wsMinimizeBox) -eq $wsMinimizeBox) {
    Send-SystemCommand $uninstallerHandle $scMinimize "minimize the Real uninstaller"
    Wait-ForWindowState $uninstallerHandle {
      [RealInstallerWindow]::IsIconic($uninstallerHandle)
    } "Real uninstaller minimize"
    $report.uninstaller.controls.minimize = "passed"

    Send-SystemCommand $uninstallerHandle $scRestore "restore the Real uninstaller after minimize"
    Wait-ForWindowState $uninstallerHandle {
      [RealInstallerWindow]::IsWindowVisible($uninstallerHandle) -and
        -not [RealInstallerWindow]::IsIconic($uninstallerHandle)
    } "Real uninstaller restore after minimize"
    $report.uninstaller.controls.restoreAfterMinimize = "passed"
  } else {
    $report.uninstaller.controls.minimize = "not-available"
    $report.uninstaller.controls.restoreAfterMinimize = "not-available"
  }

  if (($uninstallerStyle -band $wsMaximizeBox) -eq $wsMaximizeBox) {
    Send-SystemCommand $uninstallerHandle $scMaximize "maximize the Real uninstaller"
    Wait-ForWindowState $uninstallerHandle {
      [RealInstallerWindow]::IsZoomed($uninstallerHandle)
    } "Real uninstaller maximize"
    $report.uninstaller.controls.maximize = "passed"

    Send-SystemCommand $uninstallerHandle $scRestore "restore the Real uninstaller after maximize"
    Wait-ForWindowState $uninstallerHandle {
      [RealInstallerWindow]::IsWindowVisible($uninstallerHandle) -and
        -not [RealInstallerWindow]::IsZoomed($uninstallerHandle)
    } "Real uninstaller restore after maximize"
    $report.uninstaller.controls.restoreAfterMaximize = "passed"
  } else {
    $report.uninstaller.controls.maximize = "not-available"
    $report.uninstaller.controls.restoreAfterMaximize = "not-available"
  }

  $uninstallerRestoredScreenshot = Join-Path $evidenceDirectory "real-uninstaller-restored.bmp"
  [RealInstallerWindow]::Capture($uninstallerHandle, $uninstallerRestoredScreenshot)
  $report.uninstaller.screenshots += (Split-Path $uninstallerRestoredScreenshot -Leaf)

  Send-SystemCommand $uninstallerHandle $scClose "close the Real uninstaller"
  Wait-ForWindowState $uninstallerHandle {
    if ($uninstallerWindowProcess) {
      $uninstallerWindowProcess.Refresh()
    } else {
      $uninstallerProcess.Refresh()
    }
    ($uninstallerWindowProcess -and $uninstallerWindowProcess.HasExited) -or
      (-not $uninstallerWindowProcess -and $uninstallerProcess.HasExited) -or
      -not [RealInstallerWindow]::IsWindowVisible($uninstallerHandle)
  } "Real uninstaller close"
  $report.uninstaller.controls.close = "passed"
  $report.uninstaller.result = "passed"

  $report.result = "passed"
}
catch {
  $report.error = $_.Exception.Message
  throw
}
finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
  if ($uninstallerProcess -and -not $uninstallerProcess.HasExited) {
    Stop-Process -Id $uninstallerProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($uninstallerWindowProcess -and -not $uninstallerWindowProcess.HasExited) {
    Stop-Process -Id $uninstallerWindowProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path $installDirectory) {
    Remove-Item -Path $installDirectory -Recurse -Force -ErrorAction SilentlyContinue
  }
  $reportPath = Join-Path $evidenceDirectory "real-installer-ui-report.json"
  $report | ConvertTo-Json -Depth 5 | Set-Content -Path $reportPath -Encoding utf8
}