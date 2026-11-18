#!/bin/sh
# Packs the workflow into dist/glabfred.alfredworkflow (a zip Alfred imports on double-click)
set -eu
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/glabfred.alfredworkflow
# package.json has to ship: its "type": "module" tells Node to load the .js files as ES modules
zip -qr dist/glabfred.alfredworkflow info.plist icon.png package.json main.js lib
echo "dist/glabfred.alfredworkflow"
