#!/usr/bin/env python3
"""Tiny status web service for the services lab."""
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

port = 18080
for arg in sys.argv[1:]:
    if arg.startswith("--port"):
        port = int(arg.split("=")[-1] if "=" in arg else sys.argv[sys.argv.index(arg) + 1])


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"web ok\n")

    def log_message(self, *a):
        pass


print(f"web listening on {port}", flush=True)
HTTPServer(("127.0.0.1", port), H).serve_forever()
