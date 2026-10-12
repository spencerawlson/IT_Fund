#!/usr/bin/env bash
# road-to-cissp/python-tools entrypoint.
# No background services to boot for these labs (python3, sqlite3 and semgrep
# are plain CLI tools); just hand control to the CMD so the shape matches the
# other lab images.
exec "$@"
