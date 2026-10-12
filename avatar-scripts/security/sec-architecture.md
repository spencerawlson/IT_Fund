# Security Architecture: Secure by Design — Avatar Tutor Script

**Lesson ID:** sec-architecture
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Bolting security onto a finished system is like adding seatbelts to a car after the crash test. Good architecture makes the secure path the default. You decide up front how data is protected in each state, where systems are separated, and how the whole thing keeps running when parts fail.

**[WHY IT MATTERS — ~0:25]**
This lesson is the exam's architecture tour: data states and protection techniques, inspection devices, failure modes, resilience, and the cloud-delivered access models. The scenarios reward one habit — asking "which state is the data in, and which device does what?" Answer that precisely and the options sort themselves.

**[SECTION — Protecting data — ~0:50]**
Data has three states, and each gets its own protection. Data at rest sits on disk — protect it with full-disk or database encryption. Data in transit travels the network — protect it with TLS or a VPN. Data in use sits in memory while being processed — protect it with secure enclaves and confidential computing, which shield processing even from the host. At rest, in transit, in use: disk encryption, TLS, enclaves.

Three techniques for handling sensitive data. Tokenization replaces sensitive data with a non-sensitive token and keeps the real value in a secure vault — common for card numbers, where the merchant never holds the actual digits. Data masking hides part of the data, like `****-1234`, for display and non-production use — enough to recognise, not enough to steal. And data loss prevention — DLP — detects and blocks sensitive data leaving the organisation, on endpoints, on the network, and in cloud services.

**[SECTION — Special environments and infrastructure as code — ~2:05]**
Industrial control systems — ICS and SCADA — run power, water, and manufacturing. They are often old and hard to patch, and availability is critical: you cannot reboot the grid for a Tuesday patch window. So the answer is segmentation: separate operational technology networks from IT networks, and tightly control what crosses between them. Old, unpatchable, and essential — keep it isolated.

Infrastructure as code gives consistent, reviewable, repeatable configuration. The security win is the review: scan templates for misconfigurations — open storage, permissive security groups — before deployment, so the open bucket is caught in review rather than in production.

**[SECTION — Inspection devices and failure modes — ~3:10]**
A web application firewall — a WAF — protects web applications at Layer 7, blocking SQL injection, XSS, and similar attacks. It understands HTTP, not just packets. An IDS watches traffic and alerts; an IPS sits inline and can block. Both detect with signatures, anomaly baselines, or behavioural analysis. The one-line distinction: IDS detects, IPS prevents.

Now failure modes — what happens when the device itself dies? It can fail open, letting traffic through, or fail closed, blocking it. Security devices usually fail closed, to protect confidentiality: better to block legitimate traffic than to let attacks through. But life-safety systems — emergency exit doors — fail open, to protect people. The priority decides the direction: protect the data, fail closed; protect the people, fail open.

**[SECTION — Resilience and modern access — ~4:10]**
High availability designs systems to keep running despite failures, using redundancy, clustering, load balancing, and failover. If one node dies, another takes over and nobody notices.

Backups follow the 3-2-1 rule: three copies, on two media types, with one offsite. And add the modern rider: keep one copy offline or immutable, so ransomware cannot encrypt it too. A backup the ransomware can reach is not a backup — it is a second victim.

Finally, SASE — Secure Access Service Edge — delivers networking and security from the cloud together: secure web gateway, CASB, zero trust network access, and SD-WAN in one converged offering. SSE, Security Service Edge, is the security-only subset. When the question describes cloud-delivered security without the networking, that is SSE.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: IDS versus IPS. The IDS alerts; the IPS sits inline and blocks. Two: fail open versus fail closed. Security devices fail closed to protect data; life-safety systems fail open to protect people. Three: tokenization versus masking. Tokenization swaps the value for a token with the real one in a vault; masking just hides part of the display.

**[RECAP — ~5:25]**
Data at rest gets disk encryption, in transit gets TLS, in use gets enclaves. Tokenization vaults the real value, masking hides the display, DLP stops data leaving. ICS and SCADA are old, unpatchable, and availability-critical — segment OT from IT. IaC templates get scanned before deployment. WAFs guard Layer 7, IDS alerts while IPS blocks, and failure modes follow the priority: closed for data, open for people. Backups are 3-2-1 with an offline copy, and SASE converges cloud networking with security — SSE is the security-only slice.

## On-screen visuals

- HOOK: a blueprint with security baked into the foundation versus controls bolted on afterward.
- Data states: at rest / in transit / in use as three panels with their protections; tokenization, masking, and DLP as three handling techniques.
- ICS: an OT network segmented from the IT network with a controlled crossing; IaC template with a misconfiguration flagged before deployment.
- Devices: WAF at Layer 7 filtering web attacks; IDS alerting beside IPS blocking inline; fail-closed versus fail-open as a forked path.
- Resilience: the 3-2-1 backup rule with the offline copy highlighted; SASE as a converged cloud with SSE as its subset.
- RECAP: the cheat-sheet rows as a clean summary card.
