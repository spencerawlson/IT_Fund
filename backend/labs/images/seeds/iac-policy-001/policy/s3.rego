# OPA policy: S3 buckets must be encrypted at rest and versioned.
# Evaluated by conftest against the HCL2-parsed config:
#   conftest test --parser hcl2 -p policy/ main.tf
package main

# Every bucket needs a server_side_encryption_configuration block.
deny contains msg if {
	some name
	bucket := input.resource.aws_s3_bucket[name]
	not bucket.server_side_encryption_configuration
	msg := sprintf("aws_s3_bucket '%s' has no server-side encryption configured", [name])
}

# Every bucket needs versioning enabled.
deny contains msg if {
	some name
	bucket := input.resource.aws_s3_bucket[name]
	not bucket.versioning.enabled
	msg := sprintf("aws_s3_bucket '%s' does not have versioning enabled", [name])
}
