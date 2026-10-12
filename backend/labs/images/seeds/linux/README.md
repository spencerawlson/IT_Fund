# Linux administration workstation

You are `student` on an unprivileged Debian container. This is a REAL Linux system with
REAL tools — but the container deliberately lacks root, so a few things work differently
than on a production host. Know the boundaries; they are the lesson.

## What is real here

- `chmod`, `chown`/`chgrp`, `setfacl`/`getfacl`, `stat` — real, on real files.
- `ssh-keygen`, `sshd`, `ssh` — real. sshd runs as YOU on port 2222 (a non-root
  process cannot bind port 22; that is why hardening moves SSH off the default port).
- `supervisord` / `supervisorctl` — real process supervision (see below).
- `supercronic` — a real crontab-compatible scheduler that runs as your user.
- `fail2ban-regex` — the real filter tester. `visudo -c` — the real syntax checker.
- `sudo -l` — lists your real sudo privileges (sudo cannot escalate here; see below).

## Honest boundaries

1. **No root.** The provider drops all capabilities and sets no-new-privileges, so
   `sudo`/`su` cannot escalate. `useradd`, `groupadd`, `usermod`, `userdel`, `groupmod`
   are shims that manage a PRACTICE ROOT at `~/sysroot` — the `/etc/passwd`,
   `/etc/group` and `/etc/shadow` formats inside are byte-identical to a real host,
   where you would run the same commands as root.
2. **No systemd.** systemd cannot run as PID 1 in an unprivileged container, so
   services are managed by **supervisord** (`supervisorctl status`, logs, `reread` /
   `update`). The troubleshooting workflow is the same.
3. **No system cron daemon** (it requires root). Cron jobs run under **supercronic**
   with identical five-field crontab syntax.
4. **No fail2ban-server** (it requires root to enforce bans). You author a real
   `jail.local` and prove the filter with `fail2ban-regex`; bans are computed, not
   enforced.
5. **No kernel firewall.** `nft`/`iptables` binaries are installed for inspection,
   but the kernel refuses to enforce rules without CAP_NET_ADMIN. The firewall lab
   is write-and-verify: `check-firewall` reviews your ruleset statically.
