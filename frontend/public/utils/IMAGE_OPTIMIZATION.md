# Image Optimization Guide

This utility provides scripts to optimize images (JPG, JPEG, PNG) into modern formats (**WebP**, **AVIF**) to improve web performance and SEO.

## Prerequisites

Before running the script, ensure you have the necessary tools installed on your Ubuntu system:

```bash
sudo apt update
sudo apt install webp libavif-bin imagemagick -y
```

## Tools Summary

- **cwebp**: Converts images to WebP format.
- **avifenc**: Converts images to AVIF format.
- **mogrify/convert**: ImageMagick tools for general image processing.

## Script Usage

### `optimize_images.sh`

This script recursively scans the `/frontend/public/images/posts` directory and converts all found images to WebP.

#### Execution

1. Make the script executable:
   ```bash
   chmod +x frontend/public/utils/optimize_images.sh
   ```

2. Run the script:
   ```bash
   ./frontend/public/utils/optimize_images.sh
   ```

#### Features
- **Recursive Scan**: Processes all subfolders under `images/posts`.
- **Duplicate Prevention**: Skips conversion if the `.webp` file already exists.
- **Quality Control**: Default quality set to 80 (adjustable in script).
- **Safe Mode**: Original files are kept by default.

## Recommended Settings

- **WebP**: 75-85 quality is the sweet spot for web.
- **AVIF**: Provides even better compression than WebP but takes longer to encode.

## Why Optimize?

Converting to WebP/AVIF can reduce image file sizes by **25% to 50%** without noticeable quality loss, leading to:
- Faster page load speeds.
- Reduced bandwidth usage.
- Better LCP (Largest Contentful Paint) scores.
