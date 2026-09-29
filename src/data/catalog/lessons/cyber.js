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
};
