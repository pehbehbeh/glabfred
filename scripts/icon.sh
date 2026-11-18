#!/bin/sh
# Renders assets/icon.svg to icon.png. Needs a Chromium browser for the SVG filters and gradients
set -eu
cd "$(dirname "$0")/.."
for b in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
  [ -x "$b" ] && browser=$b && break
done
: "${browser:?No Chrome, Brave or Chromium found}"
tmp=$(mktemp -d)
printf '<html><body style="margin:0"><img src="file://%s/assets/icon.svg" width="1024" height="1024"></body></html>' "$PWD" > "$tmp/icon.html"
"$browser" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=1024,1024 --screenshot="$tmp/icon.png" "file://$tmp/icon.html" 2>/dev/null
sips --resampleHeightWidth 512 512 "$tmp/icon.png" --out icon.png >/dev/null
rm -r "$tmp"
echo icon.png
