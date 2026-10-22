#!/bin/bash
# Builds warehouse-windows.zip: a portable Windows folder with its own Python,
# so the other PC only has to unzip it and double-click Warehouse.bat.
set -euo pipefail

# 3.8 is the last Python that runs on Windows 7; newer ones fail with a missing
# api-ms-win-core-path DLL. requirements-win7.txt pins packages that support it.
PYTHON_VERSION=3.8.10
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
W="$WORK/Warehouse"
mkdir -p "$W/python" "$W/packages" "$W/app"

(cd web && npm run build)

# Windows embeddable Python; its ._pth file replaces sys.path, so list our folders there.
curl -sSfL -o "$WORK/python.zip" "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
unzip -q "$WORK/python.zip" -d "$W/python"
printf 'python38.zip\r\n.\r\n..\\app\r\n..\\packages\r\n' > "$W/python/python38._pth"

# Windows wheels. pip evaluates markers for this Mac, so colorama (which click
# needs on Windows) is listed explicitly in requirements-win7.txt.
venv/bin/pip install -q --target "$W/packages" --platform win_amd64 --python-version 3.8 \
  --implementation cp --only-binary=:all: --no-deps -r requirements-win7.txt
rm -rf "$W/packages/bin" "$W/packages/__pycache__"

cp main.py launcher/desktop.py "$W/app/"
cp -R launcher/seed "$W/app/seed"
cp -R web-dist "$W/app/web-dist"
find "$W" -name .DS_Store -delete

printf '@echo off\r\ntitle Warehouse\r\nset "WEB_DIST_DIR=%%~dp0app\\web-dist"\r\n"%%~dp0python\\python.exe" "%%~dp0app\\desktop.py"\r\nif errorlevel 1 pause\r\n' > "$W/Warehouse.bat"

# cmd.exe needs CRLF line endings.
cp launcher/Backup.bat launcher/Restore.bat "$W/"
perl -pi -e 's/\r?\n/\r\n/' "$W/Backup.bat" "$W/Restore.bat"

cat > "$W/README.txt" <<'EOF'
Warehouse - راهنما

اجرا: روی Warehouse.bat دابل‌کلیک کنید.
مرورگر خودش باز می‌شود. برای خاموش کردن، پنجره‌ی سیاه را ببندید.

اطلاعات (دیتابیس) در این پوشه ذخیره می‌شود:
%APPDATA%\Warehouse

این پوشه را جابه‌جا نکنید و فایل‌هایش را جدا نکنید؛ همه با هم لازم‌اند.

پشتیبان‌گیری:
1. پنجره‌ی سیاه برنامه را ببندید.
2. روی Backup.bat دابل‌کلیک کنید.
3. پوشه‌ای به اسم Warehouse-Backup-تاریخ روی Desktop ساخته می‌شود.
   آن را روی فلش کپی کنید.

برگرداندن پشتیبان (مثلاً بعد از نصب Windows جدید):
1. پنجره‌ی سیاه برنامه را ببندید.
2. پوشه‌ی Warehouse-Backup را بکشید و روی Restore.bat رها کنید.
3. YES را تایپ کنید و Enter بزنید.
4. Warehouse.bat را اجرا کنید.
اطلاعات قبلی پاک نمی‌شود و در پوشه‌ی Warehouse-before-restore نگه داشته می‌شود.
EOF
perl -pi -e 's/\r?\n/\r\n/' "$W/README.txt"

rm -f warehouse-windows.zip
(cd "$WORK" && zip -qr "$PROJECT_DIR/warehouse-windows.zip" Warehouse)
echo "Built $PROJECT_DIR/warehouse-windows.zip"
