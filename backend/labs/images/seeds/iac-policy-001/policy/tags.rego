# OPA policy: every resource must carry the Environment and Owner tags.
# tfsec does not check tags, so this one is enforced by policy-as-code only.
# Evaluated by conftest against the HCL2-parsed config:
#   conftest test --parser hcl2 -p policy/ main.tf
package main

required_tags := {"Environment", "Owner"}

deny contains msg if {
	some type, resources in input.resource
	some name, r in resources
	tags := object.get(r, "tags", {})
	missing := {t | some t in required_tags; not tags[t]}
	count(missing) > 0
	msg := sprintf("%s '%s' is missing required tags: %v", [type, name, missing])
}
