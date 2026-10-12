# Data Protection and Encryption — KMS, SSE and Secrets — Avatar Tutor Script

**Lesson ID:** awss-data-protection
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~6 minutes (~782 words)

## Spoken script

**[HOOK — 0:00]**
Data protection is the domain where the exam is most unforgiving, because the
distinctions are precise and the wrong choice fails silently. SSE-S3 versus
SSE-KMS is not a trivia question — it determines whether every decryption is
logged with an identity attached. A key policy is not just another policy —
for KMS it is the primary gate.

**[WHY IT MATTERS — ~0:25]**
This is the encryption and secrets toolkit in full: KMS key types and policies,
envelope encryption, the SSE family, CloudHSM, certificates with ACM, Secrets
Manager, and the data-discovery loop with Macie. The specialty exam treats
these as working tools, not vocabulary words — you will choose between them
under constraints.

**[SECTION — KMS: keys, policies, and envelope encryption — ~0:50]**
KMS offers three key types. AWS managed keys are the default — AWS controls
the policy and rotation. Customer managed keys give you control of the key
policy, rotation, and audit granularity — the exam's answer for regulated data.
AWS owned keys live entirely inside services for their internal use. The
practical difference that matters most: with AWS managed keys you cannot view
or edit the key policy.

KMS evaluates the key policy as the primary gate. Cross-account decryption
works only if the key policy explicitly allows the external account — an IAM
allow in the caller's account is insufficient, a reversal of the usual "either
side allows" intuition from S3. Grants provide temporary, programmatic
delegation without editing the durable policy. Envelope encryption is why KMS
scales: your data is encrypted with a data key; the data key is encrypted by
the KMS key. GenerateDataKey returns both the plaintext data key — use it, then
discard it — and the encrypted version, stored alongside the ciphertext.
Automatic rotation of customer managed keys generates new backing material
yearly while retaining the old, so existing ciphertext keeps decrypting.

**[SECTION — Encryption in practice: S3, EBS, TLS, and secrets — ~2:20]**
For S3, the SSE family is a ladder of control. SSE-S3 is free and simple with
AWS-managed keys. SSE-KMS uses your KMS keys and gives you the audit trail —
every decryption logged to CloudTrail with the requesting identity — at the
cost of KMS API calls, which S3 Bucket Keys reduce by up to 99% by reusing a
bucket-level data key. SSE-C means you manage the keys entirely. Enforce
encryption with both default bucket encryption and a bucket policy denying
PutObject without the encryption header; require TLS in transit with a policy
denying requests where aws:SecureTransport is false.

For the strictest requirements — where even AWS personnel must not access key
material — CloudHSM provides dedicated, single-tenant FIPS 140-2 Level 3
hardware, or KMS with an external key store. Choose CloudHSM for regulatory
mandates and KMS for everything else. When data must be provably unrecoverable,
crypto-shredding — destroying the KMS key material — is the accepted answer;
deleting S3 objects alone leaves replicated copies behind. ACM public
certificates with DNS validation renew automatically, and their private keys
can never be exported — a security feature, not a limitation. Application
secrets belong in Secrets Manager with automatic rotation; it wins over
Parameter Store SecureString when you need rotation, cross-account sharing, or
RDS-integrated rotation. Environment variables and config files are never the
answer.

S3 Object Lock in
compliance mode gives WORM guarantees — objects cannot be deleted or
overwritten until retention expires, not even by root — for regulatory
retention. Macie closes the discovery loop: beyond initial PII and PHI
classification, it continuously monitors for new sensitive data and routes
findings to Security Hub, because data protection is a posture that drifts.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: for KMS cross-account access, the key policy must allow it —
an IAM allow in the caller's account is not enough. Two: deleting S3 objects
does not make data unrecoverable — replicated copies survive; crypto-shredding
the key is the accepted answer. Three: secrets in environment variables or
config files are never the answer; Secrets Manager with rotation is.

**[RECAP — ~5:05]**
Customer managed keys give you policy control, rotation, and audit granularity
— the exam's answer for regulated data — and KMS answers to its key policy
first, with grants for temporary delegation. Envelope encryption keeps
plaintext key material fleeting; rotation happens without re-encryption. For
S3, climb the SSE ladder by control — SSE-S3, SSE-KMS with Bucket Keys cutting
costs, SSE-C entirely yours — enforce encryption by default plus deny policies,
require TLS with aws:SecureTransport, and crypto-shred keys for provable
destruction. CloudHSM serves mandates where AWS must not reach the keys, ACM
renews certificates automatically, Secrets Manager rotates the credentials,
and Object Lock plus Macie keep the posture from drifting.

## On-screen visuals

- HOOK: a decryption event with and without an identity attached — the silent
  difference between SSE-S3 and SSE-KMS.
- KMS SECTION: the three key types with the policy-control dial turning up for
  customer managed; the key policy as the primary gate for cross-account; the
  envelope diagram — plaintext data key used then discarded, encrypted data key
  stored; rotation generating new material while old ciphertext still
  decrypts.
- PRACTICE SECTION: the SSE ladder of control with Bucket Keys cutting KMS
  costs; the aws:SecureTransport deny enforcing TLS; crypto-shredding a key to
  destroy ciphertext everywhere; ACM auto-renewing; Secrets Manager rotating
  on schedule.
- COMMON MISTAKES: three trap cards — "the key policy must allow it",
  "deleting objects is not destruction", "env vars are never the answer".
- RECAP: the cheat-sheet terms as a clean summary card.
