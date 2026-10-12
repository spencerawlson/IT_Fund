# Web Application Attacks: The OWASP Top 10, Trust and Sessions — Avatar Tutor Script

**Lesson ID:** cy-web
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~799 words)

## Spoken script

**[HOOK — 0:00]**
Web applications are the front door of most organisations — and the most
common way in for attackers. And here is the uncomfortable truth: most web
attacks are not exotic zero-days. They are developers trusting input they
should not trust, or skipping an authorisation check they should not skip.

**[WHY IT MATTERS — 0:25]**
The OWASP Top 10 is the shared reference for what goes wrong in web apps —
it is the vocabulary every pentester and defender uses. This lesson covers
the attacks Security+ and the real world both expect you to understand: who
can access what, how attackers make your server work for them, and how they
attack your users instead.

**[SECTION — Access control and IDOR — 0:50]**
Broken Access Control is number one in the OWASP Top 10 from 2021. The
classic example is IDOR, Insecure Direct Object Reference: you are looking
at /account?id=123, you change it to 124, and suddenly you are looking at
someone else's account. The server never checked ownership. One missing
check, total data exposure.

Why does this happen? Because the developer assumed users would only click
the links they were given. Attackers do not click links; they edit URLs. The
fix is a discipline: enforce authorisation server-side, on every request,
for every object. Not in JavaScript. On the server, every time.

**[SECTION — Making the server do things: SSRF, traversal, command injection — 1:55]**
SSRF — server-side request forgery — tricks the server into sending requests
to internal or unintended targets. In the cloud, the prize is the instance
metadata service at 169.254.169.254: reach it, and it can hand out IAM
credentials. That is why SSRF in cloud environments turns a web bug into
cloud-wide access. On AWS, IMDSv2 requires a session token obtained with a
PUT request, and that blocks most SSRF attempts.

Path traversal uses dot-dot-slash sequences — often URL-encoded — to escape
the intended folder and read files elsewhere. The fix: canonicalise the
path, then check it against an allow-list.

Command injection is cruder: the server runs OS commands built from user
input. A ping form accepting "8.8.8.8; cat /etc/passwd" just handed over the
password file — the semicolon ends one command and starts another.

**[SECTION — Attacking other users: XSS and sessions — 3:10]**
Sometimes the target is not the server — it is the other users. Stored XSS
saves a malicious script on the server, so it runs for every viewer. Reflected
XSS bounces off a single request — the victim clicks a crafted link. DOM XSS
lives entirely in client-side JavaScript. Different delivery, same payload.

A Content Security Policy is strong defence in depth: it restricts where a
page may load scripts from, so an injected script from an untrusted source
simply will not run.

Then sessions. Cookie flags are small but they matter. HttpOnly stops
JavaScript reading the cookie. Secure sends it over HTTPS only. SameSite
limits sending it on cross-site requests. And with JWTs, test whether the
server accepts alg: none or a weak, guessable signing key — both let an
attacker forge tokens. Always verify signatures with a fixed, expected
algorithm.

**[SECTION — Misconfiguration, deserialization and tooling — 4:10]**
Security Misconfiguration is the unglamorous one: insecure defaults, verbose
error messages, open storage, unneeded features. Harden with baselines and
automated configuration scanning — nobody finds every misconfiguration by
hand.

Insecure deserialization — turning untrusted serialized data back into
objects — can lead to code execution. The 2021 list groups it under Software
and Data Integrity Failures: it is about trusting data you should verify.

For tooling: Burp Suite, whose Community edition is free, is the standard
intercepting proxy; OWASP ZAP is a fully free alternative. And one rule
matters more than any tool: practise only on labs and applications you are
authorised to test.

**[COMMON MISTAKES — 4:45]**
Three traps. One: thinking access control is enforced by hiding links. If the
server does not check on every request, IDOR is one edited URL away. Two:
confusing the three XSS types — stored persists for everyone, reflected
needs one crafted click, DOM never touches the server. Three: reaching for
encryption when the fix is authorisation. IDOR is a missing ownership check,
not a crypto problem.

**[RECAP — 5:10]**
Broken Access Control tops the OWASP list: enforce ownership server-side on
every request. SSRF makes the server fetch attacker-chosen URLs —
169.254.169.254 is the cloud crown jewel; IMDSv2 blocks most of it. Path
traversal escapes folders with encoded dot-dot-slash; canonicalise and
allow-list. Command injection runs OS commands through input. Stored,
reflected, and DOM XSS attack your users; CSP limits where scripts may load.
Harden cookie flags, distrust alg: none in JWTs, fix misconfigurations with
baselines — and test with Burp or ZAP, only where authorised.

## On-screen visuals

- HOOK: a web app front door with a "trusted input" sign being ignored by an
  attacker walking past it.
- IDOR: URL bar morphing from id=123 to id=124, revealing another user's
  account; "server-side check" shield stamping each request.
- SSRF/traversal/injection: server fetching the metadata IP 169.254.169.254;
  encoded ../ path diagram; the ping-form injection command chain.
- XSS: three delivery paths — stored, reflected, DOM — converging on a victim
  browser; CSP allow-list gate; cookie flags table; JWT alg:none warning.
- Misconfig/tooling: baseline checklist vs verbose error leak; Burp/ZAP
  intercept proxy flow; "authorised testing only" banner.
- RECAP: the cheat-sheet table as a summary card.
