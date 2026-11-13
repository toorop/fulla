#!/bin/sh
# Renders scripts/og.html to public/og.jpg (1200 x 630) with a headless Chromium (Chromium, Chrome
# or Edge, whichever is found), then compresses it with sharp. Run from site/.
for b in chromium google-chrome "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; do
  if command -v "$b" >/dev/null 2>&1 || [ -x "$b" ]; then browser=$b; break; fi
done
[ -n "$browser" ] || { echo "No Chromium, Chrome or Edge found" >&2; exit 1; }
# Git Bash on Windows: the browser wants a Windows path (C:/...), which pwd -W gives.
if dir=$(pwd -W 2>/dev/null); then url="file:///$dir/scripts/og.html"; else dir=$(pwd); url="file://$dir/scripts/og.html"; fi
"$browser" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="$dir/og-tmp.png" "$url" 2>/dev/null
# JPEG keeps it well under 300 KB, WhatsApp's limit for link previews (the photo's grain defeats PNG).
node -e "require('sharp')('og-tmp.png').jpeg({ quality: 85, mozjpeg: true }).toFile('public/og.jpg').then(() => require('fs').unlinkSync('og-tmp.png'))"
