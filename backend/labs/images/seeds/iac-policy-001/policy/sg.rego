# OPA policy: no security-group ingress from 0.0.0.0/0.
# Evaluated by conftest against the HCL2-parsed config:
#   conftest test --parser hcl2 -p policy/ main.tf
package main

deny contains msg if {
	some name
	sg := input.resource.aws_security_group[name]
	some rule in sg.ingress
	"0.0.0.0/0" in rule.cidr_blocks
	msg := sprintf(
		"aws_security_group '%s' allows ingress from 0.0.0.0/0 (port %v)",
		[name, rule.from_port],
	)
}
