"""Linux terminal essentials lab: learn the Linux CLI by doing. Data only; nothing here executes.

Eight hands-on objectives on a simulated Ubuntu workstation: navigate the filesystem, copy files
into a backup directory, harden file permissions, extract error lines from syslog with grep,
find and kill a runaway process, diagnose a failed nginx service from its journal logs (a typo in
nginx.conf) and bring it back up, discover which port sshd listens on, and create a new user.
Drives the `linux_cli` shell. Validators are registered here (lt_* namespace) so they load with
the lab. Every validator inspects the recorded shell/filesystem/service state, not command
history.
"""
from __future__ import annotations

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


def _cli(findings):
    return findings.get("_linux_cli") or {}


# ---- outcome validators (check recorded state, not which commands were typed) ----

@validator("lt_navigated")
def lt_navigated(args, findings):
    st = _cli(findings)
    if "/var/log" in st.get("visited", []):
        return True, "You navigated to /var/log.", {"visited": st["visited"]}
    return False, "Change into /var/log: cd /var/log.", None


@validator("lt_backup_created")
def lt_backup_created(args, findings):
    if findings.get("lt_backup_created"):
        return True, "You backed notes.txt up into projects/backup/.", None
    return False, "Create ~/projects/backup and copy notes.txt into it: mkdir ~/projects/backup && cp ~/notes.txt ~/projects/backup/.", None


@validator("lt_permissions_hardened")
def lt_permissions_hardened(args, findings):
    if findings.get("lt_permissions_hardened"):
        return True, "notes.txt is now owner-only (600).", {"mode": "600"}
    return False, "Restrict notes.txt to owner read/write: chmod 600 ~/notes.txt.", None


@validator("lt_errors_extracted")
def lt_errors_extracted(args, findings):
    if findings.get("lt_errors_extracted"):
        return True, "You extracted every ERROR line from syslog into ~/errors.txt.", None
    return False, "Pull the ERROR lines out of /var/log/syslog: grep ERROR /var/log/syslog > ~/errors.txt.", None


@validator("lt_runaway_killed")
def lt_runaway_killed(args, findings):
    if findings.get("lt_runaway_killed"):
        return True, "The runaway backup-agent process is gone.", None
    return False, "Find the CPU-hogging process with ps aux or top, then kill its PID.", None


@validator("lt_nginx_fixed")
def lt_nginx_fixed(args, findings):
    if findings.get("lt_nginx_fixed"):
        return True, "nginx is running again with a valid configuration.", {"service": "nginx", "status": "active"}
    return False, ("Diagnose the failure (systemctl status nginx, journalctl -u nginx), fix the config "
                   "(a backup exists at /etc/nginx/nginx.conf.bak), then systemctl start nginx."), None


@validator("lt_ssh_port_found")
def lt_ssh_port_found(args, findings):
    if findings.get("lt_ssh_port_found"):
        return True, "You identified sshd's listening port.", {"port": 22}
    return False, "Inspect listening sockets (ss -tuln) and record sshd's port in ~/ssh_port.txt.", None


@validator("lt_user_created")
def lt_user_created(args, findings):
    if findings.get("lt_user_created"):
        return True, "The deploy user exists and has a password set.", {"user": "deploy"}
    return False, "Create the deploy user and set its password: useradd -m deploy && passwd deploy.", None


LINUX_TERMINAL_LAB = LabDefinition(
    id="linux-terminal-001",
    slug="linux-terminal",
    title="Linux Terminal Essentials",
    description=(
        "Learn the Linux command line the way it is actually used: navigate the filesystem, copy "
        "and move files, lock down permissions, search logs with grep, manage processes, "
        "troubleshoot a failed nginx service from its journal logs, inspect listening ports, and "
        "manage users. Everything is simulated — nothing runs on a real host. Aligned to "
        "CompTIA Linux+ (XK0-005) objectives."
    ),
    category="linux",
    difficulty="beginner",
    estimated_minutes=45,
    shell="linux_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/linux-terminal:latest",
        # No image is built (mock provider simulates the host); kept for uniformity.
        workdir="/home/student",
        idle_timeout_minutes=25,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="linux-lab", role="Ubuntu 24.04 workstation (simulated)"),
    ],
    objectives=[
        LabObjective(
            id="navigate", label="Find your way around", validator="lt_navigated",
            description="Get oriented: check where you are, list files, and move into /var/log.",
            hints=["pwd prints your current directory; ls -la shows hidden files too.",
                   "cd /var/log moves you there; cd ~ takes you home."]),
        LabObjective(
            id="backup-files", label="Back up your notes", validator="lt_backup_created",
            description="Create a backup directory under ~/projects and copy notes.txt into it.",
            hints=["mkdir ~/projects/backup creates the directory.",
                   "cp ~/notes.txt ~/projects/backup/ copies the file into it."]),
        LabObjective(
            id="harden-permissions", label="Lock down private notes", validator="lt_permissions_hardened",
            description="Your notes.txt is world-readable. Restrict it to owner read/write only.",
            hints=["ls -l ~/notes.txt shows the current mode.",
                   "chmod 600 ~/notes.txt gives rw to you and nothing to anyone else."]),
        LabObjective(
            id="extract-errors", label="Mine the logs for errors", validator="lt_errors_extracted",
            description="Find every line containing ERROR in /var/log/syslog and save them to ~/errors.txt.",
            hints=["grep ERROR /var/log/syslog prints the matching lines.",
                   "Add > ~/errors.txt to redirect the output into a file."]),
        LabObjective(
            id="kill-runaway", label="Stop the runaway process", validator="lt_runaway_killed",
            description="Something is eating nearly all CPU. Find it and terminate it.",
            hints=["ps aux or top shows per-process CPU usage — look for the outlier.",
                   "kill <pid> terminates it. Do not kill PID 1 or your own shell."]),
        LabObjective(
            id="fix-nginx", label="Rescue the web server", validator="lt_nginx_fixed",
            description="nginx failed to start. Diagnose it from the service logs, repair the "
                       "configuration, and bring the service back up.",
            hints=["systemctl status nginx confirms the failure; journalctl -u nginx shows why.",
                   "The journal points at a bad directive in /etc/nginx/nginx.conf — compare it with the .bak file.",
                   "Copy the backup over the broken config, then systemctl start nginx."]),
        LabObjective(
            id="find-ssh-port", label="What port is sshd on?", validator="lt_ssh_port_found",
            description="Determine which TCP port the SSH daemon listens on and record it in ~/ssh_port.txt.",
            hints=["ss -tuln lists listening sockets — look for the ssh row.",
                   "echo 22 > ~/ssh_port.txt records your answer (replace 22 with what you find)."]),
        LabObjective(
            id="create-user", label="Onboard a new user", validator="lt_user_created",
            description="Create a deploy user with a home directory and set its password.",
            hints=["useradd -m deploy creates the account and its home directory.",
                   "passwd deploy sets the password (simulated — nothing real is stored)."]),
    ],
)
