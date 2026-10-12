// Reading content for the CySA+ (CS0-003) track (src/data/academy/cysa.js).
// Keyed by deck id. Professional voice — narrative, precise, confident.

export default {
  'cysa-soc-foundations': {
    overview: [
      'A Security Operations Center is where detection becomes action. Every alert that a firewall, endpoint agent, or identity system produces lands in the SOC, and analysts decide — usually in minutes — whether it is noise, a misconfiguration, or the first sign of an intruder. The difference between a contained event and a breach is often decided in that triage queue.',
      'This lesson covers how the SOC is organized, how alerts are triaged and escalated, what a SIEM actually does with all that telemetry, and the metrics — MTTD, MTTR, dwell time — by which a SOC\'s effectiveness is measured.',
    ],
    learn: [
      {
        heading: 'How the SOC is organized',
        body: [
          'A SOC is typically layered into tiers because not every alert deserves the same depth of attention. Tier 1 analysts are the front line: they monitor the alert queue, perform initial triage, enrich tickets with context, and escalate anything that looks genuinely malicious. Their job is filtering — separating signal from noise at volume, and doing it consistently.',
          'Tier 2 analysts pick up escalated cases and perform deep investigation: correlating logs across sources, pulling packet captures, examining endpoint telemetry, and determining scope. Tier 3 is where threat hunting and proactive work live — hypothesis-driven searching for threats that evaded automation — alongside incident response support and detection engineering. The escalation path runs Tier 1 to Tier 2 to Tier 3 to management, and it is defined in the incident response plan so nobody improvises the chain of command during a crisis.',
          'What makes triage work is prioritization, and prioritization requires context. An alert is never just an alert: it is an event on an asset, with a severity attached, enriched by threat intelligence. Severity is the technical impact of the event; priority is the response order, which folds in business context. A critical alert on a domain controller outranks the same alert on a print server, because asset criticality changes what the event means. Analysts who triage without asset context are guessing.',
        ],
      },
      {
        heading: 'Alerts, events, and the anatomy of triage',
        body: [
          'Precision starts with vocabulary. An event is any observable occurrence — a login, a blocked connection, a file hash match. An incident is an event that has been confirmed as a policy or security violation. Only incidents trigger the formal incident response process; everything else is triage, investigation, or tuning work. Confusing the two either wastes IR resources or starves real incidents of them.',
          'Every alert also carries a classification. A true positive is an alert for a real malicious event. A false positive flags benign activity — annoying, but the cost is analyst time. A false negative is the dangerous one: a real attack that produced no alert at all. Alert fatigue — the desensitization that comes from drowning in false positives — is how true positives get missed. Tuning, correlation, and automation are the cures, not asking analysts to simply try harder.',
          'Runbooks and playbooks keep triage consistent. A runbook is a documented step-by-step procedure for a specific alert type — check this log, look up that hash, escalate if X. A playbook is broader: a conditional response plan that links multiple runbooks, tools, and decisions together. Runbooks make Tier 1 consistent; playbooks make complex responses repeatable. And enrichment — automatically adding asset owner, threat intel, and related alerts to a ticket — is what lets a Tier 1 analyst make a good decision in two minutes instead of twenty.',
        ],
      },
      {
        heading: 'The SIEM at the center',
        body: [
          'The SIEM — Security Information and Event Management — is the SOC\'s nervous system. It collects logs from firewalls, IDS/IPS, EDR, servers, identity systems, and cloud audit trails, normalizes them into a common schema so different vendors\' logs can be searched and compared together, and correlates them: linking related events across sources into a single incident so one attack produces one case instead of fifty alerts.',
          'Normalization deserves emphasis because it is invisible when it works. A firewall calls a source address src_ip, an endpoint agent calls it srcAddr, and without normalization the analyst cannot ask "show me everything this IP touched" across both. Parsers extract fields from raw logs into the SIEM\'s schema, and the quality of those parsers quietly determines the quality of every detection built on top.',
          'Know what the SIEM does not do. It does not block traffic inline — that is the IPS\'s job, and IPS blocks become events to verify, not trusted truth. It does not replace endpoint agents. It provides central visibility, and its value is entirely downstream of log quality, coverage, and tuning. A SIEM with poor telemetry is a very expensive alert factory.',
        ],
      },
      {
        heading: 'Measuring the SOC',
        body: [
          'Three metrics dominate SOC reporting. Mean time to detect (MTTD) is the average time from compromise to detection — lower MTTD limits how long an attacker operates unseen. Mean time to respond (MTTR) is the average time from detection to containment or remediation — the speed at which the SOC turns knowledge into action. Dwell time is how long an attacker remains undetected in the environment, and industry averages are measured in days to weeks, which is why threat hunting exists.',
          'Baselines make these metrics meaningful. A baseline is a profile of normal behavior — normal login times, normal traffic volumes, normal process trees — and deviations from it are what trigger investigation. Without a baseline, every anomaly is a coin flip; with one, the analyst can say what "wrong" looks like for this specific environment.',
          'Finally, continuous monitoring is the SOC\'s standing posture: ongoing collection and analysis of security telemetry, not a yearly audit or quarterly review. Frameworks like NIST CSF expect it, and the whole point of the tier structure, the runbooks, and the SIEM is to make continuous monitoring sustainable — accurate enough to trust, automated enough to scale, and measured enough to improve.',
        ],
      },
    ],
    cheatSheet: [
      ['SOC tiers', 'Tier 1 triages alerts; Tier 2 investigates escalations; Tier 3 hunts threats and supports IR.'],
      ['True positive / false positive / false negative', 'Real attack alerted / benign activity alerted / real attack missed. False negatives are the most dangerous.'],
      ['Alert fatigue', 'Desensitization from excessive false positives; cured by tuning, correlation, and automation.'],
      ['SIEM', 'Collects, normalizes, and correlates logs for central detection; does not block traffic inline.'],
      ['Event vs incident', 'An event is any observable occurrence; an incident is a confirmed policy or security violation.'],
      ['Severity vs priority', 'Severity is technical impact; priority is response order including business context.'],
      ['Runbook vs playbook', 'A runbook is step-by-step for one alert type; a playbook is a broader conditional response plan.'],
      ['MTTD / MTTR / dwell time', 'Mean time to detect, mean time to respond, and how long an attacker stays undetected.'],
      ['Baseline', 'A profile of normal behavior used to spot anomalies.'],
      ['Enrichment', 'Automatically adding asset, threat intel, and related-alert context to a ticket.'],
    ],
  },

  'cysa-vuln-basics': {
    overview: [
      'You cannot defend what you have not inventoried, and you cannot fix what you have not found. Vulnerability scanning is the automated, systematic discovery of known weaknesses across systems — the flashlight that turns an unknown attack surface into a prioritized list of problems.',
      'This lesson covers how scans work, how findings are scored and named through CVSS and CVE, and the fundamental decision every finding forces: remediate it, mitigate it, or formally accept the risk.',
    ],
    learn: [
      {
        heading: 'How vulnerability scanning works',
        body: [
          'A vulnerability scanner probes systems and compares what it finds against a database of known weaknesses — missing patches, misconfigurations, weak credentials, exposed services. It is automated discovery, and its value is coverage: it checks every asset in scope, the same way, every time, without getting tired or skipping the boring servers.',
          'Credentialed scans authenticate to the target with provided credentials and see what the scanner could never observe from the outside: installed patch levels, registry settings, local security policy, missing hotfixes. Non-credentialed scans see only what is exposed over the network. Neither is sufficient alone — authenticated scans find the missing patches, unauthenticated scans confirm what an attacker can actually reach — so mature programs run both.',
          'Agent-based scanning adds a third option: a lightweight agent on the host that continuously reports vulnerabilities without a scheduled network scan. Agents solve the blind spots of periodic scanning — laptops that are asleep during the scan window, cloud instances that live for hours — and they collect continuously rather than on a schedule. The tradeoff is deployment and maintenance of the agent fleet itself.',
          'Scan scope is a formal decision, not an afterthought: the defined set of assets included in a scan. Scanning outside scope can violate contracts, regulations, or common sense — and scanning is often scheduled during off-hours because aggressive scanning can degrade performance or crash fragile legacy systems. A scan that takes down production is not a successful scan.',
        ],
      },
      {
        heading: 'CVSS, CVE, and the NVD',
        body: [
          'Every finding needs a common language for "how bad is this." CVSS — the Common Vulnerability Scoring System — is the open standard for scoring vulnerability severity from 0.0 to 10.0. It has three metric groups: base metrics describe the intrinsic properties of the flaw (attack vector, complexity, privileges required, impact), temporal metrics adjust for factors that change over time (exploit code maturity, remediation level), and environmental metrics adjust for your specific deployment. A score of 9.0 to 10.0 is critical; 7.0 to 8.9 is high.',
          'Know CVSS\'s limits, because the exam tests them. CVSS measures severity — how bad the vulnerability is in the abstract — not likelihood of exploitation in your environment. A 9.8 on an isolated system with no exploit code in the wild may matter less than a 7.5 with active exploitation. Scoring guides attention; it does not replace judgment.',
          'CVE and the NVD are the identification layer beneath the score. A CVE is a unique public identifier for a known vulnerability, formatted CVE-YYYY-NNNNN, so the whole industry can refer to the same flaw unambiguously. The NVD — NIST\'s National Vulnerability Database — is the primary US source that enriches each CVE with CVSS scores, references, and affected products. When a scanner reports a finding, it is ultimately pointing at a CVE entry in the NVD.',
        ],
      },
      {
        heading: 'Remediation, mitigation, and acceptance',
        body: [
          'Every confirmed finding ends in one of three dispositions, and confusing them is an operational and audit failure. Remediation fixes the root cause — usually by patching or reconfiguring — so the vulnerability no longer exists. Mitigation reduces exposure without fully fixing the flaw: an IPS signature, network segmentation, disabling a vulnerable feature. An exception, or risk acceptance, is the formal documented acceptance of the vulnerability without fixing it, approved by a risk owner with an expiry date.',
          'Mitigation is preferred when no patch exists — a zero-day, a legacy system the vendor no longer supports, or a change that cannot be made during a critical business period. The tool of choice is the compensating control: segmentation that isolates the unpatchable server, an IPS signature that blocks the exploit, enhanced monitoring that would catch its use. Compensating controls do not make the finding go away; they make it survivable until remediation is possible.',
          'Exceptions need a workflow, or they become permanent. A sound exception process requires a request, a risk assessment, an owner\'s approval, and an expiry date that forces re-evaluation. The risk of indefinite exceptions is silent accumulation — each accepted risk is small, but the portfolio grows until it becomes the attack path. Risk acceptance is a decision with a shelf life.',
        ],
      },
      {
        heading: 'Scanning in context',
        body: [
          'A vulnerability assessment finds and reports weaknesses; a penetration test attempts to exploit them to prove impact. The assessment answers "what is wrong," the pen test answers "what can an attacker actually do with it." Assessments are broader and safer to run regularly; pen tests are deeper and usually point-in-time. Programs need both, on different cadences.',
          'Configuration compliance scanning checks systems against secure baselines rather than known CVEs — asking "is this system configured the way we decided it should be?" CIS Benchmarks are the standard reference here: consensus-based secure configuration guidance for platforms and applications, built by practitioners and freely available. A system can be fully patched and still be insecure because its configuration drifted from the baseline.',
          'That drift is worth naming explicitly. Configuration drift is systems gradually diverging from their secure baselines over time — the firewall rule added for a project and never removed, the service re-enabled by an update. Continuous compliance scanning exists because drift is constant, and vulnerability management that only tracks CVEs misses the misconfigurations attackers actually exploit. And vulnerability chaining is why even low-severity findings matter: attackers combine multiple minor flaws into a serious exploit path, so the "low" you deferred can be the stepping stone to the "critical" you feared.',
        ],
      },
    ],
    cheatSheet: [
      ['Vulnerability scanning', 'Automated discovery of known weaknesses in systems.'],
      ['Credentialed vs non-credentialed', 'Credentialed scans authenticate and see patch levels and configs; non-credentialed scans see only network-exposed weaknesses. Run both.'],
      ['Agent-based scanning', 'A lightweight host agent reports vulnerabilities continuously; covers offline and ephemeral systems.'],
      ['CVSS', 'Open standard scoring severity 0.0–10.0; base, temporal, and environmental metric groups. 9.0–10.0 is critical.'],
      ['CVE', 'Unique public identifier for a known vulnerability, formatted CVE-YYYY-NNNNN.'],
      ['NVD', 'NIST\'s database enriching CVEs with CVSS scores and references.'],
      ['Remediation vs mitigation vs acceptance', 'Fix the root cause / reduce exposure without fixing / formally accept the risk with approval and expiry.'],
      ['Compensating control', 'Segmentation, IPS signatures, or monitoring that make an unpatchable flaw survivable.'],
      ['Vulnerability assessment vs pen test', 'Assessment finds and reports; pen test exploits to prove impact.'],
      ['CIS Benchmarks', 'Consensus-based secure configuration guidance used for compliance scanning.'],
    ],
  },

  'cysa-siem-soar': {
    overview: [
      'A SIEM that fires ten thousand alerts a day is not a detection capability — it is a noise generator. The difference between a SIEM that works and one that analysts ignore is correlation, the logic that turns scattered events into coherent incidents, and tuning, the discipline that keeps that logic honest.',
      'This lesson covers correlation and tuning, the SOAR automation that extends them, and the threat intelligence that gives every alert its context — from IOCs and IOAs to STIX and TAXII.',
    ],
    learn: [
      {
        heading: 'Correlation: turning events into incidents',
        body: [
          'Event correlation is the SIEM\'s core value proposition: linking related events across sources into a single incident. Five failed logins on the VPN, a successful login from a new country, and an impossible-travel alert for the same user are three events and one story. Without correlation, the analyst works three tickets; with it, they work one case with a narrative.',
          'A correlation rule is the logic that fires an alert when a defined pattern of events occurs — a sequence, a threshold, a combination across sources. A SIEM use case is the defined detection scenario behind the rule, mapped to a specific threat: impossible travel, brute force followed by success, malware callback patterns. Good programs write use cases first and rules second, because a rule without a threat model is just a guess with syntax.',
          'Aggregation sits beside correlation in the noise-reduction toolkit: combining similar events into one to reduce alert volume. Ten thousand identical firewall denies become one aggregated event with a count. Aggregation does not detect anything new — it makes the detectable manageable. And a watchlist is the analyst\'s custom lens: a list of entities such as IPs, users, or domains that the SIEM alerts on whenever they appear, useful for tracking persons of interest, critical assets, or threat actor infrastructure.',
        ],
      },
      {
        heading: 'Tuning: the never-ending job',
        body: [
          'No correlation rule survives first contact with a real environment. Tuning is how a noisy detection becomes a useful one: adjusting thresholds so normal behavior stops firing, adding allowlists for known-good entities, and requiring additional conditions before an alert triggers. A rule that fires a hundred times a day with one true positive is not a detection — it is training analysts to ignore it.',
          'Tuning is continuous because environments change. New applications, new users, new infrastructure all shift the baseline, and every change can turn a tuned rule noisy again — or worse, turn a working rule blind. The discipline is to review detection performance regularly: true positive rate per rule, alert volume trends, and coverage gaps against the threats you actually face.',
          'Know the failure modes. An over-tuned rule suppresses real attacks — the false negatives nobody notices until the incident. An under-tuned rule drowns analysts — alert fatigue that lets true positives slip through. Tuning is the trade between these two, and it is never finished, only maintained.',
        ],
      },
      {
        heading: 'SOAR: automation with judgment',
        body: [
          'SOAR — Security Orchestration, Automation, and Response — is what happens when playbooks become executable. Where a SIEM detects, SOAR acts: running automated playbooks that enrich tickets, create cases, block IPs, disable accounts, and isolate endpoints in response to alerts. The trigger is the alert condition that starts a sequence of automated actions; the playbook is the workflow itself.',
          'The realistic automation targets are the repetitive, low-judgment parts of triage: enrichment (pulling asset owner, threat intel, and related alerts into the ticket automatically), ticket creation, and reversible containment like blocking a known-malicious IP. These are the tasks that consume analyst hours without requiring analyst judgment, and automating them is how a SOC scales without hiring linearly.',
          'The main risk of fully automated response is getting it wrong at machine speed. Automated containment can disrupt legitimate business — isolating the CEO\'s laptop during a board meeting because of a false positive is a career event. Mature programs gate automation by confidence: fully automatic for high-confidence, reversible actions; human approval for destructive or business-impacting ones. Automation should multiply analyst judgment, not replace it.',
        ],
      },
      {
        heading: 'Threat intelligence in the pipeline',
        body: [
          'Threat intelligence feed integration gives every alert its context automatically: the SIEM matches observed indicators — IPs, domains, hashes — against feeds of known-malicious artifacts and attaches the results to the alert. An alert for "workstation talked to 203.0.113.44" becomes "workstation talked to a known ransomware C2 server," and the analyst\'s first decision is half made.',
          'Two vocabularies matter here. An IOC — indicator of compromise — is an artifact of compromise such as a hash, IP, or domain; it is evidence that something already happened. An IOA — indicator of attack — describes behavior in progress, like a suspicious process pattern. IOCs are specific and expire quickly as attackers rotate infrastructure; IOAs describe behavior and stay relevant longer. Detections built on IOAs are more durable than those built on IOCs.',
          'STIX and TAXII are the standards that let this intelligence move between organizations and tools: STIX is the format for expressing threat intelligence, TAXII is the protocol for exchanging it. Together they are how a feed from a vendor, a government agency, or an industry sharing group arrives in your SIEM in a machine-readable form. And UEBA — user and entity behavior analytics — extends the same idea to behavior: baselining normal user and device activity to flag anomalies, which is how you catch the insider and the compromised account that no signature would recognize.',
        ],
      },
    ],
    cheatSheet: [
      ['Correlation', 'Linking related events across sources into a single incident.'],
      ['Correlation rule', 'Logic that fires an alert when a defined pattern of events occurs.'],
      ['SIEM use case', 'A defined detection scenario mapped to a specific threat.'],
      ['Tuning', 'Adjusting thresholds, adding allowlists, and requiring conditions to reduce false positives.'],
      ['SOAR', 'Security orchestration, automation, and response: automated playbooks that act on alerts.'],
      ['Playbook trigger', 'The alert condition that starts a sequence of automated actions.'],
      ['Automation risk', 'Fully automated containment can disrupt legitimate business; gate by confidence and reversibility.'],
      ['IOC vs IOA', 'An IOC is an artifact of compromise (hash, IP); an IOA describes attack behavior. IOAs are more durable.'],
      ['STIX / TAXII', 'STIX is the format for threat intelligence; TAXII is the protocol for exchanging it.'],
      ['UEBA', 'Baselines normal user and entity behavior to flag anomalies.'],
    ],
  },

  'cysa-threat-hunting': {
    overview: [
      'Automated detection catches the known. Threat hunting exists for everything else — the novel malware, the misused legitimate tool, the slow exfiltration that no signature describes. It is proactive, hypothesis-driven searching through telemetry for threats that evaded the automated defenses.',
      'This lesson covers how hunts are structured, what attacker behavior looks like in network, endpoint, and email telemetry, and the forensic techniques that confirm what hunting uncovers.',
    ],
    learn: [
      {
        heading: 'The hunting loop',
        body: [
          'A hunt starts with a hypothesis: an educated guess about attacker behavior to test against telemetry. "Ransomware affiliates are abusing our RDP gateway" is a hypothesis; "let\'s look at logs" is not. The hypothesis focuses the hunt, defines what evidence would confirm or refute it, and keeps the analyst from drowning in data.',
          'The loop itself has four movements: hypothesize, investigate, uncover, and inform. You form the hypothesis, dig through telemetry to test it, uncover either malicious activity or a refuted hypothesis, and inform the organization — new detections, hardened configurations, updated runbooks. A hunt that finds nothing still has value if it produces a detection or closes a blind spot; the only failed hunt is one that teaches nothing.',
          'Hunts come from two directions. Intel-driven hunting starts from threat reports and known actor TTPs — mapping a published ransomware playbook against your own telemetry. Data-driven hunting explores telemetry for anomalies without a specific intelligence lead, looking for the statistical oddity that turns out to be an intruder. Mature programs do both: intel tells you where to look first, data tells you what you were not looking for.',
        ],
      },
      {
        heading: 'Reading network telemetry',
        body: [
          'The network remembers what endpoints try to forget. Command-and-control beaconing has a recognizable shape in logs: regular, low-volume callbacks at fixed intervals, often to rare or newly registered domains, with consistent small byte counts. Humans browse irregularly; malware phones home on a schedule. That regularity is the signal.',
          'DNS tunneling abuses the one protocol almost every network allows everywhere. In logs it looks like long, encoded subdomains with high query volume to rare domains — data exfiltrated or commands received inside DNS queries that no legitimate resolver would generate. Ten thousand queries to random-looking subdomains of a single domain in an hour is not a misconfiguration; it is an exfiltration channel or a tunnel being established.',
          'NetFlow analysis answers the structural question: who talked to whom, when, and how much — without packet contents. It is how you spot the workstation uploading gigabytes to an external IP at 2 AM, the server talking to an address it has never contacted, the lateral movement pattern of one host scanning its neighbors. Flow data is compact enough to retain for months, which makes it the hunting ground for slow, long-dwell intrusions.',
        ],
      },
      {
        heading: 'Endpoint and email evidence',
        body: [
          'On the endpoint, process relationships tell the story. Unexpected parent-child process relationships — Word spawning PowerShell, rundll32.exe running with no command line and making external connections — are classic signs of process injection and payload execution. Attackers increasingly practice living-off-the-land: using legitimate system tools like PowerShell, WMI, and PsExec instead of custom malware, because trusted tools bypass allowlists and leave less forensic residue. The defense is not blocking the tool but detecting its misuse.',
          'Email remains the most common initial access vector, and the headers are the evidence. Return-Path, the Received chain, and the SPF, DKIM, and DMARC results show where a message actually came from versus where it claims to be from. A "bank" email whose Received chain starts at a residential ISP and fails all three authentication checks is not a bank email. URL detonation — safely opening a suspicious link in a sandbox to observe its behavior — answers what the link does without risking a workstation.',
          'Persistence in email systems is subtler than malware: attackers create auto-forwarding rules or rules that hide their activity, silently copying incoming mail to external addresses or moving security notifications out of the inbox. Mailbox rule review belongs in every compromise investigation, because the attacker who keeps reading the victim\'s email keeps their access to password resets.',
        ],
      },
      {
        heading: 'Confirming with forensics',
        body: [
          'When hunting surfaces a lead, forensics confirms it. Memory forensics finds what disk forensics cannot: fileless malware, injected code, and encryption keys that exist only in RAM. A process that looks clean on disk but has injected threads in memory is the signature of modern tradecraft, and memory capture is often the only way to see it.',
          'Collection follows the order of volatility: gather the most ephemeral evidence first — CPU cache and registers, RAM, network connections, running processes — before moving to disk and logs. Volatile evidence disappears the moment a system is powered off or rebooted, so the order is not a suggestion. An analyst who images the disk before capturing memory has already lost the fileless payload.',
          'Timeline analysis then reconstructs the attack by ordering artifacts by timestamp — file modifications, log entries, registry changes — into a single narrative of what happened when. And file carving recovers deleted files from unallocated disk space, useful when attackers try to cover their tracks. Together they turn a confirmed compromise into a complete story: initial access, persistence, lateral movement, and exfiltration, each with its timestamp.',
        ],
      },
    ],
    cheatSheet: [
      ['Threat hunting', 'Proactive, hypothesis-driven searching for threats that evaded automated detection.'],
      ['Hunting loop', 'Hypothesize, investigate, uncover, and inform.'],
      ['Intel-driven vs data-driven', 'Intel-driven starts from threat reports and TTPs; data-driven explores telemetry for anomalies.'],
      ['C2 beaconing', 'Regular, low-volume callbacks at fixed intervals to rare domains.'],
      ['DNS tunneling', 'Long encoded subdomains with high query volume to rare domains.'],
      ['NetFlow analysis', 'Who talked to whom, when, and how much — without packet contents.'],
      ['Living-off-the-land', 'Attackers using legitimate tools (PowerShell, WMI) to evade detection. Detect the misuse, not the tool.'],
      ['Email headers', 'Return-Path, the Received chain, and SPF/DKIM/DMARC show a message\'s true origin.'],
      ['Order of volatility', 'Collect the most volatile evidence first: cache and RAM before disk and logs.'],
      ['Timeline analysis', 'Ordering artifacts by timestamp to reconstruct the attack.'],
    ],
  },

  'cysa-vuln-management': {
    overview: [
      'Scanning finds vulnerabilities; management decides what to do about them. A scanner will happily report ten thousand findings, and the organization that tries to fix them all in CVSS order will spend its year patching the wrong things while the exploited ones wait.',
      'This lesson covers risk-based prioritization — EPSS, the CISA KEV catalog, and threat-informed decision-making — plus the remediation workflows, SLAs, and metrics that turn findings into fixed problems.',
    ],
    learn: [
      {
        heading: 'Beyond CVSS: prioritizing by risk',
        body: [
          'CVSS measures severity, not likelihood of exploitation, and that gap is where prioritization lives. EPSS — the Exploit Prediction Scoring System — fills it: the estimated probability that a vulnerability will be exploited in the wild in the next thirty days, expressed as a score from 0 to 1. A CVSS 9.8 with an EPSS of 0.001 is a theoretical problem; a CVSS 7.5 with an EPSS of 0.9 is an operational emergency.',
          'The CISA KEV catalog is the sharper instrument: the list of vulnerabilities known to be actively exploited in the wild, maintained by CISA. A KEV listing is ground truth, not prediction — someone is exploiting this right now, against real targets. Federal agencies are required to remediate KEV entries on binding deadlines, and every organization should treat KEV as its priority override. The classic exam scenario is direct: a CVSS 9.8 with no known exploit versus a CVSS 7.5 listed in KEV — remediate the KEV entry first.',
          'Threat-informed prioritization generalizes the principle: weight vulnerabilities by active threat intelligence relevant to your sector, not just by score. A vulnerability in the VPN concentrator your industry\'s ransomware affiliates are targeting outranks a higher-scored flaw in a product nobody attacks. Scoring tells you how bad; threat intel tells you how likely; asset criticality tells you how much it matters to you. Prioritization is all three multiplied.',
        ],
      },
      {
        heading: 'The remediation workflow',
        body: [
          'Findings move through a pipeline: discovery, validation, prioritization, remediation or mitigation, and verification. Vulnerability validation — confirming a scanner finding is real and exploitable before acting on it — is the step immature programs skip. Scanners produce false positives; patching a phantom vulnerability wastes a change window and erodes trust in the program. Validate first, especially for findings that will drive emergency changes.',
          'Penetration testing plays a defined role in this pipeline: it validates exploitability and demonstrates impact. Where the scanner says "this could be exploited," the pen test says "this is how, and here is what it yields." That evidence is what justifies emergency patching to a reluctant system owner and what separates the findings that need a weekend from the ones that can wait for the cycle.',
          'Continuous vulnerability management is the operating model that replaces the quarterly scan-and-panic cycle: ongoing discovery, prioritization, and remediation as a standing process. Assets change daily — new systems, new software, new exposures — and a point-in-time assessment decays from the moment it finishes. The goal is a pipeline that never stops, not a project that ends.',
        ],
      },
      {
        heading: 'SLAs, exceptions, and drift',
        body: [
          'A remediation SLA is a deadline for fixing vulnerabilities based on severity — critical findings in days, highs in weeks, mediums in the cycle. SLAs turn "we should patch that" into an accountable commitment with an owner and a date, and the metric that matters is mean time to remediate by severity: how fast the organization actually closes what it promised to close.',
          'The exception workflow handles the findings that cannot be fixed on schedule: a request, a risk assessment, the owner\'s approval, and an expiry date that forces re-evaluation. The failure mode is the indefinite exception — accepted risk that never expires and silently accumulates until the accepted vulnerabilities become the attack path. Every exception should have a next review date, or it is not an exception; it is surrender.',
          'Configuration drift is the slow leak in every program: systems gradually diverging from their secure baselines over time as administrators make changes, updates re-enable services, and temporary fixes become permanent. Drift is why compliance scanning runs continuously and why "we hardened that server last year" is not a security posture. The baseline is the contract; drift is the breach of it.',
        ],
      },
      {
        heading: 'Disclosure and program health',
        body: [
          'A vulnerability disclosure program is the official channel for external researchers to report flaws — the "report a vulnerability" page with a scope, a safe harbor, and a response commitment. Coordinated vulnerability disclosure is the process it enables: the researcher reports privately, the vendor remediates, and the flaw is publicly disclosed only after a fix exists. Organizations without a disclosure program still receive reports; they just receive them on social media.',
          'Program health is measured, not felt. The metrics that matter: mean time to remediate by severity, percentage of assets covered by scanning, exception aging — how long vulnerabilities remain open past their remediation SLAs — and scan coverage itself, the percentage of assets actually scanned during the period. Unscanned assets are unmeasured risk, and a program that cannot report its coverage cannot claim to manage its vulnerabilities.',
          'Tie the metrics together and they tell a story. Rising MTTR with stable coverage means the remediation pipeline is the bottleneck. Falling coverage with stable MTTR means the asset inventory is decaying. Vulnerability aging climbing means exceptions are accumulating. The analyst who can read these trends can fix the program, not just the findings.',
        ],
      },
    ],
    cheatSheet: [
      ['EPSS', 'Exploit Prediction Scoring System: estimated probability a vulnerability is exploited in the next 30 days.'],
      ['CISA KEV', 'Catalog of vulnerabilities known to be actively exploited; KEV listings outrank CVSS-only prioritization.'],
      ['CVSS vs likelihood', 'CVSS measures severity, not likelihood of exploitation. Pair it with EPSS and KEV.'],
      ['Validation', 'Confirming a scanner finding is real and exploitable before acting on it.'],
      ['Remediation SLA', 'A deadline for fixing vulnerabilities based on severity, e.g. criticals in days.'],
      ['Exception workflow', 'Request, risk assessment, owner approval, expiry date. Indefinite exceptions accumulate into attack paths.'],
      ['Compensating control', 'Segmentation, IPS signatures, or monitoring that reduce exposure when patching is impossible.'],
      ['Configuration drift', 'Systems gradually diverging from secure baselines; caught by continuous compliance scanning.'],
      ['Vulnerability aging', 'How long vulnerabilities remain open past their remediation SLAs.'],
      ['Coordinated disclosure', 'Researcher reports privately, vendor remediates, public disclosure follows the fix.'],
    ],
  },

  'cysa-incident-response': {
    overview: [
      'Every organization will have incidents. The ones that survive them well are not the ones with the best tools — they are the ones that decided, before the crisis, who does what, in what order, with whose authority. Incident response is that decision, written down and rehearsed.',
      'This lesson covers the NIST SP 800-61 response lifecycle, containment through recovery, the forensics that preserve evidence along the way, and the legal and business realities that shape every response.',
    ],
    learn: [
      {
        heading: 'The NIST SP 800-61 lifecycle',
        body: [
          'NIST SP 800-61 defines four phases: Preparation; Detection and Analysis; Containment, Eradication, and Recovery; and Post-Incident Activity. The phases are a cycle, not a line — lessons learned feed back into preparation, and preparation determines how well every other phase performs.',
          'Preparation is everything built before the incident: the IR team with defined roles, the tooling and access they will need, the playbooks for likely scenarios, and the communication plans for stakeholders, legal, and the public. It also means relationships — an IR retainer, a pre-contracted external response firm for surge support, signed before you need it, because negotiating contracts during a breach is how you lose days you do not have.',
          'Detection and Analysis is the SOC\'s handoff to the IR process: confirming that an event is an incident, determining scope, and understanding what the attacker did. Analysis quality determines response quality — contain too early and you tip off the attacker before you understand their foothold; contain too late and the damage spreads. A war room — a centralized coordination space or channel with defined roles — keeps the analysis and the decisions in one place instead of scattered across chat threads.',
        ],
      },
      {
        heading: 'Containment, eradication, recovery',
        body: [
          'When ransomware is confirmed on a host, the first priority is containment: isolate the host from the network immediately. Every minute of delay is lateral movement. Short-term containment isolates the threat quickly — pulling the network cable, disabling the switch port, revoking the cloud account\'s sessions and access keys. Long-term containment keeps the business running while the threat is neutralized — segmented VLANs, hardened temporary controls — buying time for a thorough response.',
          'Eradication is removing all attacker presence: the malware, the backdoors, the persistence mechanisms, the compromised credentials. Partial eradication is how incidents recur — the attacker\'s scheduled task or stolen service account survives, and the "recovered" environment is compromised again within days. Eradication must be verified, not assumed, and that verification is what separates a response from a pause.',
          'Recovery restores systems to normal operation from known-good backups and hardened images — never from the compromised state, and never before eradication is confirmed. Systems return in priority order, with enhanced monitoring watching for recurrence. The tension between evidence preservation and business continuity runs through all of this: forensics wants systems frozen, the business wants them back. That tension is resolved in preparation, by deciding in advance which wins and when, not argued during the incident.',
        ],
      },
      {
        heading: 'Forensics: evidence that holds up',
        body: [
          'Digital forensics is the scientific collection and analysis of digital evidence, and its first rule is that evidence must survive scrutiny — by management, by regulators, and potentially by a court. A forensic image is a bit-for-bit copy of storage media used for analysis; the original is preserved untouched, and all examination happens on the copy. Write-blocking — hardware or software that prevents any writes to the evidence media — guarantees the original cannot be altered during imaging.',
          'Chain of custody is the documented record of who handled evidence, when, and how, from collection to presentation. A gap in the chain is an argument that the evidence was tampered with, and an unbroken chain is what makes digital evidence admissible. Analysts who skip the paperwork have not saved time; they have destroyed the evidence\'s value.',
          'Collection follows the order of volatility, forensic analysis follows the timeline, and both serve the same goal: a defensible reconstruction of what happened. Know also what forensics is not: analysts should generally avoid definitive attack attribution. Focus on TTPs — what the attacker did and how — because attribution is a political and intelligence judgment that most organizations are not equipped to make, and getting it wrong publicly is worse than not making it.',
        ],
      },
      {
        heading: 'The legal and business layer',
        body: [
          'Legal counsel\'s role in incident response is protecting privilege, managing breach notification obligations, and guiding evidence handling so the investigation does not create liability. When counsel directs the investigation, its findings can be protected by attorney-client privilege — which is why involving legal early is a strategic decision, not a courtesy.',
          'An incident is not automatically a breach. A breach is confirmed unauthorized acquisition of data — a higher bar with regulatory consequences. The distinction matters because breach notification laws trigger on breaches, not incidents: what happened, the types of data affected, the steps taken, and what affected individuals should do. Under GDPR, supervisory authorities must be notified within 72 hours of becoming aware of a qualifying breach. The clock starts at awareness, which is why detection and analysis speed is a legal matter as well as a technical one.',
          'Post-Incident Activity closes the loop with the lessons-learned review: a blameless analysis of what happened, what worked, what failed, and what changes, with assigned action items and owners. Blameless is not optional — a review that punishes honesty guarantees the next review hears nothing. Document what went well alongside what did not; it reinforces the controls and decisions that worked and tells the team the review is about improvement, not punishment.',
        ],
      },
    ],
    cheatSheet: [
      ['NIST SP 800-61 phases', 'Preparation; Detection and Analysis; Containment, Eradication, and Recovery; Post-Incident Activity.'],
      ['Preparation', 'IR team, tooling, playbooks, communication plans, and an IR retainer — built before the incident.'],
      ['Short-term vs long-term containment', 'Short-term isolates immediately; long-term keeps the business running during response.'],
      ['Eradication', 'Removing all attacker presence — malware, backdoors, persistence, compromised credentials — and verifying it.'],
      ['Recovery', 'Restoring from known-good backups after eradication is confirmed, in priority order.'],
      ['Forensic image', 'A bit-for-bit copy of media; analysis happens on the copy, never the original.'],
      ['Chain of custody', 'Documented record of who handled evidence, when, and how. Gaps destroy admissibility.'],
      ['Write-blocking', 'Prevents any writes to evidence media during collection.'],
      ['Incident vs breach', 'A breach is confirmed unauthorized acquisition of data; breach laws trigger on breaches.'],
      ['GDPR 72-hour rule', 'Supervisory authorities must be notified within 72 hours of becoming aware of a breach.'],
    ],
  },

  'cysa-attack-frameworks': {
    overview: [
      'Defenders who think in isolated alerts lose to attackers who think in campaigns. Frameworks like MITRE ATT&CK, the cyber kill chain, and the diamond model give analysts a shared language for describing what an attacker is doing — not just which alert fired, but which step of the intrusion it represents.',
      'This lesson covers the three frameworks, how they map to detection and response, and the discipline of threat-informed defense: prioritizing controls against the adversary behaviors that actually threaten you.',
    ],
    learn: [
      {
        heading: 'MITRE ATT&CK: the adversary playbook',
        body: [
          'MITRE ATT&CK is a knowledge base of adversary tactics, techniques, and procedures, organized as a matrix that has become the industry\'s common language. A tactic is the adversary\'s goal — the "why," such as Initial Access, Persistence, or Exfiltration. A technique is how they achieve it — the "how," such as phishing or scheduled tasks. A procedure is the specific implementation — the actual malware, command, or sequence a particular actor uses. Tactic, technique, procedure: goal, method, implementation.',
          'The matrix rewards study because it turns vague alerts into precise statements. Credential dumping via LSASS access is Credential Access (T1003). Scheduled tasks used for persistence are Persistence (T1053). Moving through the environment with WMI or PsExec is Lateral Movement; obfuscating payloads to avoid detection is Defense Evasion. When an analyst says "we have a T1053 detection firing," every defender in the industry knows exactly what behavior is meant.',
          'ATT&CK improves on older models by being non-linear and granular. Real intrusions do not march through phases in order — attackers loop back, skip steps, and pursue multiple tactics simultaneously. ATT&CK describes that reality: a menu of behaviors that can occur in any sequence, each mapped to detection and mitigation guidance. It is a map of the territory, not a script of the journey.',
        ],
      },
      {
        heading: 'The kill chain and the diamond model',
        body: [
          'The cyber kill chain describes the seven phases of an intrusion in order: Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command and Control, and Actions on Objectives. Its strategic insight is that disrupting any single phase defeats the attack — you do not need to stop everything, just one link. Its limitation is linearity: it models the initial compromise well and everything after it poorly.',
          'The diamond model of intrusion analysis complements both by linking four elements of every intrusion event: the adversary, their capability, the infrastructure they use, and the victim. Every event is a diamond connecting who, with what, through which infrastructure, against whom. Pivoting across the diamond — from a malicious IP to the other victims it touched, from a capability to the adversary known to use it — is how analysts expand a single indicator into a full picture of the intrusion.',
          'Use the frameworks together. The kill chain gives you the campaign narrative: where in the intrusion are we? ATT&CK gives you the behavioral detail: exactly what technique is this alert describing? The diamond model gives you the analytic pivots: what else connects to what we just found? An analyst fluent in all three can take one alert and unfold it into the whole operation.',
        ],
      },
      {
        heading: 'Threat-informed defense',
        body: [
          'Threat-informed defense is the discipline of prioritizing controls against the TTPs most relevant to your sector and threat landscape — not against every technique in the matrix equally. A hospital and a defense contractor face different adversaries; their detection investments should differ accordingly. ATT&CK Navigator visualizes this as heatmaps: technique coverage across your defenses, showing at a glance which adversary behaviors you can detect and which are blind spots.',
          'The durability argument is central. TTP-based detections describe attacker behavior — process injection patterns, unusual authentication sequences — and they survive infrastructure changes because behavior changes slowly. IOC-based detections describe artifacts — a hash, a domain — and they expire the moment the attacker rotates infrastructure. Both have uses, but a detection program built mostly on IOCs is a program that needs constant feeding; one built on TTPs compounds.',
          'MITRE D3FEND extends the picture to the defensive side: a knowledge base of defensive techniques mapped against ATT&CK, so each adversary technique links to the countermeasures that defeat it. And adversary emulation exercises close the loop — simulating a specific threat actor\'s TTPs against your own environment to test whether the defenses you claim actually work. Mapping incidents to ATT&CK after response standardizes reporting and reveals systemic detection gaps: if every incident involves the same uncovered technique, the gap is the finding.',
        ],
      },
    ],
    cheatSheet: [
      ['MITRE ATT&CK', 'Knowledge base of adversary tactics, techniques, and procedures organized as a matrix.'],
      ['Tactic vs technique vs procedure', 'Tactic is the adversary\'s goal; technique is the method; procedure is the specific implementation.'],
      ['Cyber kill chain', 'Reconnaissance, Weaponization, Delivery, Exploitation, Installation, C2, Actions on Objectives. Break any link to defeat the attack.'],
      ['Diamond model', 'Links adversary, capability, infrastructure, and victim for each intrusion event; pivot across it to expand investigations.'],
      ['ATT&CK Navigator', 'Visualizes technique coverage across defenses as heatmaps, revealing blind spots.'],
      ['Threat-informed defense', 'Prioritizing controls against the TTPs most relevant to your sector.'],
      ['TTP vs IOC detections', 'TTP-based detections describe behavior and are durable; IOC-based detections expire with infrastructure rotation.'],
      ['MITRE D3FEND', 'Knowledge base of defensive techniques mapped against ATT&CK.'],
      ['Adversary emulation', 'Simulating a specific threat actor\'s TTPs to test your defenses.'],
    ],
  },

  'cysa-reporting': {
    overview: [
      'The best analysis in the world is worthless if it never changes a decision. Reporting is how security work becomes business action — how an incident becomes funding, a vulnerability trend becomes a policy change, and a SOC\'s daily grind becomes a board-level conversation about risk.',
      'This lesson covers security metrics and what makes them meaningful, how to communicate with executives and other stakeholders, and the compliance and legal reporting obligations that shape every serious program.',
    ],
    learn: [
      {
        heading: 'Metrics that mean something',
        body: [
          'Start with the distinction the exam tests: metrics measure activity; KPIs tie measurements to business objectives. "We closed 400 tickets" is a metric. "We reduced mean time to remediate critical vulnerabilities from 30 days to 9 days against our 14-day SLA" is a KPI — it connects the work to an objective the business chose. Executives fund KPIs; they skim metrics.',
          'MTTD and MTTR earn their place in reporting as trend metrics: not single numbers but direction over time, showing whether detection and response are getting faster or slower. Trend reporting — alert volume, true positive rate, and MTTR plotted across quarters — is what turns operational data into a story about program health. A single quarter\'s numbers are trivia; four quarters of movement are evidence.',
          'Vulnerability programs have their own essential metrics: vulnerability aging, how long findings remain open past their remediation SLAs; and scan coverage, the percentage of assets scanned during the period. Unscanned assets are unmeasured risk, and aging shows whether exceptions and delays are accumulating. Together with mean time to remediate by severity, they answer the only question leadership actually asks about vulnerabilities: are we getting safer or not?',
        ],
      },
      {
        heading: 'Communicating with stakeholders',
        body: [
          'Different stakeholders need different reports from the same facts. An executive incident summary contains business impact, scope, actions taken, and next steps — without technical jargon. Executives need decisions, not packet captures: what happened to the business, what it costs, what is being done, and what they need to approve. The full log dumps and file hashes belong in the technical appendix, not the briefing.',
          'When the board asks "are we secure," the correct answer is risk framing, never a yes. No honest analyst claims absolute security; the professional answer describes residual risk in business terms — what the program covers, where the gaps are, what the trends show, and what investment would change. "Are we secure" is really "are we managing risk acceptably," and the analyst\'s job is to make that answer concrete.',
          'Technical findings reach non-technical audiences by leading with risk and business impact, then supporting with just enough detail. A stakeholder communication matrix makes this systematic: a plan defining who gets told what, when, and by whom during an incident — executives, legal, public relations, IT, HR, customers — so notification is a procedure, not an improvisation. And the SOC shift handoff note keeps continuity between the people doing the work: open investigations, pending actions, and items to watch, so nothing falls between shifts.',
        ],
      },
      {
        heading: 'Compliance, legal, and the post-incident record',
        body: [
          'Several compliance frameworks require vulnerability management reporting as a condition of doing business: PCI DSS, HIPAA, SOC 2, and others each demand evidence that vulnerabilities are found, tracked, and remediated on defined timelines. Compliance reporting is therefore not overhead on the security program — for regulated organizations it is one of the program\'s primary products, and the metrics above are its raw material.',
          'Breach notification has its own formal requirements. A notification must cover what happened, the types of data affected, the steps taken, and what affected individuals should do — and the timelines are law, not courtesy. Under GDPR, supervisory authorities must be notified within 72 hours of becoming aware of a qualifying breach. Attorney-client privilege protects the investigation itself when legal counsel directs it, which is why counsel belongs in the response structure from the start rather than being called after the notifications go out.',
          'The lessons-learned report is the final reporting product of every incident: a blameless post-incident analysis with assigned action items and owners. It differs from a forensic report, which documents evidence and technical findings for potential legal use — the incident report covers timeline and business impact, the forensic report covers artifacts and analysis. Document what went well alongside what failed; it reinforces the controls that worked and keeps the review honest. And responsible disclosure communication — coordinated, factual public statements made after remediation — is how the organization talks about the incident to the outside world without creating new liability.',
        ],
      },
    ],
    cheatSheet: [
      ['Metrics vs KPIs', 'Metrics measure activity; KPIs tie measurements to business objectives.'],
      ['Executive incident summary', 'Business impact, scope, actions taken, next steps — no technical jargon.'],
      ['Trend reporting', 'MTTD, MTTR, alert volume, and true positive rate plotted over time to show program direction.'],
      ['Vulnerability aging', 'How long vulnerabilities remain open past their remediation SLAs.'],
      ['Scan coverage', 'The percentage of assets scanned during the period; unscanned assets are unmeasured risk.'],
      ['Communication matrix', 'Defines who gets told what, when, and by whom during an incident.'],
      ['Breach notification', 'What happened, data types affected, steps taken, what individuals should do.'],
      ['GDPR 72-hour rule', 'Supervisory authorities must be notified within 72 hours of becoming aware of a breach.'],
      ['Attorney-client privilege', 'Legal counsel directing the investigation protects its findings.'],
      ['Lessons-learned report', 'Blameless post-incident analysis with assigned action items; document what went well too.'],
    ],
  },
};
