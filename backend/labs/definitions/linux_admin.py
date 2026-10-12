"""Linux administration lab group (Phase 3): learn Linux sysadmin by doing, for real.

Eight Docker-backed labs on the road-to-cissp/linux-admin image (Debian bookworm-slim, non-root
`student` user). The browser terminal executes REAL commands in the container; objectives are
validated against the attested state (the "I did this" pattern — see validators_linux.py).

Honest boundaries, stated in each lab description:
- The container is unprivileged (all capabilities dropped, no-new-privileges), so the real
  /etc/passwd, /etc/shadow and /etc/sudoers cannot be touched: useradd/groupadd/usermod shims
  manage a PRACTICE ROOT at ~/sysroot with byte-identical file formats.
- sshd runs on high port 2222 as the student user (a non-root sshd cannot bind port 22).
- supervisord manages services, NOT systemd: systemd cannot run as PID 1 in an unprivileged
  container. The troubleshooting workflow (status -> logs -> fix config -> restart) transfers.
- The system cron daemon requires root, so cron jobs run under supercronic, a
  crontab-compatible scheduler. The crontab format is identical.
- fail2ban-server cannot enforce bans unprivileged: the audit lab authors a real jail.local
  and proves the filter with the real fail2ban-regex.
- nft/iptables binaries are installed for inspection, but the kernel refuses to enforce rules
  without CAP_NET_ADMIN: the firewall lab is write-and-verify (check-firewall validates the
  ruleset statically, including a packet simulation).
"""
from __future__ import annotations

import labs.validators_linux  # noqa: F401  (registers the linux_* validators)
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

_ENV = LabEnvironmentConfig(
    provider="docker",
    image="road-to-cissp/linux-admin:latest",
    workdir="/home/student",
    idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True,
    cpu_limit=1.0, memory_mb=512)

_HARDENING_ENV = LabEnvironmentConfig(
    provider="docker",
    image="road-to-cissp/linux-admin-hardening:latest",
    workdir="/home/student",
    idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True,
    cpu_limit=1.0, memory_mb=512)

_TARGET = LabTarget(hostname="sysadmin01", role="Linux administration workstation")


LINUX_USERS_LAB = LabDefinition(
    id="linux-users-001",
    slug="linux-users-groups-sudo",
    title="Linux Users, Groups & sudo",
    description=(
        "Create users and groups and delegate least-privilege sudo — the way a sysadmin does on day "
        "one. This container is unprivileged, so the useradd/groupadd/usermod commands here manage a "
        "practice root at ~/sysroot (byte-identical /etc/passwd, /etc/group and sudoers.d formats); "
        "on a real host you would run the same commands as root. You will also validate a real "
        "sudoers drop-in with visudo and list your own real sudo privileges with sudo -l."
    ),
    category="linux", difficulty="beginner", estimated_minutes=20, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="create-user", label="Create a deploy user",
                     validator="linux_user_created", args={"username": "deploy"},
                     hints=["useradd -m -s /bin/bash deploy", "Verify: cat ~/sysroot/etc/passwd"]),
        LabObjective(id="create-group", label="Create a deployers group",
                     validator="linux_group_created", args={"group": "deployers"},
                     hints=["groupadd deployers", "Verify: cat ~/sysroot/etc/group"]),
        LabObjective(id="add-to-group", label="Add deploy to the deployers group",
                     validator="linux_user_in_group", args={"username": "deploy", "group": "deployers"},
                     hints=["usermod -aG deployers deploy", "Verify: grep deployers ~/sysroot/etc/group"]),
        LabObjective(id="sudoers-dropin", label="Write a least-privilege sudoers drop-in",
                     validator="linux_sudoers_entry", args={"user": "deploy"},
                     hints=["Edit ~/sysroot/etc/sudoers.d/deploy — grant /usr/bin/systemctl restart app only, no blanket ALL."]),
        LabObjective(id="sudoers-syntax", label="Validate the sudoers syntax with visudo",
                     validator="linux_sudoers_syntax_ok", args={"path": "~/sysroot/etc/sudoers.d/deploy"},
                     hints=["visudo -c -f ~/sysroot/etc/sudoers.d/deploy — look for 'parsed OK'."]),
        LabObjective(id="sudo-list", label="List your own sudo privileges",
                     validator="linux_sudo_listed", args={"privilege": "NOPASSWD"},
                     hints=["sudo -l — note it lists privileges even though sudo cannot escalate in this container."]),
    ],
)

LINUX_PERMISSIONS_LAB = LabDefinition(
    id="linux-permissions-001",
    slug="linux-permissions-acls",
    title="Permissions & ACLs",
    description=(
        "Master the permission model on real files: classic mode bits, ownership, setgid/sticky "
        "special bits, and POSIX ACLs with setfacl/getfacl. Everything here executes for real as the "
        "student user. (chown to another user needs root, so ownership changes are practiced with "
        "chgrp to groups you belong to; the syntax is identical.)"
    ),
    category="linux", difficulty="beginner", estimated_minutes=20, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="lock-secret", label="Lock down secret.txt to owner-only",
                     validator="linux_perm_secret",
                     args={"path": "~/permissions-lab/secret.txt", "mode": "600"},
                     hints=["chmod 600 ~/permissions-lab/secret.txt", "Verify: stat -c %a ~/permissions-lab/secret.txt"]),
        LabObjective(id="exec-script", label="Make deploy.sh executable",
                     validator="linux_perm_script",
                     args={"path": "~/permissions-lab/deploy.sh", "mode": "755"},
                     hints=["chmod 755 ~/permissions-lab/deploy.sh", "Verify: ls -l ~/permissions-lab/deploy.sh"]),
        LabObjective(id="shared-dir", label="Build a setgid collaboration directory",
                     validator="linux_perm_group_dir",
                     args={"path": "~/permissions-lab/shared", "mode": "2770", "group": "devs"},
                     hints=["chgrp devs ~/permissions-lab/shared && chmod 2770 ~/permissions-lab/shared"]),
        LabObjective(id="acl-entry", label="Grant alice read-only access with an ACL",
                     validator="linux_perm_acl",
                     args={"path": "~/permissions-lab/report.txt", "entries": ["user:alice:r--"]},
                     hints=["setfacl -m u:alice:r-- ~/permissions-lab/report.txt", "Verify: getfacl ~/permissions-lab/report.txt"]),
        LabObjective(id="sticky-dropbox", label="Create a sticky-bit dropbox",
                     validator="linux_perm_sticky",
                     args={"path": "~/permissions-lab/dropbox", "mode": "1777"},
                     hints=["chmod 1777 ~/permissions-lab/dropbox — like /tmp: anyone can write, only owners delete."]),
    ],
)

LINUX_SSH_LAB = LabDefinition(
    id="linux-ssh-001",
    slug="linux-ssh-hardening",
    title="SSH Hardening",
    description=(
        "Harden a real OpenSSH server: generate a key pair, move the daemon to a high port, disable "
        "password authentication, forbid root login, and prove a key-only login works. The sshd here "
        "runs as the unprivileged student user on port 2222 — a non-root sshd cannot bind port 22, "
        "which is exactly why the hardening moves it off the default port."
    ),
    category="linux", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="review-config", label="Review the starter sshd_config",
                     validator="linux_ssh_config_viewed",
                     hints=["cat ~/ssh-lab/sshd_config — note Port 22, PasswordAuthentication yes, PermitRootLogin yes."]),
        LabObjective(id="keypair", label="Generate an ed25519 key pair",
                     validator="linux_ssh_keypair", args={"key": "id_ed25519"},
                     hints=["ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ''", "Then append the .pub to ~/.ssh/authorized_keys."]),
        LabObjective(id="harden-config", label="Harden the sshd_config",
                     validator="linux_sshd_hardened",
                     args={"settings": {"port": "2222", "passwordauthentication": "no",
                                        "pubkeyauthentication": "yes", "permitrootlogin": "no"}},
                     hints=["Edit ~/ssh-lab/sshd_config: Port 2222, PasswordAuthentication no, PermitRootLogin no.",
                            "Verify effective config: sshd -T -f ~/ssh-lab/sshd_config | grep -Ei 'port|passwordauth|permitroot'."]),
        LabObjective(id="start-sshd", label="Start sshd and confirm it listens",
                     validator="linux_sshd_listening", args={"port": "2222"},
                     hints=["/usr/sbin/sshd -f ~/ssh-lab/sshd_config -E ~/ssh-lab/sshd.log", "Verify: ss -tlnp | grep 2222"]),
        LabObjective(id="key-login", label="Log in with your key (no password)",
                     validator="linux_ssh_key_login", args={"marker": "SSH_LOGIN_OK"},
                     hints=["ssh -p 2222 -o StrictHostKeyChecking=no student@localhost 'echo SSH_LOGIN_OK'"]),
    ],
)

LINUX_FIREWALL_LAB = LabDefinition(
    id="linux-firewall-001",
    slug="linux-host-firewall",
    title="Host Firewall",
    description=(
        "Write a host firewall policy — honestly. iptables/nft need CAP_NET_ADMIN, which the "
        "hardened provider forbids, so the kernel will NOT enforce anything you write here. Instead "
        "this lab is write-and-verify: you author ~/firewall/rules.nft with a default-deny policy, "
        "and the check-firewall tool validates syntax and semantics (including a packet simulation) "
        "exactly as a senior would review a ruleset before applying it on a real host."
    ),
    category="linux", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="write-rules", label="Author the ruleset",
                     validator="linux_fw_rules_written", args={"min_rules": 4},
                     hints=["Edit ~/firewall/rules.nft — start from the TODO skeleton and the policy in the README."]),
        LabObjective(id="checker-pass", label="Pass the check-firewall review",
                     validator="linux_fw_checker_pass",
                     hints=["check-firewall — fix each FAIL until you see ALL CHECKS PASSED.",
                            "Try: check-firewall --test-packet 'dport=2222 src=10.0.2.5' to simulate."]),
        LabObjective(id="default-deny", label="Enforce default-deny",
                     validator="linux_fw_default_deny", args={"patterns": ["policy drop"]},
                     hints=["Your input chain needs 'policy drop' — unmatched traffic must not slip through."]),
        LabObjective(id="allow-ssh", label="Allow management SSH explicitly",
                     validator="linux_fw_ssh_allowed", args={"port": "2222"},
                     hints=["One explicit accept for tcp dport 2222 from the management network — default-deny means nothing is open by accident."]),
    ],
)

LINUX_SERVICES_LAB = LabDefinition(
    id="linux-services-001",
    slug="linux-service-troubleshooting",
    title="Service Troubleshooting",
    description=(
        "Three services are down and the on-call pager is yours. Diagnose each failure from its "
        "logs, fix the broken supervisord configs, and bring everything back to RUNNING. Honest "
        "note: systemd cannot run as PID 1 in an unprivileged container, so this lab uses "
        "supervisord — the troubleshooting workflow (status -> logs -> fix config -> reread/update) "
        "is the same discipline systemd teaches. Tip: supervisorctl needs -c ~/supervisord.conf, "
        "or use the wrapper (plain supervisorctl works)."
    ),
    category="linux", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="read-logs", label="Read the failing service logs",
                     validator="linux_svc_logs_read", args={"service": "web"},
                     hints=["supervisorctl status — then supervisorctl tail web stderr (try each service)."]),
        LabObjective(id="fix-web", label="Bring the web service back up",
                     validator="linux_svc_web_running", args={"service": "web"},
                     hints=["The log shows the real cause — check the command= path in ~/services/conf.d/web.conf.",
                            "After fixing: supervisorctl reread && supervisorctl update."]),
        LabObjective(id="fix-worker", label="Bring the worker service back up",
                     validator="linux_svc_worker_running", args={"service": "worker"},
                     hints=["worker.py exits when a required environment variable is missing — the log names it."]),
        LabObjective(id="fix-cache", label="Bring the cache service back up",
                     validator="linux_svc_cache_running", args={"service": "cache"},
                     hints=["cache.py cannot find its config file — check the --config path in cache.conf."]),
        LabObjective(id="root-causes", label="Record the root cause of each failure",
                     validator="linux_svc_root_causes",
                     args={"causes": {"web": "command", "worker": "environment", "cache": "config"}},
                     hints=["One line each: what was wrong and what you changed."]),
    ],
)

LINUX_CRON_LAB = LabDefinition(
    id="linux-cron-001",
    slug="linux-cron-automation",
    title="Cron & Automation",
    description=(
        "Schedule real recurring jobs with real cron syntax. The system cron daemon requires root, "
        "which an unprivileged container does not have, so jobs run under supercronic — a "
        "crontab-compatible scheduler that runs as your user. The five-field format, the gotchas "
        "(@reboot, PATH, % handling), and the verify-by-output discipline are identical to system "
        "cron."
    ),
    category="linux", difficulty="beginner", estimated_minutes=20, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="write-crontab", label="Write a crontab with two jobs",
                     validator="linux_cron_jobs_written", args={"min_jobs": 2},
                     hints=["Edit ~/cron/jobs.cron: a heartbeat every minute and a report every 5 minutes.",
                            "Format: * * * * * /home/student/cron/heartbeat.sh >> /home/student/cron/out/heartbeat.log 2>&1"]),
        LabObjective(id="valid-syntax", label="Prove every line parses",
                     validator="linux_cron_syntax_valid",
                     hints=["Five time fields then a command — minutes hours dom month dow. No shortcuts until it parses."]),
        LabObjective(id="start-scheduler", label="Start the scheduler",
                     validator="linux_cron_scheduler_running",
                     hints=["supercronic ~/cron/jobs.cron > ~/cron/supercronic.log 2>&1 &", "Verify: ps aux | grep supercronic"]),
        LabObjective(id="job-output", label="Confirm a job actually ran",
                     validator="linux_cron_job_ran",
                     args={"output_file": "~/cron/out/heartbeat.log", "marker": "heartbeat"},
                     hints=["Wait ~70 seconds, then cat ~/cron/out/heartbeat.log — cron is verified by its output, not by faith."]),
    ],
)

LINUX_AUDIT_LAB = LabDefinition(
    id="linux-audit-001",
    slug="linux-audit-fail2ban",
    title="Audit Logs & fail2ban",
    description=(
        "Someone is hammering SSH. Work the seeded auth log like an analyst: find the brute-force "
        "source, count the attempts, prove the real sshd filter matches with fail2ban-regex, and "
        "author a real jail.local that would ban the attacker. Honest note: fail2ban-server needs "
        "root to enforce bans, so nothing is actually banned here — your jail.local is validated "
        "for correctness, and the ban list is computed from your findtime/maxretry settings."
    ),
    category="linux", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=_ENV,
    targets=[_TARGET],
    objectives=[
        LabObjective(id="view-log", label="Open the auth log",
                     validator="linux_audit_log_viewed",
                     hints=["cat ~/audit/auth.log — or tail -30 for the recent window."]),
        LabObjective(id="top-offender", label="Identify the brute-force source IP",
                     validator="linux_audit_top_offender", args={"ip": "203.0.113.66"},
                     hints=["grep -c 'Failed password' ~/audit/auth.log per IP — one address dominates."]),
        LabObjective(id="count-attempts", label="Count its failed attempts",
                     validator="linux_audit_offense_count", args={"ip": "203.0.113.66", "minimum": 30},
                     hints=["grep 'Failed password' ~/audit/auth.log | grep -c 203.0.113.66"]),
        LabObjective(id="filter-test", label="Prove the sshd filter matches",
                     validator="linux_fail2ban_regex", args={"minimum": 30},
                     hints=["fail2ban-regex ~/audit/auth.log /etc/fail2ban/filter.d/sshd.conf — check 'Matched lines'."]),
        LabObjective(id="jail-local", label="Author a jail.local",
                     validator="linux_jail_configured",
                     args={"settings": {"bantime": "3600", "findtime": "600", "maxretry": "5"}},
                     hints=["Write ~/audit/jail.local: [sshd] with bantime, findtime, maxretry."]),
        LabObjective(id="would-ban", label="Confirm who your jail would ban",
                     validator="linux_would_ban", args={"expected": ["203.0.113.66"]},
                     hints=["With maxretry 5 in 10 minutes, which IP trips the ban?"]),
    ],
)

LINUX_HARDENING_LAB = LabDefinition(
    id="linux-hardening-001",
    slug="linux-hardening-capstone",
    title="Hardening Capstone",
    description=(
        "A host was provisioned badly and something may already be living on it. Run the posture "
        "checker, fix every FAIL — SSH config, sudoers delegation, file permissions, firewall "
        "ruleset, and a planted malicious cron entry — until it reports POSTURE: HARDENED. This "
        "is the capstone for everything in the Linux & Systems track."
    ),
    category="linux", difficulty="advanced", estimated_minutes=30, shell="linux_cli",
    environment=LabEnvironmentConfig(
        provider="docker", image="road-to-cissp/linux-admin-hardening:latest",
        workdir="/home/student",
        idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True),
    targets=[LabTarget(hostname="bastion", role="Misconfigured bastion host (hardening target)",
                       intentionally_vulnerable=True)],
    objectives=[
        LabObjective(id="run-check", label="Run the posture checker",
                     validator="linux_posture_started",
                     hints=["~/posture-check — read every FAIL before fixing anything."]),
        LabObjective(id="fix-ssh", label="Harden the SSH daemon config",
                     validator="linux_posture_ssh", args={"check": "ssh_hardened"},
                     hints=["~/ssh-lab/sshd_config: PasswordAuthentication no, Port 2222."]),
        LabObjective(id="fix-sudoers", label="Restrict the contractors sudoers drop-in",
                     validator="linux_posture_sudoers", args={"check": "sudoers_restricted"},
                     hints=["~/sysroot/etc/sudoers.d/contractors: least privilege, no blanket NOPASSWD: ALL."]),
        LabObjective(id="fix-perms", label="Lock down the secret file and helper tool",
                     validator="linux_posture_perms", args={"check": "secret_perms"},
                     hints=["secret.txt to 0600; ~/bin/tool must not be world-writable."]),
        LabObjective(id="fix-firewall", label="Write a passing firewall ruleset",
                     validator="linux_posture_firewall", args={"check": "firewall_checked"},
                     hints=["Fix ~/firewall/rules.nft, then /usr/local/bin/check-firewall must say ALL CHECKS PASSED."]),
        LabObjective(id="fix-cron", label="Remove the weak cron entry",
                     validator="linux_posture_cron", args={"check": "cron_clean"},
                     hints=["~/cron/jobs.cron calls a script from world-writable /tmp — remove or relocate it."]),
        LabObjective(id="all-green", label="Reach POSTURE: HARDENED",
                     validator="linux_posture_all_pass", args={"total": 6},
                     hints=["Re-run ~/posture-check until all six checks PASS."]),
    ],
)
