
# Voice Pack Merger for Mewgenics
# Scans subdirectories for description.json and adds them to a unified catgen.gon.patch

$patchFile = "catgen.gon.patch"
$content = "voice_sets {`n"
$found = $false

Get-ChildItem -Directory | ForEach-Object {
    $descPath = Join-Path $_.FullName "description.json"
    if (Test-Path $descPath) {
        try {
            $json = Get-Content $descPath -Raw | ConvertFrom-Json
            if ($json.title) {
                $title = $json.title
                Write-Host "Found voice pack: $title"
                $content += "    $title 1`n"
                $found = $true
            }
        } catch {
            Write-Warning "Failed to parse $descPath"
        }
    }
}

$content += "}"

if ($found) {
    Set-Content -Path $patchFile -Value $content
    Write-Host "Successfully created $patchFile"
} else {
    Write-Warning "No voice packs found. Make sure each pack has a description.json file."
}

Pause
