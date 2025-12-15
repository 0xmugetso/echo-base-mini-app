#!/bin/bash

# Ensure we are in the root directory
if [ ! -d "aura-miniapp" ]; then
    echo "Error: Directory 'aura-miniapp' not found. Make sure you are in the root 'Aura-mini-app' folder."
    exit 1
fi

echo "Moving contents from aura-miniapp to root..."

# Move all visible files
mv aura-miniapp/* . 2>/dev/null

# Move hidden files (excluding special dirs . and ..)
mv aura-miniapp/.[!.]* . 2>/dev/null

# Remove the now empty directory
rmdir aura-miniapp

echo "Success! Files moved."
echo "Now you can rename the parent folder safely."
echo "To restart dev server: npm run dev"
