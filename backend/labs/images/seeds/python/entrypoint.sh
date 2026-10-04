#!/bin/bash
# road-to-cissp python lab entrypoint.
# Boots the lab's alerts API, then hands over to the provider's command
# (DockerLabProvider always starts lab containers with `sleep infinity`).
set -e
/usr/local/bin/alerts-api >/home/analyst/.alerts-api.log 2>&1 &
exec "$@"
