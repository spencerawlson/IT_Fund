# D8 Capstone: Scenario Judgment — Secure Development Calls — Avatar Tutor Script

**Lesson ID:** cissp-cap-d8
**Track:** CISSP Domains
**Estimated runtime:** ~4 minutes (~625 words)

## Spoken script

**[HOOK — 0:00]**
Domain 8 scenarios test whether security is built in or bolted on: what
happens before a dependency is adopted, what happens the instant a secret
leaks, and where in the lifecycle a bug is cheapest to kill. The exam treats
software security as a series of judgment calls — and the right calls follow
patterns. This lesson drills them.

**[WHY IT MATTERS — ~0:25]**
Your application is mostly code you didn't write, running with your
privileges, holding your data. Every dependency is a trust decision, every
committed secret a potential breach, every late-found bug an expensive one.
The scenarios test whether your process respects that reality.

**[SECTION — Trust, but verify the supply chain — ~0:50]**
Developers want to adopt a popular open-source library. What happens first?
Due diligence: licence compatibility, maintenance health, and known
vulnerabilities via SCA. Check the licence — can you legally ship it? Check
the maintenance health — commits, maintainers, issue response times — is
anyone actually home? Check the known vulnerabilities. Popularity is not
diligence. A million downloads prove adoption, not safety; the exam's
distractors lean hard on "everyone uses it."

Here's why the maintenance check matters: an unmaintained library is a
vulnerability waiting for its CVE. Nobody's patching it, nobody's watching
it, and it's running inside your application with your privileges. Every
dependency is code you didn't write running with your privileges — treat
adoption like hiring.

And generate and keep an SBOM — a software bill of materials. When the next
Log4Shell lands, the SBOM tells you in minutes whether you're exposed,
instead of discovering it in weeks of frantic searching. It's the
inventory lesson from Domain 2, applied to code: you can't protect what you
haven't inventoried — and in a crisis, the team with the inventory wins.

**[SECTION — Secrets spill: revoke first, shift left always — ~2:50]**
A code review finds hardcoded AWS keys in the repository. The best immediate
fix? Revoke and rotate the keys, move secrets to a vault, and add
pre-commit secret scanning. A secret in version control is compromised the
moment it's pushed — repositories are copied, backed up, and mirrored.
Revoke first, then fix the process so it can't recur. Restricting repo
access while keeping the keys is wishful thinking; the secret already
travelled.

Notice the two-part rhythm the exam loves: contain the immediate damage,
then fix the process. Revoke the keys — containment. Vault plus pre-commit
scanning — process: the scanner catches the next secret before it leaves
the laptop. One without the other fails the scenario.

Then the economics question. Leadership asks where in the SDLC a security
bug is cheapest to fix. The answer: as early as possible — requirements and
design. Shift-left. Threat modelling in design beats a pentest finding,
which beats an emergency production patch. The later you find a bug, the
more it costs — so every phase you shift left multiplies your savings. This
isn't ideology; it's arithmetic. The cheapest bug is the one that never
ships.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: adopting the library because it's popular. Popularity is
not a security control — check licence, maintenance health, and CVEs via
SCA first. Two: keeping compromised keys in use while "securing" the repo.
A pushed secret is a compromised secret: revoke and rotate immediately,
then vault and pre-commit scanning. Three: answering the cost question with
testing or production. The cheapest fix is always earliest — requirements
and design.

**[RECAP — ~4:50]**
New dependency? Licence, maintenance health, and known vulnerabilities via
SCA first — popularity proves nothing. Keep an SBOM so the next Log4Shell
takes minutes to assess, not weeks. A secret committed is a secret
compromised: revoke and rotate now, move to a vault, add pre-commit
scanning — containment first, process second. And bugs are cheapest where
they're born: threat modelling in design beats a pentest finding beats an
emergency production patch. Shift-left is economics, not ideology.

## On-screen visuals

- HOOK: a dependency tree with hidden vulnerabilities glowing inside.
- Trust, but verify the supply chain: the adoption due-diligence checklist
  — licence, maintenance, CVEs; SBOM as an exposure map when Log4Shell
  lands.
- Secrets spill: revoke first, shift left always: the committed secret's
  travel path through copies and mirrors; revoke-then-vault-then-scan
  response sequence; bug-cost curve rising along the SDLC.
- RECAP: the cheat-sheet rows as a clean summary card.
