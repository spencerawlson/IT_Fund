# Threat Actors & Attack Vectors: Who Attacks and How They Fool You — Avatar Tutor Script

**Lesson ID:** cy-threat-actors
**Track:** Cybersecurity Operations
**Estimated runtime:** ~5 minutes (~754 words)

## Spoken script

**[HOOK — 0:00]**
Every defence starts with knowing who might attack and why. A bank faces
organised crime chasing money. A defence contractor faces nation-states
chasing secrets. Everyone faces phishing. The attacker shapes the defence —
so let us meet the cast.

**[WHY IT MATTERS — 0:25]**
Threat actors differ in resources, patience, and goals — and those
differences dictate which controls matter most. Security+ expects you to
recognise the actor types and the social engineering vectors they use, from
whaling to watering holes. This is the human side of the threat landscape.

**[SECTION — Who attacks and why — 0:50]**
Start with the heavyweights. Advanced persistent threats — APTs — are
usually nation-state backed: resourced, patient, and targeted. They dwell in
networks for months pursuing espionage or sabotage. Contrast them with
opportunistic attackers, who spray ransomware and phishing broadly,
optimising for volume rather than any specific victim. The APT studies you;
the opportunist spams everyone.

Hacktivists act for political or social causes and want publicity —
defacements and DDoS are their signature. They want you to know they were
there. Organised crime wants money and runs ransomware-as-a-service like a
business: developers, affiliates, customer support, profit sharing.

Insiders come in three flavours. Malicious — the disgruntled employee.
Negligent — the user who clicked. And compromised — whose account an
outsider now drives. Notice that two of the three are not villains; that is
why insider threat is hard.

Shadow IT is the insider-adjacent risk: unsanctioned apps holding real data,
living outside security visibility entirely. You cannot protect what you do
not know exists.

Finally, TTP: tactics, techniques, and procedures — the attacker's playbook.
MITRE ATT&CK catalogues TTPs so defenders can detect behavioural patterns
rather than chasing individual indicators. And here is the practical payoff:
profiling which actors target your sector tells you which TTPs to
prioritise. A hospital and a bank prepare for different enemies.

**[SECTION — Social engineering attack vectors — 2:30]**
Now the con artist's toolkit. Phishing is bulk deception by email. Spear
phishing targets specific people with researched lures. Whaling targets
senior executives with deeply researched pretexts — the bigger the fish, the
sharper the hook. Vishing moves the con to voice calls — "IT support" asking
for your MFA code — and smishing moves it to text messages, often fake
delivery or bank alerts.

Business email compromise rarely carries malware at all. A spoofed or
hijacked executive account directs a wire transfer or an invoice change
purely on trust. No payload, no exploit — which is why finance teams need
their own training. You cannot detect what was never sent as malware.

Pretexting invents a scenario to extract information. Baiting dangles
something tempting — the parking-lot USB drop is the classic. Tailgating
follows an authorised person through a secured door. Three different doors:
the mind, the curiosity, the physical entrance.

Watering hole attacks compromise websites the targets already visit, instead
of attacking them directly — poison the water supply, not the drinker.
Typosquatting registers lookalike domains for credential harvesting. Clone
phishing copies a real email and swaps in malicious links — harder to spot
because the original message was genuine. Pharming poisons DNS so even
correctly typed URLs land on the attacker's copy. And influence campaigns
coordinate disinformation through fake personas.

The defence against all of it is the same, and it is not a product: process
and culture. Verify out of band. When the "CEO" emails an urgent wire
transfer, you call the CEO — on a number you already had.

**[COMMON MISTAKES — 4:30]**
Three traps. One: thinking BEC needs malware. It usually carries none — it
runs on trust, which is exactly why it bypasses technical controls. Two:
lumping all phishing together. Bulk phishing, spear phishing, and whaling
differ in targeting and research — and whaling specifically aims at senior
executives. Three: confusing the insider types. Negligent and compromised
insiders cause as much damage as malicious ones — the threat is the access,
not just the intent.

**[RECAP — 4:55]**
APTs are resourced, patient, and targeted — usually nation-state. Hacktivists
want publicity, organised crime wants money, and insiders are malicious,
negligent, or compromised. Shadow IT hides real data outside your
visibility. TTPs are the playbook; ATT&CK catalogues them; profiling your
sector's actors tells you which to prioritise. Phishing scales from bulk to
spear to whaling; vishing and smishing move it to voice and text. BEC abuses
trust without malware. Pretexting invents scenarios, baiting tempts,
tailgating follows. Watering holes poison visited sites, typosquatting fakes
domains, clone phishing corrupts real emails, pharming poisons DNS. And the
universal defence: verify out of band.

## On-screen visuals

- HOOK: three targets — bank, defence contractor, everyone — each with its
  characteristic attacker silhouette.
- Actors: APT dwell-time timeline (months) vs opportunistic spray pattern;
  hacktivist defacement vs ransomware business model; the three insider
  flavours; shadow IT app outside the visibility boundary; TTP playbook
  feeding into ATT&CK.
- Vectors: phishing-to-whaling targeting ladder; vishing call and smishing
  text mock-ups; BEC wire-transfer email with no attachment; pretexting,
  baiting USB drop, tailgating door sequence; watering hole, typosquat
  domain, clone phish, pharming DNS poison — one panel each.
- Defence: "verify out of band" phone-call verification flow.
- RECAP: the cheat-sheet table as a summary card.
