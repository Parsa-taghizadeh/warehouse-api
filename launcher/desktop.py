"""Entry point for the standalone app built by build_standalone.sh (macOS) and
build_windows.bat (Windows).

Runs the server and opens the browser. On macOS it shows a menu bar icon with
Open and Quit items; on Windows it runs in a console window, and closing that
window stops the server.
"""
import os
import sys
import threading
import time
import urllib.request
import webbrowser

HOST = "127.0.0.1"
PORT = int(os.getenv("WAREHOUSE_PORT", "8000"))
URL = f"http://{HOST}:{PORT}"
IS_MAC = sys.platform == "darwin"

# Apps opened from Finder or Explorer don't start in the project folder, so
# keep the database and secret key in a per-user folder and point the bundled
# frontend at its unpacked location.
if sys.platform == "win32":
    DATA_DIR = os.path.join(os.environ["APPDATA"], "Warehouse")
elif IS_MAC:
    DATA_DIR = os.path.expanduser("~/Library/Application Support/Warehouse")
else:
    DATA_DIR = os.path.expanduser("~/.local/share/Warehouse")
os.makedirs(DATA_DIR, exist_ok=True)
os.chdir(DATA_DIR)

# On first run, start from the bundled database that already has the login user.
SEED_DB = os.path.join(getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__))), "seed", "warehouse.db")
if not os.path.exists("warehouse.db") and os.path.exists(SEED_DB):
    import shutil
    shutil.copyfile(SEED_DB, "warehouse.db")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'warehouse.db')}")
os.environ.setdefault("WEB_DIST_DIR", os.path.join(getattr(sys, "_MEIPASS", ""), "web-dist"))

# The macOS app has no terminal; without this, logging writes to None and fails.
if IS_MAC or sys.stdout is None:
    sys.stdout = sys.stderr = open(os.path.join(DATA_DIR, "server.log"), "a", buffering=1)

import uvicorn


def server_is_up() -> bool:
    try:
        urllib.request.urlopen(f"{URL}/auth/status", timeout=1)
        return True
    except OSError:
        return False


def create_server() -> uvicorn.Server:
    import main

    # A fresh database has no tables yet.
    main.Base.metadata.create_all(bind=main.engine)

    return uvicorn.Server(uvicorn.Config(main.app, host=HOST, port=PORT, log_config=None))


def open_when_ready():
    for _ in range(60):
        if server_is_up():
            webbrowser.open(URL)
            return
        time.sleep(0.25)
    print("Server did not start within 15 seconds", flush=True)


def run_mac(server: uvicorn.Server):
    import rumps

    class WarehouseApp(rumps.App):
        def __init__(self):
            super().__init__("انبار", quit_button=None)
            self.menu = [
                rumps.MenuItem("باز کردن انبار", callback=lambda _: webbrowser.open(URL)),
                None,
                rumps.MenuItem("خروج", callback=self.quit_app),
            ]

        def quit_app(self, _):
            server.should_exit = True
            rumps.quit_application()

    threading.Thread(target=server.run, daemon=True).start()
    WarehouseApp().run()


def run_console(server: uvicorn.Server):
    print(f"Warehouse is running at {URL}")
    print("Close this window to stop the server.")
    print(f"Data folder: {DATA_DIR}", flush=True)
    server.run()


if __name__ == "__main__":
    if server_is_up():
        # Another copy is already serving; just bring up the browser.
        webbrowser.open(URL)
        sys.exit(0)

    server = create_server()
    threading.Thread(target=open_when_ready, daemon=True).start()
    if IS_MAC:
        run_mac(server)
    else:
        run_console(server)
