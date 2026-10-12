# iac-policy-001 seeds

Shift-left security: scan the Terraform BEFORE it provisions anything.

## Layout

- `main.tf` — seeded config with four violations:
  1. S3 bucket without server-side encryption (tfsec HIGH, OPA deny)
  2. S3 bucket without versioning (tfsec)
  3. Security group with SSH (22/tcp) open to 0.0.0.0/0 (tfsec CRITICAL, OPA deny)
  4. Resources missing the required `Environment` / `Owner` tags (OPA deny;
     tfsec does not check tags)
- `policy/s3.rego`, `policy/sg.rego`, `policy/tags.rego` — the OPA policies
  conftest evaluates. Rego v1 syntax (`deny contains msg if { ... }`).

## Learner workflow (all offline — no `terraform init` needed)

```bash
cd ~/policy-lab
tfsec .                                            # triage the findings
conftest test --parser hcl2 -p policy/ main.tf    # triage the policy denials
# ... edit main.tf: add server_side_encryption_configuration + versioning to
# the bucket, restrict the SSH ingress to 10.0.0.0/8, add Environment/Owner
# tags to both resources ...
tfsec .                                            # exit 0
conftest test --parser hcl2 -p policy/ main.tf    # 0 failures
```

## Notes

- `conftest test --parser hcl2` parses the raw HCL, so no AWS credentials and
  no provider download are required — deliberate, since the lab network denies
  internet egress.
- The `deny` rule name is what conftest picks up (alongside `warn` and
  `violation`); policies must live in package `main` (the default namespace).
