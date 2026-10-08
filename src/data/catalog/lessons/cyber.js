// Reading content for the Cybersecurity Operations course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/cyber.js.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'cy-linux': {
    overview: [
      'Most servers, security tools and attacker infrastructure run Linux. Analysts read its logs, testers live in its shell, and both need to spot a dangerous permission or a suspicious process at a glance.',
      'This lesson covers navigation and searching, permissions and `chmod`, where accounts and password hashes live, authentication logs, `sudo` and SUID, processes and sockets, pipelines, and base64.',
    ],
    learn: [
      {
        heading: 'Moving around and finding things',
        body: [
          '`pwd` prints the current directory, `cd` changes it and `ls` lists it. `ls -la` includes hidden files, whose names start with a dot (such as `.bashrc` or `.ssh`), which is exactly where persistence and secrets tend to hide.',
          '`grep` searches text for a pattern: `grep -i "failed" /var/log/auth.log` finds failed logins, case-insensitively. The pipe `|` sends one command\'s output into the next command\'s input, so small tools combine into powerful one-liners.',
        ],
      },
      {
        heading: 'Permissions, accounts and privilege',
        body: [
          'Permissions are read (4), write (2) and execute (1), set for the owner, the group and everyone else. `chmod 600 key.pem` gives the owner read and write and nobody else any access; SSH refuses to use a private key that others can read.',
          '`/etc/passwd` lists accounts but no longer holds password hashes. The hashes live in `/etc/shadow`, readable only by root.',
          '`sudo` runs a command as another user, root by default. Overly broad sudo rules (for example, allowing an editor or interpreter as root) are a privilege escalation path, so audit sudoers. A SUID binary runs with its owner\'s privileges rather than the caller\'s; SUID-root binaries are a classic escalation target, catalogued on GTFOBins.',
        ],
      },
      {
        heading: 'Logs, processes and network state',
        body: [
          'On Debian and Ubuntu, SSH and sudo authentication events go to `/var/log/auth.log`; RHEL-family systems use `/var/log/secure`, and systemd hosts expose everything through `journalctl`.',
          '`ps aux` (or `top` and `htop`) shows running processes. Look for odd parents, names impersonating system processes, or unexplained high CPU. `ss -tulpn` lists listening TCP and UDP sockets with the owning process.',
          'Base64 is an encoding, not encryption: `base64 -d` reverses it instantly. Attackers use it to smuggle payloads past naive filters, so decode anything suspicious you find in logs or scripts.',
        ],
      },
    ],
    examples: [
      {
        title: 'Top sources of failed SSH logins',
        code: code(
          'grep "Failed password" /var/log/auth.log \\',
          '  | grep -oE "from [0-9.]+" | cut -d" " -f2 \\',
          '  | sort | uniq -c | sort -nr | head',
        ),
        explanation: 'Extract the source IP from each failure, count duplicates, and list the noisiest sources first.',
      },
      {
        title: 'Quick privilege-escalation checks',
        code: code(
          'sudo -l                                   # what may this user run as root?',
          'find / -perm -4000 -type f 2>/dev/null    # SUID binaries',
          'ls -la ~/.ssh                             # keys and authorized_keys',
          'ss -tulpn                                 # unexpected listeners',
        ),
        explanation: 'Defenders run these to find weaknesses before attackers do; compare the SUID list against GTFOBins.',
      },
    ],
    cheatSheet: [
      ['pwd / cd / ls -la', 'Where am I / move / list incl. hidden'],
      ['grep -i', 'Search text, case-insensitive'],
      ['|', 'Pipe output into the next command'],
      ['chmod 600', 'Owner read/write only (r4 w2 x1)'],
      ['/etc/shadow', 'Password hashes (root only)'],
      ['/var/log/auth.log', 'SSH/sudo auth (RHEL: /var/log/secure)'],
      ['sudo', 'Run as another user; audit sudoers'],
      ['SUID', 'Runs as the file owner; see GTFOBins'],
      ['ps aux / ss -tulpn', 'Processes / listening sockets'],
      ['base64 -d', 'Decode: encoding, not encryption'],
    ],
  },

  'cy-frameworks': {
    overview: [
      'Frameworks give defenders a shared map of how attacks unfold and what a security programme should cover. They let a SOC say "we have no coverage for lateral movement" instead of "we feel exposed".',
      'This lesson covers MITRE ATT&CK tactics and techniques, the Cyber Kill Chain, NIST CSF 2.0, the Diamond Model, the Pyramid of Pain, STIX/TAXII, purple teaming and OSINT.',
    ],
    learn: [
      {
        heading: 'MITRE ATT&CK',
        body: [
          'ATT&CK is a knowledge base of real adversary behaviour. Tactics are the why, the attacker\'s goal at each stage; techniques are the how. Initial Access is getting a first foothold (phishing, exploiting a public-facing app, valid accounts). Persistence is staying on after a reboot (scheduled tasks, run keys, new accounts). Lateral Movement is moving to other hosts (RDP, SMB admin shares, pass-the-hash).',
          'Each technique has an ID such as T1053 (Scheduled Task/Job), which lets tools, detections and reports refer to exactly the same behaviour.',
        ],
      },
      {
        heading: 'Kill Chain, CSF and the Diamond Model',
        body: [
          'The Lockheed Martin Cyber Kill Chain has seven phases: Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command and Control, and Actions on Objectives. Breaking any link stops the attack.',
          'NIST CSF 2.0 (2024) organises a whole security programme into six functions: Govern (new in 2.0), Identify, Protect, Detect, Respond and Recover.',
          'The Diamond Model links four features of every intrusion (adversary, capability, infrastructure and victim), helping analysts pivot from one known element to discover the others.',
        ],
      },
      {
        heading: 'Pyramid of Pain and sharing intel',
        body: [
          'The Pyramid of Pain ranks indicator types by how much it hurts attackers when you block them. Hashes and IP addresses are at the bottom, trivial to change; domains and tools are harder; TTPs (tactics, techniques and procedures) are at the top, because changing behaviour is expensive. Aim detections as high up as you can.',
          'STIX is a standard format for describing threat intelligence, and TAXII is the transport for exchanging it, so tools can share IoCs automatically.',
        ],
      },
      {
        heading: 'Purple teams and OSINT',
        body: [
          'A purple team is red and blue working together: attack, observe whether detection fired, tune, repeat. It improves detection far faster than a report delivered weeks later.',
          'OSINT is intelligence from publicly available sources: search engines, social media, DNS records and certificate transparency logs. Attackers use it for reconnaissance, so defenders should know what it reveals about them.',
        ],
      },
    ],
    cheatSheet: [
      ['ATT&CK tactic vs technique', 'Goal (why) vs method (how)'],
      ['Initial Access', 'First foothold: phishing, public apps, valid accounts'],
      ['Persistence', 'Survive reboot: tasks, run keys, accounts'],
      ['Lateral Movement', 'Other hosts: RDP, SMB, pass-the-hash'],
      ['Kill Chain', 'Recon → Weaponize → Deliver → Exploit → Install → C2 → Actions'],
      ['NIST CSF 2.0', 'Govern, Identify, Protect, Detect, Respond, Recover'],
      ['Diamond Model', 'Adversary, capability, infrastructure, victim'],
      ['Pyramid of Pain', 'Hashes/IPs easy for attackers; TTPs hardest'],
      ['STIX / TAXII', 'Intel format / transport'],
      ['Purple team', 'Red + blue tuning together'],
      ['OSINT', 'Public-source intelligence'],
    ],
  },

  'cy-soc': {
    overview: [
      'A security operations centre turns a flood of alerts into a few confident decisions. Analysts who know the key log events, can read an email header and understand what a hash lookup does and does not prove are the ones who escalate the right things.',
      'This lesson covers SOC tiers, the Windows Security events every analyst memorises, Sysmon, email authentication, sandboxes and hash lookups, alert quality and alert fatigue.',
    ],
    learn: [
      {
        heading: 'How a SOC is organised',
        body: [
          'Tier 1 triages alerts: validate them, enrich them with context, and escalate the real ones. Tier 2 investigates in depth; Tier 3 hunts and handles major incidents. Clear escalation criteria keep Tier 1 fast and consistent.',
          'A true positive is an alert that fired on genuinely malicious activity; a false positive fired on benign activity. Tracking both rates measures detection quality. Alert fatigue, analysts overwhelmed by noise and missing real attacks, is the SOC\'s biggest enemy. Tune detections, suppress known-good activity and automate enrichment.',
        ],
      },
      {
        heading: 'Windows events to know by number',
        body: [
          '4624 is a successful logon and 4625 a failed one; the logon type tells you how (type 10 is RemoteInteractive, meaning RDP). 4672 means special privileges were assigned to a new logon, which signals an admin. 4720 means a user account was created, and an unexpected one is a persistence indicator. 1102 means the security audit log was cleared, a strong indicator of anti-forensics.',
          'Sysmon is a free Microsoft tool that logs far richer detail than the defaults. Its Event ID 1 records process creation with the full command line, which is invaluable for catching malicious PowerShell and living-off-the-land activity.',
        ],
      },
      {
        heading: 'Phishing analysis',
        body: [
          'Every mail server that handles a message adds a `Received` header, so reading them from the bottom up traces the path the message actually took.',
          'SPF lists which servers may send for a domain, DKIM signs the message so tampering is detectable, and DMARC checks that those results align with the visible From address and tells receivers what to do on failure (none, quarantine, reject).',
          'A sandbox is an isolated environment where you run a suspicious file and watch its behaviour: files dropped, registry keys changed, network calls made. A hash lookup on a service such as VirusTotal tells you whether that exact file is known to be malicious, but changing a single byte changes the hash, so "no results" proves very little.',
        ],
      },
    ],
    cheatSheet: [
      ['Tier 1 / 2 / 3', 'Triage / investigate / hunt and major incidents'],
      ['4624 / 4625', 'Logon success / failure (type 10 = RDP)'],
      ['4672', 'Special privileges assigned'],
      ['4720', 'User account created'],
      ['1102', 'Security log cleared'],
      ['Sysmon ID 1', 'Process creation with command line'],
      ['Received headers', 'Read bottom to top'],
      ['SPF / DKIM / DMARC', 'Allowed senders / signature / alignment + policy'],
      ['Sandbox', 'Run safely, observe behaviour'],
      ['Hash lookup', 'Known-bad exact file; absence proves little'],
      ['Alert fatigue', 'Tune, suppress known-good, automate'],
    ],
  },

  'cy-web': {
    overview: [
      'Web applications are the front door of most organisations and the most common way in for attackers. The OWASP Top 10 is the shared reference for what goes wrong, and most of it comes down to trusting input or skipping an authorisation check.',
      'This lesson covers broken access control and IDOR, SSRF, path traversal, XSS and cookie flags, JWT pitfalls, command injection, misconfiguration, insecure deserialization, CSP, and the tools used to test for them.',
    ],
    learn: [
      {
        heading: 'Access control and IDOR',
        body: [
          'Broken Access Control is number one in the OWASP Top 10 (2021). The classic example is IDOR (Insecure Direct Object Reference): changing `/account?id=123` to `124` shows someone else\'s account because the server never checked ownership. Enforce authorisation server-side on every request, for every object.',
        ],
      },
      {
        heading: 'Making the server do things: SSRF, traversal, command injection',
        body: [
          'SSRF (server-side request forgery) makes the server send requests to internal or unintended targets. In the cloud, the prize is the instance metadata service at `169.254.169.254`, which can hand out IAM credentials. IMDSv2 on AWS requires a session token obtained with a PUT request, which blocks most SSRF.',
          'Path traversal uses `../` sequences (often URL-encoded) to read files outside the intended folder. Canonicalise paths and check them against an allow-list. Command injection gets the server to run OS commands through input, such as a ping form accepting `8.8.8.8; cat /etc/passwd`.',
        ],
      },
      {
        heading: 'Attacking other users: XSS and sessions',
        body: [
          'Stored XSS saves a malicious script on the server so it runs for every viewer; reflected XSS bounces off a single request; DOM XSS lives entirely in client-side JavaScript. A Content Security Policy restricts where a page may load scripts from, a strong defence-in-depth layer.',
          'Cookie flags matter: HttpOnly stops JavaScript reading the cookie, Secure sends it over HTTPS only, and SameSite limits sending it on cross-site requests. With JWTs, test whether the server accepts `alg: none` or uses a weak, guessable signing key. Always verify signatures with a fixed, expected algorithm.',
        ],
      },
      {
        heading: 'Misconfiguration, deserialization and tooling',
        body: [
          'Security Misconfiguration covers insecure defaults, verbose error messages, open storage and unneeded features; harden with baselines and automated configuration scanning. Insecure deserialization, turning untrusted serialized data into objects, can lead to code execution; the 2021 list groups it under Software and Data Integrity Failures.',
          'Burp Suite (the Community edition is free) is the standard intercepting proxy for web testing; OWASP ZAP is a fully free alternative. Practise only on labs and applications you are authorised to test.',
        ],
      },
    ],
    cheatSheet: [
      ['OWASP #1 (2021)', 'Broken Access Control'],
      ['IDOR', 'Change an ID, see others\' data'],
      ['SSRF', 'Server fetches attacker-chosen URLs; 169.254.169.254'],
      ['IMDSv2', 'Session token (PUT) blocks most SSRF'],
      ['Path traversal', '../ (encoded) escapes the folder'],
      ['Stored / reflected / DOM XSS', 'Saved / per-request / client-side JS'],
      ['HttpOnly / Secure / SameSite', 'No JS access / HTTPS only / cross-site limits'],
      ['JWT pitfalls', 'alg none, weak signing key'],
      ['Command injection', 'Input runs OS commands'],
      ['CSP', 'Restrict script sources; XSS defence in depth'],
      ['Burp Suite / ZAP', 'Intercepting proxies'],
    ],
  },

  'cy-pentest': {
    overview: [
      'A penetration test is an authorised, scoped simulation of a real attack, finishing with a report that helps the organisation fix what was found. The method matters as much as the exploits: without authorisation it is a crime, and without a clear report it is wasted money.',
      'This lesson covers rules of engagement and test types, reconnaissance and nmap scanning, exploitation with Metasploit, privilege escalation, Windows credential attacks, cracking, pivoting and reporting.',
    ],
    learn: [
      {
        heading: 'Before the first packet',
        body: [
          'Written authorisation and an agreed scope, the rules of engagement, must exist before any testing: what is in scope, what is off limits, testing windows, and emergency contacts. Without them, testing can be a crime.',
          'In a black-box test the tester has no prior knowledge of the target; white box means full knowledge (architecture, source code); grey box means partial knowledge, such as a normal user account.',
        ],
      },
      {
        heading: 'Reconnaissance and scanning',
        body: [
          'Passive reconnaissance gathers information without touching the target: WHOIS, OSINT, certificate transparency. Active reconnaissance interacts directly, as port scanning does.',
          '`nmap -sS` runs a TCP SYN ("half-open") scan: it sends SYN, reads SYN-ACK (open) or RST (closed), and never completes the handshake. `-sV` adds service and version detection, `-O` detects the operating system, and `-A` enables OS detection, version detection, scripts and traceroute together.',
        ],
      },
      {
        heading: 'Exploitation and escalation',
        body: [
          'Metasploit is an exploitation framework of modules and payloads driven from `msfconsole`; Meterpreter is its advanced in-memory payload. Privilege escalation gains higher permissions than you started with: vertical is user to admin, horizontal is one user to another.',
          'Pass-the-hash authenticates with an NTLM hash instead of the password; mitigate it with LAPS, Credential Guard and a tiered admin model. Kerberoasting requests service tickets for accounts with SPNs and cracks them offline; long random service-account passwords or group managed service accounts (gMSAs) defeat it. Hashcat (or John the Ripper) cracks hashes offline with GPU acceleration, and strong, slow hashes resist it.',
          'Pivoting uses a compromised host to reach networks that were not directly accessible, through SSH tunnels, SOCKS proxies or tools such as chisel.',
        ],
      },
      {
        heading: 'Reporting',
        body: [
          'The report starts with an executive summary in business terms (what an attacker could achieve and how urgently to act), followed by findings with severity, evidence and specific remediation steps. The report is the product the client actually pays for.',
        ],
      },
    ],
    examples: [
      {
        title: 'A typical first scan of an authorised target',
        code: code(
          'nmap -sS -p- --min-rate 1000 -oA full 10.10.10.5   # all TCP ports, half-open',
          'nmap -sV -sC -p 22,80,445 -oA services 10.10.10.5  # versions + default scripts',
        ),
        explanation: 'Find every open port first, then fingerprint only those. `-oA` saves results in all formats for the report.',
      },
    ],
    cheatSheet: [
      ['Rules of engagement', 'Written authorisation + scope first'],
      ['Black / grey / white box', 'None / partial / full knowledge'],
      ['Passive vs active recon', 'OSINT, WHOIS vs scanning'],
      ['nmap -sS', 'SYN half-open scan'],
      ['-sV / -O / -A', 'Versions / OS / everything'],
      ['Metasploit', 'Exploit framework; Meterpreter payload'],
      ['Vertical vs horizontal privesc', 'User → admin vs user → user'],
      ['Pass-the-hash', 'NTLM hash as credential; LAPS, Credential Guard'],
      ['Kerberoasting', 'Crack SPN service tickets; gMSAs'],
      ['Hashcat / John', 'Offline GPU cracking'],
      ['Pivoting', 'Tunnel through a compromised host'],
      ['Report first page', 'Executive summary in business terms'],
    ],
  },

  'cy-detection': {
    overview: [
      'Detection engineering is writing, testing and maintaining the rules that turn logs into alerts. Done well, it is software engineering applied to the SOC: version-controlled, tested and measured against real attacker techniques.',
      'This lesson covers Sigma, YARA and Snort/Suricata rules, signature versus anomaly detection, ATT&CK coverage, detection as code, high-value behaviours to detect, and validating that detections fire.',
    ],
    learn: [
      {
        heading: 'Rule languages',
        body: [
          'Sigma is a generic, SIEM-agnostic format for log detections: write the logic once in YAML, then convert it to Splunk, Elastic or Microsoft Sentinel queries. YARA rules identify malware files with strings and conditions, and are used by scanners and sandboxes. Snort and Suricata are open-source network IDS/IPS engines that match signature rules against traffic.',
          'Signature detection matches known-bad patterns: precise, but blind to novel attacks. Anomaly detection flags deviations from a baseline: it catches the new, but it is noisier.',
        ],
      },
      {
        heading: 'Coverage and discipline',
        body: [
          'Mapping each detection to ATT&CK techniques shows where you have coverage and where you are blind; a heat map of techniques makes the gaps obvious. Detection as code stores rules in git, tests them, reviews them like code and deploys them through CI.',
          'Validate that a detection works by safely emulating the technique, for example with Atomic Red Team, and confirming the alert fires. Do it in a lab or controlled environment first.',
        ],
      },
      {
        heading: 'Behaviours worth detecting',
        body: [
          'PowerShell abuse often shows encoded commands (`-enc`) and download cradles; enable Script Block Logging (Event ID 4104) to see the decoded script. Living off the land means abusing built-in tools such as `certutil` or `rundll32` (LOLBins). They are hard to block, so detect unusual parent/child process pairs and arguments.',
          'Beaconing is malware calling back to its C2 at regular intervals, detectable by consistent timing and request sizes. DNS tunnelling hides data or C2 inside DNS queries; look for long, high-entropy subdomains and unusually high query volumes to one domain.',
        ],
      },
    ],
    examples: [
      {
        title: 'A Sigma rule for encoded PowerShell',
        code: code(
          'title: Encoded PowerShell command line',
          'logsource:',
          '  category: process_creation',
          '  product: windows',
          'detection:',
          '  selection:',
          '    Image|endswith: \\powershell.exe',
          '    CommandLine|contains:',
          '      - " -enc "',
          '      - " -EncodedCommand "',
          '  condition: selection',
          'level: medium',
          'tags:',
          '  - attack.execution',
          '  - attack.t1059.001',
        ),
        explanation: 'Written once, converted with the Sigma CLI into the query language of whichever SIEM you run, and tagged to ATT&CK for coverage mapping.',
      },
      {
        title: 'A minimal YARA rule',
        code: code(
          'rule Suspicious_Downloader {',
          '  strings:',
          '    $a = "certutil -urlcache -split -f" nocase',
          '    $b = "FromBase64String" nocase',
          '  condition:',
          '    any of them',
          '}',
        ),
        explanation: 'Strings plus a condition; real rules add more specific strings and file-type checks to avoid false positives.',
      },
    ],
    cheatSheet: [
      ['Sigma', 'SIEM-agnostic log rules (YAML)'],
      ['YARA', 'Malware file pattern rules'],
      ['Snort / Suricata', 'Network IDS/IPS signatures'],
      ['Signature vs anomaly', 'Known-bad (precise) vs deviation (noisier)'],
      ['ATT&CK mapping', 'Measure coverage, find gaps'],
      ['Detection as code', 'Git, tests, review, CI'],
      ['Event 4104', 'PowerShell Script Block Logging'],
      ['LOLBins', 'certutil, rundll32: watch parents and args'],
      ['Beaconing', 'Regular C2 callbacks: timing and size'],
      ['DNS tunnelling', 'Long, high-entropy subdomains'],
      ['Atomic Red Team', 'Emulate a technique to test a detection'],
    ],
  },

  'cy-ir-forensics': {
    overview: [
      'When prevention fails, the quality of the response decides the size of the damage. Good incident response stops the spread, preserves the evidence needed to understand what happened, and communicates without tipping off the attacker.',
      'This lesson covers volatile evidence and memory images, forensic imaging and write blockers, legal holds, timelines and key Windows artefacts, containment versus eradication, out-of-band communication, playbooks, notification and lessons learned.',
    ],
    learn: [
      {
        heading: 'Preserving evidence',
        body: [
          'Take a memory image before shutting a system down: RAM holds running processes, network connections, encryption keys and fileless malware that disappear at power-off. Capture it with tools such as WinPmem (Windows) or LiME (Linux) and analyse it with Volatility.',
          'A forensic image is a bit-for-bit copy of the whole disk, including deleted files and unallocated space, unlike an ordinary file copy. Hash the source and the image before and after acquisition to prove integrity, and use a write blocker to prevent any change to the evidence media.',
          'A legal hold instructs the organisation to preserve relevant data from deletion, overriding normal retention schedules.',
        ],
      },
      {
        heading: 'Analysis',
        body: [
          'Timeline analysis orders artefacts by time to reconstruct what the attacker did; tools such as Plaso build "super-timelines" from dozens of sources at once.',
          'On Windows, Prefetch files, together with Amcache and ShimCache, show which programs ran and when, even after the attacker deleted the executable.',
        ],
      },
      {
        heading: 'Running the response',
        body: [
          'Containment stops the spread (isolating hosts, disabling accounts, blocking C2); eradication removes the cause (malware, persistence, the exploited vulnerability). Then recover, and monitor closely for re-infection.',
          'During a major incident, communicate out of band: the attacker may be reading normal email and chat. Use a pre-arranged separate channel. A playbook is a predefined, step-by-step procedure for one incident type, such as phishing, ransomware or a compromised account, so nobody improvises under pressure.',
          'Leadership decides, with legal counsel, whether and when to notify regulators and customers, following the applicable laws and contracts. Deadlines vary: GDPR requires 72 hours to the regulator, and US public companies must disclose material incidents to the SEC within four business days of determining materiality.',
          'Finish with a blameless lessons-learned review, then update playbooks and detections.',
        ],
      },
    ],
    cheatSheet: [
      ['Memory image first', 'RAM: processes, connections, keys, fileless malware'],
      ['WinPmem / LiME / Volatility', 'Capture Windows / Linux RAM / analyse'],
      ['Forensic image', 'Bit-for-bit incl. deleted space; hash it'],
      ['Write blocker', 'No changes to evidence media'],
      ['Legal hold', 'Preserve data; overrides retention'],
      ['Timeline (Plaso)', 'Reconstruct actions by time'],
      ['Prefetch / Amcache / ShimCache', 'What ran on Windows, and when'],
      ['Containment vs eradication', 'Stop spread vs remove cause'],
      ['Out-of-band comms', 'Attacker may read email and chat'],
      ['Notification', 'Leadership + legal; GDPR 72 h, SEC 4 business days'],
      ['Lessons learned', 'Blameless; update playbooks and detections'],
    ],
  },

  'cy-ad-cloud-attacks': {
    overview: [
      'Active Directory and cloud identity providers are where one compromised account can become control of everything. Attackers rarely need exotic exploits: they follow permission paths and steal tokens.',
      'This lesson covers BloodHound attack paths, Golden Tickets and DCSync, LAPS and the tiered admin model, MFA fatigue and adversary-in-the-middle phishing, and cloud identity attacks from leaked keys to token theft.',
    ],
    learn: [
      {
        heading: 'Active Directory attack paths',
        body: [
          'BloodHound maps Active Directory relationships (group memberships, sessions, ACLs) to show attack paths from any account to privileged ones. Defenders use it too, to find and remove the riskiest paths first.',
          'A Golden Ticket is a forged Kerberos ticket-granting ticket made with the KRBTGT account\'s hash, granting domain-wide access. Remediate by resetting the KRBTGT password twice, because the previous password remains valid. DCSync impersonates a domain controller to request password hashes through replication; it needs replication rights, so monitor Event ID 4662 for the replication GUIDs from non-DC accounts.',
        ],
      },
      {
        heading: 'Hardening AD',
        body: [
          'Shared local admin passwords let one compromised machine unlock them all. Windows LAPS gives every device a unique, rotating local admin password.',
          'The tiered admin model separates admin accounts for domain controllers, servers and workstations, so credentials stolen from a laptop can never expose a domain admin.',
        ],
      },
      {
        heading: 'Beating MFA',
        body: [
          'MFA fatigue (push bombing) spams push prompts until a tired user approves one; number matching and phishing-resistant MFA stop it. Adversary-in-the-middle phishing kits such as Evilginx proxy the real login page and steal the session cookie after the user completes MFA. FIDO2 and passkeys resist this because the credential is bound to the genuine domain.',
        ],
      },
      {
        heading: 'Cloud identity attacks',
        body: [
          'Common cloud initial access comes from leaked access keys (often in code repositories) and misconfigured public storage: scan repos for secrets and block public buckets by default. An illicit OAuth consent grant tricks a user into approving a malicious app\'s access to their data; restrict user consent and review app permissions regularly.',
          'The cloud control plane (the IAM and API layer) is critical, because whoever controls it controls every resource. Protect root and global admin accounts with strong MFA, alerting and break-glass procedures. Token theft steals session or refresh tokens to act as the user without the password or MFA; short token lifetimes, token binding and conditional access limit it.',
        ],
      },
    ],
    cheatSheet: [
      ['BloodHound', 'AD attack-path graph (offence and defence)'],
      ['Golden Ticket', 'Forged TGT from KRBTGT hash; reset KRBTGT twice'],
      ['DCSync', 'Replication to steal hashes; watch 4662'],
      ['Windows LAPS', 'Unique rotating local admin passwords'],
      ['Tiered admin', 'Separate DC / server / workstation admins'],
      ['MFA fatigue', 'Push bombing; number matching'],
      ['AiTM (Evilginx)', 'Steals session cookie; FIDO2 resists'],
      ['Leaked keys / public buckets', 'Top cloud initial access'],
      ['Illicit consent grant', 'Malicious OAuth app; restrict consent'],
      ['Control plane', 'IAM/API layer controls everything'],
      ['Token theft', 'Short lifetimes, binding, conditional access'],
    ],
  },

  'cy-threat-intel': {
    overview: [
      'Threat intelligence is only useful when it changes what defenders do: which vulnerability to patch first, which behaviour to hunt for, which detection to write. Hunting closes the loop by testing intel against your own environment.',
      'This lesson covers intelligence levels and the intelligence lifecycle, prioritising vulnerabilities with KEV and EPSS, attribution, sharing rules (TLP), hunting hypotheses and techniques, and deception.',
    ],
    learn: [
      {
        heading: 'Intelligence levels and lifecycle',
        body: [
          'Strategic intelligence covers long-term trends for leaders; tactical intelligence gives TTPs and IoCs to defenders; operational intelligence covers specific campaigns in between.',
          'The intelligence lifecycle runs direction (requirements), collection, processing, analysis, dissemination and feedback. Start from the questions your organisation needs answered, not from whatever feeds you can buy.',
        ],
      },
      {
        heading: 'Prioritising what to fix',
        body: [
          'CISA\'s Known Exploited Vulnerabilities (KEV) catalogue lists vulnerabilities confirmed as exploited in the wild; patch those first (US federal agencies have mandatory deadlines). EPSS, from FIRST, estimates the probability a vulnerability will be exploited soon. Combine KEV, EPSS, CVSS and your own asset context rather than sorting by CVSS alone.',
          'Attribution, identifying who is behind an attack, is hard and often less useful to a defender than knowing the TTPs, which is what you can actually detect.',
        ],
      },
      {
        heading: 'Sharing and hunting',
        body: [
          'The Traffic Light Protocol labels how widely intel may be shared: TLP:RED (named recipients only), AMBER, GREEN, and TLP:CLEAR (public).',
          'A hunt starts from a testable hypothesis about attacker behaviour in your environment, such as "attackers use scheduled tasks for persistence on servers". Stack counting counts occurrences of a value across the fleet to surface rare outliers: an autorun on 3 of 5,000 hosts stands out immediately.',
          'A successful hunt should produce a new or improved automated detection. Hunts that find nothing still document coverage.',
        ],
      },
      {
        heading: 'Deception',
        body: [
          'Deception technology\'s key advantage is very high-fidelity alerts, because legitimate users never touch decoys. Honeytokens, such as fake credentials planted in memory or files, catch attackers during lateral movement.',
        ],
      },
    ],
    cheatSheet: [
      ['Strategic / operational / tactical', 'Leaders / campaigns / TTPs and IoCs'],
      ['Lifecycle', 'Direction, collection, processing, analysis, dissemination, feedback'],
      ['CISA KEV', 'Known exploited: patch first'],
      ['EPSS', 'Probability of exploitation soon'],
      ['Attribution', 'Who: hard, less actionable than TTPs'],
      ['TLP', 'RED, AMBER, GREEN, CLEAR'],
      ['Hypothesis', 'Testable statement about attacker behaviour'],
      ['Stack counting', 'Rare values across the fleet'],
      ['Hunt output', 'A new or better detection'],
      ['Honeytokens', 'Decoy credentials: high-fidelity alerts'],
    ],
  },

  'cy-detection-labs': {
    overview: [
      'Reading about detections only goes so far. The CyberSecurity_Lab simulations generate real attack traces safely, so you can run a drill, capture it with your own tools, and check what you actually caught.',
      'This lesson walks through the four labs (web attacks, DDoS, amplification and the gift-card lure chain), what each attack looks like in telemetry, and how to use each lab\'s answer key to grade your detections.',
    ],
    learn: [
      {
        heading: 'Web attack traces',
        body: [
          'Credential stuffing (T1110) shows as a burst of 401 responses for many distinct usernames from one source against `/login`. Enumeration and directory busting (T1595) shows as a spike of 404s across many distinct paths from one source, with a few 200s revealing real content; hits on `/.git`, `/.env` or admin paths deserve attention.',
          'The SSRF drill aims a `url=` parameter at `169.254.169.254`, the cloud instance metadata endpoint, where SSRF can leak IAM credentials (T1552.005). A web tier should never fetch arbitrary user-supplied URLs. For path traversal (T1083), a `file=` value like `..%2f..%2fetc/passwd` teaches the matching rule: decode once before matching, and watch for double encoding (`%252e`) that a single decode leaves as `%2e`.',
        ],
      },
      {
        heading: 'DDoS and amplification',
        body: [
          'At the victim, a volumetric flood shows high requests per second over reused connections; slowloris shows concurrency climbing while requests never complete. A connection flood opens a fresh socket per request (connections roughly equal requests), whereas a volumetric flood reuses keep-alive connections (requests far exceed connections).',
          'The rapid-reset vector models CVE-2023-44487: streams initiated far exceed streams completed, and connections open and then abort or reset almost immediately.',
          'The amplification lab measures each protocol\'s amplification factor without attacking anyone, because it never spoofs a source IP: the large responses return to the sender. NTP `monlist` has the highest factor of its profiles (about 556x), answering from UDP source port 123.',
        ],
      },
      {
        heading: 'The gift-card lure chain',
        body: [
          'The lure masquerades (T1036) with a double or mismatched extension: the name claims `.pdf` or `.txt`, but the real type is executable. Correlate the downloaded file\'s Mark of the Web (Zone.Identifier) with its later execution.',
          'The persistence stage writes a Run key, caught by Sysmon Event IDs 12 and 13 (registry key and value set) on `...\\CurrentVersion\\Run` or by an Autoruns diff (T1547.001), and simulates a scheduled task, caught by Security Event ID 4698 or `schtasks.exe` in process telemetry (T1053.005). Its C2 beacon (T1071) is found by periodicity, not volume: repeated small check-ins to one destination at a near-constant interval.',
        ],
      },
      {
        heading: 'Grade yourself with the answer key',
        body: [
          'Each lab writes an `events.jsonl` file: a ground-truth timeline of exactly what the simulation did. Run a drill, capture it with Sysmon, EDR or Wireshark, then compare your alerts with the answer key. Anything in the key that you did not catch is your next detection to write.',
        ],
      },
    ],
    cheatSheet: [
      ['T1110 credential stuffing', '401 burst, many usernames, one source'],
      ['T1595 enumeration', '404 spike, many distinct paths'],
      ['T1552.005 SSRF', 'url= to 169.254.169.254'],
      ['T1083 traversal', 'Decode first; watch %252e double encoding'],
      ['Volumetric vs slowloris', 'High RPS vs concurrency that never completes'],
      ['connflood', 'Connections ≈ requests'],
      ['Rapid reset', 'CVE-2023-44487: opened ≫ completed'],
      ['NTP monlist', '~556x, UDP source port 123'],
      ['T1036 masquerading', 'Double or mismatched extension'],
      ['T1547.001 / T1053.005', 'Run key (Sysmon 12/13) / task (4698)'],
      ['T1071 beacon', 'Periodicity, not volume'],
      ['events.jsonl', 'Ground truth to grade detections'],
    ],
  },
  'cy-threat-actors': {
    overview: [
      'Every defence starts with knowing who might attack and why. A bank faces organized crime chasing money; a defence contractor faces nation-states chasing secrets; everyone faces phishing. Threat actors differ in resources, patience, and goals — and those differences dictate which controls matter most.',
      'This lesson covers the major actor types (nation-state APTs, hacktivists, insiders, organized crime), the concept of TTPs, and the social engineering attack vectors Security+ expects you to recognize: phishing variants, BEC, pretexting, watering holes, and more.',
    ],
    learn: [
      {
        heading: 'Who attacks and why',
        body: [
          'Advanced persistent threats (APTs), usually nation-state backed, are resourced, patient, and targeted: they dwell in networks for months pursuing espionage or sabotage. Opportunistic attackers spray ransomware and phishing broadly, optimizing for volume rather than a specific victim.',
          'Hacktivists act for political or social causes and want publicity — defacements and DDoS are their signature. Organized crime wants money and runs ransomware-as-a-service like a business. Insiders come in three flavours: malicious, negligent (the user who clicked), and compromised (whose account an outsider now drives). Shadow IT — unsanctioned apps holding real data — is an insider-adjacent risk that lives outside security visibility entirely.',
          'TTP stands for tactics, techniques, and procedures: the attacker\u2019s playbook. MITRE ATT&CK catalogs TTPs so defenders can detect behavioural patterns rather than chasing individual indicators. Profiling which actors target your sector tells you which TTPs to prioritize.',
        ],
      },
      {
        heading: 'Social engineering attack vectors',
        body: [
          'Phishing is bulk deception by email; spear phishing targets specific people; whaling targets senior executives with deeply researched pretexts. Vishing moves the con to voice calls ("IT support" asking for your MFA code) and smishing to text messages, often fake delivery or bank alerts.',
          'Business email compromise rarely carries malware at all: a spoofed or hijacked executive account directs a wire transfer or invoice change purely on trust, which is why finance teams need their own training. Pretexting invents a scenario to extract information, baiting dangles something tempting (the parking-lot USB drop), and tailgating follows an authorized person through a secured door.',
          'Watering hole attacks compromise websites the targets already visit instead of attacking them directly. Typosquatting registers lookalike domains for credential harvesting. Influence campaigns coordinate disinformation through fake personas. Clone phishing copies a real email and swaps in malicious links, while pharming poisons DNS so even correctly typed URLs land on the attacker\u2019s copy. The defence against all of it is process and culture: verify out of band.',
        ],
      },
    ],
    cheatSheet: [
      ['APT', 'Resourced, patient, targeted (often nation-state)'],
      ['Hacktivist', 'Political cause, wants publicity'],
      ['Insider types', 'Malicious, negligent, compromised'],
      ['TTP', 'Tactics, techniques, procedures'],
      ['Whaling', 'Spear phishing aimed at executives'],
      ['Vishing / smishing', 'Voice / SMS phishing'],
      ['BEC', 'Executive email fraud, usually no malware'],
      ['Pretexting', 'Invented scenario to extract info'],
      ['Baiting', 'Tempting lure: USB drop, fake download'],
      ['Tailgating', 'Following someone through a secured door'],
      ['Watering hole', 'Compromise sites the target visits'],
      ['Typosquatting', 'Lookalike domains for phishing'],
    ],
  },
  'cy-malware': {
    overview: [
      'Malware is not one thing: a worm that spreads itself, a Trojan the user installs willingly, and fileless code living only in memory demand completely different defences. Security+ expects you to tell them apart and know what each one implies for detection and response.',
      'This lesson covers the major malware types — ransomware (including double extortion), Trojans and RATs, worms versus viruses, fileless malware, rootkits and bootkits, spyware, logic bombs, backdoors — plus the evasion techniques (packers, polymorphism, process hollowing) that make them hard to catch.',
    ],
    learn: [
      {
        heading: 'The malware zoo',
        body: [
          'Ransomware encrypts data and demands payment; modern strains add double extortion, threatening to publish stolen data, which is why backups alone no longer defeat it. A Trojan disguises itself as legitimate software that the user installs willingly, and a RAT (Remote Access Trojan) then gives the attacker full remote control of the machine.',
          'Worms self-propagate across networks while viruses need a host file and user action to spread. Fileless malware runs entirely in memory through legitimate tools like PowerShell and WMI, leaving no binary for antivirus to find — but EDR and Sysmon can still see it. Rootkits hide by subverting the operating system itself, and bootkits go further, infecting the boot process so they survive even an OS reinstall; Secure Boot is the mitigation.',
          'Keyloggers record keystrokes to steal credentials, spyware secretly monitors activity, logic bombs wait for a trigger condition (the classic disgruntled-admin revenge), and backdoors provide hidden access bypassing normal authentication. Droppers and downloaders are stage-one malware whose only job is delivering the real payload.',
        ],
      },
      {
        heading: 'Evasion and analysis',
        body: [
          'Attackers hide malware with packers and crypters that compress or encrypt the binary to defeat signature detection — high-entropy packed executables are themselves a red flag. Polymorphic malware re-encrypts each copy while metamorphic malware rewrites its own code, both defeating hash-based detection. Process hollowing swaps a legitimate process\u2019s memory for malicious code, and DLL injection forces trusted processes to load hostile libraries.',
          'Botnets network compromised machines for DDoS, spam, and cryptojacking — the theft of compute for mining cryptocurrency, betrayed by unexplained CPU spikes. Wipers destroy data with no recovery option (NotPetya posed as ransomware but was a wiper), and ransomware-as-a-service lets criminals lease attack kits to affiliates, lowering the skill barrier for everyone.',
        ],
      },
    ],
    cheatSheet: [
      ['Ransomware', 'Encrypts data, demands payment'],
      ['Double extortion', 'Encrypt + threaten to leak'],
      ['Trojan / RAT', 'Disguised installer / remote control'],
      ['Worm vs virus', 'Self-propagates vs needs host + user'],
      ['Fileless', 'Memory-only via legit tools'],
      ['Rootkit / bootkit', 'Hides in OS / in boot process'],
      ['Logic bomb', 'Triggers on condition or date'],
      ['Backdoor', 'Hidden access bypassing auth'],
      ['Packer', 'Evades signatures via encryption'],
      ['Polymorphic', 'Re-encrypts each copy'],
      ['Process hollowing', 'Malicious code in legit process memory'],
      ['Wiper', 'Destroys data, no ransom (NotPetya)'],
    ],
  },
  'cy-vulns': {
    overview: [
      'Vulnerabilities are the raw material of every attack, and Security+ tests whether you can name the flaw class, explain how it is exploited, and state the fix. Memorizing individual CVEs is pointless; recognizing that unsanitized input plus string-built SQL equals injection is the skill.',
      'This lesson covers the major vulnerability classes — zero-days, buffer overflows, race conditions, injection flaws (SQL, XSS, CSRF, XXE, LDAP, template), cryptographic and protocol weaknesses — and the mitigations that actually work: input validation, parameterized queries, output encoding, least privilege, and defence in depth.',
    ],
    learn: [
      {
        heading: 'Flaw classes to recognize',
        body: [
          'A zero-day is exploited before the vendor knows or patches it, so the response is isolation and monitoring rather than patching. Buffer overflows write past a buffer\u2019s bounds to hijack execution, mitigated by safe languages, ASLR (which randomizes memory layout), and DEP/NX. Race conditions (time-of-check to time-of-use) exploit the gap between a security check and the action it approved.',
          'Injection flaws share one root cause: untrusted input treated as code. SQL injection manipulates databases (fix: parameterized queries), cross-site scripting injects scripts into victims\u2019 browsers (fix: output encoding plus Content Security Policy), and the family extends to LDAP injection, template injection, and XXE, where XML parsers resolve external entities to read files. Cross-site request forgery tricks a logged-in browser into unwanted actions, countered by anti-CSRF tokens.',
          'Replay attacks re-send captured valid data, defeated by nonces and timestamps. Downgrade attacks force weaker crypto, countered by HSTS and version enforcement. Side-channel attacks extract secrets from timing or cache behaviour — the Spectre class — mitigated with constant-time code.',
        ],
      },
      {
        heading: 'Mitigations that work',
        body: [
          'Validate input against an allow-list of known-good values; deny-lists always miss the next bypass. Encode output for its context so data can never execute. Separate code from data with parameterized queries. None of these is optional — they are the actual fixes, not suggestions.',
          'Least privilege grants only the access a task needs, limiting any compromise\u2019s blast radius. Defence in depth layers controls so no single failure is fatal. Attack surface reduction removes what attackers could target in the first place. And "security through obscurity" — hiding details — fails the moment it is discovered, so use it only as one layer among many, per Kerckhoffs\u2019s principle.',
        ],
      },
    ],
    cheatSheet: [
      ['Zero-day', 'Exploited before vendor knows/patches'],
      ['Buffer overflow', 'Write past bounds; fix: safe langs, ASLR, DEP'],
      ['Race condition', 'Gap between check and use (TOCTOU)'],
      ['SQLi fix', 'Parameterized queries'],
      ['XSS fix', 'Output encoding + CSP'],
      ['Stored / reflected / DOM XSS', 'Persists / bounces / client-side JS'],
      ['CSRF fix', 'Anti-CSRF tokens, SameSite cookies'],
      ['Replay fix', 'Nonces and timestamps'],
      ['Allow-list > deny-list', 'Deny-lists miss the next bypass'],
      ['Least privilege', 'Only the access needed'],
      ['Defence in depth', 'Layered; no single point of failure'],
    ],
  },
  'cy-cloud-arch': {
    overview: [
      'Cloud security starts with one uncomfortable truth: most cloud breaches are the customer\u2019s misconfiguration, not the provider\u2019s failure. The shared responsibility model draws the line, and Security+ expects you to draw it differently for IaaS, PaaS, and SaaS.',
      'This lesson covers the cloud service and deployment models, virtualization and container security, and the zero-trust direction modern architecture is heading — plus the practical controls (CSPM, golden images, secrets management) that keep cloud estates safe.',
    ],
    learn: [
      {
        heading: 'Models and the shared line',
        body: [
          'IaaS rents raw infrastructure (you manage the OS up), PaaS rents a platform (you manage code and data), SaaS rents finished software (you manage users, access, and data). The higher the stack, the less you control — and the more the provider secures. Public clouds are multi-tenant and shared, private clouds are dedicated, hybrid mixes both, and community clouds serve peer organizations.',
          'Misconfigurations — public storage buckets, open security groups, exposed keys — cause more breaches than zero-days. Cloud Security Posture Management continuously scans for them. Lift-and-shift migrations move workloads unchanged, which is fast but carries on-prem weaknesses into the cloud.',
        ],
      },
      {
        heading: 'Virtualization, containers, and zero trust',
        body: [
          'Type 1 hypervisors run on bare metal while Type 2 run atop a host OS. VM sprawl — untracked, unpatched virtual machines — is an asset-management failure, and VM escape (guest breaking out to the hypervisor) is rare but catastrophic. Containers share the host kernel, so a kernel bug escapes every container on the host: run them as non-root, keep images minimal, and scan them in CI.',
          'Harden with golden images (approved templates), immutable infrastructure (replace rather than patch), infrastructure-as-code scanning, and runtime-injected secrets — never baked into images. Zero trust ("never trust, always verify") replaces flat VPN-era networking with per-request, identity-aware access; microsegmentation and service meshes (mutual TLS between services) are its network expression.',
        ],
      },
    ],
    cheatSheet: [
      ['IaaS / PaaS / SaaS', 'You manage OS / code / data+access'],
      ['#1 cloud breach cause', 'Customer misconfiguration'],
      ['CSPM', 'Continuous misconfig scanning'],
      ['Type 1 / 2 hypervisor', 'Bare metal / on host OS'],
      ['VM escape', 'Guest breaks out to hypervisor'],
      ['Container risk', 'Shared kernel; run non-root'],
      ['Golden image', 'Hardened approved template'],
      ['Immutable infra', 'Replace, don\u2019t patch'],
      ['Secrets rule', 'Inject at runtime, never bake in'],
      ['Zero trust', 'Never trust, always verify'],
    ],
  },
  'cy-net-arch': {
    overview: [
      'Network architecture is where security policy becomes geography: what sits in the DMZ, which VLANs can reach each other, and where the single guarded entry point is. Get the topology right and most attacks run out of road.',
      'This lesson covers DMZs, segmentation (VLANs, microsegmentation), bastion hosts, deception (honeypots, honeynets, honeytokens), air gaps and data diodes, and the firewall and IDS/IPS concepts that enforce it all.',
    ],
    learn: [
      {
        heading: 'Zones and segmentation',
        body: [
          'A DMZ (screened subnet) is a buffer network between the internet and the internal LAN, firewalled on both sides. Web servers, mail relays, and VPN concentrators belong there; databases never do — if a DMZ host falls, the data stays inside.',
          'Segmentation limits lateral movement and blast radius: a compromised laptop should never reach operational technology. VLANs separate at Layer 2 (watch for double-tagging VLAN hopping) while subnets separate at Layer 3, and microsegmentation pushes policy down to individual workloads. A jump (bastion) host is the single hardened entry point for administration — MFA it, log everything, and never RDP to servers directly from user VLANs.',
        ],
      },
      {
        heading: 'Deception, isolation, and enforcement',
        body: [
          'Honeypots are decoy systems that alert the instant they are touched — no legitimate user ever would, so the signal is nearly pure. Honeynets scale the idea to whole fake networks, and honeytokens are fake credentials or files (a bogus AWS key in code) that trip an immediate alert. Air gaps isolate physically with no network path (though USBs and insiders bridge them), while data diodes enforce one-way flow in hardware.',
          'Stateful firewalls track connections rather than judging packets alone, and zone policies default-deny between trust zones. A WAF filters HTTP-layer attacks in front of web apps, an IDS only alerts while an IPS blocks inline (tune in IDS mode first to avoid false-positive outages), and reverse proxies terminate client connections so origin servers stay hidden.',
        ],
      },
    ],
    cheatSheet: [
      ['DMZ', 'Buffer net; firewalled both sides'],
      ['Never in DMZ', 'Databases'],
      ['Segmentation goal', 'Limit lateral movement'],
      ['Bastion host', 'Single hardened admin entry'],
      ['Honeypot', 'Decoy; any touch = alert'],
      ['Honeytoken', 'Fake credential tripwire'],
      ['Air gap', 'No network path at all'],
      ['Data diode', 'One-way flow in hardware'],
      ['WAF', 'Filters HTTP attacks'],
      ['IDS vs IPS', 'Alert only vs block inline'],
    ],
  },
  'cy-secure-proto': {
    overview: [
      'Protocols are promises about how data moves, and the secure versions of familiar protocols are where most day-to-day security lives: the S that turns HTTP into HTTPS, the 3 that turns SNMPv2c into SNMPv3, the tunnel that turns remote access from exposure into a non-event.',
      'This lesson covers TLS and certificates, secure management and file-transfer protocols, IPSec, VPN designs, and wireless security from WPA3 down to Bluetooth — the protocol knowledge Security+ tests directly.',
    ],
    learn: [
      {
        heading: 'TLS, certificates, and secure services',
        body: [
          'TLS provides confidentiality, integrity, and server authentication; version 1.3 is faster, drops weak ciphers, and encrypts more of the handshake — disable SSL and anything below 1.2. Certificate authorities vouch for public keys, HSTS headers force browsers onto HTTPS (defeating downgrade attacks), and certificate pinning makes an app trust only specific certificates regardless of the CA store.',
          'SSH replaces cleartext Telnet for everything, SFTP (over SSH) beats FTPS (FTP over TLS) for file transfer, SNMPv3 adds the authentication and encryption that v1/v2c\u2019s community strings lack, LDAPS encrypts directory queries, and DNSSEC validates DNS responses against cache poisoning. IPSec\u2019s ESP mode (encrypt plus authenticate) in tunnel mode is the standard site-to-site VPN construction.',
        ],
      },
      {
        heading: 'VPN designs and wireless',
        body: [
          'Split-tunnel VPNs send only corporate traffic through the tunnel (faster) while full-tunnel sends everything (inspectable and controlled). Site-to-site VPNs link networks; remote-access VPNs link roaming users. Always-on VPN connects before user logon so policy and patching apply off-network.',
          'WPA3 replaces WPA2\u2019s crackable handshakes with SAE, which resists offline dictionary attacks; WPA2-Enterprise adds per-user 802.1X authentication via RADIUS instead of one shared PSK. Rogue access points and evil twins (fake APs cloning a real SSID) are countered with wireless intrusion prevention and wired-side NAC. Deauthentication attacks spoof disconnect frames to capture handshakes — 802.11w protected management frames mitigate them. Bluetooth and NFC bring close-range risks (pairing interception, relay attacks); keep discoverable mode off.',
        ],
      },
    ],
    cheatSheet: [
      ['TLS 1.3', 'Faster, weak ciphers dropped'],
      ['HSTS', 'Forces HTTPS, blocks downgrade'],
      ['S/MIME', 'Email encryption + signing'],
      ['SFTP vs FTPS', 'Over SSH:22 vs FTP over TLS'],
      ['SNMPv3', 'Adds auth + encryption'],
      ['IPSec tunnel / ESP', 'Whole packet / encrypt+auth'],
      ['Split vs full tunnel', 'Corp-only vs all traffic via VPN'],
      ['WPA3 SAE', 'Resists offline dictionary attacks'],
      ['Enterprise vs Personal', '802.1X per-user vs shared PSK'],
      ['Evil twin', 'Fake AP cloning a real SSID'],
      ['Deauth mitigation', '802.11w protected mgmt frames'],
    ],
  },
  'cy-crypto': {
    overview: [
      'Cryptography is the quiet machinery underneath nearly every security control: the TLS that protects a login, the hash that proves a file is intact, the signature that makes a software update trustworthy. Security+ expects you to know not just the names but when each tool fits.',
      'This lesson covers how strangers agree on secrets (key exchange), how hybrid encryption gets the best of both worlds, what certificates actually prove, and how the pieces — ciphers, hashes, signatures — combine into working systems.',
    ],
    learn: [
      {
        heading: 'Agreeing on secrets and mixing ciphers',
        body: [
          'Two parties who have never met can still agree on a secret over a public channel using Diffie-Hellman: each combines a private value with the other’s public value, and both arrive at the same secret while eavesdroppers cannot. It solves key distribution without ever transmitting the key itself.',
          'Real systems rarely use one cipher type alone. A digital envelope encrypts the message with a fast symmetric key, then encrypts that key with the recipient’s public key — symmetric speed for the bulk data, asymmetric convenience for the key. TLS handshakes work the same way, and ephemeral keys per session give perfect forward secrecy.',
          'Block ciphers like AES encrypt fixed-size chunks; stream ciphers encrypt bit by bit. Prefer authenticated modes such as AES-GCM, which bundle confidentiality and integrity, over plain CBC, which needs a separate HMAC to detect tampering. And remember the fundamental split: hashing is one-way with no key, encryption is reversible with one.',
        ],
      },
      {
        heading: 'Certificates and the PKI that backs them',
        body: [
          'A certificate binds a public key to an identity, vouched for by a certificate authority. Domain-validated (DV) certs only prove control of the domain; organization-validated (OV) verify the business; extended-validation (EV) vets rigorously. All three encrypt identically — the difference is how much identity was checked.',
          'Choose wildcards (*.example.com) for many subdomains of one domain, and SAN certificates when one certificate must cover several different names. Self-signed certificates encrypt fine but no trusted third party vouches for them, so browsers warn — acceptable in a lab, not in production.',
          'Trust flows down a chain: the leaf was signed by an intermediate, which was signed by a root your system trusts. Intermediates exist so the root key can stay offline; if an intermediate is compromised it can be revoked without replacing the root. Certificate pinning goes further — an app accepts only one specific key — defeating rogue-CA attacks at the cost of painful rotations.',
        ],
      },
      {
        heading: 'Keys, signatures, and where they live',
        body: [
          'A digital signature is a hash of the message encrypted with the sender’s private key. Verification decrypts with the public key, re-hashes, and compares. It proves origin and integrity — but not confidentiality, since anyone can read a signed message.',
          'Keys need homes and lifecycles. A hardware security module (HSM) is a network-attached vault serving keys to many systems; a TPM is a chip binding keys to one motherboard. Rotate keys on schedule and immediately on suspected compromise, and never hard-code them into shipped software — anyone who downloads the app owns the key.',
          'Elliptic-curve crypto gives more strength per bit than RSA: a 256-bit curve rivals RSA-3072, which is why ECC dominates on phones and constrained devices. And when secrecy must also hide the message’s very existence, steganography tucks data inside innocent files — but unlike encryption, it provides no mathematical guarantee once discovered.',
        ],
      },
    ],
    cheatSheet: [
      ['Diffie-Hellman', 'Agree on a secret over a public channel'],
      ['Digital envelope', 'Symmetric message key, encrypted asymmetrically'],
      ['DV / OV / EV', 'Domain / organization / extended validation'],
      ['Wildcard vs SAN', '*.domain subdomains vs several different names'],
      ['Self-signed', 'Encrypts fine; no trusted vouching'],
      ['Key escrow', 'Third party holds key copies for recovery'],
      ['HSM vs TPM', 'Network vault vs motherboard chip'],
      ['AES-GCM', 'Authenticated encryption: confidentiality + integrity'],
      ['Signature steps', 'Hash, then encrypt hash with private key'],
      ['Chain validation', 'Leaf → intermediate → trusted root'],
      ['Pinning', 'App accepts only one specific key'],
      ['ECC P-256', '≈ RSA-3072 strength, far less computation'],
    ],
  },
  'cy-concepts': {
    overview: [
      'Before any tool or protocol, security rests on a handful of ideas that show up on every exam and in every real design review: what you are protecting (the CIA triad), who gets in (AAA), and how you arrange trust (zero trust, defense in depth, least privilege).',
      'This lesson turns those abstractions into working instincts — which goal a ransomware attack hits, why a mantrap beats a polite sign, and how biometric error rates actually trade off.',
    ],
    learn: [
      {
        heading: 'CIA and AAA in practice',
        body: [
          'Confidentiality keeps secrets secret, integrity keeps data trustworthy, availability keeps systems reachable. Ransomware that encrypts your files attacks availability; when it also steals them for double extortion, confidentiality falls too. A database with wrong balances but no outage is an integrity failure — and only a verified clean copy restores it, not just any backup.',
          'Redundancy — RAID, clustering, generators — buys availability. Hashes, checksums, and version control buy integrity by detecting change. Encryption buys confidentiality. Most real controls serve one goal primarily; knowing which one tells you what a given attack actually breaks.',
          'AAA separates three questions: authentication (prove who you are), authorization (what you may do), and accounting (a record of what you did). A badge that opens the door but logs nothing failed at accounting — and without that record, incident response is blind. Authorization should default to implicit deny: nothing is allowed unless explicitly granted.',
        ],
      },
      {
        heading: 'Zero trust and layered defense',
        body: [
          'The old castle-and-moat model trusted everything inside the network. Zero trust assumes no implicit trust by location: every request is verified continuously, based on identity, device health, and context. A compromised laptop on the LAN gets no free pass.',
          'Microsegmentation carves the network into tiny isolated zones so breaching one does not open the rest. Continuous validation re-checks throughout the session rather than once at login. The policy engine decides, the administrator configures, and the enforcement point applies — the three logical pieces of a NIST 800-207 architecture.',
          'Defense in depth layers controls so one failure is not a breach: if phishing beats training, MFA and EDR still stand in the way. "Assume breach" designs detection, segmentation, and least privilege as if attackers were already inside — because eventually, they will be.',
        ],
      },
      {
        heading: 'Physical security and biometrics',
        body: [
          'Physical controls are the outermost layer. Bollards stop vehicle ramming; a mantrap — two interlocked doors where the second opens only after the first closes — defeats tailgating; a Faraday cage blocks all radio signals for rooms where wireless exfiltration is a concern. Cable locks deter opportunistic laptop theft, and visitor logs with escorts keep non-employees accountable.',
          'Biometrics authenticate "something you are": fingerprint, iris, face, voice. Two error rates govern them — the false acceptance rate (wrongly admitting) and false rejection rate (wrongly denying) — and lowering one raises the other. The crossover error rate, where the two are equal, lets you compare systems objectively.',
          'The catch with biometrics is permanence: you cannot revoke a compromised fingerprint. Use them for convenience, and pair them with something revocable — a PIN or token — where the stakes are high.',
        ],
      },
      {
        heading: 'Design principles that prevent fraud',
        body: [
          'Separation of duties splits critical tasks so no single person can complete fraud alone — the approver of payments cannot also issue them. Dual control goes further, requiring two authorized people for one sensitive action, as in key ceremonies and large transfers.',
          'Job rotation exposes fraud by putting fresh eyes on a role, and mandatory vacations force a break in any scheme that needs constant cover — both are classic anti-fraud controls, especially in finance. "Need to know" limits information access to those whose role requires it.',
          'These principles compose: classification labels data, need-to-know limits who sees it, least privilege limits what they can do with it, and separation of duties ensures no one person controls the whole chain.',
        ],
      },
    ],
    cheatSheet: [
      ['Ransomware encrypting files', 'Availability (+ confidentiality if stolen)'],
      ['Wrong balances, no outage', 'Integrity'],
      ['DDoS on the web shop', 'Availability'],
      ['Sniffed HTTP logins', 'Confidentiality'],
      ['AAA', 'Authenticate, authorize, account'],
      ['Implicit deny', 'Deny unless explicitly allowed'],
      ['Zero trust', 'Never trust, always verify, continuously'],
      ['Microsegmentation', 'Tiny isolated zones limit lateral movement'],
      ['Bollards / mantrap / Faraday', 'Anti-ram / anti-tailgate / anti-radio'],
      ['FAR vs FRR', 'Wrongly admit vs wrongly deny; CER compares'],
      ['Biometric catch', 'Cannot revoke a fingerprint'],
      ['Separation of duties', 'No single person completes fraud alone'],
      ['Mandatory vacations', 'Fraud needing cover unravels'],
    ],
  },
  'cy-risk': {
    overview: [
      'Security exists to manage risk, not to eliminate it — and risk is a business language, not a technical one. Leaders decide how much risk to accept; your job is to measure it honestly, price it in dollars or clear ratings, and drive it down to the line they drew.',
      'This lesson covers how risks are assessed and answered, what a business impact analysis produces, and how continuity planning keeps the organisation alive when controls fail.',
    ],
    learn: [
      {
        heading: 'Measuring and answering risk',
        body: [
          'Qualitative assessments rate risks high, medium, or low — fast and cheap. Quantitative assessments put numbers on them: single loss expectancy times annualized rate of occurrence gives annualized loss expectancy in dollars. Use qualitative for speed, quantitative when you need to justify a budget.',
          'A risk matrix plots likelihood against impact so the red corner — high likelihood times high impact — demands action first. Inherent risk is what you face before controls; residual risk is what remains after. The goal is never zero risk; it is residual risk at or below the appetite leadership set.',
          'Four answers exist for any risk: mitigate it with controls, transfer it with insurance or outsourcing, accept it with formal sign-off, or avoid it by stopping the activity. Acceptance is a documented decision with an expiry date, not neglect — and transfer never removes your residual liability.',
        ],
      },
      {
        heading: 'Business impact analysis and continuity',
        body: [
          'The business impact analysis identifies critical functions, sets recovery time and recovery point objectives for each, and maps the dependencies they need. Its outputs — not anyone’s gut feeling — drive the continuity budget. Maximum tolerable downtime caps it all: the RTO must fit inside the MTD or recovery is theatre.',
          'The business continuity plan keeps the whole organisation running and belongs to business leadership; the disaster recovery plan restores IT systems and belongs to IT. DRP is a subset of BCP. Succession planning names trained backups for every critical role, because incidents do not wait for the one expert to return.',
          'Match alternate sites to RTO: hot sites run ready for seconds-to-minutes recovery, warm sites need hours, cold sites are empty space for days-long rebuilds. Separate primary and recovery sites geographically — one regional disaster must not take both — and consider power grids and flood plains, not just mileage.',
        ],
      },
      {
        heading: 'Backups, testing, and communication',
        body: [
          'Full backups copy everything; incremental copies changes since the last backup of any kind (fast daily, slow to restore); differential copies changes since the last full (the middle path). Align backup frequency to the recovery point objective — a weekly tape cannot serve a four-hour RPO.',
          'Test realism in stages: tabletops talk through a scenario, functional exercises actually fail systems over, full-interruption tests run the business from the alternate site. Escalate gradually, because the most realistic tests risk real disruption. Test generators under load monthly — an untested generator is a hope, not a control.',
          'Continuity lives or dies on communication: who contacts whom, over which out-of-band channels, with pre-drafted messages for staff, customers, regulators, and media. Rehearse call trees — people change numbers, and a drill finds the dead branches before 2 a.m. does.',
        ],
      },
    ],
    cheatSheet: [
      ['Qualitative vs quantitative', 'Ratings vs dollar figures (ALE)'],
      ['Risk matrix', 'Likelihood × impact'],
      ['Inherent vs residual', 'Before controls vs after controls'],
      ['Appetite vs tolerance', 'How much accepted vs allowed variation'],
      ['Risk owner', 'The business, not security'],
      ['ALE $50k × 0.5 ARO', '$25k justifies cheaper controls'],
      ['BIA outputs', 'Critical functions, RTO/RPO, dependencies'],
      ['MTD', 'RTO must fit inside it'],
      ['BCP vs DRP', 'Business-owned vs IT-owned; DRP ⊂ BCP'],
      ['Hot / warm / cold', 'Ready / hours / empty space'],
      ['Incremental vs differential', 'Since last backup vs since last full'],
      ['Test ladder', 'Tabletop → functional → full interruption'],
    ],
  },
  'cy-governance': {
    overview: [
      'Someone has to decide what "secure enough" means, prove it to outsiders, and keep vendors honest. That is governance: the laws that constrain you, the frameworks that organise you, the audits that verify you, and the contracts that bind your third parties.',
      'This lesson maps the compliance landscape Security+ tests — HIPAA, SOX, PCI DSS, GDPR and friends — plus the frameworks, privacy principles, and vendor-risk practices that turn policy into proof.',
    ],
    learn: [
      {
        heading: 'The compliance landscape',
        body: [
          'HIPAA protects health information held by covered entities and their business associates, with breach notification within 60 days. Sarbanes-Oxley demands reliable financial reporting, which forces controlled IT systems under Section 404. The GLBA Safeguards Rule requires written security programs at financial institutions — broadly defined enough to include car dealerships offering financing.',
          'California’s CCPA/CPRA grants consumers rights to know, delete, and opt out of sale or sharing of personal data. FERPA guards student education records. FISMA makes federal systems categorise, control, assess, authorise, and continuously monitor via the NIST Risk Management Framework.',
          'PCI DSS is an industry standard, not a law — but its twelve requirement families bind anyone handling card data, and transaction volume decides whether you self-assess or face an on-site Report on Compliance. GDPR adds data-subject rights — access, rectification, erasure, portability, objection — and the ePrivacy Directive layers cookie consent on top.',
        ],
      },
      {
        heading: 'Frameworks that organise security',
        body: [
          'The NIST Risk Management Framework runs seven steps: Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor — authorisation being an explicit risk decision. ISO 27001 states certifiable requirements for an information security management system; ISO 27002 is the companion code of practice, and ISO 27701 extends both into privacy.',
          'The CIS Controls v8 organise eighteen controls into Implementation Groups: IG1 is basic cyber hygiene every organisation should reach, IG2 and IG3 add depth for the mature. SOC 2 reports on five trust services criteria — Security plus Availability, Processing Integrity, Confidentiality, and Privacy as needed — under the SSAE 18 auditing standard.',
          'NIST CSF 2.0 added Govern as a sixth top-level function, placing organisational context, risk strategy, and supply-chain oversight above Identify, Protect, Detect, Respond, and Recover. For cloud, the CSA Cloud Controls Matrix maps provider controls to ISO, SOC 2, and others, and FedRAMP standardises authorisation for US federal cloud use.',
        ],
      },
      {
        heading: 'Privacy principles and data rights',
        body: [
          'Collect and keep only what you need — data minimization shrinks both breach blast radius and compliance burden — and use it only for the purpose collected, which is purpose limitation. Know your data regimes: PII identifies a person, PHI is health data, PCI is cardholder data, each triggering different laws and handling.',
          'Data sovereignty means data answers to the laws where it resides, driving residency and cloud-region choices. The right to erasure is easy to promise and hard to deliver: every copy must be found across backups, logs, analytics, and vendor systems. True anonymization escapes GDPR scope; mere de-identification, where re-identification remains possible, does not.',
          'Build privacy in from the start rather than bolting it on. The controller decides purposes and means and carries primary accountability; the processor acts only on instructions. Moving personal data across borders needs an adequacy decision, Standard Contractual Clauses, or Binding Corporate Rules — and high-risk processing triggers a Data Protection Impact Assessment first.',
        ],
      },
      {
        heading: 'Policies, audits, and third-party risk',
        body: [
          'Policies set intent: acceptable use defines permitted behaviour and consequences; data retention sets how long each type lives and how it dies; BYOD rests on MDM enrolment plus containerisation; and the IR policy authorises, the plan organises, the playbook executes. NIST 800-63B modernised password thinking: long passphrases, no forced rotation without cause, and checks against breached lists.',
          'Internal audits serve management and can run continuously; external audits serve regulators or customers and are point-in-time. A good scope states objectives, systems, period, and criteria before fieldwork. Findings mean a control failed and demand dated responses; continuous auditing replaces annual sampling with automated, always-on testing.',
          'Vet vendors before signing — security posture, financial health, compliance evidence, incident history — because leverage evaporates after the contract is signed. Demand right-to-audit clauses, define SLAs with measurement and remedies (not wishes), and remember fourth-party risk: your vendors’ vendors, whom you never vetted. Offboard completely — orphaned vendor VPN accounts are a classic breach path.',
        ],
      },
    ],
    cheatSheet: [
      ['HIPAA', 'PHI; 60-day breach notice'],
      ['SOX 404', 'Controlled IT for financial reporting'],
      ['CCPA/CPRA', 'Know, delete, opt out of sale'],
      ['PCI DSS', '12 families; volume sets SAQ vs ROC'],
      ['GDPR rights', 'Access, rectify, erase, port, object'],
      ['NIST RMF', 'Prepare→Categorize→Select→Implement→Assess→Authorize→Monitor'],
      ['27001 vs 27002', 'Certifiable ISMS vs code of practice'],
      ['CIS IG1/2/3', 'Basic hygiene → mature'],
      ['SOC 2 criteria', 'Security + A, PI, C, P'],
      ['CSF 2.0 Govern', 'Context, risk strategy, supply chain'],
      ['800-63B passwords', 'Long, no forced rotation, breach-list check'],
      ['Internal vs external audit', 'Management/continuous vs regulators/point-in-time'],
      ['Minimization / purpose limit', 'Only what you need / only why collected'],
      ['Controller vs processor', 'Decides why vs acts on instructions'],
      ['Fourth-party risk', 'Your vendors’ vendors'],
      ['SLA needs', 'Levels, measurement, remedies'],
    ],
  },
};
