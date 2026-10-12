# Cryptography & PKI: Which Key for Which Job — Avatar Tutor Script

**Lesson ID:** sec-crypto
**Track:** Security+ (SY0-701)
**Estimated runtime:** ~6 minutes (~800 words)

## Spoken script

**[HOOK — 0:00]**
Cryptography underpins nearly every other control you will study: HTTPS, VPNs, disk encryption, password storage, code signing. Here is the good news: you do not need the maths. You need to know which tool does which job, and which keys go where. Mix those up and the exam will notice.

**[WHY IT MATTERS — ~0:25]**
Crypto questions are classification questions. Is this symmetric or asymmetric? Which key encrypts, which key signs? Why is MD5 wrong here? The scenarios collapse into a handful of rules — one key shared, or a key pair split; encrypt with theirs, sign with yours. Learn the rules and the topic turns into pattern recognition.

**[SECTION — Symmetric and asymmetric encryption — ~0:50]**
Symmetric encryption uses one shared key to encrypt and decrypt. It is fast, and AES-256 is the standard; DES and 3DES are deprecated. The hard part is distributing the key: how do two people who have never met agree on a secret?

Asymmetric encryption solves that with a key pair — a public key you can share with anyone, a private key you never share. RSA and elliptic curve cryptography (ECC) are the common families. Asymmetric crypto is slower, so it handles key exchange and signatures while bulk data is encrypted symmetrically. TLS does exactly this: the slow asymmetric handshake agrees on a fast symmetric session key.

**[SECTION — Which key for which job — ~2:00]**
Two rules, and they are mirror images. To send someone a confidential message, encrypt with the recipient's public key — only their private key can decrypt it.

To sign, you use your own private key. Anyone can verify with your public key, proving integrity, authentication, and non-repudiation. Only your private key could have made that signature.

The exam's favourite confusion is swapping these. Encrypt with their public key; sign with your private key.

**[SECTION — Hashing and password storage — ~2:50]**
A hash is a one-way fingerprint of data. MD5 is unsuitable for security because practical collisions exist — two different inputs with the same hash — so use SHA-256 or SHA-3. When the exam offers MD5 for integrity, the answer is no.

Passwords need two extra ingredients. First, a salt: random data stored with each hash, so identical passwords hash differently — defeating precomputed rainbow tables, since the attacker cannot precompute hashes when each password is salted uniquely. Second, key stretching: making each hash deliberately slow with PBKDF2, bcrypt, or Argon2. A fast hash is a gift to brute force; a slow one makes cracking a stolen database impractical.

**[SECTION — Certificates and PKI — ~3:50]**
A digital certificate binds a public key to an identity, signed by a Certificate Authority — a CA. Trust flows along a chain: root CA, through intermediate CAs, to the leaf certificate the server presents. Your browser trusts the root, the root vouches for the intermediate, the intermediate vouches for the server.

To get a certificate, you generate a key pair and send the CA a certificate signing request — a CSR — containing your public key and subject details. The private key never leaves you: the CA signs your public key without ever touching your private one.

When a certificate must die early, revocation is checked quickly with OCSP, often via OCSP stapling, where the server attaches a fresh revocation response. CRLs — certificate revocation lists — are the older list-based method. Fast check versus old list: that is the distinction.

**[SECTION — Forward secrecy and the quantum future — ~4:40]**
Perfect forward secrecy uses ephemeral session keys — DHE or ECDHE key exchange — so a server's long-term private key, stolen later, cannot decrypt past recorded sessions. TLS 1.3 makes it mandatory.

And post-quantum cryptography means algorithms designed to resist future quantum computers. NIST standardised ML-KEM for key establishment and ML-DSA for signatures in 2024 — FIPS 203 and FIPS 204. Names and year: that is all you need.

**[COMMON MISTAKES — ~5:15]**
Three traps. One: encrypting with the wrong key — confidential message takes the recipient's public key, signatures take your private key. Two: picking MD5 for anything security-related. Collisions killed it; SHA-256 or SHA-3. Three: confusing OCSP with CRLs. OCSP is the fast online check, often stapled; CRLs are the older lists.

**[RECAP — ~5:40]**
Symmetric is one shared fast key — AES-256; asymmetric is a key pair — RSA and ECC — for key exchange and signatures. Encrypt with their public key, sign with your private key. Hashes are one-way fingerprints; MD5 is out, SHA-256 is in; passwords get salt against rainbow tables and stretching — PBKDF2, bcrypt, Argon2 — against brute force. Certificates bind keys to identities via CAs; the CSR carries the public key; revocation is OCSP or CRLs. Forward secrecy protects past sessions; post-quantum standards are ML-KEM and ML-DSA.

## On-screen visuals

- HOOK: HTTPS, VPN, disk encryption and code signing icons, all resting on a crypto foundation.
- Symmetric/asymmetric: one shared key versus a key pair; the TLS handshake agreeing a symmetric session key.
- Key rules: two mirrored flows — public key to send, private key to sign.
- Hashing: identical passwords salting to different hashes; a deliberately slow stretching function resisting brute force; MD5 crossed out.
- PKI: the trust chain — root CA to intermediate to leaf; the CSR carrying only the public key; OCSP stapling beside the older CRL.
- RECAP: the cheat-sheet rows as a clean summary card.
