#!/bin/bash

# ==============================================================================
# FireMarkets App Image Optimization Script
# Location: frontend/public/utils/optimize_images.sh
# Purpose: Recursively convert PNG, JPG, JPEG to WebP (and AVIF)
# ==============================================================================

# Configuration
TARGET_DIR="/home/geehong/firemarkets-app/frontend/public/images/posts"
WEBP_QUALITY=80
AVIF_QUALITY=65
CONVERT_TO_AVIF=false # Set to true to also generate AVIF files
DELETE_ORIGINAL=true  # Set to true to delete source files after success

# Check for required tools
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp is not installed. Please run: sudo apt install webp"
    exit 1
fi

if [ "$CONVERT_TO_AVIF" = true ] && ! command -v avifenc &> /dev/null; then
    echo "Warning: avifenc is not installed. AVIF conversion will be skipped."
    echo "To install: sudo apt install libavif-bin"
    CONVERT_TO_AVIF=false
fi

echo "🚀 Starting image optimization in: $TARGET_DIR"

# Find and process images
find "$TARGET_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r img; do
    
    # Get file basics
    dir=$(dirname "$img")
    filename=$(basename -- "$img")
    extension="${filename##*.}"
    filename_no_ext="${filename%.*}"
    
    webp_path="$dir/$filename_no_ext.webp"
    avif_path="$dir/$filename_no_ext.avif"
    
    success=false
    webp_success=false
    avif_success=false

    # 1. Convert to WebP
    if [ ! -f "$webp_path" ]; then
        echo "📸 Converting to WebP: $filename"
        if cwebp -q "$WEBP_QUALITY" "$img" -o "$webp_path" -quiet; then
            echo "  ✅ Created: $filename_no_ext.webp"
            webp_success=true
        else
            echo "  ❌ Failed to convert $filename to WebP"
        fi
    else
        echo "  ⏭️  Skipping WebP (already exists): $filename_no_ext.webp"
        webp_success=true # Treat as success since it exists
    fi

    # 2. Convert to AVIF (optional)
    if [ "$CONVERT_TO_AVIF" = true ]; then
        if [ ! -f "$avif_path" ]; then
            echo "📸 Converting to AVIF: $filename"
            if avifenc -q "$AVIF_QUALITY" "$img" "$avif_path" &> /dev/null; then
                echo "  ✅ Created: $filename_no_ext.avif"
                avif_success=true
            else
                echo "  ❌ Failed to convert $filename to AVIF"
            fi
        else
            echo "  ⏭️  Skipping AVIF (already exists): $filename_no_ext.avif"
            avif_success=true
        fi
    else
        avif_success=true # Don't block deletion if AVIF is disabled
    fi

    # 3. Clean up original files if both (requested) conversions are successful
    if [ "$DELETE_ORIGINAL" = true ] && [ "$webp_success" = true ] && [ "$avif_success" = true ]; then
        echo "  ♻️  Removing original file: $filename"
        rm "$img"
    fi

done

echo "=============================================================================="
echo "🎉 Image optimization task completed!"
echo "📍 Target folder: $TARGET_DIR"
echo "=============================================================================="
