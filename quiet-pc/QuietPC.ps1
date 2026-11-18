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

# ---------- 9. background checkup (find hidden stuff using your PC) ----------

# Known background stuff that usually isn't needed all the time. Pattern -> plain-English note.
$KnownBloat = [ordered]@{
    'OneDrive'                                   = 'OneDrive cloud sync. Fine if you use it, otherwise wasted RAM/disk.'
    'Teams|ms-teams'                             = 'Microsoft Teams. Starts with Windows even if you never use it.'
    'Spotify'                                    = 'Spotify auto-start. You can just open it when you want music.'
    'Discord'                                    = 'Discord auto-start. Open it when you need it.'
    'EpicGamesLauncher|EpicWebHelper'            = 'Epic Games launcher. Games still work if you open Epic yourself.'
    'Overwolf'                                   = 'Overwolf overlay. Heavy, and often installed by accident with game addons.'
    'CCleaner'                                   = 'CCleaner background monitor. Not needed.'
    'GoogleUpdate|GoogleUpdater'                 = 'Google updater. Chrome updates itself when you open it anyway.'
    'MicrosoftEdgeUpdate'                        = 'Edge updater. Edge updates itself when you open it.'
    'Adobe(ARM|GCInvoker|Updater|Update)|AGSService|AdobeCollabSync|CCXProcess' = 'Adobe background updaters/helpers. Not needed until you open Adobe apps.'
    'Opera.*(Assistant|Autoupdate)|opera_autoupdate' = 'Opera browser background helper.'
    'BraveUpdate'                                = 'Brave updater.'
    'uTorrent|BitTorrent'                        = 'Torrent client. Uploads in the background and uses network/disk - close it when not downloading.'
    'Skype'                                      = 'Skype auto-start.'
    'Dropbox'                                    = 'Dropbox sync. Fine if you use it.'
    'iTunesHelper|AppleMobileDevice'             = 'Apple/iTunes helper. Only needed when plugging in an iPhone.'
    'jusched|JavaUpdate'                         = 'Java updater. Not needed.'
    'Battle\.net'                                = 'Battle.net launcher auto-start.'
    'EADesktop|EABackgroundService|Origin'       = 'EA app launcher/background service.'
    'UbisoftConnect|upc\.exe|UplayWebCore'       = 'Ubisoft Connect launcher.'
    'Wallpaper(Engine|32|64)'                    = 'Wallpaper Engine. Animated wallpapers use GPU (and fan noise).'
    'McAfee|Norton|Avast|\bAVG\b|Avira|TotalAV'      = 'Third-party antivirus. Often very heavy; Windows Defender is built in and enough for most people. (Uninstall from Settings if you want - not done here.)'
    'Razer|Synapse|iCUE|Corsair|LGHUB|LogiOptions|SteelSeries|ArmouryCrate' = 'Mouse/keyboard/RGB software. Only stop it if you do not need RGB or macros.'
}

# Never offer to touch these - games, anti-cheat, drivers, audio and security need them.
$ProtectedPattern = 'nvidia|nvcontainer|\bamd|radeon|realtek|intel|easyanticheat|battleye|vanguard|vgc|vgk|faceit|defender|securityhealth|msmpeng|audio|wacom|steam client service|QuietPC'

function Get-ExePath([string]$cmd) {
    if (-not $cmd) { return $null }
    $cmd = [Environment]::ExpandEnvironmentVariables($cmd.Trim())
    if ($cmd -match '^"([^"]+)"') { return $Matches[1] }
    if ($cmd -match '^(.+?\.(exe|com|bat|cmd|lnk))\b') { return $Matches[1] }
    return ($cmd -split ' ')[0]
}

function Get-Company([string]$cmd) {
    $path = Get-ExePath $cmd
    try { if ($path -and (Test-Path -LiteralPath $path)) { return (Get-Item -LiteralPath $path).VersionInfo.CompanyName } } catch { }
    return ''
}

function Get-BloatNote([string]$text) {
    foreach ($k in $KnownBloat.Keys) { if ($text -match $k) { return $KnownBloat[$k] } }
    return $null
}

function Ensure-StateProp($state, $name, $default) {
    if (-not ($state.PSObject.Properties.Name -contains $name)) {
        $state | Add-Member -NotePropertyName $name -NotePropertyValue $default
    }
}

function Write-Item($name, $detail, $note) {
    if ($note) { Write-Host ("  [!] {0}" -f $name) -ForegroundColor Yellow }
    else       { Write-Host ("  [?] {0}" -f $name) -ForegroundColor White }
    if ($detail) { Write-Host ("      {0}" -f $detail) -ForegroundColor DarkGray }
    if ($note)   { Write-Host ("      -> {0}" -f $note) -ForegroundColor Yellow }
}

function Run-Checkup {
    $report = Join-Path ([Environment]::GetFolderPath('Desktop')) 'QuietPC-report.txt'
    try { Start-Transcript -Path $report -Force | Out-Null } catch { $report = $null }

    Write-Title 'Background checkup - what runs without you asking'
    Write-Host '  [!] = known stuff that usually is not needed all the time'
    Write-Host '  [?] = not from Microsoft; probably fine, but check you know what it is'
    Write-Host '  Nothing is changed during the scan.'

    # Startup apps
    Write-Host "`n  --- Starts with Windows ---" -ForegroundColor Cyan
    $startup = @(Get-StartupItems | Where-Object { $_.Enabled })
    if ($startup.Count -eq 0) { Write-Host '  (nothing)' }
    foreach ($i in $startup) { Write-Item $i.Name ("{0}  [{1}]" -f $i.Command, (Get-Company $i.Command)) (Get-BloatNote "$($i.Name) $($i.Command)") }

    # Scheduled tasks
    Write-Host "`n  --- Scheduled tasks (run on a timer in the background) ---" -ForegroundColor Cyan
    $tasks = @()
    foreach ($t in Get-ScheduledTask -ErrorAction SilentlyContinue) {
        if ($t.State -eq 'Disabled' -or $t.TaskPath -like '\Microsoft\*' -or $t.TaskName -like 'QuietPC*') { continue }
        $exe = ''
        if ($t.Actions -and $t.Actions[0].PSObject.Properties.Name -contains 'Execute') { $exe = [string]$t.Actions[0].Execute }
        $note = Get-BloatNote "$($t.TaskName) $exe"
        $tasks += [pscustomobject]@{ Task = $t; Exe = $exe; Note = $note }
        Write-Item ($t.TaskPath + $t.TaskName) ("{0}  [{1}]" -f $exe, (Get-Company $exe)) $note
    }
    if ($tasks.Count -eq 0) { Write-Host '  (nothing extra)' }

    # Services
    Write-Host "`n  --- Background services set to start automatically (not Microsoft) ---" -ForegroundColor Cyan
    $services = @()
    foreach ($s in Get-CimInstance Win32_Service -Filter "StartMode='Auto'" -ErrorAction SilentlyContinue) {
        $company = Get-Company $s.PathName
        if ($company -match 'Microsoft' -or $s.PathName -match '\\svchost\.exe') { continue }
        $note = Get-BloatNote "$($s.Name) $($s.DisplayName) $($s.PathName)"
        $services += [pscustomobject]@{ Service = $s; Note = $note; Company = $company }
        Write-Item ("{0} ({1}) - {2}" -f $s.DisplayName, $s.Name, $s.State) ("{0}  [{1}]" -f $s.PathName, $company) $note
    }
    if ($services.Count -eq 0) { Write-Host '  (nothing extra)' }

    # Running background processes using a lot of RAM
    Write-Host "`n  --- Background programs using the most memory right now ---" -ForegroundColor Cyan
    Get-Process | Where-Object { $_.MainWindowHandle -eq 0 -and $_.WorkingSet64 -gt 100MB } |
        Sort-Object WorkingSet64 -Descending | Select-Object -First 12 | ForEach-Object {
            $company = ''
            try { $company = $_.Company } catch { }
            $note = Get-BloatNote "$($_.ProcessName) $($_.Path)"
            Write-Item ("{0}  {1}" -f $_.ProcessName, (Format-Size $_.WorkingSet64)) $company $note
        }

    # Xbox Game Bar background recording - records your games all the time, costs GPU = noise
    Write-Host "`n  --- Windows settings ---" -ForegroundColor Cyan
    $dvrKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
    $dvrOn = $false
    try { $dvrOn = ((Get-ItemProperty -Path $dvrKey -Name AppCaptureEnabled -ErrorAction Stop).AppCaptureEnabled -eq 1) } catch { }
    if ($dvrOn) { Write-Item 'Xbox Game Bar background recording is ON' '' 'Quietly records gameplay all the time. Costs GPU power (more heat/noise) and FPS.' }
    else        { Write-Host '  Xbox background recording: off (good)' }

    if ($report) {
        try { Stop-Transcript | Out-Null } catch { }
        Write-Host "`n  Report saved to your Desktop: QuietPC-report.txt" -ForegroundColor Green
        Write-Host '  Send it to Claude and it will tell you what each [?] item is.' -ForegroundColor Green
    }

    # ---- offer fixes, one at a time ----
    $flaggedTasks = @($tasks | Where-Object { $_.Note -and ("$($_.Task.TaskName) $($_.Exe)" -notmatch $ProtectedPattern) })
    $flaggedSvcs  = @($services | Where-Object { $_.Note -and ("$($_.Service.Name) $($_.Service.DisplayName) $($_.Service.PathName)" -notmatch $ProtectedPattern) -and ($_.Note -notmatch 'antivirus') })
    $flaggedStart = @($startup | Where-Object { Get-BloatNote "$($_.Name) $($_.Command)" })
    if (($flaggedTasks.Count + $flaggedSvcs.Count + $flaggedStart.Count) -eq 0 -and -not $dvrOn) {
        Write-Host "`n  Nothing obvious to switch off. Your PC is pretty clean." -ForegroundColor Green
        return
    }
    Write-Host ''
    if (-not (Ask-YesNo 'Want to go through the [!] items and choose what to switch off? (all reversible with option 8)')) { return }

    $state = Load-State
    Ensure-StateProp $state 'DisabledStartup' @()
    Ensure-StateProp $state 'DisabledTasks' @()
    Ensure-StateProp $state 'ChangedServices' @()
    Ensure-StateProp $state 'GameDvrWasOn' $false
    $dTasks = @($state.DisabledTasks | Where-Object { $_ })
    $dSvcs  = @($state.ChangedServices | Where-Object { $_ })
    $dStart = @($state.DisabledStartup | Where-Object { $_ })

    foreach ($i in $flaggedStart) {
        Write-Host "`n  Startup app: $($i.Name)" -ForegroundColor White
        Write-Host "  $(Get-BloatNote "$($i.Name) $($i.Command)")" -ForegroundColor DarkGray
        if (Ask-YesNo '  Stop it starting with Windows?') {
            try { Set-StartupApproved $i $DisabledBytes; $dStart += [pscustomobject]@{ Approved = $i.Approved; Key = $i.Key; Name = $i.Name }; Write-Host '  Done.' -ForegroundColor Green }
            catch { Write-Host '  Could not change it (needs admin). Skipped.' -ForegroundColor Yellow }
        }
    }
    foreach ($t in $flaggedTasks) {
        Write-Host "`n  Scheduled task: $($t.Task.TaskName)" -ForegroundColor White
        Write-Host "  $($t.Note)" -ForegroundColor DarkGray
        if (Ask-YesNo '  Switch this task off?') {
            try {
                Disable-ScheduledTask -TaskPath $t.Task.TaskPath -TaskName $t.Task.TaskName | Out-Null
                $dTasks += [pscustomobject]@{ TaskPath = $t.Task.TaskPath; TaskName = $t.Task.TaskName }
                Write-Host '  Done.' -ForegroundColor Green
            } catch { Write-Host '  Could not change it (needs admin). Skipped.' -ForegroundColor Yellow }
        }
    }
    foreach ($s in $flaggedSvcs) {
        Write-Host "`n  Service: $($s.Service.DisplayName)" -ForegroundColor White
        Write-Host "  $($s.Note)" -ForegroundColor DarkGray
        Write-Host '  (Switching to "Manual" means it only starts when the app actually needs it.)' -ForegroundColor DarkGray
        if (Ask-YesNo '  Set this service to Manual?') {
            try {
                Set-Service -Name $s.Service.Name -StartupType Manual
                $dSvcs += [pscustomobject]@{ Name = $s.Service.Name; Display = $s.Service.DisplayName }
                Write-Host '  Done (takes effect after restart).' -ForegroundColor Green
            } catch { Write-Host '  Could not change it (needs admin or it is protected). Skipped.' -ForegroundColor Yellow }
        }
    }
    if ($dvrOn) {
        Write-Host "`n  Xbox Game Bar background recording" -ForegroundColor White
        Write-Host '  You can still record clips by hand with Win+Alt+R.' -ForegroundColor DarkGray
        if (Ask-YesNo '  Turn background recording off?') {
            Set-ItemProperty -Path $dvrKey -Name AppCaptureEnabled -Value 0 -Type DWord
            $state.GameDvrWasOn = $true
            Write-Host '  Done.' -ForegroundColor Green
        }
    }
    $state.DisabledStartup = $dStart
    $state.DisabledTasks = $dTasks
    $state.ChangedServices = $dSvcs
    Save-State $state
    Write-Host "`n  All set. Restart the PC to feel the difference." -ForegroundColor Green
}

function Restore-Checkup {
    $state = Load-State
    foreach ($t in @($state.DisabledTasks | Where-Object { $_ })) {
        try { Enable-ScheduledTask -TaskPath $t.TaskPath -TaskName $t.TaskName | Out-Null; Write-Host "  Re-enabled task: $($t.TaskName)" -ForegroundColor Green }
        catch { Write-Host "  Could not re-enable task: $($t.TaskName)" -ForegroundColor Yellow }
    }
    foreach ($s in @($state.ChangedServices | Where-Object { $_ })) {
        try { Set-Service -Name $s.Name -StartupType Automatic; Write-Host "  Service back to Automatic: $($s.Display)" -ForegroundColor Green }
        catch { Write-Host "  Could not restore service: $($s.Display)" -ForegroundColor Yellow }
    }
    if ($state.PSObject.Properties.Name -contains 'GameDvrWasOn' -and $state.GameDvrWasOn) {
        try { Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name AppCaptureEnabled -Value 1 -Type DWord; Write-Host '  Xbox background recording back on.' -ForegroundColor Green } catch { }
    }
    Ensure-StateProp $state 'DisabledTasks' @()
    Ensure-StateProp $state 'ChangedServices' @()
    Ensure-StateProp $state 'GameDvrWasOn' $false
    $state.DisabledTasks = @(); $state.ChangedServices = @(); $state.GameDvrWasOn = $false
    Save-State $state
}

function Undo-Everything {
    Write-Title 'Undo everything QuietPC changed'
    if (-not (Ask-YesNo '  Put everything back the way it was?')) { return }
    Enable-DayMode -Quiet
    Remove-Schedule
    Restore-Startup
    Restore-Checkup
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
    Write-Host '  9) Background checkup    (finds hidden stuff using your PC, makes a report)'
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
            '9' { Run-Checkup; Pause-Menu }
            '0' { break }
            default { Write-Host '  Pick a number from the list.' -ForegroundColor Yellow }
        }
    } catch {
        Write-Host "  Something went wrong: $($_.Exception.Message)" -ForegroundColor Red
        Pause-Menu
    }
    if ($choice -eq '0') { break }
}
