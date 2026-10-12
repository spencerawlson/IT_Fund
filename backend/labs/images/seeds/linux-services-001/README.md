# Service troubleshooting — on-call workflow

Three services are down. For each one:

1. `supervisorctl status` — see what is FATAL/BACKOFF.
2. `supervisorctl tail <name> stderr` (or stdout) — read the actual error.
3. Fix the config in `~/services/conf.d/<name>.conf`.
4. `supervisorctl reread && supervisorctl update` — reload and restart.
5. `supervisorctl status` — confirm RUNNING.

supervisord is the init here: systemd cannot run as PID 1 in an unprivileged
container. The discipline — status, logs, fix config, restart, verify — is
exactly what you would do with systemctl/journalctl on a real host.

The three failures (find them yourself first):
- web:   the configured command points at a file that does not exist
- worker: the process exits because a required environment variable is missing
- cache:  the --config path does not point at the real config file
