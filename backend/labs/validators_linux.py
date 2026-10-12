"""Outcome-based validators for the Linux administration lab group (Phase 3).

All eight labs are Docker-backed (road-to-cissp/linux-admin): the browser terminal runs REAL
commands inside the container, and the learner presses "I did this" on each objective after
verifying the real state themselves. That button records findings keyed by validator name
(`{<validator_name>: {"attested": True}}`), so every validator here follows the attestation
pattern: the finding's presence is the pass signal, and when the finding carries richer
detail (pasted state recorded via the findings API), the validator checks that detail
against `args` instead of waving it through. Nothing here inspects command history.

Validator names are all prefixed `linux_` so they stay globally unique in VALIDATORS.
"""
from __future__ import annotations

from typing import Any

from labs.validators import validator


def _detail(name: str, findings: dict[str, Any]) -> dict[str, Any] | None:
    """Attestation payload for validator `name`, or None if not attested."""
    state = findings.get(name)
    if not state:
        return None
    return state if isinstance(state, dict) else {}


def _norm_mode(mode: Any) -> str:
    """Normalise a stat mode to its last 3-4 octal digits ('0600' -> '600')."""
    s = str(mode or "").strip().lower().removeprefix("0o")
    return s[-4:] if len(s) > 4 else s


def _entries_contain(lines: Any, expected: list[str]) -> list[str]:
    """Return the expected items missing from a list of raw entry lines."""
    have = {str(l).strip() for l in (lines or []) if str(l).strip()}
    return [e for e in expected if e not in have and not any(h.startswith(e + ":") for h in have)]


# ---------------------------------------------------------------------------
# linux-users-001 — Linux Users, Groups & sudo
# ---------------------------------------------------------------------------

@validator("linux_user_created")
def linux_user_created(args, findings):
    username = args.get("username")
    detail = _detail("linux_user_created", findings)
    if detail is None:
        return False, f"Create the user (useradd -m {username or '<name>'}) in the practice root, then press 'I did this'.", None
    lines = detail.get("passwd_lines") or []
    if lines and username and not any(str(l).split(":")[0] == username for l in lines if ":" in str(l)):
        return False, f"{username} is not in the attested passwd entries.", None
    return True, f"User {username} exists in the practice passwd database.", {"user": username}


@validator("linux_group_created")
def linux_group_created(args, findings):
    group = args.get("group")
    detail = _detail("linux_group_created", findings)
    if detail is None:
        return False, f"Create the group (groupadd {group or '<name>'}), then press 'I did this'.", None
    lines = detail.get("group_lines") or []
    if lines and group and not any(str(l).split(":")[0] == group for l in lines if ":" in str(l)):
        return False, f"{group} is not in the attested group entries.", None
    return True, f"Group {group} exists in the practice group database.", {"group": group}


@validator("linux_user_in_group")
def linux_user_in_group(args, findings):
    username, group = args.get("username"), args.get("group")
    detail = _detail("linux_user_in_group", findings)
    if detail is None:
        return False, f"Add {username} to {group} (usermod -aG {group} {username}), then press 'I did this'.", None
    memberships = detail.get("memberships") or {}
    if memberships and username:
        groups = memberships.get(username) or []
        if group not in groups:
            return False, f"Attested memberships show {username} is not in {group}.", None
    id_output = str(detail.get("id_output") or "")
    if not memberships and id_output and group and group not in id_output:
        return False, f"The attested id output does not mention {group}.", None
    return True, f"{username} is a member of {group}.", {"user": username, "group": group}


@validator("linux_sudoers_syntax_ok")
def linux_sudoers_syntax_ok(args, findings):
    path = args.get("path")
    detail = _detail("linux_sudoers_syntax_ok", findings)
    if detail is None:
        return False, f"Validate the sudoers drop-in (visudo -c -f {path or '<file>'}), then press 'I did this'.", None
    output = str(detail.get("visudo_output") or "")
    if output and "parsed ok" not in output.lower():
        return False, "The attested visudo output does not report 'parsed OK'.", None
    return True, f"Sudoers drop-in {path} passes visudo syntax check.", {"path": path}


@validator("linux_sudoers_entry")
def linux_sudoers_entry(args, findings):
    user = args.get("user")
    detail = _detail("linux_sudoers_entry", findings)
    if detail is None:
        return False, f"Grant {user or '<user>'} least-privilege sudo in sudoers.d, then press 'I did this'.", None
    content = str(detail.get("sudoers_content") or "")
    if content:
        missing = []
        if user and user not in content:
            missing.append(user)
        if "NOPASSWD" not in content and " ALL" not in content:
            missing.append("a privilege specification")
        if missing:
            return False, f"The attested sudoers content is missing: {', '.join(missing)}.", None
    return True, f"Sudoers entry for {user} is in place.", {"user": user}


@validator("linux_sudo_listed")
def linux_sudo_listed(args, findings):
    privilege = args.get("privilege")
    detail = _detail("linux_sudo_listed", findings)
    if detail is None:
        return False, "Run sudo -l to list your real sudo privileges, then press 'I did this'.", None
    output = str(detail.get("sudo_l_output") or "")
    if output and privilege and privilege not in output:
        return False, f"The attested sudo -l output does not show '{privilege}'.", None
    return True, "You listed your real sudo privileges with sudo -l.", None


# ---------------------------------------------------------------------------
# linux-permissions-001 — Permissions & ACLs
# ---------------------------------------------------------------------------

def _mode_check(name, args, findings, todo):
    detail = _detail(name, findings)
    if detail is None:
        return None, (False, todo, None)
    modes = detail.get("stat_modes") or {}
    path, want = args.get("path"), _norm_mode(args.get("mode"))
    if modes and path:
        got = _norm_mode(modes.get(path))
        if got != want:
            return None, (False, f"Attested mode for {path} is {got or 'unknown'}, expected {want}.", None)
    return detail, None


@validator("linux_perm_secret")
def linux_perm_secret(args, findings):
    detail, fail = _mode_check("linux_perm_secret", args, findings,
                              "Lock down the secret (chmod 600), then press 'I did this'.")
    if fail:
        return fail
    return True, f"{args.get('path')} is mode {args.get('mode')}: owner read/write only.", {"path": args.get("path")}


@validator("linux_perm_script")
def linux_perm_script(args, findings):
    detail, fail = _mode_check("linux_perm_script", args, findings,
                              "Make the script executable (chmod 755), then press 'I did this'.")
    if fail:
        return fail
    return True, f"{args.get('path')} is mode {args.get('mode')}: executable by everyone.", {"path": args.get("path")}


@validator("linux_perm_group_dir")
def linux_perm_group_dir(args, findings):
    path = args.get("path")
    detail = _detail("linux_perm_group_dir", findings)
    if detail is None:
        return False, f"Set up the shared directory (chgrp + chmod 2770 on {path or '<dir>'}), then press 'I did this'.", None
    modes = detail.get("stat_modes") or {}
    if modes and path and _norm_mode(modes.get(path)) != _norm_mode(args.get("mode")):
        return False, f"Attested mode for {path} is {_norm_mode(modes.get(path)) or 'unknown'}, expected {args.get('mode')} (setgid).", None
    groups = detail.get("stat_groups") or {}
    if groups and path and args.get("group") and groups.get(path) != args.get("group"):
        return False, f"Attested group for {path} is {groups.get(path)}, expected {args.get('group')}.", None
    return True, f"{path} is a setgid group directory owned by {args.get('group')}.", {"path": path}


@validator("linux_perm_acl")
def linux_perm_acl(args, findings):
    path = args.get("path")
    detail = _detail("linux_perm_acl", findings)
    if detail is None:
        return False, f"Add the ACL entry (setfacl -m ... {path or '<file>'}), then press 'I did this'.", None
    facls = detail.get("getfacl") or {}
    raw = str(facls.get(path) or "") if isinstance(facls, dict) else ""
    if raw:
        missing = [e for e in (args.get("entries") or []) if e not in raw]
        if missing:
            return False, f"The attested getfacl output is missing: {', '.join(missing)}.", None
    return True, f"ACL entries are set on {path}.", {"path": path, "entries": args.get("entries")}


@validator("linux_perm_sticky")
def linux_perm_sticky(args, findings):
    detail, fail = _mode_check("linux_perm_sticky", args, findings,
                              "Set the sticky bit on the dropbox (chmod 1777), then press 'I did this'.")
    if fail:
        return fail
    return True, f"{args.get('path')} is mode {args.get('mode')}: sticky bit set.", {"path": args.get("path")}


# ---------------------------------------------------------------------------
# linux-ssh-001 — SSH Hardening
# ---------------------------------------------------------------------------

@validator("linux_ssh_config_viewed")
def linux_ssh_config_viewed(args, findings):
    detail = _detail("linux_ssh_config_viewed", findings)
    if detail is None:
        return False, "Read the starter sshd_config first (cat ~/ssh-lab/sshd_config), then press 'I did this'.", None
    return True, "You reviewed the SSH daemon configuration.", None


@validator("linux_ssh_keypair")
def linux_ssh_keypair(args, findings):
    key = args.get("key", "id_ed25519")
    detail = _detail("linux_ssh_keypair", findings)
    if detail is None:
        return False, "Generate a key pair (ssh-keygen -t ed25519), then press 'I did this'.", None
    files = detail.get("key_files") or []
    if files and not any(key in str(f) for f in files):
        return False, f"The attested key files do not include {key}.", None
    return True, f"Key pair {key} generated.", {"key": key}


@validator("linux_sshd_hardened")
def linux_sshd_hardened(args, findings):
    expected = {str(k).lower(): str(v).lower() for k, v in (args.get("settings") or {}).items()}
    detail = _detail("linux_sshd_hardened", findings)
    if detail is None:
        return False, "Harden ~/ssh-lab/sshd_config (port, PasswordAuthentication, PermitRootLogin), then press 'I did this'.", None
    effective = {str(k).lower(): str(v).lower() for k, v in (detail.get("sshd_T") or {}).items()}
    if effective:
        wrong = [k for k, v in expected.items() if effective.get(k) != v]
        if wrong:
            return False, "sshd -T shows wrong values for: " + ", ".join(
                f"{k} (got {effective.get(k) or 'unset'}, want {expected[k]})" for k in wrong) + ".", None
    return True, "sshd_config is hardened: high port, key-only auth, no root login.", {"settings": args.get("settings")}


@validator("linux_sshd_listening")
def linux_sshd_listening(args, findings):
    port = str(args.get("port", "2222"))
    detail = _detail("linux_sshd_listening", findings)
    if detail is None:
        return False, f"Start sshd on port {port} and confirm it listens (ss -tlnp), then press 'I did this'.", None
    output = str(detail.get("ss_output") or detail.get("ps_output") or "")
    if output and f":{port}" not in output:
        return False, f"The attested output shows nothing listening on port {port}.", None
    return True, f"sshd is listening on port {port}.", {"port": port}


@validator("linux_ssh_key_login")
def linux_ssh_key_login(args, findings):
    marker = args.get("marker", "SSH_LOGIN_OK")
    detail = _detail("linux_ssh_key_login", findings)
    if detail is None:
        return False, f"Log in with your key (ssh -p 2222 student@localhost 'echo {marker}'), then press 'I did this'.", None
    output = str(detail.get("login_output") or "")
    if output and marker not in output:
        return False, f"The attested login output does not contain the marker '{marker}'.", None
    return True, "Key-based login to loopback succeeded — password auth is off and keys work.", {"marker": marker}


# ---------------------------------------------------------------------------
# linux-firewall-001 — Host Firewall (write-and-verify)
# ---------------------------------------------------------------------------

@validator("linux_fw_rules_written")
def linux_fw_rules_written(args, findings):
    minimum = int(args.get("min_rules", 4))
    detail = _detail("linux_fw_rules_written", findings)
    if detail is None:
        return False, "Write your ruleset to ~/firewall/rules.nft, then press 'I did this'.", None
    text = str(detail.get("rules_text") or "")
    if text:
        rules = [l for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]
        if len(rules) < minimum:
            return False, f"Only {len(rules)} rule lines attested — write at least {minimum}.", None
    return True, "A firewall ruleset is written to ~/firewall/rules.nft.", None


@validator("linux_fw_checker_pass")
def linux_fw_checker_pass(args, findings):
    detail = _detail("linux_fw_checker_pass", findings)
    if detail is None:
        return False, "Run check-firewall until it passes, then press 'I did this'.", None
    output = str(detail.get("checker_output") or "")
    if output and "ALL CHECKS PASSED" not in output:
        return False, "The attested check-firewall output does not report ALL CHECKS PASSED.", None
    return True, "check-firewall validates your ruleset: syntax and semantics pass.", None


@validator("linux_fw_default_deny")
def linux_fw_default_deny(args, findings):
    patterns = [str(p).lower() for p in (args.get("patterns") or ["policy drop"])]
    detail = _detail("linux_fw_default_deny", findings)
    if detail is None:
        return False, "Set a default-deny policy in the ruleset, then press 'I did this'.", None
    text = str(detail.get("rules_text") or "").lower()
    if text:
        missing = [p for p in patterns if p not in text]
        if missing:
            return False, f"The attested ruleset is missing a default deny ({', '.join(missing)}).", None
    return True, "Default-deny policy is in place: unmatched traffic is dropped.", None


@validator("linux_fw_ssh_allowed")
def linux_fw_ssh_allowed(args, findings):
    port = str(args.get("port", "2222"))
    detail = _detail("linux_fw_ssh_allowed", findings)
    if detail is None:
        return False, f"Allow SSH on port {port} for the management network, then press 'I did this'.", None
    text = str(detail.get("rules_text") or "").lower()
    if text and (port not in text or "accept" not in text):
        return False, f"The attested ruleset does not accept TCP port {port}.", None
    return True, f"Management SSH (port {port}) is explicitly allowed.", {"port": port}


# ---------------------------------------------------------------------------
# linux-services-001 — Service Troubleshooting (supervisord)
# ---------------------------------------------------------------------------

@validator("linux_svc_logs_read")
def linux_svc_logs_read(args, findings):
    service = args.get("service")
    detail = _detail("linux_svc_logs_read", findings)
    if detail is None:
        return False, f"Read the {service or 'service'} logs (supervisorctl tail {service or '<svc>'}), then press 'I did this'.", None
    excerpts = detail.get("log_excerpts") or {}
    if excerpts and service and not str(excerpts.get(service) or "").strip():
        return False, f"No log excerpt attested for {service}.", None
    return True, f"You read the {service} logs — the error is visible there.", {"service": service}


def _service_running(name, args, findings, todo):
    service = args.get("service", name)
    detail = _detail(f"linux_svc_{name}_running", findings)
    if detail is None:
        return False, todo, None
    status = str(detail.get("supervisor_status") or "")
    if status:
        line = next((l for l in status.splitlines() if l.split()[0:1] == [service]), "")
        if "RUNNING" not in line:
            return False, f"Attested supervisorctl status does not show {service} RUNNING.", None
    return True, f"{service} is RUNNING under supervisord.", {"service": service}


@validator("linux_svc_web_running")
def linux_svc_web_running(args, findings):
    return _service_running("web", args, findings,
                            "Fix the web service config and get it RUNNING, then press 'I did this'.")


@validator("linux_svc_worker_running")
def linux_svc_worker_running(args, findings):
    return _service_running("worker", args, findings,
                            "Fix the worker service config and get it RUNNING, then press 'I did this'.")


@validator("linux_svc_cache_running")
def linux_svc_cache_running(args, findings):
    return _service_running("cache", args, findings,
                            "Fix the cache service config and get it RUNNING, then press 'I did this'.")


@validator("linux_svc_root_causes")
def linux_svc_root_causes(args, findings):
    causes = args.get("causes") or {}
    detail = _detail("linux_svc_root_causes", findings)
    if detail is None:
        return False, "Write down the root cause of each failure, then press 'I did this'.", None
    diagnoses = detail.get("diagnoses") or {}
    if diagnoses:
        bad = []
        for svc, keyword in causes.items():
            if keyword.lower() not in str(diagnoses.get(svc) or "").lower():
                bad.append(svc)
        if bad:
            return False, f"The attested diagnoses miss the root cause for: {', '.join(bad)}.", None
    return True, "All three root causes correctly diagnosed.", {"causes": list(causes)}


# ---------------------------------------------------------------------------
# linux-cron-001 — Cron & Automation
# ---------------------------------------------------------------------------

def _cron_jobs(text):
    """Parse crontab text into (valid, invalid) job lines (comments/blank skipped)."""
    import re
    valid, invalid = [], []
    field = r"(?:\*(?:/\d+)?|\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)"
    pattern = re.compile(rf"^\s*{field}\s+{field}\s+{field}\s+{field}\s+{field}\s+\S")
    for line in str(text or "").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        (valid if pattern.match(s) else invalid).append(s)
    return valid, invalid


@validator("linux_cron_jobs_written")
def linux_cron_jobs_written(args, findings):
    minimum = int(args.get("min_jobs", 2))
    detail = _detail("linux_cron_jobs_written", findings)
    if detail is None:
        return False, "Write your crontab to ~/cron/jobs.cron, then press 'I did this'.", None
    text = str(detail.get("crontab_text") or "")
    if text:
        valid, _ = _cron_jobs(text)
        if len(valid) < minimum:
            return False, f"Only {len(valid)} valid job lines attested — schedule at least {minimum}.", None
    return True, "Your crontab schedules the required jobs.", None


@validator("linux_cron_syntax_valid")
def linux_cron_syntax_valid(args, findings):
    detail = _detail("linux_cron_syntax_valid", findings)
    if detail is None:
        return False, "Double-check every crontab line parses, then press 'I did this'.", None
    text = str(detail.get("crontab_text") or "")
    if text:
        _, invalid = _cron_jobs(text)
        if invalid:
            return False, f"These crontab lines do not parse: {'; '.join(invalid)}.", None
    return True, "Every crontab line is syntactically valid.", None


@validator("linux_cron_scheduler_running")
def linux_cron_scheduler_running(args, findings):
    detail = _detail("linux_cron_scheduler_running", findings)
    if detail is None:
        return False, "Start the scheduler (supercronic ~/cron/jobs.cron &), then press 'I did this'.", None
    output = str(detail.get("ps_output") or "")
    if output and "supercronic" not in output:
        return False, "The attested process list does not show supercronic running.", None
    return True, "The supercronic scheduler is running as your user.", None


@validator("linux_cron_job_ran")
def linux_cron_job_ran(args, findings):
    output_file, marker = args.get("output_file"), args.get("marker")
    detail = _detail("linux_cron_job_ran", findings)
    if detail is None:
        return False, f"Wait for the job to write {output_file or '<file>'}, then press 'I did this'.", None
    outputs = detail.get("job_outputs") or {}
    if outputs and output_file:
        content = str(outputs.get(output_file) or "")
        if not content:
            return False, f"No output attested for {output_file} — the job has not run yet.", None
        if marker and marker not in content:
            return False, f"The attested {output_file} does not contain '{marker}'.", None
    return True, f"Scheduled job ran and wrote {output_file}.", {"file": output_file}


# ---------------------------------------------------------------------------
# linux-audit-001 — Audit Logs & fail2ban
# ---------------------------------------------------------------------------

@validator("linux_audit_log_viewed")
def linux_audit_log_viewed(args, findings):
    detail = _detail("linux_audit_log_viewed", findings)
    if detail is None:
        return False, "Open the auth log (cat ~/audit/auth.log), then press 'I did this'.", None
    return True, "You reviewed the authentication log.", None


@validator("linux_audit_top_offender")
def linux_audit_top_offender(args, findings):
    ip = args.get("ip")
    detail = _detail("linux_audit_top_offender", findings)
    if detail is None:
        return False, "Find the IP with the most failed logins, then press 'I did this'.", None
    offenders = detail.get("top_offenders") or []
    top = detail.get("top_offender")
    if (offenders or top) and ip not in offenders and top != ip:
        return False, f"The attested top offender is not {ip}.", None
    return True, f"{ip} is the brute-force source.", {"ip": ip}


@validator("linux_audit_offense_count")
def linux_audit_offense_count(args, findings):
    ip, minimum = args.get("ip"), int(args.get("minimum", 1))
    detail = _detail("linux_audit_offense_count", findings)
    if detail is None:
        return False, f"Count the failed logins from {ip or '<ip>'}, then press 'I did this'.", None
    counts = detail.get("offense_counts") or {}
    if counts and ip:
        n = int(counts.get(ip) or 0)
        if n < minimum:
            return False, f"Attested count for {ip} is {n} — recount (grep -c).", None
    return True, f"{ip} made at least {minimum} failed attempts.", {"ip": ip, "minimum": minimum}


@validator("linux_fail2ban_regex")
def linux_fail2ban_regex(args, findings):
    minimum = int(args.get("minimum", 1))
    detail = _detail("linux_fail2ban_regex", findings)
    if detail is None:
        return False, "Test the sshd filter (fail2ban-regex ~/audit/auth.log /etc/fail2ban/filter.d/sshd.conf), then press 'I did this'.", None
    matched = detail.get("regex_matched")
    if matched is not None and int(matched) < minimum:
        return False, f"fail2ban-regex matched only {matched} lines — expected at least {minimum}.", None
    return True, "The real sshd filter matches the attack lines.", {"matched": matched}


@validator("linux_jail_configured")
def linux_jail_configured(args, findings):
    settings = args.get("settings") or {}
    detail = _detail("linux_jail_configured", findings)
    if detail is None:
        return False, "Write ~/audit/jail.local with bantime/findtime/maxretry, then press 'I did this'.", None
    text = str(detail.get("jail_text") or "")
    if text:
        import re
        missing = []
        for key, want in settings.items():
            m = re.search(rf"^{re.escape(key)}\s*=\s*(\S+)", text, re.M | re.I)
            if not m or m.group(1) != str(want):
                missing.append(f"{key} = {want}")
        if missing:
            return False, f"jail.local is missing or misconfigures: {', '.join(missing)}.", None
    return True, "jail.local sets a sane sshd jail policy.", {"settings": settings}


@validator("linux_would_ban")
def linux_would_ban(args, findings):
    expected = set(args.get("expected") or [])
    detail = _detail("linux_would_ban", findings)
    if detail is None:
        return False, "List the IPs your jail would ban, then press 'I did this'.", None
    would = detail.get("would_ban")
    if would is not None and set(would) != expected:
        return False, f"Attested ban list {sorted(would)} does not match the expected {sorted(expected)}.", None
    return True, f"Your jail would ban exactly: {', '.join(sorted(expected))}.", {"banned": sorted(expected)}


# ---------------------------------------------------------------------------
# linux-hardening-001 — Hardening Capstone
# ---------------------------------------------------------------------------

@validator("linux_posture_started")
def linux_posture_started(args, findings):
    detail = _detail("linux_posture_started", findings)
    if detail is None:
        return False, "Run ~/posture-check and read every FAIL, then press 'I did this'.", None
    return True, "You have the full failure list — now fix them one by one.", None


def _posture_check(name, args, findings, todo):
    check = args.get("check")
    detail = _detail(name, findings)
    if detail is None:
        return False, todo, None
    checks = (detail.get("posture") or {}).get("checks") or {}
    if checks and checks.get(check) != "PASS":
        return False, f"posture-check still reports {check}: {checks.get(check) or 'FAIL'}.", None
    return True, f"Posture check '{check}' passes.", {"check": check}


@validator("linux_posture_ssh")
def linux_posture_ssh(args, findings):
    return _posture_check("linux_posture_ssh", args, findings,
                         "Harden ~/ssh-lab/sshd_config until posture-check passes ssh_hardened.")


@validator("linux_posture_sudoers")
def linux_posture_sudoers(args, findings):
    return _posture_check("linux_posture_sudoers", args, findings,
                         "Restrict the contractors sudoers drop-in until posture-check passes sudoers_restricted.")


@validator("linux_posture_perms")
def linux_posture_perms(args, findings):
    return _posture_check("linux_posture_perms", args, findings,
                         "Fix the file permissions until posture-check passes secret_perms.")


@validator("linux_posture_firewall")
def linux_posture_firewall(args, findings):
    return _posture_check("linux_posture_firewall", args, findings,
                         "Write a passing firewall ruleset until posture-check passes firewall_checked.")


@validator("linux_posture_cron")
def linux_posture_cron(args, findings):
    return _posture_check("linux_posture_cron", args, findings,
                         "Remove the world-writable cron entry until posture-check passes cron_clean.")


@validator("linux_posture_all_pass")
def linux_posture_all_pass(args, findings):
    total = int(args.get("total", 1))
    detail = _detail("linux_posture_all_pass", findings)
    if detail is None:
        return False, "Run posture-check until every check passes, then press 'I did this'.", None
    checks = (detail.get("posture") or {}).get("checks") or {}
    if checks:
        failed = [k for k, v in checks.items() if v != "PASS"]
        if failed:
            return False, f"Still failing: {', '.join(failed)}.", None
        if len(checks) < total:
            return False, f"Only {len(checks)} checks attested — expected {total}.", None
    return True, f"POSTURE: HARDENED — all {total} checks pass.", {"total": total}
