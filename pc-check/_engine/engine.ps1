# Hardware baseline check.
# Source for the downloadable .bat files. Run build.mjs after edits.
# Windows PowerShell 5.1, read only.
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference    = 'SilentlyContinue'

$Cfg = @'
__PROFILE_JSON__
'@ | ConvertFrom-Json

$script:Checks = New-Object System.Collections.ArrayList
$script:Log    = New-Object System.Collections.ArrayList
$script:Admin  = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$script:IdleZones = @()
$script:LoadZones = @()
$script:Nv = $null

function Fmt($n, $d = 0) {
  if ($null -eq $n) { return 'n/a' }
  return ([double]$n).ToString('N' + $d, [System.Globalization.CultureInfo]::InvariantCulture)
}
function Out-Line([string]$text) {
  Write-Host $text
  [void]$script:Log.Add($text)
}
function Out-Note([string]$text) {
  Write-Host ('  ' + $text) -ForegroundColor DarkGray
  [void]$script:Log.Add('  ' + $text)
}
function Out-Section([string]$title) {
  Write-Host ''
  Write-Host ('  ' + $title.ToUpper()) -ForegroundColor White
  Write-Host ('  ' + ('-' * 58)) -ForegroundColor DarkGray
  [void]$script:Log.Add('')
  [void]$script:Log.Add($title.ToUpper())
  [void]$script:Log.Add('-' * 58)
}
function Add-Check([string]$area, [string]$name, [string]$status, [string]$detail, [string]$expected = '') {
  $label = switch ($status) { 'PASS' { 'PASS' } 'WARN' { 'WARN' } 'FAIL' { 'FAIL' } 'SKIP' { 'SKIP' } default { 'INFO' } }
  $color = switch ($status) { 'PASS' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } 'SKIP' { 'DarkGray' } default { 'Gray' } }
  Write-Host '  [' -NoNewline -ForegroundColor DarkGray
  Write-Host $label -NoNewline -ForegroundColor $color
  Write-Host '] ' -NoNewline -ForegroundColor DarkGray
  Write-Host ($name.PadRight(26)) -NoNewline -ForegroundColor Gray
  Write-Host $detail -ForegroundColor Gray
  $line = '  [' + $label + '] ' + $name.PadRight(26) + ' ' + $detail
  if ($expected) { $line = $line + '  (expected: ' + $expected + ')' }
  [void]$script:Log.Add($line)
  [void]$script:Checks.Add([pscustomobject]@{
    Area = $area; Name = $name; Status = $status; Detail = $detail; Expected = $expected
  })
}

function Get-GpuVendor([string]$name) {
  if ($name -match 'NVIDIA|GeForce|Quadro|RTX|GTX') { return 'NVIDIA' }
  if ($name -match 'AMD|Radeon|FirePro') { return 'AMD' }
  if ($name -match 'Intel|Arc|Iris|UHD') { return 'Intel' }
  return 'Unknown'
}
function Get-ZoneTemps {
  $zones = $null
  try { $zones = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop } catch { return @() }
  if (-not $zones) { return @() }
  $out = New-Object System.Collections.ArrayList
  foreach ($z in $zones) {
    $c = [math]::Round(($z.CurrentTemperature / 10) - 273.15, 1)
    if ($c -gt 0 -and $c -lt 120) {
      [void]$out.Add([pscustomobject]@{ Name = $z.InstanceName; C = $c })
    }
  }
  return @($out)
}
function Get-PcieLink([string]$instanceId) {
  if (-not $instanceId) { return $null }
  if (-not (Get-Command Get-PnpDeviceProperty -ErrorAction SilentlyContinue)) { return $null }
  $props = Get-PnpDeviceProperty -InstanceId $instanceId -KeyName 'DEVPKEY_PciDevice_CurrentLinkSpeed', 'DEVPKEY_PciDevice_MaxLinkSpeed', 'DEVPKEY_PciDevice_CurrentLinkWidth', 'DEVPKEY_PciDevice_MaxLinkWidth' -ErrorAction SilentlyContinue
  if (-not $props) { return $null }
  $h = @{}
  foreach ($p in $props) { $h[$p.KeyName] = $p.Data }
  return $h
}
function Get-NvSmi {
  $exe = $null
  foreach ($p in @('nvidia-smi', (Join-Path $env:SystemRoot 'System32\nvidia-smi.exe'), (Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe'))) {
    $c = Get-Command $p -ErrorAction SilentlyContinue
    if ($c) { $exe = $c.Source; break }
  }
  if (-not $exe) { return $null }
  $fields = 'name,driver_version,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,power.default_limit,clocks.current.graphics,clocks.max.graphics,clocks.current.memory,clocks.max.memory,pcie.link.gen.current,pcie.link.gen.max,pcie.link.width.current,pcie.link.width.max'
  $line = (& $exe ('--query-gpu=' + $fields) '--format=csv,noheader,nounits' 2>$null | Select-Object -First 1)
  if (-not $line) { return $null }
  $v = $line -split ','
  if ($v.Count -lt 17) { return $null }
  function N($s) {
    $t = ([string]$s).Trim()
    if ($t -match '^-?[0-9.]+$') { return [double]$t }
    return $null
  }
  return [pscustomobject]@{
    Name = $v[0].Trim(); Driver = $v[1].Trim()
    TempC = N $v[2]; Util = N $v[3]; MemUsed = N $v[4]; MemTotal = N $v[5]
    PowerDraw = N $v[6]; PowerLimit = N $v[7]; PowerDefault = N $v[8]
    ClockGfx = N $v[9]; ClockGfxMax = N $v[10]; ClockMem = N $v[11]; ClockMemMax = N $v[12]
    LinkGen = N $v[13]; LinkGenMax = N $v[14]; LinkWidth = N $v[15]; LinkWidthMax = N $v[16]
  }
}
function Measure-Drive([string]$path, [int]$mb) {
  $total = [int64]$mb * 1MB
  $chunk = New-Object byte[] (1MB)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $fs = New-Object System.IO.FileStream($path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None, 1048576, [System.IO.FileOptions]::SequentialScan)
  for ($i = 0; $i -lt ($total / $chunk.Length); $i++) { $fs.Write($chunk, 0, $chunk.Length) }
  $fs.Flush($true)
  $fs.Dispose()
  $sw.Stop()
  $write = ($total / 1MB) / $sw.Elapsed.TotalSeconds

  $opts = [System.IO.FileOptions]([int][System.IO.FileOptions]::SequentialScan -bor 536870912)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $fs = New-Object System.IO.FileStream($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None, 1, $opts)
  $read = 0
  while (($n = $fs.Read($chunk, 0, $chunk.Length)) -gt 0) { $read += $n }
  $fs.Dispose()
  $sw.Stop()
  if ($read -le 0) { return [pscustomobject]@{ Write = $write; Read = $null } }
  return [pscustomobject]@{ Write = $write; Read = ($read / 1MB) / $sw.Elapsed.TotalSeconds }
}

$os    = Get-CimInstance Win32_OperatingSystem
$cs    = Get-CimInstance Win32_ComputerSystem
$board = Get-CimInstance Win32_BaseBoard
$bios  = Get-CimInstance Win32_BIOS
$cpu   = Get-CimInstance Win32_Processor | Select-Object -First 1

$machine = $cs.Name
if (-not $machine) { $machine = $env:COMPUTERNAME }
Write-Host ''
Write-Host '  HARDWARE BASELINE CHECK' -ForegroundColor White
Write-Host ('  ' + $Cfg.platformLong + '  /  ' + $Cfg.gpuLabel) -ForegroundColor Cyan
Write-Host ('  ' + $machine + '  |  ' + $os.Caption + ' build ' + $os.BuildNumber) -ForegroundColor DarkGray
Write-Host ('  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + '  |  ' + $(if ($script:Admin) { 'administrator' } else { 'standard user' }) + '  |  PowerShell ' + $PSVersionTable.PSVersion) -ForegroundColor DarkGray
[void]$script:Log.Add('HARDWARE BASELINE CHECK')
[void]$script:Log.Add($Cfg.platformLong + ' / ' + $Cfg.gpuLabel)
[void]$script:Log.Add($machine + ' | ' + $os.Caption + ' build ' + $os.BuildNumber)
[void]$script:Log.Add((Get-Date -Format 'yyyy-MM-dd HH:mm') + ' | ' + $PSVersionTable.PSVersion)
if (-not $script:Admin) {
  Write-Host '  Not elevated: thermal zones and some sensors will be unavailable.' -ForegroundColor DarkYellow
}

$script:IdleZones = Get-ZoneTemps

Out-Section 'CPU'
if (-not $cpu) {
  Add-Check 'CPU' 'Processor' 'SKIP' 'Windows did not return a processor.'
} else {
  $cpuName    = ([string]$cpu.Name).Trim()
  $baseMhz    = [double]$cpu.MaxClockSpeed
  $cores      = [int]$cpu.NumberOfCores
  $threads    = [int]$cpu.NumberOfLogicalProcessors
  $socket     = ([string]$cpu.SocketDesignation).Trim()
  $cpuVendor  = Get-GpuVendor $cpuName
  if ($cpuName -match 'Intel') { $cpuVendor = 'Intel' }

  Out-Note ($cpuName + '  |  ' + $cores + ' cores / ' + $threads + ' threads  |  base ' + (Fmt $baseMhz) + ' MHz  |  socket ' + $socket)

  $socketOk = $false
  foreach ($s in $Cfg.sockets) { if ($socket -and $socket.ToUpper().StartsWith($s.ToUpper())) { $socketOk = $true } }
  if (-not $socket) {
    Add-Check 'CPU' 'Socket' 'SKIP' 'Windows did not report a socket.' ($Cfg.sockets -join ' / ')
  } elseif ($socketOk) {
    Add-Check 'CPU' 'Socket' 'PASS' ($socket + ' matches this platform.') ($Cfg.sockets -join ' / ')
  } else {
    Add-Check 'CPU' 'Socket' 'FAIL' ($socket + ' does not match ' + $Cfg.platformLong + '.') ($Cfg.sockets -join ' / ')
  }

  if ($cpuVendor -eq 'Unknown') {
    Add-Check 'CPU' 'Vendor' 'SKIP' 'Could not identify the CPU vendor.' $Cfg.cpuVendor
  } elseif ($cpuVendor -eq $Cfg.cpuVendor) {
    Add-Check 'CPU' 'Vendor' 'PASS' ($cpuVendor + ' CPU, as expected.') $Cfg.cpuVendor
  } else {
    Add-Check 'CPU' 'Vendor' 'FAIL' ($cpuVendor + ' CPU; this script targets ' + $Cfg.cpuVendor + '.') $Cfg.cpuVendor
  }

  $planOut = (powercfg /getactivescheme) -join ' '
  $planName = 'unknown'
  if ($planOut -match '\((.+)\)') { $planName = $matches[1].Trim() }
  $cap = $null
  $q = (powercfg /query SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX) -join "`n"
  if ($q -match 'Current AC Power Setting Index:\s*0x([0-9a-fA-F]+)') { $cap = [Convert]::ToInt32($matches[1], 16) }
  if ($null -eq $cap) {
    Add-Check 'CPU' 'Power plan' 'SKIP' ('Active plan: ' + $planName + '; CPU cap not readable.') '100%'
  } elseif ($cap -lt 100) {
    Add-Check 'CPU' 'Power plan' 'WARN' ('Plan "' + $planName + '" caps the CPU at ' + $cap + '%.') '100%'
  } elseif ($planName -match 'Power saver') {
    Add-Check 'CPU' 'Power plan' 'WARN' ('Power saver plan is active; switch to Balanced.') 'Balanced or High performance'
  } else {
    Add-Check 'CPU' 'Power plan' 'PASS' ($planName + ', CPU cap 100%.') '100%'
  }

  $hvci = $null
  try { $hvci = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name Enabled -ErrorAction Stop).Enabled } catch { $hvci = $null }
  if ($hvci -eq 1) {
    Add-Check 'CPU' 'Memory integrity' 'INFO' 'On. Costs a small amount of CPU time in some workloads.'
  } else {
    Add-Check 'CPU' 'Memory integrity' 'INFO' 'Off.'
  }

  $burnSource = @"
using System;
using System.Threading;
public static class HcBurn {
  public static volatile bool Stop;
  static double sink;
  public static void Start() {
    Stop = false;
    int n = Environment.ProcessorCount;
    for (int i = 0; i < n; i++) {
      Thread t = new Thread(delegate() {
        double x = 0.0; long j = 0;
        while (!Stop) { x += Math.Sqrt((double)(j++ & 0xFFFF)); if (x > 1e12) x = 0; }
        sink = x;
      });
      t.IsBackground = true; t.Start();
    }
  }
}
"@
  $perf = $null
  $load = $null
  try {
    if (-not ('HcBurn' -as [type])) { Add-Type -TypeDefinition $burnSource -ErrorAction Stop }
    [HcBurn]::Start()
    Start-Sleep -Milliseconds 900
    $perfSamples = @()
    $loadSamples = @()
    for ($i = 0; $i -lt 4; $i++) {
      $pi = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'"
      if ($pi) { $perfSamples += [double]$pi.PercentProcessorPerformance }
      $po = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
      if ($po) { $loadSamples += [double]$po.PercentProcessorTime }
      Start-Sleep -Milliseconds 650
    }
    [HcBurn]::Stop = $true
    $script:LoadZones = Get-ZoneTemps
    if ($perfSamples.Count -gt 0) { $perf = ($perfSamples | Measure-Object -Average).Average }
    if ($loadSamples.Count -gt 0) { $load = ($loadSamples | Measure-Object -Average).Average }
  } catch {
    [HcBurn]::Stop = $true
  }

  if ($null -eq $perf -or $perf -le 0) {
    Add-Check 'CPU' 'Sustained clock' 'SKIP' 'Frequency counter unavailable; load test skipped.' ((Fmt $baseMhz) + ' MHz')
  } elseif ($load -ne $null -and $load -lt 50) {
    Add-Check 'CPU' 'Sustained clock' 'SKIP' ('Load test only reached ' + (Fmt $load) + '% CPU.') ((Fmt $baseMhz) + ' MHz')
  } else {
    $mhz = $baseMhz * ($perf / 100)
    $ratio = $perf / 100
    $detail = 'Held ' + (Fmt $mhz) + ' MHz at ' + (Fmt $load) + '% load (base ' + (Fmt $baseMhz) + ' MHz).'
    if ($ratio -ge 0.97) {
      Add-Check 'CPU' 'Sustained clock' 'PASS' $detail ('>= ' + (Fmt ($baseMhz * 0.97)) + ' MHz')
    } elseif ($ratio -ge 0.85) {
      Add-Check 'CPU' 'Sustained clock' 'WARN' ($detail + ' Below base; check cooler, VRM airflow and power limits.') ('>= ' + (Fmt ($baseMhz * 0.97)) + ' MHz')
    } else {
      Add-Check 'CPU' 'Sustained clock' 'FAIL' ($detail + ' Clamped well below base.') ('>= ' + (Fmt ($baseMhz * 0.97)) + ' MHz')
    }
  }
}

Out-Section 'Memory'
$sticks = @(Get-CimInstance Win32_PhysicalMemory)
if ($sticks.Count -eq 0) {
  Add-Check 'Memory' 'Modules' 'SKIP' 'Windows did not return memory modules.'
} else {
  $memTypes = @{ 20 = 'DDR'; 21 = 'DDR2'; 22 = 'DDR2'; 24 = 'DDR3'; 26 = 'DDR4'; 27 = 'LPDDR'; 28 = 'LPDDR2'; 29 = 'LPDDR3'; 30 = 'LPDDR4'; 34 = 'DDR5'; 35 = 'LPDDR5' }
  $totalGB = 0
  $type = $null
  $speeds = @()
  $channelsFound = @()
  foreach ($s in $sticks) {
    $gb = [math]::Round($s.Capacity / 1GB)
    $totalGB += $gb
    if ($memTypes[[int]$s.SMBIOSMemoryType]) { $type = $memTypes[[int]$s.SMBIOSMemoryType] }
    $stickMhz = [double]$s.ConfiguredClockSpeed
    if ($stickMhz -le 0) { $stickMhz = [double]$s.Speed }
    $speeds += $stickMhz
    $bank = [string]$s.BankLabel
    $loc  = [string]$s.DeviceLocator
    $ch = $null
    if ($bank -match 'CHANNEL\s*([A-D])') { $ch = $matches[1] }
    elseif ($bank -match 'CHANNEL') { $ch = $bank }
    elseif ($loc -match 'CHANNEL\s*([A-D])') { $ch = $matches[1] }
    if ($ch) { $channelsFound += $ch }
    $label = $loc
    if ($bank) { $label = $bank + ' / ' + $loc }
    Out-Note ((Fmt $gb) + ' GB  ' + $type + '  ' + (Fmt $stickMhz) + ' MT/s  ' + ([string]$s.Manufacturer).Trim() + ' ' + ([string]$s.PartNumber).Trim() + '  (' + $label + ')')
  }
  $speed = ($speeds | Measure-Object -Minimum).Minimum
  $channels = ($channelsFound | Sort-Object -Unique).Count
  if ($channels -eq 0) { if ($sticks.Count -ge 2) { $channels = 2 } else { $channels = 1 } }
  $ramTarget = [int]$Cfg.ramTarget
  if ($Cfg.ramTargets -and $type -and $Cfg.ramTargets.$type) { $ramTarget = [int]$Cfg.ramTargets.$type }

  if ($type -and ($Cfg.ramGens -contains $type)) {
    Add-Check 'Memory' 'Type' 'PASS' ($type + ' matches this platform.') ($Cfg.ramGens -join ' / ')
  } elseif ($type) {
    Add-Check 'Memory' 'Type' 'FAIL' ($type + ' is not used on ' + $Cfg.platformLong + '.') ($Cfg.ramGens -join ' / ')
  }

  if ($totalGB -ge $Cfg.ramMinGB) {
    Add-Check 'Memory' 'Capacity' 'PASS' ((Fmt $totalGB) + ' GB installed.') ('>= ' + $Cfg.ramMinGB + ' GB')
  } else {
    Add-Check 'Memory' 'Capacity' 'WARN' ((Fmt $totalGB) + ' GB installed; below the target for this platform.') ('>= ' + $Cfg.ramMinGB + ' GB')
  }

  if ($channels -ge $Cfg.ramChannels) {
    Add-Check 'Memory' 'Channels' 'PASS' ((Fmt $channels) + ' channels populated.') ($Cfg.ramChannels.ToString() + ' channels')
  } else {
    Add-Check 'Memory' 'Channels' 'WARN' ((Fmt $channels) + ' channel populated; bandwidth is half of a dual-channel setup.') ($Cfg.ramChannels.ToString() + ' channels')
  }

  if ($speed -ge $ramTarget) {
    Add-Check 'Memory' 'Speed' 'PASS' ((Fmt $speed) + ' MT/s configured.') ($ramTarget.ToString() + ' MT/s')
  } elseif ($speed -ge ($ramTarget - 400)) {
    Add-Check 'Memory' 'Speed' 'WARN' ((Fmt $speed) + ' MT/s; slightly below the target.') ($ramTarget.ToString() + ' MT/s')
  } else {
    Add-Check 'Memory' 'Speed' 'WARN' ((Fmt $speed) + ' MT/s; EXPO/XMP is probably off.') ($ramTarget.ToString() + ' MT/s')
  }
}

Out-Section 'Graphics'
$adapters = @(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -and $_.Name -notmatch 'Microsoft Basic|Remote|Virtual|Parsec' })
if ($adapters.Count -eq 0) {
  Add-Check 'Graphics' 'Adapter' 'SKIP' 'Windows did not return a display adapter.'
} else {
  if ($adapters.Count -gt 1) {
    $names = @($adapters | ForEach-Object { ([string]$_.Name).Trim() })
    Out-Note ('Display adapters: ' + ($names -join '; '))
  }
  $gpu = $null
  $match = @($adapters | Where-Object { (Get-GpuVendor ([string]$_.Name)) -eq $Cfg.gpuVendor })
  if ($match.Count -gt 0) {
    $gpu = $match | Sort-Object -Property @{ Expression = { if ($_.Name -match 'Arc') { 3 } elseif ($_.Name -match 'RX|Radeon RX|GeForce|RTX|GTX') { 2 } else { 1 } }; Descending = $true } | Select-Object -First 1
  } else {
    $gpu = $adapters | Select-Object -First 1
  }
  $gpuName = ([string]$gpu.Name).Trim()
  $gpuVendor = Get-GpuVendor $gpuName
  Out-Note ($gpuName + '  |  driver ' + $gpu.DriverVersion)

  if ($gpuVendor -eq $Cfg.gpuVendor) {
    Add-Check 'Graphics' 'Vendor' 'PASS' ($gpuVendor + ' adapter found.') $Cfg.gpuVendor
  } else {
    Add-Check 'Graphics' 'Vendor' 'FAIL' ($gpuVendor + ' adapter found; this script targets ' + $Cfg.gpuVendor + '.') $Cfg.gpuVendor
  }

  $drvDate = $gpu.DriverDate
  if ($drvDate -is [string]) {
    try { $drvDate = [Management.ManagementDateTimeConverter]::ToDateTime($drvDate) } catch { $drvDate = $null }
  }
  if ($drvDate) {
    $age = (New-TimeSpan -Start $drvDate -End (Get-Date)).Days
    if ($age -gt 730) {
      Add-Check 'Graphics' 'Driver age' 'WARN' ('Driver dated ' + $drvDate.ToString('yyyy-MM-dd') + ' (' + [math]::Round($age / 30) + ' months old).') 'under 24 months'
    } else {
      Add-Check 'Graphics' 'Driver age' 'PASS' ('Driver dated ' + $drvDate.ToString('yyyy-MM-dd') + '.') 'under 24 months'
    }
  } else {
    Add-Check 'Graphics' 'Driver age' 'SKIP' 'Driver date unavailable.'
  }

  $link = Get-PcieLink ([string]$gpu.PNPDeviceID)
  if ($link) {
    $curW = $link['DEVPKEY_PciDevice_CurrentLinkWidth']
    $maxW = $link['DEVPKEY_PciDevice_MaxLinkWidth']
    $curG = $link['DEVPKEY_PciDevice_CurrentLinkSpeed']
    $maxG = $link['DEVPKEY_PciDevice_MaxLinkSpeed']
    if ($curW -and $maxW) {
      if ([int]$curW -lt [int]$maxW) {
        Add-Check 'Graphics' 'PCIe width' 'WARN' ('x' + $curW + ' of x' + $maxW + '. Card is in a shorter slot, a riser, or lanes are shared.') ('x' + $maxW)
      } else {
        Add-Check 'Graphics' 'PCIe width' 'PASS' ('x' + $curW + ' link.') ('x' + $maxW)
      }
    }
    if ($curG -and $maxG) {
      if ([int]$curG -lt [int]$maxG) {
        Add-Check 'Graphics' 'PCIe generation' 'INFO' ('Gen' + $curG + ' at query time, card supports Gen' + $maxG + '. Idle power saving lowers this.')
      } else {
        Add-Check 'Graphics' 'PCIe generation' 'PASS' ('Gen' + $curG + ' link, full speed for the card.')
      }
    }
  } else {
    Add-Check 'Graphics' 'PCIe link' 'SKIP' 'PCIe link properties are not exposed on this system.'
  }

  $curHz = [int]$gpu.CurrentRefreshRate
  $maxHz = [int]$gpu.MaxRefreshRate
  if ($curHz -gt 0 -and $maxHz -gt 0) {
    if ($curHz -lt $maxHz) {
      Add-Check 'Graphics' 'Refresh rate' 'WARN' ($curHz + ' Hz; the display can do ' + $maxHz + ' Hz. Change it in display settings.') ($maxHz + ' Hz')
    } else {
      Add-Check 'Graphics' 'Refresh rate' 'PASS' ($curHz + ' Hz.') ($maxHz + ' Hz')
    }
  } else {
    Add-Check 'Graphics' 'Refresh rate' 'SKIP' 'Refresh rate not reported for this adapter.'
  }

  if ($Cfg.gpuVendor -eq 'NVIDIA' -and $gpuVendor -eq 'NVIDIA') { $script:Nv = Get-NvSmi }
  if ($Cfg.gpuVendor -eq 'NVIDIA' -and $script:Nv) {
    $nv = $script:Nv
    if ($nv.PowerLimit -and $nv.PowerDefault -and $nv.PowerLimit -lt ($nv.PowerDefault - 1)) {
      Add-Check 'Graphics' 'Power limit' 'WARN' ((Fmt $nv.PowerLimit) + ' W of ' + (Fmt $nv.PowerDefault) + ' W default. Raised by Afterburner or a vBIOS switch?') ((Fmt $nv.PowerDefault) + ' W')
    } elseif ($nv.PowerLimit) {
      Add-Check 'Graphics' 'Power limit' 'PASS' ((Fmt $nv.PowerLimit) + ' W, at the card default.')
    }
    if ($nv.ClockGfx -ne $null -and $nv.ClockGfxMax) {
      Add-Check 'Graphics' 'Clocks' 'INFO' ('Graphics ' + (Fmt $nv.ClockGfx) + ' MHz idle / ' + (Fmt $nv.ClockGfxMax) + ' MHz max, memory ' + (Fmt $nv.ClockMem) + ' / ' + (Fmt $nv.ClockMemMax) + ' MHz, ' + (Fmt $nv.Util) + '% load.')
    }
    if ($nv.MemUsed -ne $null -and $nv.MemTotal) {
      Add-Check 'Graphics' 'VRAM' 'INFO' ((Fmt $nv.MemUsed) + ' MB of ' + (Fmt $nv.MemTotal) + ' MB in use.')
    }
  } elseif ($Cfg.gpuVendor -eq 'NVIDIA') {
    Add-Check 'Graphics' 'Card sensors' 'SKIP' 'nvidia-smi not found; install the NVIDIA driver package for clock and power readings.'
  } else {
    Add-Check 'Graphics' 'Card sensors' 'SKIP' ('No command-line sensor source for ' + $Cfg.gpuVendor + '; use the vendor app for clocks and power limits.')
  }

  $hags = $null
  try { $hags = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name HwSchMode -ErrorAction Stop).HwSchMode } catch { $hags = $null }
  if ($hags -eq 2) {
    Add-Check 'Graphics' 'GPU scheduling' 'INFO' 'Hardware-accelerated scheduling is on.'
  } elseif ($hags -eq 1) {
    Add-Check 'Graphics' 'GPU scheduling' 'INFO' 'Hardware-accelerated scheduling is off.'
  } else {
    Add-Check 'Graphics' 'GPU scheduling' 'SKIP' 'Setting not present; Windows default applies.'
  }
}

Out-Section 'Motherboard'
if (-not $board) {
  Add-Check 'Board' 'Baseboard' 'SKIP' 'Windows did not return a baseboard.'
} else {
  $boardText = (([string]$board.Manufacturer) + ' ' + ([string]$board.Product) + ' ' + ([string]$board.Version)).Trim()
  Out-Note ($boardText)
  $otherFamilies = @(
    @{ Name = 'AM3'; Pattern = '\b(760G|770|780G|785G|790GX|880G|890GX|890FX|870|970|990X|990FX|A78|A88X|A68H)\b' },
    @{ Name = 'AM4'; Pattern = '\b(A320|B350|X370|B450|X470|A520|B550|X570|TRX40)\b' },
    @{ Name = 'AM5'; Pattern = '\b(A620|B650|X670|B840|B850|X870)\b' },
    @{ Name = 'LGA 1700/1851'; Pattern = '\b(Z690|B660|H610|Z790|B760|H770|Z890|B860|H810|W680|W790)\b' }
  )
  $matchedOther = $null
  foreach ($f in $otherFamilies) {
    if ($boardText -match $f.Pattern) {
      $isOwn = $false
      foreach ($c in $Cfg.chipsets) { if ($boardText -match ('\b' + [regex]::Escape($c) + '\b')) { $isOwn = $true } }
      if (-not $isOwn) { $matchedOther = $f.Name }
    }
  }
  $ownChip = $null
  foreach ($c in $Cfg.chipsets) { if ($boardText -match ('\b' + [regex]::Escape($c) + '\b')) { $ownChip = $c } }
  if ($ownChip) {
    Add-Check 'Board' 'Chipset family' 'PASS' ($ownChip + ' chipset, expected on ' + $Cfg.platform + '.') ($Cfg.chipsets -join ', ')
  } elseif ($matchedOther) {
    Add-Check 'Board' 'Chipset family' 'WARN' ('Board looks like ' + $matchedOther + ', not ' + $Cfg.platform + '. Wrong script for this machine?') ($Cfg.chipsets -join ', ')
  } else {
    Add-Check 'Board' 'Chipset family' 'SKIP' 'Chipset not recognised from the board name.'
  }

  if ($bios) {
    $biosDate = $bios.ReleaseDate
    if ($biosDate -is [string]) {
      try { $biosDate = [Management.ManagementDateTimeConverter]::ToDateTime($biosDate) } catch { $biosDate = $null }
    }
    if ($biosDate) {
      $biosAge = (New-TimeSpan -Start $biosDate -End (Get-Date)).Days
      $biosLine = 'BIOS ' + ([string]$bios.SMBIOSBIOSVersion).Trim() + ' dated ' + $biosDate.ToString('yyyy-MM-dd') + '.'
      if ($biosAge -gt 1095) {
        Add-Check 'Board' 'BIOS' 'INFO' ($biosLine + ' Over three years old; check for AGESA and memory fixes.')
      } else {
        Add-Check 'Board' 'BIOS' 'INFO' $biosLine
      }
    }
  }
}

Out-Section 'Power'
$gpuW = $Cfg.gpuW
if ($script:Nv -and $script:Nv.PowerDefault) { $gpuW = [math]::Round($script:Nv.PowerDefault) }
$peakW = $Cfg.cpuW + $gpuW + 60
$recW = [math]::Ceiling(($peakW * 1.35) / 50) * 50
if ($recW -lt $Cfg.psuRec) { $recW = $Cfg.psuRec }
Out-Note ('Estimated peak draw: ' + (Fmt $peakW) + ' W (' + $Cfg.cpuW + ' W CPU + ' + (Fmt $gpuW) + ' W GPU + 60 W board and drives).')
Out-Note ('That is about ' + (Fmt ([math]::Ceiling(($peakW * 1.2) / 12))) + ' A on the 12 V rail at peak, with 20% headroom.')
Add-Check 'Power' 'PSU' 'SKIP' ('Not readable in software. Check the label: model, wattage, 12 V amps. Target: ' + (Fmt $recW) + ' W, 80+ Bronze or better.') ((Fmt $recW) + ' W')

Out-Section 'Storage'
$disks = @(Get-PhysicalDisk | Where-Object { $_.BusType -ne 'USB' })
if ($disks.Count -eq 0) {
  Add-Check 'Storage' 'Drives' 'SKIP' 'Windows did not return physical disks.'
} else {
  foreach ($d in $disks) {
    Out-Note (([string]$d.FriendlyName).Trim() + '  |  ' + $d.BusType + ' ' + $d.MediaType + '  |  ' + (Fmt ($d.Size / 1GB)) + ' GB  |  ' + $d.HealthStatus)
  }
  $unhealthy = @($disks | Where-Object { $_.HealthStatus -ne 'Healthy' })
  if ($unhealthy.Count -gt 0) {
    Add-Check 'Storage' 'Drive health' 'FAIL' ($unhealthy.Count.ToString() + ' drive(s) not reporting Healthy.') 'Healthy'
  } else {
    Add-Check 'Storage' 'Drive health' 'PASS' ($disks.Count.ToString() + ' drive(s) Healthy.')
  }

  $root = [System.IO.Path]::GetPathRoot($env:TEMP)
  $letter = $root.Substring(0, 1)
  $vol = Get-Volume -DriveLetter $letter
  if ($vol -and $vol.Size -gt 0) {
    $freeGB = $vol.SizeRemaining / 1GB
    $freePct = ($vol.SizeRemaining / $vol.Size) * 100
    if ($freePct -lt 12 -or $freeGB -lt 15) {
      Add-Check 'Storage' 'Free space' 'WARN' ((Fmt $freeGB) + ' GB free on ' + $letter + ': (' + (Fmt $freePct) + '%).') '> 15% free'
    } else {
      Add-Check 'Storage' 'Free space' 'PASS' ((Fmt $freeGB) + ' GB free on ' + $letter + ': (' + (Fmt $freePct) + '%).') '> 15% free'
    }
  }

  $sysPart = Get-Partition -DriveLetter $letter
  $sysDisk = $null
  if ($sysPart) { $sysDisk = Get-PhysicalDisk -DeviceNumber $sysPart.DiskNumber }
  if ($sysDisk) {
    $bus = [string]$sysDisk.BusType
    $media = [string]$sysDisk.MediaType
    $expected = $Cfg.storageSata
    if ($bus -eq 'NVMe') { $expected = $Cfg.storageNvme }
    elseif ($media -eq 'HDD') { $expected = $Cfg.storageHdd }

    $tmp = Join-Path $env:TEMP ('hc-' + $Cfg.slug + '-' + [guid]::NewGuid().ToString('N') + '.bin')
    $result = $null
    try {
      $result = Measure-Drive $tmp 192
    } catch {
      $result = $null
    } finally {
      Remove-Item $tmp -Force
    }
    if ($result -and $result.Read) {
      $read = $result.Read
      $write = $result.Write
      $detail = ('Sequential ' + (Fmt $write) + ' MB/s write, ' + (Fmt $read) + ' MB/s read on ' + $letter + ': (' + $bus + ' ' + $media + ').')
      if ($read -ge ($expected * 0.55)) {
        Add-Check 'Storage' 'Throughput' 'PASS' $detail ('> ' + (Fmt ($expected * 0.55)) + ' MB/s')
      } elseif ($read -ge ($expected * 0.3)) {
        Add-Check 'Storage' 'Throughput' 'WARN' ($detail + ' Lower than this class normally reaches.') ('> ' + (Fmt ($expected * 0.55)) + ' MB/s')
      } else {
        Add-Check 'Storage' 'Throughput' 'FAIL' ($detail + ' Closer to the wrong drive class.') ('> ' + (Fmt ($expected * 0.55)) + ' MB/s')
      }
    } else {
      Add-Check 'Storage' 'Throughput' 'SKIP' 'Could not write a test file to the system drive.'
    }

    if ($bus -eq 'NVMe' -or $media -eq 'SSD') {
      $trim = (fsutil behavior query DisableDeleteNotify) -join ' '
      if ($trim -match 'NTFS DisableDeleteNotify = 0') {
        Add-Check 'Storage' 'TRIM' 'PASS' 'Enabled for NTFS.'
      } elseif ($trim -match 'NTFS DisableDeleteNotify = 1') {
        Add-Check 'Storage' 'TRIM' 'WARN' 'Disabled for NTFS; SSD write speed will fall over time.'
      } else {
        Add-Check 'Storage' 'TRIM' 'SKIP' 'State not readable.'
      }
    }
  }
}

Out-Section 'Thermals'
if ($script:IdleZones.Count -eq 0) {
  Add-Check 'Thermals' 'CPU idle' 'SKIP' $(if ($script:Admin) { 'No ACPI thermal zone exposed.' } else { 'No ACPI thermal zone; re-run as administrator.' }) 'under 50 C'
  Add-Check 'Thermals' 'CPU under load' 'SKIP' 'No thermal zone available.' 'under 85 C'
} else {
  $idleMax = ($script:IdleZones | Measure-Object -Property C -Maximum).Maximum
  if ($idleMax -lt 50) {
    Add-Check 'Thermals' 'CPU idle' 'PASS' ((Fmt $idleMax 1) + ' C (ACPI zone).') 'under 50 C'
  } elseif ($idleMax -lt 65) {
    Add-Check 'Thermals' 'CPU idle' 'WARN' ((Fmt $idleMax 1) + ' C (ACPI zone).') 'under 50 C'
  } else {
    Add-Check 'Thermals' 'CPU idle' 'FAIL' ((Fmt $idleMax 1) + ' C (ACPI zone).') 'under 50 C'
  }
  if ($script:LoadZones.Count -gt 0) {
    $loadMax = ($script:LoadZones | Measure-Object -Property C -Maximum).Maximum
    if ($loadMax -lt 85) {
      Add-Check 'Thermals' 'CPU under load' 'PASS' ((Fmt $loadMax 1) + ' C after the load test.') 'under 85 C'
    } elseif ($loadMax -lt 95) {
      Add-Check 'Thermals' 'CPU under load' 'WARN' ((Fmt $loadMax 1) + ' C after the load test.') 'under 85 C'
    } else {
      Add-Check 'Thermals' 'CPU under load' 'FAIL' ((Fmt $loadMax 1) + ' C after the load test.') 'under 85 C'
    }
  }
}
if ($script:Nv -and $script:Nv.TempC -ne $null) {
  $t = [double]$script:Nv.TempC
  if ($t -lt 50) {
    Add-Check 'Thermals' 'GPU idle' 'PASS' ((Fmt $t 1) + ' C (nvidia-smi).') 'under 45 C'
  } elseif ($t -lt 65) {
    Add-Check 'Thermals' 'GPU idle' 'WARN' ((Fmt $t 1) + ' C (nvidia-smi).') 'under 45 C'
  } else {
    Add-Check 'Thermals' 'GPU idle' 'FAIL' ((Fmt $t 1) + ' C (nvidia-smi).') 'under 45 C'
  }
} elseif ($Cfg.gpuVendor -eq 'NVIDIA') {
  Add-Check 'Thermals' 'GPU idle' 'SKIP' 'nvidia-smi not available.'
} else {
  Add-Check 'Thermals' 'GPU idle' 'SKIP' ('No sensor source for ' + $Cfg.gpuVendor + ' without the vendor app.')
}

Out-Section 'Summary'
$fails = @($script:Checks | Where-Object { $_.Status -eq 'FAIL' })
$warns = @($script:Checks | Where-Object { $_.Status -eq 'WARN' })
$passes = @($script:Checks | Where-Object { $_.Status -eq 'PASS' })
$skips = @($script:Checks | Where-Object { $_.Status -eq 'SKIP' })
Out-Line ('  ' + $passes.Count + ' passed, ' + $warns.Count + ' warnings, ' + $fails.Count + ' failed, ' + $skips.Count + ' skipped.')
$top = @($fails) + @($warns)
if ($top.Count -eq 0) {
  Out-Line '  Likely limiter: none found. Every software-side rate checked here is at or above the platform baseline.'
} else {
  Out-Line ('  Likely limiter: ' + $top[0].Area + ' - ' + $top[0].Name + '.')
  foreach ($item in ($top | Select-Object -First 3)) {
    Out-Line ('    - ' + $item.Area + ' / ' + $item.Name + ': ' + $item.Detail)
  }
}
if (-not $script:Admin) {
  Out-Note 'Re-run as administrator to read thermal zones. Temperatures and one or two sensor rows are skipped otherwise.'
}
Out-Note 'The script only reads. It changes no settings, clocks, or power limits.'

$desktop = [Environment]::GetFolderPath('Desktop')
if (-not $desktop) { $desktop = $env:USERPROFILE }
$reportPath = Join-Path $desktop ('pc-check-' + $Cfg.slug + '-' + (Get-Date -Format 'yyyyMMdd-HHmm') + '.txt')
$header = @(
  'Hardware baseline check',
  $Cfg.platformLong + ' / ' + $Cfg.gpuLabel,
  $machine + ' | ' + $os.Caption + ' build ' + $os.BuildNumber,
  'Run ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'),
  'Script: spencerboggs.github.io/pc-check',
  ''
)
$all = @($header) + @($script:Log)
Set-Content -Path $reportPath -Value $all -Encoding UTF8

Write-Host ''
Write-Host ('  Report: ' + $reportPath) -ForegroundColor Cyan
if (-not $env:HC_NO_OPEN) {
  Start-Process notepad.exe -ArgumentList ('"' + $reportPath + '"')
}
