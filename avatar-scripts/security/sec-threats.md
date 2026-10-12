# Threat Actors & Social Engineering: Know Your Adversary — Avatar Tutor Script

**Lesson ID:** sec-threats
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~793 words)

## Spoken script

**[HOOK — 0:00]**
Here is the uncomfortable truth about most breaches: the attacker did not pick a lock. They asked someone nicely. The overwhelming majority of successful attacks get in through people — a convincing email, a phone call, a stranger held the door. So before we build defences, we need to know who attacks, why, and how they usually walk in.

**[WHY IT MATTERS — ~0:25]**
Defences only make sense against a real adversary. Knowing the threat actors and their motives tells you where to spend effort — you defend differently against a nation-state than against an opportunistic amateur. And social engineering is the largest single door into organisations, so the exam tests these attacks heavily: phishing and its many cousins, pretexting, tailgating. This lesson is the vocabulary every later domain assumes you have.

**[SECTION — Threat actors — ~0:50]**
Threat actors differ in resources, persistence, and motive, and the exam wants you to match the actor to the scenario. Nation-state actors have the most resources and the most patience, running advanced persistent threats — APTs — long, quiet campaigns for espionage or disruption. Organised crime is motivated by money: ransomware, fraud. Hacktivists are motivated by ideology or a cause, favouring defacements, leaks, and DDoS. Insiders already have access, which makes them dangerous whether malicious or merely careless. And unskilled attackers use tools others wrote — limited skill, but the tools do the heavy lifting.

One more thing that is not an attacker but creates risk like one: shadow IT — systems and applications used without IT approval. Nobody approved them, nobody patches them, nobody logs them, so data sits in unapproved cloud services with no oversight. Unmanaged risk, hiding in plain sight.

**[SECTION — Phishing and its variants — ~2:00]**
Phishing is a fraudulent message that tricks the recipient into acting: clicking a link, opening an attachment, entering credentials. The variants are about targeting and channel. Spear phishing targets specific individuals, researched and personalised. Whaling targets executives — the big fish. Vishing is voice phishing over the phone. Smishing uses SMS. Same trick, different wrapping.

Business email compromise, BEC, deserves special attention. The attacker hijacks or spoofs a business email account and requests payments or changes to bank details. The invoices look right, the tone is right, the money leaves. And the defence is procedural, not technical: verify any payment change out of band — call a known number, not the one in the email. When the exam describes a finance clerk wiring money on email instructions, that is BEC, and the answer is out-of-band verification.

Two more to know. Typosquatting, also called URL hijacking, registers look-alike domains — `examp1e.com` with a one instead of an L — for phishing and malware. And a watering hole attack compromises a website a target group frequently visits. Poison the watering hole, and the herd comes to you.

**[SECTION — Pretexting and physical social engineering — ~3:30]**
Pretexting invents a believable scenario to extract information or access. The classic: a caller posing as IT support who needs your password to "fix your account." The story is the weapon. Then the physical version: tailgating, also called piggybacking — following an authorised person through a secure door. The polite instinct to hold the door becomes the vulnerability, so access control vestibules (mantraps), badge policies, and training reduce it.

The most effective defence against social engineering is security awareness training combined with verification procedures. Technical filters help, but people are the target — so the fix has to reach the people.

**[SECTION — Attack surface — ~4:20]**
The attack surface is every point where an attacker could try to get in: exposed services, open ports, user accounts, APIs, third-party integrations — and the people themselves. You cannot defend what you do not know you have, so shrink it: remove unused services, unused ports, unused accounts. And know what you actually run.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: mixing up vishing and smishing. Voice versus SMS — the channel is the name. Two: confusing spear phishing with whaling. Spear is targeted at individuals; whaling is targeted at executives specifically. Three: picking a technical control as the best defence against social engineering. Filters help, but training plus verification procedures is the answer the exam wants.

**[RECAP — ~5:15]**
Nation-states run APTs, organised crime chases money, hacktivists chase causes, insiders have access, and shadow IT creates unmanaged risk. Phishing tricks people into acting — spear targets individuals, whaling targets executives, vishing is voice, smishing is SMS. BEC fakes payment requests and is beaten by out-of-band verification. Typosquatting abuses look-alike domains; watering holes poison sites the group visits. Pretexting invents scenarios; tailgating follows people through doors. And the attack surface is everything an attacker could touch — so shrink it.

## On-screen visuals

- HOOK: a breach timeline where the entry point is a person clicking, not a firewall failing.
- Threat actors: five cards — nation-state, organised crime, hacktivist, insider, unskilled — with motive and resources; shadow IT as an unapproved app outside the perimeter.
- Phishing: the message-to-action chain, with spear/whaling/vishing/smishing branching by target and channel; BEC payment flow stopped by an out-of-band phone call; `examp1e.com` beside the real domain; the watering hole metaphor.
- Physical: tailgating through a held door; a mantrap vestibule as the fix.
- RECAP: the cheat-sheet rows as a clean summary card.
