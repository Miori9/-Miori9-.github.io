#!/bin/bash
# Placeholder script to generate a simple noise texture
# This creates a basic grayscale noise pattern using ImageMagick if available
# Otherwise, the CSS will gracefully degrade without the texture

if command -v convert &> /dev/null; then
  convert -size 100x100 xc: +noise Random -colorspace gray noise.png
  echo "Noise texture created: noise.png"
else
  echo "ImageMagick not found. Skipping noise texture generation."
  echo "The wallpaper will work without it (noise layer will be invisible)"
fi
