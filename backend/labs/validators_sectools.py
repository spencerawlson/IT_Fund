"""Outcome-based validators for the security-tools lab group (Phase 3).

Live Docker labs: learners do the work for real inside the container and press
"I did this" in the workspace, which records the finding under the validator's
name (see LabWorkspace.jsx attest). Each validator therefore checks the
attested finding — the _finding_present pattern — never command history.
"""
from __future__ import annotations

from labs.validators import validator


# ---- tools-wireshark-001: Wireshark / tshark Packet Analysis ----

@validator("ws_capture_opened")
def ws_capture_opened(args, findings):
    if findings.get("ws_capture_opened"):
        return True, "You opened the capture and listed its packets.", findings.get("ws_capture_opened")
    return False, "Open the capture first: tshark -r capture.pcap (try -q -z io,phs for a summary).", None


@validator("ws_protocols_identified")
def ws_protocols_identified(args, findings):
    if findings.get("ws_protocols_identified"):
        return True, "You identified the protocols in the capture (ARP, DNS, TCP, HTTP, TLS, ICMP).", findings.get("ws_protocols_identified")
    return False, "Which protocols appear? tshark -r capture.pcap -q -z io,phs — expect ARP, DNS, TCP, HTTP, TLS and ICMP.", None


@validator("ws_tcp_stream_followed")
def ws_tcp_stream_followed(args, findings):
    if findings.get("ws_tcp_stream_followed"):
        return True, "You followed the HTTP login TCP stream end to end.", findings.get("ws_tcp_stream_followed")
    return False, "Reassemble the conversation: tshark -r capture.pcap -q -z follow,tcp,ascii,0 — watch the login play out.", None


@validator("ws_credentials_found")
def ws_credentials_found(args, findings):
    if findings.get("ws_credentials_found"):
        return True, "You found the cleartext credentials (login POST and the Basic auth header).", findings.get("ws_credentials_found")
    return False, "Something is sent in the clear: follow the login stream or filter http and look at the POST body and Authorization header.", None


@validator("ws_dns_exfil_found")
def ws_dns_exfil_found(args, findings):
    if findings.get("ws_dns_exfil_found"):
        return True, "You spotted the DNS-TXT exfiltration to exfil.evil-dns.net.", findings.get("ws_dns_exfil_found")
    return False, "Filter the DNS traffic (tshark -Y dns) — one odd domain gets many TXT queries with encoded-looking subdomains.", None


@validator("ws_report_written")
def ws_report_written(args, findings):
    if findings.get("ws_report_written"):
        return True, "You wrote up the findings: protocols, credentials, and the exfil channel.", findings.get("ws_report_written")
    return False, "Summarise in findings.txt: the protocol mix, where the cleartext credentials were, and how the exfiltration worked.", None


# ---- sec-webapp-001: Web App Testing (SQLi & XSS) ----

@validator("webapp_enumerated")
def webapp_enumerated(args, findings):
    if findings.get("webapp_enumerated"):
        return True, "You enumerated the application (routes, search box, guestbook).", findings.get("webapp_enumerated")
    return False, "Map the app first: curl http://target.lab:5000/ and follow the links to /search and /comment.", None


@validator("webapp_sqli_proven")
def webapp_sqli_proven(args, findings):
    if findings.get("webapp_sqli_proven"):
        return True, "You proved the search box is injectable.", findings.get("webapp_sqli_proven")
    return False, "Break out of the query: try q=' OR '1'='1 — if every user comes back, it is injectable.", None


@validator("webapp_sqli_extracted")
def webapp_sqli_extracted(args, findings):
    if findings.get("webapp_sqli_extracted"):
        return True, "You extracted data with UNION-based SQL injection (schema and rows).", findings.get("webapp_sqli_extracted")
    return False, "Match the 4 columns and UNION in: q=' UNION SELECT 1,sql,2,3 FROM sqlite_master--  then pull the users table.", None


@validator("webapp_xss_reflected")
def webapp_xss_reflected(args, findings):
    if findings.get("webapp_xss_reflected"):
        return True, "You demonstrated reflected XSS in the guestbook.", findings.get("webapp_xss_reflected")
    return False, "The name/msg parameters are echoed raw: /comment?name=<script>alert(1)</script> — confirm your payload reflects unescaped.", None


@validator("webapp_fix_proposed")
def webapp_fix_proposed(args, findings):
    if findings.get("webapp_fix_proposed"):
        return True, "You proposed the fixes: parameterized queries and output encoding.", findings.get("webapp_fix_proposed")
    return False, "Write FIX.md: replace the f-string SQL with a ? placeholder (parameterized query) and HTML-escape name/msg on reflection.", None


@validator("webapp_loopback_verified")
def webapp_loopback_verified(args, findings):
    if findings.get("webapp_loopback_verified"):
        return True, "You verified the test app is loopback-only (defense in depth).", findings.get("webapp_loopback_verified")
    return False, "Check what the app binds: ss -tlnp | grep 5000 — it must be 127.0.0.1, never 0.0.0.0.", None


# ---- sec-gitleaks-001: Secret Scanning with gitleaks ----

@validator("gitleaks_run")
def gitleaks_run(args, findings):
    if findings.get("gitleaks_run"):
        return True, "You ran gitleaks detect over the repo and got findings.", findings.get("gitleaks_run")
    return False, "Scan it: cd ~/leaky-repo && gitleaks detect --no-git -v (then try the git-aware default too).", None


@validator("gitleaks_types_identified")
def gitleaks_types_identified(args, findings):
    if findings.get("gitleaks_types_identified"):
        return True, "You identified the leaked secret types (AWS keys, Stripe key, Slack token, GitHub PAT, RSA private key).", findings.get("gitleaks_types_identified")
    return False, "Triage the report: which rules fired? Map each finding to its secret type.", None


@validator("gitleaks_history_found")
def gitleaks_history_found(args, findings):
    if findings.get("gitleaks_history_found"):
        return True, "You found secrets lingering in git history (the deleted .env).", findings.get("gitleaks_history_found")
    return False, "Deleting a file does not purge history: gitleaks detect (git mode) still flags the AWS keys from the first commit.", None


@validator("gitleaks_remediated")
def gitleaks_remediated(args, findings):
    if findings.get("gitleaks_remediated"):
        return True, "You remediated: purged the secrets from history and noted the rotation rule.", findings.get("gitleaks_remediated")
    return False, "Rewrite history (git filter-repo / BFG) to drop the secrets, then document that committed secrets must be ROTATED, not just deleted.", None


@validator("gitleaks_precommit_added")
def gitleaks_precommit_added(args, findings):
    if findings.get("gitleaks_precommit_added"):
        return True, "You installed a gitleaks pre-commit hook to stop the next leak.", findings.get("gitleaks_precommit_added")
    return False, "Add .git/hooks/pre-commit running gitleaks protect --staged -v, make it executable, and prove it blocks a test secret.", None
