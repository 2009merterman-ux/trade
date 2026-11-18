<#
  QuietPC - make a Windows PC quieter at night and quicker to open apps.

  Safety rules this script follows:
    * It NEVER deletes your programs or games.
    * The only thing it can delete is Windows temp junk, and only after you type Y.
    * Startup apps are only DISABLED (same as Task Manager > Startup), never removed,
      and every change can be undone from the menu.

  Run it with "Start QuietPC.bat" (double-click). Or from PowerShell:
      powershell -ExecutionPolicy Bypass -File .\QuietPC.ps1
  Non-interactive modes (used by the night/morning schedule):
      -Mode Night    switch to the quiet power plan
      -Mode Day      switch back to your normal power plan
#>
param(
    [ValidateSet('Menu', 'Night', 'Day')]
    [string]$Mode = 'Menu'
)

$ErrorActionPreference = 'Stop'

# ---------- constants ----------
$QuietPlanGuid  = '6c1b7e2a-4f1d-4e8b-9a3c-0b5e9d2f7a11'   # fixed id so we can always find our plan
$BalancedGuid   = '381b4222-f694-41f0-9685-ff5bb260df2e'
$StateDir       = Join-Path $env:LOCALAPPDATA 'QuietPC'
$StateFile      = Join-Path $StateDir 'state.json'
$InstalledCopy  = Join-Path $StateDir 'QuietPC.ps1'
$TaskNight      = 'QuietPC - Night mode'
$TaskDay        = 'QuietPC - Day mode'

# ---------- small helpers ----------
function Write-Title($text) {
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
}

function Ask-YesNo($question) {
    while ($true) {
        $a = (Read-Host "$question [Y/N]").Trim().ToUpper()
        if ($a -eq 'Y' -or $a -eq 'YES') { return $true }
        if ($a -eq 'N' -or $a -eq 'NO')  { return $false }
        Write-Host '  Please type Y or N.' -ForegroundColor Yellow
    }
}

function Pause-Menu { [void](Read-Host "`nPress Enter to go back to the menu") }

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Load-State {
    if (Test-Path $StateFile) {
        try { return Get-Content $StateFile -Raw | ConvertFrom-Json } catch { }
    }
    return [pscustomobject]@{ NormalPlan = $null; DisabledStartup = @() }
}

function Save-State($state) {
    if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }
    $state | ConvertTo-Json -Depth 5 | Set-Content -Path $StateFile -Encoding UTF8
}

function Get-ActivePlanGuid {
    $out = (powercfg /getactivescheme) -join ' '
    if ($out -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
        return $Matches[1].ToLower()
    }
    return $null
}

function Test-PlanExists($guid) {
    return ((powercfg /list) -join ' ') -match [regex]::Escape($guid)
}

function Format-Size($bytes) {
    if ($bytes -ge 1GB) { return '{0:N1} GB' -f ($bytes / 1GB) }
    if ($bytes -ge 1MB) { return '{0:N0} MB' -f ($bytes / 1MB) }
    return '{0:N0} KB' -f ($bytes / 1KB)
}

# ---------- 1. quiet power plan ----------
function Set-PowerValue($sub, $setting, $value) {
    # Some settings don't exist on every PC (e.g. boost mode on some laptops). Skip quietly if so.
    try { powercfg /setacvalueindex $QuietPlanGuid $sub $setting $value 2>$null | Out-Null } catch { }
    try { powercfg /setdcvalueindex $QuietPlanGuid $sub $setting $value 2>$null | Out-Null } catch { }
}

function Ensure-QuietPlan {
    if (-not (Test-PlanExists $QuietPlanGuid)) {
        # Copy Balanced; if it's missing, copy whatever is active right now.
        $source = $BalancedGuid
        if (-not (Test-PlanExists $BalancedGuid)) { $source = Get-ActivePlanGuid }
        powercfg /duplicatescheme $source $QuietPlanGuid | Out-Null
        powercfg /changename $QuietPlanGuid 'Quiet Night' 'QuietPC: CPU boost off, passive cooling, no wake timers' | Out-Null
    }
    # CPU max 80%  -> on almost all Intel/AMD chips this stops turbo boost, the #1 cause of fan spikes.
    Set-PowerValue SUB_PROCESSOR PROCTHROTTLEMAX 80
    # Turbo boost off (explicitly, where Windows exposes it).
    Set-PowerValue SUB_PROCESSOR PERFBOOSTMODE 0
    # Passive cooling: slow the CPU down before spinning fans up.
    Set-PowerValue SUB_PROCESSOR SYSCOOLPOL 0
    # Don't let scheduled jobs wake the PC up at 3am.
    Set-PowerValue SUB_SLEEP RTCWAKE 0
}

function Enable-NightMode([switch]$Quiet) {
    $state = Load-State
    $current = Get-ActivePlanGuid
    if ($current -and $current -ne $QuietPlanGuid) {
        $state.NormalPlan = $current      # remember the plan to go back to in the morning
        Save-State $state
    }
    Ensure-QuietPlan
    powercfg /setactive $QuietPlanGuid | Out-Null
    if (-not $Quiet) {
        Write-Host "`n  Night mode is ON." -ForegroundColor Green
        Write-Host '  CPU turbo is off and cooling is set to passive, so the fans should calm down.'
        Write-Host '  Everything still works - games will just run a bit slower until Day mode.'
    }
}

function Enable-DayMode([switch]$Quiet) {
    $state = Load-State
    $target = $state.NormalPlan
    if (-not $target -or -not (Test-PlanExists $target)) { $target = $BalancedGuid }
    powercfg /setactive $target | Out-Null
    if (-not $Quiet) {
        Write-Host "`n  Day / gaming mode is ON - full performance is back." -ForegroundColor Green
    }
}

# ---------- 2. automatic schedule ----------
function Install-Schedule {
    Write-Title 'Automatic night schedule'
    $night = Read-Host 'What time should Night mode start? (24h, e.g. 23:00)'
    $day   = Read-Host 'What time should Day mode come back? (24h, e.g. 08:00)'
    try { $nightT = [datetime]::ParseExact($night.Trim(), 'H:mm', $null) } catch { Write-Host '  That time did not look right.' -ForegroundColor Red; return }
    try { $dayT   = [datetime]::ParseExact($day.Trim(),   'H:mm', $null) } catch { Write-Host '  That time did not look right.' -ForegroundColor Red; return }

    # Copy the script somewhere stable so the schedule keeps working if you move the download.
    if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }
    if ($PSCommandPath -and ($PSCommandPath -ne $InstalledCopy)) { Copy-Item $PSCommandPath $InstalledCopy -Force }

    $user = "$env:USERDOMAIN\$env:USERNAME"
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
    $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $argsFor = { param($m) "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$InstalledCopy`" -Mode $m" }

    $a1 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument (& $argsFor 'Night')
    $a2 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument (& $argsFor 'Day')
    $t1 = New-ScheduledTaskTrigger -Daily -At $nightT
    $t2 = New-ScheduledTaskTrigger -Daily -At $dayT

    Register-ScheduledTask -TaskName $TaskNight -Action $a1 -Trigger $t1 -Principal $principal -Settings $settings -Force | Out-Null
    Register-ScheduledTask -TaskName $TaskDay   -Action $a2 -Trigger $t2 -Principal $principal -Settings $settings -Force | Out-Null

    Write-Host ("`n  Done. Night mode every day at {0:HH:mm}, Day mode at {1:HH:mm}." -f $nightT, $dayT) -ForegroundColor Green
    Write-Host '  (If the PC is off at that time, it switches the next time it can.)'
}

function Remove-Schedule {
    foreach ($t in @($TaskNight, $TaskDay)) {
        if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $t -Confirm:$false
        }
    }
    Write-Host '  Schedule removed.' -ForegroundColor Green
}

# ---------- 3. startup apps (disable only, never delete) ----------
$EnabledBytes  = [byte[]](2,0,0,0,0,0,0,0,0,0,0,0)
$DisabledBytes = [byte[]](3,0,0,0,0,0,0,0,0,0,0,0)

function Get-StartupItems {
    $items = @()
    $sources = @(
        @{ Run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run';             Approved = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' },
        @{ Run = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run';             Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' },
        @{ Run = 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'; Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32' }
    )
    foreach ($s in $sources) {
        if (-not (Test-Path $s.Run)) { continue }
        $props = Get-ItemProperty -Path $s.Run
        foreach ($p in $props.PSObject.Properties) {
            if (@('PSPath','PSParentPath','PSChildName','PSDrive','PSProvider') -contains $p.Name) { continue }
            $items += [pscustomobject]@{ Name = $p.Name; Command = [string]$p.Value; Approved = $s.Approved; Key = $p.Name }
        }
    }
    $folders = @(
        @{ Path = [Environment]::GetFolderPath('Startup');       Approved = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder' },
        @{ Path = [Environment]::GetFolderPath('CommonStartup'); Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder' }
    )
    foreach ($f in $folders) {
        if (-not (Test-Path $f.Path)) { continue }
        foreach ($file in Get-ChildItem -Path $f.Path -File | Where-Object { $_.Name -ne 'desktop.ini' }) {
            $items += [pscustomobject]@{ Name = $file.BaseName; Command = $file.FullName; Approved = $f.Approved; Key = $file.Name }
        }
    }
    foreach ($i in $items) {
        $enabled = $true
        try {
            $v = (Get-ItemProperty -Path $i.Approved -Name $i.Key -ErrorAction Stop).($i.Key)
            if ($v -and $v.Length -gt 0 -and ($v[0] % 2) -eq 1) { $enabled = $false }   # odd first byte = disabled
        } catch { }
        $i | Add-Member -NotePropertyName Enabled -NotePropertyValue $enabled
    }
    return $items
}

function Set-StartupApproved($item, [byte[]]$bytes) {
    if (-not (Test-Path $item.Approved)) { New-Item -Path $item.Approved -Force | Out-Null }
    New-ItemProperty -Path $item.Approved -Name $item.Key -Value $bytes -PropertyType Binary -Force | Out-Null
}

function Manage-Startup {
    Write-Title 'Startup apps (makes boot and app opening faster)'
    Write-Host '  Programs that auto-start eat RAM and CPU in the background, so everything'
    Write-Host '  else opens slower. I will ask about each one. Saying Y only stops it'
    Write-Host '  auto-starting - the program and your games stay installed and still work.'
    Write-Host '  Tip: say N for drivers/audio/antivirus (Realtek, NVIDIA, AMD, Windows Security).'
    Write-Host ''

    $items = @(Get-StartupItems | Where-Object { $_.Enabled })
    if ($items.Count -eq 0) { Write-Host '  Nothing is auto-starting. Nice and clean.' -ForegroundColor Green; return }

    $state = Load-State
    $list = @($state.DisabledStartup | Where-Object { $_ })
    $changed = 0
    foreach ($i in $items) {
        Write-Host ("  > {0}" -f $i.Name) -ForegroundColor White
        Write-Host ("    {0}" -f $i.Command) -ForegroundColor DarkGray
        if (Ask-YesNo '    Stop this from starting with Windows?') {
            try {
                Set-StartupApproved $i $DisabledBytes
                $list += [pscustomobject]@{ Approved = $i.Approved; Key = $i.Key; Name = $i.Name }
                $changed++
                Write-Host '    Disabled.' -ForegroundColor Green
            } catch {
                Write-Host '    Could not change this one (needs admin). Skipped.' -ForegroundColor Yellow
            }
        }
    }
    $state.DisabledStartup = $list
    Save-State $state
    Write-Host "`n  $changed startup app(s) disabled. Takes effect next restart." -ForegroundColor Green
}

function Restore-Startup {
    $state = Load-State
    $list = @($state.DisabledStartup | Where-Object { $_ })
    if ($list.Count -eq 0) { Write-Host '  Nothing to restore.'; return }
    foreach ($i in $list) {
        try { Set-StartupApproved $i $EnabledBytes; Write-Host "  Re-enabled: $($i.Name)" -ForegroundColor Green }
        catch { Write-Host "  Could not re-enable: $($i.Name)" -ForegroundColor Yellow }
    }
    $state.DisabledStartup = @()
    Save-State $state
}

# ---------- 4. temp junk cleanup (asks first) ----------
function Clean-Temp {
    Write-Title 'Clean temporary junk files'
    Write-Host '  This ONLY looks in Windows temp folders. Games, saves, documents,'
    Write-Host '  downloads and programs are never touched. Files used in the last'
    Write-Host '  2 days are skipped so nothing that is running breaks.'
    $folders = @($env:TEMP, (Join-Path $env:WINDIR 'Temp')) | Select-Object -Unique | Where-Object { Test-Path $_ }
    $cutoff = (Get-Date).AddDays(-2)
    $files = @()
    foreach ($f in $folders) {
        $files += Get-ChildItem -Path $f -Recurse -File -Force -ErrorAction SilentlyContinue |
                  Where-Object { $_.LastWriteTime -lt $cutoff }
    }
    $total = ($files | Measure-Object -Property Length -Sum).Sum
    if (-not $total) { $total = 0 }
    Write-Host ("`n  Found {0} temp files, {1} in total." -f $files.Count, (Format-Size $total))
    foreach ($f in $folders) { Write-Host "    in $f" -ForegroundColor DarkGray }
    if ($files.Count -eq 0) { return }
    if (-not (Ask-YesNo '  Delete these temp files?')) { Write-Host '  OK, nothing deleted.'; return }
    $freed = 0
    foreach ($file in $files) {
        try { $len = $file.Length; Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop; $freed += $len } catch { }
    }
    Write-Host ("  Freed {0}. (Files in use were left alone.)" -f (Format-Size $freed)) -ForegroundColor Green
}

# ---------- 5. what is making noise right now ----------
function Show-Status {
    Write-Title 'What is your PC doing right now?'
    $active = Get-ActivePlanGuid
    $planName = 'unknown'
    $line = (powercfg /list) | Where-Object { $_ -match [regex]::Escape($active) }
    if ($line -match '\((.+)\)') { $planName = $Matches[1] }
    Write-Host "  Power plan: $planName"
    if ($active -eq $QuietPlanGuid) { Write-Host '  -> Night mode is ON' -ForegroundColor Green }

    Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
        $pct = if ($_.Size) { [math]::Round(100 * $_.FreeSpace / $_.Size) } else { 0 }
        $color = if ($pct -lt 10) { 'Red' } elseif ($pct -lt 20) { 'Yellow' } else { 'Gray' }
        Write-Host ("  Drive {0}  {1} free of {2} ({3}%)" -f $_.DeviceID, (Format-Size $_.FreeSpace), (Format-Size $_.Size), $pct) -ForegroundColor $color
    }
    $os = Get-CimInstance Win32_OperatingSystem
    $usedPct = [math]::Round(100 * (1 - $os.FreePhysicalMemory / $os.TotalVisibleMemorySize))
    Write-Host "  RAM in use: $usedPct%"

    Write-Host "`n  Measuring CPU use for 3 seconds (busy CPU = loud fans)..."
    $before = @{}
    Get-Process | ForEach-Object { try { $before[$_.Id] = $_.TotalProcessorTime.TotalMilliseconds } catch { } }
    Start-Sleep -Seconds 3
    $cores = [Environment]::ProcessorCount
    $rows = foreach ($p in Get-Process) {
        try {
            if ($before.ContainsKey($p.Id)) {
                $delta = $p.TotalProcessorTime.TotalMilliseconds - $before[$p.Id]
                [pscustomobject]@{ Name = $p.ProcessName; CPU = [math]::Round($delta / (3000 * $cores) * 100, 1); RAM = $p.WorkingSet64 }
            }
        } catch { }
    }
    Write-Host '  Top CPU users:'
    $rows | Where-Object { $_.Name -ne 'Idle' } | Sort-Object CPU -Descending | Select-Object -First 8 | ForEach-Object {
        Write-Host ("    {0,-28} {1,5}% CPU   {2,8} RAM" -f $_.Name, $_.CPU, (Format-Size $_.RAM))
    }
    Write-Host "`n  If something you don't recognise is near the top while you're idle, that's"
    Write-Host '  likely what keeps the fans going. Look it up before ending it.'
}

function Show-Tips {
    Write-Title 'Extra quiet tips (things a script cannot do for you)'
    @(
        '1. Dust! Clogged fans and heatsinks are the #1 cause of a loud PC.',
        '   Turn it off and blow out the fans with compressed air (hold the fan still).',
        '2. Graphics card noise: cap your FPS. In NVIDIA Control Panel / AMD Adrenalin set',
        '   "Max Frame Rate" to your monitor refresh rate (e.g. 60 or 144). Huge difference.',
        '3. Fan curves: the free app "FanControl" (by Rem0o) or your BIOS fan settings',
        '   let you make fans spin slower at low temperatures.',
        '4. If you have a hard drive (HDD) for Windows, moving to an SSD is the single',
        '   biggest speed-up for opening apps - and SSDs are silent.',
        '5. Leave the PC on Sleep instead of On overnight if you are not downloading.'
    ) | ForEach-Object { Write-Host "  $_" }
}

function Undo-Everything {
    Write-Title 'Undo everything QuietPC changed'
    if (-not (Ask-YesNo '  Put everything back the way it was?')) { return }
    Enable-DayMode -Quiet
    Remove-Schedule
    Restore-Startup
    if (Test-PlanExists $QuietPlanGuid) { powercfg /delete $QuietPlanGuid | Out-Null; Write-Host '  Quiet Night plan removed.' -ForegroundColor Green }
    Write-Host '  All done - your PC is back to how it was.' -ForegroundColor Green
}

# ---------- entry points ----------
if ($Mode -eq 'Night') { Enable-NightMode -Quiet; exit 0 }
if ($Mode -eq 'Day')   { Enable-DayMode   -Quiet; exit 0 }

if (-not (Test-Admin)) {
    Write-Host 'Tip: run "Start QuietPC.bat" so it opens as administrator - some options need it.' -ForegroundColor Yellow
}

while ($true) {
    Write-Title 'QuietPC - quieter nights, faster apps'
    Write-Host '  1) Night mode now        (quiet fans, lower CPU boost)'
    Write-Host '  2) Day / gaming mode now (full power back)'
    Write-Host '  3) Auto schedule         (night mode every night, day mode every morning)'
    Write-Host '  4) Startup apps          (faster boot + app opening, asks about each one)'
    Write-Host '  5) Clean temp junk       (asks before deleting, never touches games)'
    Write-Host '  6) What is making noise  (shows CPU hogs, disk space, RAM)'
    Write-Host '  7) Extra quiet tips'
    Write-Host '  8) Undo everything'
    Write-Host '  0) Exit'
    $choice = (Read-Host "`nPick a number").Trim()
    try {
        switch ($choice) {
            '1' { Enable-NightMode; Pause-Menu }
            '2' { Enable-DayMode; Pause-Menu }
            '3' {
                Write-Host ''
                if (Ask-YesNo 'Set up the automatic schedule? (N = remove an existing one)') { Install-Schedule } else { Remove-Schedule }
                Pause-Menu
            }
            '4' { Manage-Startup; Pause-Menu }
            '5' { Clean-Temp; Pause-Menu }
            '6' { Show-Status; Pause-Menu }
            '7' { Show-Tips; Pause-Menu }
            '8' { Undo-Everything; Pause-Menu }
            '0' { break }
            default { Write-Host '  Pick a number from the list.' -ForegroundColor Yellow }
        }
    } catch {
        Write-Host "  Something went wrong: $($_.Exception.Message)" -ForegroundColor Red
        Pause-Menu
    }
    if ($choice -eq '0') { break }
}
