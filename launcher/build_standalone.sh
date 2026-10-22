#!/bin/bash
# Builds a standalone Warehouse.app (no Python or project folder needed) into dist/.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

(cd web && npm run build)

ICONSET="$WORK/icon.iconset"
mkdir "$ICONSET"
SRC="web/public/icons/icon-512.png"
for size in 16 32 128 256 512; do
  sips -z $size $size "$SRC" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null
  double=$((size * 2))
  if [ $double -le 512 ]; then
    sips -z $double $double "$SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
  fi
done
iconutil -c icns "$ICONSET" -o "$WORK/Warehouse.icns"

venv/bin/pyinstaller launcher/desktop.py \
  --name Warehouse \
  --windowed \
  --noconfirm \
  --icon "$WORK/Warehouse.icns" \
  --osx-bundle-identifier com.warehouse.app \
  --paths "$PROJECT_DIR" \
  --hidden-import main \
  --hidden-import sqlalchemy.dialects.sqlite \
  --collect-submodules uvicorn \
  --add-data "$PROJECT_DIR/web-dist:web-dist" \
  --add-data "$PROJECT_DIR/launcher/seed:seed" \
  --workpath "$WORK/build" \
  --specpath "$WORK"

echo "Built $PROJECT_DIR/dist/Warehouse.app"
