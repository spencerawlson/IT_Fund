"""Generate auth.log for py-loganalysis-001 (seeded, deterministic).

ANSWERS (random.seed(42); regenerate to refresh):
  FAILED_COUNT=73
  ATTACKER_IPS (failed-login sources, desc) = 203.0.113.66 x61, 198.51.100.23 x9, 10.1.4.20 x3
  TOP_TARGET_USER=admin x37
  SCAN_SRC=192.0.2.77 x24 closed-port probes
  ODD_HOUR_SUCCESSES: 03:07 opsvc (legit on-call), 04:41/04:43 svc-backup from 203.0.113.66 (suspicious)
Run this script to regenerate auth.log; answers must match what validators hint at.
"""
import random

random.seed(42)

ATTACKER = "203.0.113.66"     # main brute-forcer
ATTACKER2 = "198.51.100.23"   # low-and-slow second attacker
SCANNER = "192.0.2.77"        # port scanner
INTERNAL = "10.1.4.20"        # workstation (legit user maria fat-fingers)

USERS = ["maria", "chen", "ada", "opsvc", "svc-backup"]
TARGETS = ["admin"] * 6 + ["root"] * 3 + ["maria"] * 2 + ["test", "opsvc", "chen"]

lines = []

def ts(day, h, m, s):
    return f"2026-09-{day:02d} {h:02d}:{m:02d}:{s:02d}"

# --- brute force waves from the main attacker ---
day = 28
for wave, (h, n) in enumerate([(1, 18), (2, 15), (14, 20), (3, 8)]):
    d = 28 + wave // 2
    for i in range(n):
        m = random.randint(0, 59); s = random.randint(0, 59)
        lines.append((ts(d, h, m, s),
                      f"app-auth: Login failed for user '{random.choice(TARGETS)}' from {ATTACKER}"))
# --- second attacker, slower ---
for d, h, n in [(28, 22, 4), (29, 11, 3), (30, 16, 2)]:
    for _ in range(n):
        lines.append((ts(d, h, random.randint(0, 59), random.randint(0, 59)),
                      f"app-auth: Login failed for user '{random.choice(TARGETS)}' from {ATTACKER2}"))
# --- legit fat-fingers from the internal workstation ---
for d, h, mi in [(28, 9, 4), (29, 13, 47), (30, 8, 59)]:
    lines.append((ts(d, h, mi, 12), f"app-auth: Login failed for user 'maria' from {INTERNAL}"))
# --- legit successful logins, business hours ---
for d in (28, 29, 30):
    for u, h in [("maria", 8), ("chen", 9), ("ada", 9), ("maria", 13), ("chen", 15), ("ada", 17)]:
        lines.append((ts(d, h, random.randint(0, 59), random.randint(0, 59)),
                      f"app-auth: Login succeeded for user '{u}' from {INTERNAL}"))
    # admin works late once - fine
    lines.append((ts(d, 19, random.randint(0, 40), random.randint(0, 59)),
                  f"app-auth: Login succeeded for user 'admin' from {INTERNAL}"))
# --- odd-hour successes: one legit on-call, two suspicious ---
lines.append((ts(29, 3, 7, 33), "app-auth: Login succeeded for user 'opsvc' from 10.1.4.9"))
lines.append((ts(30, 4, 41, 2), f"app-auth: Login succeeded for user 'svc-backup' from {ATTACKER}"))
lines.append((ts(30, 4, 43, 19), f"app-auth: Login succeeded for user 'svc-backup' from {ATTACKER}"))
# --- port-scan probes from the scanner ---
for d, h, n in [(28, 23, 10), (29, 23, 9), (30, 2, 5)]:
    for _ in range(n):
        port = random.choice([22, 3389, 445, 1433, 3306, 8080])
        lines.append((ts(d, h, random.randint(0, 59), random.randint(0, 59)),
                      f"net-scan: Connection attempt to closed port {port} from {SCANNER}"))

lines.sort()
out = "\n".join(f"{t} {m}" for t, m in lines) + "\n"
with open("auth.log", "w") as f:
    f.write(out)

# --- answers ---
from collections import Counter
failed = [m for t, m in lines if "Login failed" in m]
import re
ips = Counter(re.search(r"from (\S+)", m).group(1) for m in failed)
users = Counter(re.search(r"user '([^']+)'", m).group(1) for m in failed)
scans = [m for t, m in lines if "closed port" in m]
print(f"FAILED_COUNT={len(failed)}")
print("ATTACKER_IPS=" + ", ".join(f"{ip} x{c}" for ip, c in ips.most_common()))
print("TOP_TARGET_USER=" + ", ".join(f"{u} x{c}" for u, c in users.most_common(3)))
print(f"SCAN_SRC={SCANNER} x{len(scans)}")
print(f"TOTAL_LINES={len(lines)}")
