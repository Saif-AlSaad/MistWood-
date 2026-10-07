# Clean script to render PWA PNG icons using .NET System.Drawing
Add-Type -AssemblyName System.Drawing

function Render-Png-Icon {
    param (
        [int]$dim,
        [string]$targetFile,
        [bool]$maskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($dim, $dim)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $dim, $dim)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 14, 20, 32),
        [System.Drawing.Color]::FromArgb(255, 4, 6, 9),
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
    )
    $g.FillRectangle($bgBrush, $rect)
    $bgBrush.Dispose()

    # Scale factor
    [double]$scale = [double]$dim / 512.0
    [double]$margin = if ($maskable) { 0.82 } else { 1.0 }
    [double]$effScale = $scale * $margin

    [double]$cx = [double]$dim / 2.0
    [double]$cy = if ($maskable) { [double]$dim / 2.0 } else { [double]$dim * 0.46 }

    # Outer Amber Glow
    [int]$glowR = [int](180.0 * $effScale)
    $glowRect = New-Object System.Drawing.Rectangle([int]($cx - $glowR), [int]($cy - $glowR), [int]($glowR * 2), [int]($glowR * 2))
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 210, 122))
    $g.FillEllipse($glowBrush, $glowRect)
    $glowBrush.Dispose()

    # Mid Amber Ring
    [int]$midR = [int](120.0 * $effScale)
    $midRect = New-Object System.Drawing.Rectangle([int]($cx - $midR), [int]($cy - $midR), [int]($midR * 2), [int]($midR * 2))
    $midBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 245, 158, 11))
    $g.FillEllipse($midBrush, $midRect)
    $midBrush.Dispose()

    # Core Golden Spirit Orb
    [int]$coreR = [int](72.0 * $effScale)
    $coreRect = New-Object System.Drawing.Rectangle([int]($cx - $coreR), [int]($cy - $coreR), [int]($coreR * 2), [int]($coreR * 2))
    $coreBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $coreRect,
        [System.Drawing.Color]::FromArgb(255, 255, 245, 215),
        [System.Drawing.Color]::FromArgb(255, 217, 119, 6),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    $g.FillEllipse($coreBrush, $coreRect)
    $coreBrush.Dispose()

    # Sacred Bright White Center
    [int]$innerR = [int](26.0 * $effScale)
    $innerRect = New-Object System.Drawing.Rectangle([int]($cx - $innerR - (3.0 * $scale)), [int]($cy - $innerR - (3.0 * $scale)), [int]($innerR * 2), [int]($innerR * 2))
    $innerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 255, 255, 255))
    $g.FillEllipse($innerBrush, $innerRect)
    $innerBrush.Dispose()

    # Ground Silhouette at the bottom
    if (-not $maskable) {
        $groundBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 4, 6, 9))
        [int]$groundH = [int]($dim * 0.18)
        $g.FillRectangle($groundBrush, 0, [int]($dim - $groundH), $dim, $groundH)
        $groundBrush.Dispose()
    }

    $g.Dispose()

    $dir = [System.IO.Path]::GetDirectoryName($targetFile)
    if (-not [System.IO.Directory]::Exists($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $bmp.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Successfully generated: $targetFile ($dim x $dim)"
}

$outDir = Join-Path $PSScriptRoot "..\public\icons"
Render-Png-Icon -dim 192 -targetFile (Join-Path $outDir "icon-192.png")
Render-Png-Icon -dim 512 -targetFile (Join-Path $outDir "icon-512.png")
Render-Png-Icon -dim 512 -targetFile (Join-Path $outDir "icon-maskable-512.png") -maskable $true
