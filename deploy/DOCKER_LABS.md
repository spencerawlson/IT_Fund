# Docker-backed labs — FedSer runbook

The first lab runs for real: **Python Scripting Basics** (`py-basics-001`) now
executes in a hardened per-session container instead of simulating. Learners get
real `python3`, real output — and attest each objective with "I did this" in the
workspace (the server no longer fabricates findings for this lab).

## One-time setup (on FedSer)

```bash
# 1. Sync the code
cd ~/IT_Fund && git pull

# 2. Docker must be running
sudo systemctl enable --now docker
docker info >/dev/null && echo "daemon OK"

# 3. Build the lab image (local-only, ~1-2 min first time)
cd ~/IT_Fund/backend/labs/images && ./build.sh python
# expect: road-to-cissp/python-basics:latest (plus -automation, -netauto tags)

# 4. Opt in
printf '\nLAB_DOCKER_ENABLED=1\n' >> ~/.config/itfund/backend.env
chmod 600 ~/.config/itfund/backend.env

# 5. Restart the backend
systemctl --user restart itfund-backend
systemctl --user status itfund-backend --no-pager | head -5
curl -s https://api.road2cissp.com/health
```

## Verify one real container-backed session

1. Open https://www.road2cissp.com/labs/py-basics-001 and start the lab.
   The terminal card must read **"live container — real commands, real output"**
   (not "simulated").
2. Run `python3 --version` → expect a real `Python 3.12.x`, not canned text.
3. Work the five objectives with the hinted one-liners. After each real run,
   press **I did this** on the objective — progress ticks to 5/5 and the lab
   completes.
4. On FedSer, while the session is open:
   ```bash
   docker ps --filter label=rtc=labs --format '{{.Names}}  {{.Image}}  {{.Status}}'
   ```
   expect one `rtc-lab-*` container from `road-to-cissp/python-basics:latest`.
5. Exit the lab (or `lab exit` in the terminal) and re-run the `docker ps`:
   the container must be gone (destroy is idempotent).

## Converting the next lab

1. Build its image: `./build.sh <name>` (see `labs/images/README.md` for the map).
2. Flip `environment.provider` to `"docker"` in its definition under
   `backend/labs/definitions/`.
3. Run the backend suite: `pytest backend/labs -q`.
4. Push, pull on FedSer, restart. No frontend change needed — the workspace keys
   attestation off the lab's public `environment.live` flag automatically.

## Notes

- Labs naming `provider="docker"` fail with "unavailable" while
  `LAB_DOCKER_ENABLED=0`. There is no silent fallback to simulation — this is
  deliberate, so a half-configured host can't quietly serve fake labs.
- Containers are unprivileged, capability-dropped, CPU/mem/PID-bounded, and on
  an internal-only network when the lab denies egress. The Docker socket is
  never exposed inside. See `backend/labs/providers/docker.py`.
- Rollback for one lab: revert its `provider` to `"mock"`, push, pull, restart.
  (The attestation UI disappears on its own — it's driven by `live`.)
