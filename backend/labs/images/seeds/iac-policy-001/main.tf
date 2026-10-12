# iac-policy-001 seed: THREE policy violations to find and fix.
#
#   1. aws_s3_bucket.customer_data has no server-side encryption (tfsec HIGH + OPA deny).
#   2. aws_s3_bucket.customer_data has no versioning (tfsec).
#   3. aws_security_group.web allows SSH from 0.0.0.0/0 (tfsec CRITICAL + OPA deny).
#   4. Resources are missing the required Environment/Owner tags (OPA deny).
#
# Fix this file until `tfsec .` exits 0 AND
# `conftest test --parser hcl2 -p policy/ main.tf` reports 0 failures.
#
# No `terraform init` needed: tfsec and conftest parse HCL directly, so this
# lab runs fully offline (the lab network denies internet egress).

terraform {
  required_version = ">= 1.0"
}

resource "aws_s3_bucket" "customer_data" {
  bucket = "customer-data-exports"
  # VIOLATION: no server_side_encryption_configuration block
  # VIOLATION: no versioning block
  # VIOLATION: missing required tags (Environment, Owner)
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web tier security group"

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # VIOLATION: SSH open to the world
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  # VIOLATION: missing required tags (Environment, Owner)
}
