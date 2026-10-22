#!/bin/bash
# Builds Warehouse.app in the project folder. Re-run after moving the project.
set -euo pipefail

LAUNCHER_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$LAUNCHER_DIR")"
APP="$PROJECT_DIR/Warehouse.app"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Compile the AppleScript as a stay-open app with the project path filled in.
sed "s|__PROJECT__|$PROJECT_DIR|" "$LAUNCHER_DIR/Warehouse.applescript" > "$WORK/Warehouse.applescript"
rm -rf "$APP"
osacompile -s -o "$APP" "$WORK/Warehouse.applescript"

# Build an .icns from the web app icon and use it as the app icon.
ICONSET="$WORK/icon.iconset"
mkdir "$ICONSET"
SRC="$PROJECT_DIR/web/public/icons/icon-512.png"
for size in 16 32 128 256 512; do
  sips -z $size $size "$SRC" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null
  double=$((size * 2))
  if [ $double -le 512 ]; then
    sips -z $double $double "$SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
  fi
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/applet.icns"

# Assets.car holds the default script icon and wins over applet.icns, so drop it.
rm -f "$APP/Contents/Resources/Assets.car"
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP/Contents/Info.plist" 2>/dev/null || true

# Changing resources breaks osacompile's signature; re-sign so macOS will open it.
codesign --force --deep -s - "$APP"
touch "$APP"

echo "Built $APP"
