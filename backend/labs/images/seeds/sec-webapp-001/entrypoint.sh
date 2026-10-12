#!/bin/bash
# Entry point for the road-to-cissp/webapp image.
# Boots the vulnerable Flask training app on 127.0.0.1:5000 (loopback ONLY)
# in the background, then execs the provider's `sleep infinity` as PID 1.
set -euo pipefail

python3 /opt/webapp/app.py >>/var/log/webapp.log 2>&1 &
echo "vulnerable demo app listening on 127.0.0.1:5000 (loopback only)"

exec "$@"
