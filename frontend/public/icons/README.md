# PWA Icons

To complete the PWA setup, add the following icon sizes to this directory:

## Required Icon Sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons:

### Option 1: Using Online Tools
1. Go to: https://www.pwabuilder.com/imageGenerator
2. Upload your logo/icon (min 512x512px recommended)
3. Download all generated sizes
4. Place them in this folder

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run:
magick convert original-icon.png -resize 72x72 icon-72x72.png
magick convert original-icon.png -resize 96x96 icon-96x96.png
magick convert original-icon.png -resize 128x128 icon-128x128.png
magick convert original-icon.png -resize 144x144 icon-144x144.png
magick convert original-icon.png -resize 152x152 icon-152x152.png
magick convert original-icon.png -resize 192x192 icon-192x192.png
magick convert original-icon.png -resize 384x384 icon-384x384.png
magick convert original-icon.png -resize 512x512 icon-512x512.png
```

### Option 3: Using Figma/Photoshop
1. Design your icon (512x512px)
2. Export each size manually
3. Save with the exact filenames listed above

## Icon Guidelines:
- Use PNG format with transparency
- Minimum size: 512x512px source
- Keep design simple and recognizable
- Use brand colors
- Test on both light and dark backgrounds
- Square format (1:1 aspect ratio)

## Current Status:
⚠️ Icons not yet added - please add them to complete PWA setup!
