Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path $PSScriptRoot '..\assets'
New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
$bitmap = [System.Drawing.Bitmap]::new(1024, 1024)
$canvas = [System.Drawing.Graphics]::FromImage($bitmap)
$canvas.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$canvas.Clear([System.Drawing.Color]::Transparent)
$outline = [System.Drawing.Drawing2D.GraphicsPath]::new()
$outline.AddArc(0, 0, 260, 260, 180, 90)
$outline.AddArc(763, 0, 260, 260, 270, 90)
$outline.AddArc(763, 763, 260, 260, 0, 90)
$outline.AddArc(0, 763, 260, 260, 90, 90)
$outline.CloseFigure()
$background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(32, 42, 29))
$canvas.FillPath($background, $outline)
$canvas.TranslateTransform(512, 512)
$canvas.RotateTransform(-10)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(189, 220, 156))
foreach ($bar in @(@(-239, -25, 114, 245), @(-57, -220, 114, 440), @(125, -123, 114, 343))) {
  $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $x, $y, $width, $height = $bar
  $shape.AddArc($x, $y, $width, $width, 180, 180)
  $shape.AddArc($x, ($y + $height - $width), $width, $width, 0, 180)
  $shape.CloseFigure()
  $canvas.FillPath($brush, $shape)
  $shape.Dispose()
}
$bitmap.Save((Join-Path $assetDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$small = [System.Drawing.Bitmap]::new($bitmap, 256, 256)
$buffer = [System.IO.MemoryStream]::new()
$small.Save($buffer, [System.Drawing.Imaging.ImageFormat]::Png)
$bytes = $buffer.ToArray()
$stream = [System.IO.File]::Create((Join-Path $assetDir 'icon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]$bytes.Length); $writer.Write([UInt32]22); $writer.Write($bytes)
$writer.Dispose(); $stream.Dispose(); $buffer.Dispose(); $small.Dispose(); $canvas.Dispose(); $bitmap.Dispose(); $outline.Dispose(); $brush.Dispose(); $background.Dispose()
Write-Output 'Created Daymark PNG and ICO icons.'
