# Phase 2: Deep color refinement for perfect theme support

$pagesPath = "c:\Users\lenvo\OneDrive\Desktop\All Project\Studdy_Buddy_A5x\frontend\src\pages"
$componentsPath = "c:\Users\lenvo\OneDrive\Desktop\All Project\Studdy_Buddy_A5x\frontend\src\components"
$files = @()
$files += Get-ChildItem -Path $pagesPath -Filter "*.jsx" -Recurse
$files += Get-ChildItem -Path $componentsPath -Filter "*.jsx" -Recurse

$replacements = @(
    # Text colors - Tailwind classes
    @{ Old = 'text-white(?!")'; New = 'text-theme-primary' },
    @{ Old = 'text-gray-300'; New = 'text-theme-secondary' },
    @{ Old = 'text-gray-400'; New = 'text-theme-tertiary' },
    @{ Old = 'text-gray-500'; New = 'text-theme-muted' },
    @{ Old = 'text-gray-600'; New = 'text-theme-muted' },
    
    # Background utilities
    @{ Old = 'bg-white/5'; New = 'bg-theme-hover' },
    @{ Old = 'bg-gray-800'; New = 'bg-theme-card' },
    @{ Old = 'bg-gray-900'; New = 'bg-theme-sidebar' },
    
    # Border utilities
    @{ Old = 'border-white/10'; New = 'border-theme-light' },
    @{ Old = 'border-gray-700'; New = 'border-theme' },
    @{ Old = 'border-gray-600'; New = 'border-theme' },
    
    # More background patterns
    @{ Old = 'background: "#0a0814"'; New = 'background: "var(--bg-primary)"' },
    @{ Old = 'background: "#0f0c1f"'; New = 'background: "var(--bg-secondary)"' },
    @{ Old = 'backgroundColor: "#0a0814"'; New = 'backgroundColor: "var(--bg-primary)"' },
    @{ Old = 'backgroundColor: "#0f0c1f"'; New = 'backgroundColor: "var(--bg-secondary)"' },
    
    # Placeholder colors
    @{ Old = 'placeholder-gray-500'; New = 'placeholder-theme-muted' },
    @{ Old = 'placeholder-gray-400'; New = 'placeholder-theme-tertiary' }
)

$totalReplacements = 0
$filesUpdated = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        if ($null -eq $content) { continue }
        
        $originalContent = $content
        $fileReplacements = 0
        
        foreach ($replacement in $replacements) {
            try {
                $matches = [regex]::Matches($content, $replacement.Old)
                if ($matches.Count -gt 0) {
                    $content = $content -replace $replacement.Old, $replacement.New
                    $fileReplacements += $matches.Count
                }
            } catch {
                continue
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $totalReplacements += $fileReplacements
            $filesUpdated++
            Write-Host "✓ $($file.Name): $fileReplacements replacements" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ Skipped $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Phase 2 Complete!" -ForegroundColor Green
Write-Host "Files Updated: $filesUpdated" -ForegroundColor Cyan
Write-Host "Total Replacements: $totalReplacements" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
