#!/usr/bin/env python3
"""Tiny alerts API for the Python labs.

Mirrors the mock shell's `curl` target (labs/shells/linux_python.py API_URL):
GET /api/alerts -> {"alerts": 3, "top_source": "203.0.113.66", ...}.
Started by the image entrypoint on 127.0.0.1:8080. Stdlib only.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

RESPONSE = {"alerts": 3, "top_source": "203.0.113.66", "severity": "high", "sensor": "ids01"}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        if self.path == "/api/alerts":
            body = json.dumps(RESPONSE, indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):  # keep the lab terminal noise-free
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
