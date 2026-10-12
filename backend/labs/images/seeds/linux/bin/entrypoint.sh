#!/bin/bash
# road-to-cissp linux-admin entrypoint.
# Starts supervisord (user-level service manager; systemd cannot run as PID 1 in an
# unprivileged container), then hands over to the provider's command (DockerLabProvider
# always starts lab containers with `sleep infinity`).
set -e
/usr/bin/supervisord -c /home/student/supervisord.conf
exec "$@"
