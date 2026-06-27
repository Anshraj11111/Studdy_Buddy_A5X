# PowerShell script to update all pages with theme variables

$pagesPath = "c:\Users\lenvo\OneDrive\Desktop\All Project\Studdy_Buddy_A5x\frontend\src\pages"
$files = Get-ChildItem -Path $pagesPath -Filter "*.jsx" -Recurse

$replacements = @(
    # Background colors
    @{ Old = 'background:\s*[''"]rgba\(10,8,30,0\.75\)[''"]'; New = 'background: "var(--bg-tertiary)"' },
    @{ Old = 'background:\s*[''"]rgba\(10,8,30,0\.8\)[''"]'; New = 'background: "var(--bg-tertiary)"' },
    @{ Old = 'background:\s*[''"]rgba\(10,8,30,0\.9\)[''"]'; New = 'background: "var(--bg-card)"' },
    @{ Old = 'background:\s*[''"]rgba\(10,8,30,0\.95\)[''"]'; New = 'background: "var(--bg-card)"' },
    @{ Old = 'background:\s*[''"]rgba\(10,8,30,0\.97\)[''"]'; New = 'background: "var(--bg-card)"' },
    @{ Old = 'background:\s*[''"]rgba\(5,3,20,0\.75\)[''"]'; New = 'background: "var(--bg-overlay)"' },
    @{ Old = 'background:\s*[''"]rgba\(5,3,20,0\.82\)[''"]'; New = 'background: "var(--bg-overlay)"' },
    @{ Old = 'background:\s*[''"]rgba\(5,3,20,0\.88\)[''"]'; New = 'background: "var(--bg-overlay)"' },
    @{ Old = 'background:\s*[''"]rgba\(5,3,20,0\.92\)[''"]'; New = 'background: "var(--bg-overlay)"' },
    @{ Old = 'backgroundColor:\s*[''"]#05030f[''"]'; New = 'backgroundColor: "var(--bg-primary)"' },
    
    # Text colors
    @{ Old = 'color:\s*[''"]#ffffff[''"]'; New = 'color: "var(--text-primary)"' },
    @{ Old = 'color:\s*[''"]#e2e8f0[''"]'; New = 'color: "var(--text-primary)"' },
    @{ Old = 'color:\s*[''"]white[''"]'; New = 'color: "var(--text-primary)"' },
    @{ Old = 'color:\s*[''"]rgba\(148,163,184,0\.7\)[''"]'; New = 'color: "var(--text-secondary)"' },
    @{ Old = 'color:\s*[''"]rgba\(148,163,184,0\.6\)[''"]'; New = 'color: "var(--text-secondary)"' },
    @{ Old = 'color:\s*[''"]rgba\(148,163,184,0\.5\)[''"]'; New = 'color: "var(--text-tertiary)"' },
    @{ Old = 'color:\s*[''"]rgba\(148,163,184,0\.4\)[''"]'; New = 'color: "var(--text-muted)"' },
    
    # Border colors
    @{ Old = 'border:\s*[''"]1px solid rgba\(99,102,241,0\.15\)[''"]'; New = 'border: "1px solid var(--border-secondary)"' },
    @{ Old = 'border:\s*[''"]1px solid rgba\(99,102,241,0\.2\)[''"]'; New = 'border: "1px solid var(--border-primary)"' },
    @{ Old = 'border:\s*[''"]1px solid rgba\(99,102,241,0\.25\)[''"]'; New = 'border: "1px solid var(--border-primary)"' },
    @{ Old = 'borderBottom:\s*[''"]1px solid rgba\(99,102,241,0\.15\)[''"]'; New = 'borderBottom: "1px solid var(--border-secondary)"' },
    @{ Old = 'borderBottom:\s*[''"]1px solid rgba\(99,102,241,0\.2\)[''"]'; New = 'borderBottom: "1px solid var(--border-primary)"' },
    @{ Old = 'borderColor:\s*[''"]rgba\(99,102,241,0\.2\)[''"]'; New = 'borderColor: "var(--border-primary)"' }
)

$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($replacement in $replacements) {
        $matches = [regex]::Matches($content, $replacement.Old)
        if ($matches.Count -gt 0) {
            $content = $content -replace $replacement.Old, $replacement.New
            $fileReplacements += $matches.Count
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalReplacements += $fileReplacements
        Write-Host "Updated $($file.Name): $fileReplacements replacements" -ForegroundColor Green
    }
}

Write-Host "`nTotal replacements made: $totalReplacements" -ForegroundColor Cyan
Write-Host "Theme update complete!" -ForegroundColor Green
