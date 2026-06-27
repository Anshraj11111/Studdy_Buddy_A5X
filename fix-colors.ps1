# Simple color fix script

$pagesPath = "c:\Users\lenvo\OneDrive\Desktop\All Project\Studdy_Buddy_A5x\frontend\src\pages"
$files = Get-ChildItem -Path $pagesPath -Filter "*.jsx"

Write-Host "Updating Tailwind classes to theme-aware..." -ForegroundColor Cyan

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Replace Tailwind text colors
    $content = $content -replace 'className="([^"]*?)text-white([^"]*?)"', 'className="$1text-theme-primary$2"'
    $content = $content -replace 'className="([^"]*?)text-gray-300([^"]*?)"', 'className="$1text-theme-secondary$2"'
    $content = $content -replace 'className="([^"]*?)text-gray-400([^"]*?)"', 'className="$1text-theme-tertiary$2"'
    $content = $content -replace 'className="([^"]*?)text-gray-500([^"]*?)"', 'className="$1text-theme-muted$2"'
    
    # Replace background colors
    $content = $content -replace 'bg-gray-800', 'bg-theme-card'
    $content = $content -replace 'bg-gray-900', 'bg-theme-sidebar'
    
    # Replace borders  
    $content = $content -replace 'border-gray-700', 'border-theme'
    $content = $content -replace 'border-gray-600', 'border-theme'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $count++
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nUpdated $count files" -ForegroundColor Cyan
