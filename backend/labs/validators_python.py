"""Outcome-based validators for the Phase 3 Python-tools labs (Docker-backed).

Same attestation contract as labs/validators.py: each validator inspects the recorded lab STATE
(the `findings` the learner attests via the session API), never command history. The learner runs
real tools inside the container (python3, sqlite3, semgrep) and records what they uncovered.

Expected seeded answers:
  - py-loganalysis-001: auth.log has 73 failed logins; top attacker 203.0.113.66 (61);
    top-targeted user 'admin' (37); port-scan source 192.0.2.77 (24 probes).
  - py-sqli-001: vuln_app.py login injection `' OR '1'='1` returns all 3 users;
    vulnerable functions: get_user (SELECT) and add_note (INSERT).
  - py-semgrep-001: custom rules fire 6 findings (4 ERROR, 2 WARNING); a correct
    fix re-runs to 0 findings.
"""
from __future__ import annotations

from labs.validators import validator

# ---- seeded answers for py-loganalysis-001 ----
_PYLOG_FAILED_COUNT = 73
_PYLOG_TOP_ATTACKER_IP = "203.0.113.66"
_PYLOG_TOP_ATTACKER_COUNT = 61
_PYLOG_TOP_USER = "admin"
_PYLOG_TOP_USER_COUNT = 37
_PYLOG_SCAN_SRC = "192.0.2.77"
_PYLOG_REPORT_FILE = "incident_report.txt"


def _as_dict(value):
    return value if isinstance(value, dict) else {}


# ---- py-loganalysis-001: Python log analysis ----

@validator("pylog_failed_count")
def pylog_failed_count(args, findings):
    rec = _as_dict(findings.get("pylog_failed_count"))
    count = rec.get("count")
    if count == _PYLOG_FAILED_COUNT:
        return True, f"You counted {_PYLOG_FAILED_COUNT} failed logins.", {"count": count}
    if count is not None:
        return False, (f"That count ({count}) does not match the log — recount the "
                       f"'Login failed' lines in loganalysis/auth.log."), None
    return False, "Count the failed logins: sum(1 for l in open('loganalysis/auth.log') if 'Login failed' in l).", None


@validator("pylog_attacker_ips")
def pylog_attacker_ips(args, findings):
    rec = _as_dict(findings.get("pylog_attacker_ips"))
    ips = rec.get("ips") or []
    ips = [str(i) for i in ips]
    if _PYLOG_TOP_ATTACKER_IP in ips:
        return True, (f"You pinned the brute-forcer: {_PYLOG_TOP_ATTACKER_IP} "
                      f"({_PYLOG_TOP_ATTACKER_COUNT} failed attempts)."), {"ips": ips}
    return False, ("Extract the source IPs of the failed logins with re and set() — "
                   "one IP dominates the list."), None


@validator("pylog_top_user")
def pylog_top_user(args, findings):
    rec = _as_dict(findings.get("pylog_top_user"))
    user = rec.get("user")
    if user == _PYLOG_TOP_USER:
        return True, (f"'{_PYLOG_TOP_USER}' is the most-targeted account "
                      f"({_PYLOG_TOP_USER_COUNT} failed attempts)."), {"user": user}
    if user:
        return False, f"'{user}' is not the most-targeted account — tally the usernames on failed logins.", None
    return False, "Count failed logins per username (collections.Counter) — which account is hit most?", None


@validator("pylog_scan_src")
def pylog_scan_src(args, findings):
    rec = _as_dict(findings.get("pylog_scan_src"))
    src = rec.get("ip")
    if src == _PYLOG_SCAN_SRC:
        return True, (f"Port scanner found: {_PYLOG_SCAN_SRC} "
                      "probed closed ports across the window."), {"ip": src}
    if src:
        return False, f"{src} is not the scanner — grep 'closed port' in loganalysis/auth.log.", None
    return False, "Find the source of the 'closed port' probes (the port scan).", None


@validator("pylog_report_written")
def pylog_report_written(args, findings):
    rec = _as_dict(findings.get("pylog_report"))
    fname = rec.get("file")
    if fname == _PYLOG_REPORT_FILE and rec.get("failed_count") == _PYLOG_FAILED_COUNT:
        return True, f"Incident report written to {_PYLOG_REPORT_FILE}.", {"file": fname}
    return False, (f"Write your findings to {_PYLOG_REPORT_FILE} in your workdir — "
                   "include the failed-login count and the attacker IPs."), None


# ---- py-sqli-001: fixing SQL injection ----

_SQLI_VULN_FILE = "vuln_app.py"
_SQLI_FIXED_FILE = "fixed_app.py"
_SQLI_ALL_USERS = 3


@validator("sqli_injection_demo")
def sqli_injection_demo(args, findings):
    rec = _as_dict(findings.get("sqli_injected"))
    rows = rec.get("rows")
    if rows == _SQLI_ALL_USERS:
        return True, (f"Injection confirmed: the payload returned all {_SQLI_ALL_USERS} users, "
                      "including password hashes."), {"rows": rows}
    if rows:
        return False, (f"That returned {rows} row(s) — a full bypass returns all "
                       f"{_SQLI_ALL_USERS} users. Try: ' OR '1'='1"), None
    return False, ("Demonstrate the injection against vuln_app.py login: "
                   "a payload like ' OR '1'='1 should dump every user row."), None


@validator("sqli_vuln_located")
def sqli_vuln_located(args, findings):
    rec = _as_dict(findings.get("sqli_vuln_location"))
    if rec.get("file") == _SQLI_VULN_FILE and rec.get("function") == "get_user":
        return True, "Found it: get_user() builds the SELECT with an f-string.", dict(rec)
    return False, ("Locate the vulnerable SELECT: which function in vuln_app.py "
                   "interpolates user input into the query with an f-string?"), None


@validator("sqli_insert_vuln")
def sqli_insert_vuln(args, findings):
    rec = _as_dict(findings.get("sqli_insert_vuln"))
    if rec.get("file") == _SQLI_VULN_FILE and rec.get("function") == "add_note":
        return True, "Second sink found: add_note() interpolates into the INSERT too.", dict(rec)
    return False, ("The login is not the only sink — find the other function in vuln_app.py "
                   "that f-strings user input into SQL (the INSERT)."), None


@validator("sqli_fix_applied")
def sqli_fix_applied(args, findings):
    rec = _as_dict(findings.get("sqli_fix"))
    if rec.get("file") == _SQLI_FIXED_FILE and rec.get("parameterized") is True:
        return True, "fixed_app.py uses parameterized queries (? placeholders) — no more f-string SQL.", dict(rec)
    return False, ("Rewrite both queries with parameterized placeholders "
                   "(cursor.execute('... WHERE username = ?', (username,))) in fixed_app.py."), None


@validator("sqli_injection_blocked")
def sqli_injection_blocked(args, findings):
    rec = _as_dict(findings.get("sqli_retest"))
    blocked = rec.get("blocked") is True
    legit = rec.get("legit_ok") is True
    if blocked and legit:
        return True, "Retest clean: the injection returns nothing and the legit login still works.", dict(rec)
    missing = []
    if not blocked:
        missing.append("the injection still returns rows (it must return none)")
    if not legit:
        missing.append("the legit 'admin' login broke (it must still return exactly 1 row)")
    return False, "Retest fixed_app.py: " + "; ".join(missing) + ".", None


# ---- py-semgrep-001: static analysis with semgrep ----

_SEMGREP_FINDINGS = 6
_SEMGREP_ERROR_RULES = {"tools.hardcoded-secret", "tools.subprocess-shell-true"}


@validator("semgrep_scanned")
def semgrep_scanned(args, findings):
    rec = _as_dict(findings.get("semgrep_scan"))
    n = rec.get("findings")
    if isinstance(n, int) and n >= _SEMGREP_FINDINGS:
        return True, f"Scan complete: {n} findings against the custom rules.", {"findings": n}
    if n:
        return False, (f"Only {n} finding(s) — the custom rules should fire at least "
                       f"{_SEMGREP_FINDINGS}. Run: semgrep --config .semgrep/rules.yml vuln/"), None
    return False, "Run semgrep with the custom rules: semgrep --config .semgrep/rules.yml vuln/", None


@validator("semgrep_triaged")
def semgrep_triaged(args, findings):
    rec = _as_dict(findings.get("semgrep_triage"))
    errors = {str(r) for r in (rec.get("error") or [])}
    if errors == _SEMGREP_ERROR_RULES:
        return True, ("Triage correct: hardcoded-secret and subprocess-shell-true are ERROR; "
                      "weak-md5 and unsafe-yaml-load are WARNING."), {"error": sorted(errors)}
    return False, ("Triage by severity: which two rule ids are ERROR in .semgrep/rules.yml "
                   "(fix now) and which two are WARNING (fix soon)?"), None


@validator("semgrep_secret_fixed")
def semgrep_secret_fixed(args, findings):
    fixes = _as_dict(findings.get("semgrep_fixes"))
    if fixes.get("hardcoded_secret") is True:
        return True, "Hardcoded secrets are gone — loaded from the environment instead.", None
    return False, ("Remove the hardcoded API key and DB password: read them from "
                   "os.environ instead of string literals."), None


@validator("semgrep_shell_fixed")
def semgrep_shell_fixed(args, findings):
    fixes = _as_dict(findings.get("semgrep_fixes"))
    if fixes.get("shell_true") is True:
        return True, "shell=True is gone — subprocess now takes an argv list with shell=False.", None
    return False, ("Kill shell=True in both files: pass a list of args "
                   "(subprocess.run(['tar', '-czf', ...], shell=False))."), None


@validator("semgrep_clean")
def semgrep_clean(args, findings):
    rec = _as_dict(findings.get("semgrep_rerun"))
    n = rec.get("findings")
    if n == 0:
        return True, "Re-run is clean: 0 findings against the custom rules.", {"findings": 0}
    if n:
        return False, f"{n} finding(s) still fire — fix them all, then re-run semgrep.", None
    return False, "Re-run the scan after your fixes: semgrep --config .semgrep/rules.yml vuln/ (expect 0).", None
