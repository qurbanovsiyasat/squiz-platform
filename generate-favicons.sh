#!/bin/bash

# Favicon Generator Script for Squiz Platform
# This script helps generate multiple favicon sizes from a source image

echo "=== Squiz Favicon Generator ==="
echo "This script helps generate multiple favicon sizes"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed."
    echo "Please install ImageMagick first:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/"
    exit 1
fi

# Check if source file exists
SOURCE_FILE=""
if [ -f "public/favicon.ico" ]; then
    SOURCE_FILE="public/favicon.ico"
    echo "Using existing favicon.ico as source"
elif [ -f "public/logo.png" ]; then
    SOURCE_FILE="public/logo.png"
    echo "Using logo.png as source"
else
    echo "No source image found. Please provide a source image:"
    echo "1. Place your source image in public/ directory"
    echo "2. Recommended: 512x512px PNG or ICO file"
    echo "3. Run this script again"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p public/favicons

echo "Generating favicon sizes..."

# Generate all required sizes
sizes=(16 32 48 180 192 512)

for size in "${sizes[@]}"; do
    output_file="public/favicon-${size}x${size}.png"
    echo "Generating ${size}x${size}..."
    convert "$SOURCE_FILE" -resize "${size}x${size}" "$output_file"
    
    if [ $? -eq 0 ]; then
        echo "✓ Created $output_file"
    else
        echo "✗ Failed to create $output_file"
    fi
done

echo ""
echo "=== Generation Complete ==="
echo "All favicon files have been created in public/ directory"
echo ""
echo "Files created:"
ls -la public/favicon-*.png 2>/dev/null || echo "No favicon files found"
echo ""
echo "Next steps:"
echo "1. Verify the files look correct"
echo "2. Restart your development server"
echo "3. Clear browser cache (Ctrl+F5)"
echo "4. Test on different devices"
echo ""
echo "For detailed instructions, see FAVICON_SETUP_GUIDE.md"
