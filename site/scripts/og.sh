#!/bin/sh
# Renders scripts/og.html to public/og.png with a headless Chromium. Run from site/.
chromium --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --screenshot=public/og.png "file://$(pwd)/scripts/og.html"
