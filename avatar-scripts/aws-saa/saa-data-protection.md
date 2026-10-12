# Encryption and Data Protection — KMS, Secrets and Surviving Ransomware — Avatar Tutor Script

**Lesson ID:** saa-data-protection
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~787 words)

## Spoken script

**[HOOK — 0:00]**
Data protection on AWS is encryption plus key management plus the operational
discipline around both. The exam will not ask you to implement cryptography. It
will ask you to choose correctly — which encryption mode, which key store,
which secret store — and to know who holds the keys. The recurring theme is
control: AWS can manage the machinery, but you decide the trust boundary.

**[WHY IT MATTERS — ~0:25]**
Choose the wrong encryption option and the failure is silent: the data is
encrypted, but nobody can audit who decrypted it, or the keys sit somewhere
you cannot rotate them. The exam distinguishes architects by exactly these
choices.

**[SECTION — Envelope encryption and KMS — ~0:50]**
AWS encrypts with envelope encryption: a unique data key encrypts the data,
and a KMS key encrypts the data key. The encrypted data key travels with the
data; the KMS key never leaves KMS. Why this separation? It makes rotation and
auditing tractable — re-encrypting petabytes is never required, because
rotating the KMS key only re-wraps the small data keys. The big problem becomes
a small one.

Every KMS key carries a key policy, a resource policy declaring who may use
and administer the key — and every use is logged to CloudTrail: who called it,
when, from where. That audit trail is the exam's answer to proving key usage.
Customer-managed keys can enable automatic annual rotation. When compliance
demands keys in single-tenant hardware, the answer is CloudHSM; workloads
needing FIPS 140-2 validated cryptography use KMS's FIPS-validated endpoints.
One operational rule matters more than the rest: KMS keys are regional. Data
replicated cross-region stays decryptable only if a replica key exists there —
DR designs that replicate KMS-encrypted data without planning key replication
fail at the worst possible moment.

**[SECTION — Choosing server-side encryption for S3 — ~2:00]**
S3 offers three server-side modes, and the exam tests the trade-off directly.
SSE-S3 uses S3-managed AES-256 keys: simplest, no key management, no
per-request KMS charges. SSE-KMS uses keys you control in KMS: an audit trail
of every decryption and the ability to revoke — at the cost of KMS API charges
and quotas. SSE-C lets you supply your own key with each request: maximum
control, but you own secure transport, storage, and rotation.

New buckets encrypt with SSE-S3 automatically. Compliance
requirements push toward SSE-KMS for the audit trail — the CloudTrail record
of every decryption with the requesting identity attached. SSE-C is for when a
regulator insists the cloud provider never hold the key. EBS encryption by
default at the account level removes the choice entirely. And an existing
unencrypted RDS database cannot be flipped in place — the path is snapshot,
copy the snapshot with encryption enabled, restore.

**[SECTION — Secrets, certificates, and surviving ransomware — ~3:05]**
Database credentials belong in Secrets Manager — not in code, not in
environment variables, not in a wiki. It stores them encrypted and rotates them
automatically on a schedule, including for RDS. Parameter Store is the cheaper
alternative for configuration and secrets that rotate rarely — the
cost-conscious choice when automatic rotation is not required. TLS certificates
come from ACM: free public certificates with automatic renewal, attached to
load balancers, CloudFront, and API Gateway. Terminate TLS at the edge rather
than managing certificates on instances. For discovering what sensitive data
already exists, Macie applies machine learning to S3 buckets to find PII at
scale.

Ransomware resilience is a data-protection design, not just a backup plan. S3
versioning turns overwrites and deletes into new versions rather than
destruction. MFA Delete — enabled only by the root account — requires a
hardware token to permanently delete versions. And S3 Object Lock in Compliance
mode makes objects immutable for the retention period, undeletable by anyone
including the root user. Together they mean an attacker with stolen credentials
still cannot destroy the data.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: SSE-KMS is not free like SSE-S3 — the per-request charges
and quotas are the trade-off for the audit trail. Two: an unencrypted RDS
instance cannot be encrypted in place; snapshot, copy with encryption, restore.
Three: Parameter Store is not a substitute for Secrets Manager when automatic
rotation is required.

**[RECAP — ~4:45]**
Envelope encryption separates the data key from the KMS key so rotation stays
cheap; every key use is logged to CloudTrail, and keys are regional — plan key
replication for DR. For S3: SSE-S3 is simplest, SSE-KMS buys the audit trail,
SSE-C keeps keys entirely in your hands. Secrets live in Secrets Manager with
automatic rotation, certificates in ACM, TLS terminates at the edge. And
against ransomware: versioning, MFA Delete, and Object Lock in Compliance mode
mean stolen credentials still cannot destroy the data.

## On-screen visuals

- HOOK: an envelope diagram — data key wrapping data, KMS key wrapping the
  data key — with the KMS key locked inside a vault.
- ENVELOPE/KMS SECTION: the two-key diagram animating rotation — the KMS key
  re-wrapping small data keys without touching petabytes of data; a CloudTrail
  entry showing "who called the key, when, from where"; a regional boundary
  around keys with a multi-Region key spanning it.
- SSE SECTION: three-column comparison of SSE-S3, SSE-KMS, and SSE-C with the
  audit-trail and cost trade-offs; the snapshot-copy-restore path for an
  unencrypted RDS instance.
- SECRETS SECTION: credentials flowing from Secrets Manager with an automatic
  rotation clock; ACM certificate renewing itself on a load balancer; the three
  ransomware defences stacking — versioning, MFA Delete, Object Lock.
- COMMON MISTAKES: three trap cards — "SSE-KMS costs per request", "no
  in-place RDS encryption", "rotation means Secrets Manager".
- RECAP: the cheat-sheet terms as a clean summary card.
