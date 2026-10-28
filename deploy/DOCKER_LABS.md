# Docker-backed labs — FedServ runbook

Twenty-eight labs now run for real in hardened per-session containers instead
of simulating. Learners get real tools, real output — and attest each objective
with "I did this" in the workspace (the server no longer fabricates findings
for these labs).

| Lab | Image |
|---|---|
| py-basics-001 — Python Scripting Basics | road-to-cissp/python-basics |
| py-automation-001 — Automate with Python | road-to-cissp/python-automation |
| py-netauto-001 — Python for Network Automation | road-to-cissp/python-netauto |
| sec-logtriage-001 — Log Triage: Brute-Force Investigation | road-to-cissp/log-triage |
| sec-c2beacon-001 — C2 Beacon Hunt | road-to-cissp/log-triage |
| sec-dns-typo-001 — DNS Tunneling & Typosquatting | road-to-cissp/log-triage |
| sec-ransomware-001 — Ransomware over SMB | road-to-cissp/log-triage |
| cyber-nmap-001 — Service Enumeration with Nmap | road-to-cissp/security-tools |
| cyber-portblast-001 — PortBlast: Full Assessment Workflow | road-to-cissp/portblast-lab |
| cloud-aws-audit-001 — Cloud Security Audit with the AWS CLI | road-to-cissp/cloudshell |
| cloud-terraform-001 — Terraform: Provision & Secure Infrastructure | road-to-cissp/iac |
| terraform-fundamentals-001 — Terraform Fundamentals | road-to-cissp/iac |
| linux-users-001 — Linux Users, Groups & sudo | road-to-cissp/linux-admin |
| linux-permissions-001 — Permissions & ACLs | road-to-cissp/linux-admin |
| linux-ssh-001 — SSH Hardening | road-to-cissp/linux-admin |
| linux-firewall-001 — Host Firewall | road-to-cissp/linux-admin |
| linux-services-001 — Service Troubleshooting | road-to-cissp/linux-admin |
| linux-cron-001 — Cron & Automation | road-to-cissp/linux-admin |
| linux-audit-001 — Audit Logs & fail2ban | road-to-cissp/linux-admin |
| linux-hardening-001 — Hardening Capstone | road-to-cissp/linux-admin-hardening |
| tools-wireshark-001 — Wireshark / tshark Packet Analysis | road-to-cissp/wireshark |
| sec-webapp-001 — Web Application Testing | road-to-cissp/webapp |
| sec-gitleaks-001 — Secret Scanning with Gitleaks | road-to-cissp/gitleaks |
| sec-trivy-001 — Container Image Scanning with Trivy | road-to-cissp/trivy |
| iac-policy-001 — Terraform Policy as Code | road-to-cissp/iac-policy |
| py-loganalysis-001 — Python Log Analysis | road-to-cissp/python-tools |
| py-sqli-001 — SQL Injection: Find & Fix | road-to-cissp/python-tools |
| py-semgrep-001 — Static Analysis with Semgrep | road-to-cissp/python-tools |

The remaining 26 labs stay simulated on purpose: 12 networking labs emulate
Cisco IOS (no container equivalent), 5 need real cloud credentials, 2 need
Docker-in-Docker (incompatible with the hardened provider), and 7 are bespoke
simulator workbenches (SIEM, vuln-management, IAM, pentest methodology, Linux
terminal) where the simulation *is* the pedagogy.

## One-time setup (on FedServ)

```bash
# 1. Sync the code
cd ~/IT_Fund && git pull

# 2. Docker must be running
sudo systemctl enable --now docker
docker info >/dev/null && echo "daemon OK"

# 3. Build all lab images (local-only, ~5-10 min first time)
cd ~/IT_Fund/backend/labs/images && ./build.sh
# expect: road-to-cissp/python-basics, python-automation, python-netauto,
#   log-triage, security-tools, portblast-lab, cloudshell, iac, wireshark,
#   webapp, pentest-web, gitleaks, trivy, iac-policy, python-tools, linux-admin,
#   linux-admin-hardening (:latest)

# 4. Opt in.
# The systemd unit (deploy/itfund-backend.service) now sets LAB_DOCKER_ENABLED=1
# itself, so a fresh unit install already enables it. This env line is only
# needed if you run the backend some other way (not via that unit).
printf '\nLAB_DOCKER_ENABLED=1\n' >> ~/.config/itfund/backend.env
chmod 600 ~/.config/itfund/backend.env

# 5. Restart the backend (re-copy the unit first if it changed):
#    cp deploy/itfund-backend.service ~/.config/systemd/user/ && systemctl --user daemon-reload
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
4. On FedServ, while the session is open:
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
4. Push, pull on FedServ, restart. No frontend change needed — the workspace keys
   attestation off the lab's public `environment.live` flag automatically.

## Notes

- **Phase 3 images `linux-admin` and `linux-admin-hardening`:** their Dockerfiles
  (`backend/labs/images/Dockerfile.linux-admin`,
  `backend/labs/images/Dockerfile.linux-admin-hardening`) are created directly
  on FedServ — copy the contents from the Phase 3 report, then run
  `./build.sh linux-admin && ./build.sh linux-admin-hardening`.
- Linux labs (039–046) run on an unprivileged container, so the honest
  boundaries are stated in each lab description: user/group/shadow edits apply
  to a practice root (`~/sysroot`) with byte-identical file formats; sshd runs
  on high port 2222 as the student user; supervisord replaces systemd (it
  cannot run as PID 1 unprivileged); cron runs under a crontab-compatible
  scheduler; fail2ban proves its filter with the real `fail2ban-regex` but
  cannot enforce bans; nft/iptables binaries are present for inspection but the
  kernel refuses enforcement without CAP_NET_ADMIN, so the firewall lab is
  write-and-verify with static review plus packet simulation.
- `sec-trivy-001` scans via `trivy rootfs` against a seeded vulnerable rootfs —
  `trivy image` needs the Docker socket, which the hardened provider never
  exposes. This is stated in the lab.
- `sec-webapp-001` serves its vulnerable app on loopback only
  (`target.lab` → 127.0.0.1); the image is intentionally vulnerable by design
  and never exposed beyond the session container.

- `cyber-nmap-001` and `cyber-portblast-001` keep their `target.lab` hostname: the
  provider maps it to 127.0.0.1 via `extra_hosts` (see `LabEnvironmentConfig`),
  where the image runs real sshd/nginx/http services on unprivileged ports.
  Scan with `nmap -Pn -sT target.lab` (raw sockets are dropped by the hardening).
- Terraform labs (`cloud-terraform-001`, `terraform-fundamentals-001`) run real
  `terraform init/validate/plan` and `tfsec` offline; the sandbox has no AWS API,
  so apply/destroy objectives are framed around the saved plan — the last human
  gate before a real apply. This is stated in the lab descriptions, not hidden.
- Labs naming `provider="docker"` fail with "unavailable" while
  `LAB_DOCKER_ENABLED=0`. There is no silent fallback to simulation — this is
  deliberate, so a half-configured host can't quietly serve fake labs.
- Containers are unprivileged, capability-dropped, CPU/mem/PID-bounded, and on
  an internal-only network when the lab denies egress. The Docker socket is
  never exposed inside. See `backend/labs/providers/docker.py`.
- Rollback for one lab: revert its `provider` to `"mock"`, push, pull, restart.
  (The attestation UI disappears on its own — it's driven by `live`.)
