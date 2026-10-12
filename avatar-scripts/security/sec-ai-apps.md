# Application & AI Security: Code That Defends Itself — Avatar Tutor Script

**Lesson ID:** sec-ai-apps
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
Applications are where attackers meet your data directly — every form field, every API, every login page is a conversation with a stranger. And now AI features add a new class of input that can talk back. The good news: secure coding basics still stop most attacks. The new part is a handful of AI habits you need on top.

**[WHY IT MATTERS — ~0:25]**
This lesson splits into three acts: the classic web attacks and their fixes, the practices that build software securely, and the new AI threat landscape — prompt injection, data poisoning, excessive agency, deepfakes. The exam pairs every attack with its defence, so learn them as pairs: injection with parameterised queries, XSS with output encoding. Attack, fix.

**[SECTION — Classic application attacks — ~0:50]**
SQL injection inserts SQL through user input so the database runs it. The classic payload turns a login query into "return every user." The fix is parameterised queries, which send values separately from the SQL — the database treats the whole input as a value, never as code — plus least-privilege database accounts to limit the damage if something slips through.

Cross-site scripting — XSS — injects script that runs in other users' browsers: your site serves the attacker's JavaScript to your visitors. The fix is encoding output for the context it appears in, plus a Content Security Policy as a second layer. Cross-site request forgery — CSRF — tricks a logged-in user's browser into sending an unwanted request, which looks legitimate because the browser is authenticated. Anti-CSRF tokens and SameSite cookies stop it. XSS runs script in the victim's browser; CSRF rides the victim's session.

A buffer overflow writes past the bounds of a memory buffer, possibly letting an attacker run code. This is the memory-safety story you know from the Rust track: memory-safe languages prevent it, and ASLR and DEP make exploitation much harder. Defence in depth — the language removes the bug class, and the OS hardens what remains.

**[SECTION — Building securely — ~2:15]**
Input validation checks input against the expected type, length, and format — and it must happen on the server. Client-side checks are for user experience and are trivially bypassed: the attacker does not use your form, they talk to your API directly.

Code signing proves software came from the publisher and was not altered in transit, protecting users and the supply chain. If the signature does not verify, do not install.

SAST analyses source code statically; DAST tests the running application from outside. Static sees the code, dynamic sees the behaviour — each finds things the other cannot, so use both in CI/CD. And an SBOM — a software bill of materials — is an inventory of every component in your software. When a library vulnerability is announced, it finds affected systems in minutes instead of weeks. You cannot patch what you cannot find.

**[SECTION — AI threats — ~3:30]**
Prompt injection is input that overrides a language model's instructions — OWASP's LLM01. Direct injection comes from the user typing malicious instructions; indirect injection hides instructions in documents, emails, or web pages the model reads. The defence is an attitude: treat model output as untrusted, and keep sensitive actions outside the model's control. The model suggests; it does not execute.

Data poisoning corrupts training data to manipulate a model's behaviour — so control the provenance and integrity of training data. The model will learn whatever it is fed.

Excessive agency is the risk that an agent with broad tools takes harmful actions when manipulated. The fix is restraint by design: limit its tools and permissions, and require human approval for high-impact actions.

And attackers use AI too: deepfake voices and video, convincing phishing at scale. Verify unusual requests out of band, and train staff to expect synthetic media.

**[COMMON MISTAKES — ~4:45]**
Three traps. One: validating input only on the client. The attacker bypasses your form — validation must happen on the server. Two: thinking SAST and DAST are interchangeable. Static analyses the source; dynamic tests the running app — use both. Three: treating model output as trustworthy. Prompt injection exists precisely because models follow instructions in their input — treat output as untrusted.

**[RECAP — ~5:10]**
SQL injection is beaten by parameterised queries and least-privilege database accounts. XSS by output encoding plus CSP; CSRF by anti-CSRF tokens and SameSite cookies. Buffer overflows by memory-safe languages with ASLR and DEP behind them. Validate on the server, sign your code, run SAST and DAST in CI/CD, and keep an SBOM. For AI: prompt injection is LLM01 — treat model output as untrusted; guard training data against poisoning; limit agent tools and require human approval; verify the deepfake-sounding request out of band.

## On-screen visuals

- HOOK: an application with every input — form fields, APIs, login — as a conversation with a stranger, plus an AI chat box that talks back.
- Classic attacks: the vulnerable SQL string versus the parameterised query, value sent separately; XSS script landing in a victim's browser; CSRF riding an authenticated session; the buffer overflowing its bounds with ASLR/DEP as the second wall.
- Building securely: server-side validation gate with the bypassed client form; SAST scanning source beside DAST probing the running app; an SBOM inventory locating a vulnerable library in minutes.
- AI threats: a prompt injection overriding model instructions (direct and indirect paths); poisoned training data; an agent with limited tools and a human-approval gate; a deepfake call verified by a callback.
- RECAP: the cheat-sheet rows as a clean summary card.
