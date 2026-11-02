"""Local server for the Traffic Light Timer.

Serves the timer page to this computer and a phone view to devices on the
same Wi-Fi. Run:  python server.py   then open http://localhost:8000
"""
import io
import json
import os
import socket
import sys
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import qrcode
import qrcode.image.svg

PORT = 8000
HERE = os.path.dirname(os.path.abspath(__file__))

lock = threading.Lock()
state = {"running": False, "base_ms": 0.0, "since": None, "triggers": None}


def lan_ip():
    """Best guess at this computer's Wi-Fi address (no traffic is sent)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


PHONE_URL = f"http://{lan_ip()}:{PORT}/remote.html"


def current_state():
    with lock:
        elapsed = state["base_ms"]
        if state["running"] and state["since"] is not None:
            elapsed += (time.monotonic() - state["since"]) * 1000
        return {"running": state["running"], "elapsedMs": elapsed, "triggers": state["triggers"]}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def send_json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")  # lets index.html opened as a file connect
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/state":
            return self.send_json(current_state())
        if self.path == "/api/info":
            return self.send_json({"phoneUrl": PHONE_URL})
        if self.path == "/api/qr.svg":
            buf = io.BytesIO()
            qrcode.make(PHONE_URL, image_factory=qrcode.image.svg.SvgPathImage, box_size=10).save(buf)
            body = buf.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/state":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length) or b"{}")
        with lock:
            state["running"] = bool(data.get("running"))
            state["base_ms"] = float(data.get("elapsedMs", 0))
            state["since"] = time.monotonic() if state["running"] else None
            state["triggers"] = data.get("triggers")
        self.send_json(current_state())

    def log_message(self, fmt, *args):
        pass  # keep the console quiet; phones poll every second


if __name__ == "__main__":
    try:
        server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is already in use - the timer is probably already running.")
        print(f"Opening http://localhost:{PORT} in your browser instead.")
        webbrowser.open(f"http://localhost:{PORT}")
        sys.exit(1)
    print(f"Timer:      http://localhost:{PORT}")
    print(f"Phone view: {PHONE_URL}")
    print("Press Ctrl+C to stop.")
    if "--no-browser" not in sys.argv:
        webbrowser.open(f"http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
