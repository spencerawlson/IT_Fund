# Host firewall — write-and-verify

The kernel will NOT enforce these rules (no CAP_NET_ADMIN in this container), so
this lab is about writing a correct policy and proving it with check-firewall —
the same review a senior does before applying rules on a real host.

## Required policy (~/firewall/rules.nft)

- Default-deny: the input chain must end in `policy drop`.
- Always allow: loopback (iif "lo"), established/related connections.
- Allow exactly: TCP 2222 from the management network 10.0.2.0/24 (SSH).
- Allow outbound-initiated: TCP 80/443 (web) — stateful, via established.
- Log what you drop (optional but good practice).

## Workflow

1. Edit rules.nft (the skeleton has TODO markers).
2. `check-firewall` — fix every FAIL until `ALL CHECKS PASSED`.
3. Simulate packets: `check-firewall --test-packet "dport=2222 src=10.0.2.5"`
   and `check-firewall --test-packet "dport=3389 src=203.0.113.9"` —
   the first must be accepted, the second dropped by the default policy.

On a real host you would then `nft -f rules.nft` (as root) and re-verify with
`nft list ruleset`.
