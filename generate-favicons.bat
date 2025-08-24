@echo off
echo === Squiz Favicon Generator for Windows ===
echo This batch file helps generate multiple favicon sizes

REM Check if ImageMagick is installed
where convert >nul 2>nul
if errorlevel 1 (
    echo Error: ImageMagick is not installed or not in PATH.
    echo Please install ImageMagick first:
    echo Download from https://imagemagick.org/
    echo Make sure to add it to your system PATH during installation.
    pause
    exit /b 1
)

REM Check if source files exist
set SOURCE_FILE=
if exist "public\favicon.ico" (
    set SOURCE_FILE=public\favicon.ico
    echo Using existing favicon.ico as source
) else if exist "public\logo.png" (
    set SOURCE_FILE=public\logo.png
    echo Using logo.png as source
) else (
    echo No source image found. Please provide a source image:
    echo 1. Place your source image in public\ directory
    echo 2. Recommended: 512x512px PNG or ICO file
    echo 3. Run this script again
    pause
    exit /b 1
)

echo Generating favicon sizes...

REM Generate all required sizes
set sizes=16 32 48 180 192 512

for %%s in (%sizes%) do (
    set output_file=public\favicon-%%sx%%s.png
    echo Generating %%sx%%s...
    convert "%SOURCE_FILE%" -resize %%sx%%s "!output_file!"
    
    if !errorlevel! equ 0 (
        echo ✓ Created !output_file!
    ) else (
        echo ✗ Failed to create !output_file!
    )
)

echo.
echo === Generation Complete ===
echo All favicon files have been created in public\ directory
echo.
echo Files created:
dir public\favicon-*.png 2>nul || echo No favicon files found
echo.
echo Next steps:
echo 1. Verify the files look correct
echo 2. Restart your development server
echo 3. Clear browser cache (Ctrl+F5)
echo 4. Test on different devices
echo.
echo For detailed instructions, see FAVICON_SETUP_GUIDE.md
pause
