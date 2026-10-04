"""Outcome-based validators.

Each validator inspects the recorded lab STATE (the `findings` a student has captured), not which
commands were typed, so a student can reach an objective by any valid route. A validator is a
function (target-args, findings) -> (passed, message, evidence). Objectives reference a validator by
name; the name must exist here or the lab fails to load (see registry.py).
"""
from __future__ import annotations

from typing import Any, Callable

# A validator returns (passed, message, evidence).
Validator = Callable[[dict[str, Any], dict[str, Any]], tuple[bool, str, Any]]

VALIDATORS: dict[str, Validator] = {}


def validator(name: str) -> Callable[[Validator], Validator]:
    def register(fn: Validator) -> Validator:
        if name in VALIDATORS:
            raise ValueError(f"duplicate validator: {name}")
        VALIDATORS[name] = fn
        return fn

    return register


def _ports_for(findings: dict[str, Any], target: str) -> list[dict]:
    return [p for p in findings.get("ports", []) if p.get("target", target) == target]


# ---- cybersecurity: enumeration ----

@validator("host_discovered")
def host_discovered(args, findings):
    target = args["target"]
    hosts = findings.get("hosts", {})
    if hosts.get(target, {}).get("up"):
        return True, f"You confirmed {target} is reachable.", {"target": target}
    return False, f"{target} has not been confirmed reachable yet.", None


@validator("ports_discovered")
def ports_discovered(args, findings):
    target = args["target"]
    ports = _ports_for(findings, target)
    if ports:
        nums = sorted({p["port"] for p in ports})
        return True, f"You discovered {len(nums)} open port(s) on {target}.", {"target": target, "ports": nums}
    return False, "No exposed ports have been recorded yet.", None


@validator("services_identified")
def services_identified(args, findings):
    target = args["target"]
    named = [p for p in _ports_for(findings, target) if p.get("service")]
    if named:
        return True, f"You identified services on {len(named)} port(s).", {"services": named}
    return False, "No services have been identified on the recorded ports yet.", None


@validator("versions_identified")
def versions_identified(args, findings):
    target = args["target"]
    versioned = [p for p in _ports_for(findings, target) if p.get("version")]
    if versioned:
        return True, f"You captured version detail for {len(versioned)} service(s).", {"services": versioned}
    return False, "No service versions have been recorded yet.", None


# ---- cybersecurity: manual vs PortBlast ----

@validator("manual_enumeration_complete")
def manual_enumeration_complete(args, findings):
    target = args["target"]
    if _ports_for(findings, target):
        return True, "Manual enumeration recorded.", None
    return False, "Record your manual enumeration findings first.", None


@validator("research_complete")
def research_complete(args, findings):
    if findings.get("research"):
        return True, "Vulnerability research recorded.", {"count": len(findings["research"])}
    return False, "No vulnerability research has been recorded yet.", None


@validator("portblast_result_exists")
def portblast_result_exists(args, findings):
    # PortBlast writes its normalized result here via the adapter; we only check it exists.
    if findings.get("portblast"):
        return True, "A PortBlast result is available for comparison.", None
    return False, "Run PortBlast against the training target to produce a result.", None


@validator("comparison_complete")
def comparison_complete(args, findings):
    if findings.get("comparison"):
        return True, "You compared your manual findings with PortBlast.", None
    return False, "Complete the manual-vs-PortBlast comparison.", None


# ---- networking: state checks against the recorded device config ----

def _config_flag(findings: dict[str, Any], key: str) -> bool:
    return bool(findings.get("config", {}).get(key))


def _network_validator(key: str, ok: str, todo: str) -> Validator:
    def fn(args, findings):
        return (True, ok, None) if _config_flag(findings, key) else (False, todo, None)

    return fn


for _key, _ok, _todo in [
    ("vlan10_exists", "VLAN 10 exists.", "VLAN 10 has not been created yet."),
    ("vlan20_exists", "VLAN 20 exists.", "VLAN 20 has not been created yet."),
    ("sw1_trunk_configured", "SW1 trunk is configured.", "Configure the trunk on SW1."),
    ("sw2_trunk_configured", "SW2 trunk is configured.", "Configure the trunk on SW2."),
    ("router_interfaces_configured", "Router sub-interfaces are configured.", "Configure the router's inter-VLAN interfaces."),
    ("pc1_reaches_gateway", "PC1 reaches its gateway.", "PC1 cannot reach its gateway yet."),
    ("pc2_reaches_gateway", "PC2 reaches its gateway.", "PC2 cannot reach its gateway yet."),
    ("pc1_reaches_pc2", "PC1 reaches PC2 across VLANs.", "PC1 cannot reach PC2 yet."),
    # VLANs & Inter-VLAN Routing (Cisco IOS shell; flags derived in labs/topologies.py)
    ("vlans_created", "VLAN 10 and VLAN 20 exist on SW1.", "Create VLAN 10 and VLAN 20 on SW1."),
    ("access_ports_configured", "Access ports are in the right VLANs.", "Put Gi0/1 in VLAN 10 and Gi0/2 in VLAN 20 as access ports."),
    ("trunk_configured", "The trunk to the router is up.", "Set SW1 Gi0/24 to trunk mode."),
    ("router_subinterfaces_configured", "R1 subinterfaces route both VLANs.", "Enable Gi0/0 and add dot1Q subinterfaces .10 and .20 with gateway IPs."),
    ("intervlan_connectivity", "PC1 and PC2 can reach each other across VLANs.", "Finish the switch and router config, then ping across the VLANs."),
    # Static Routing (Cisco IOS shell)
    ("r1_interfaces_configured", "R1's LAN and WAN interfaces are up.", "Address and enable R1 Gi0/0 (192.168.1.1) and Gi0/1 (10.0.0.1)."),
    ("r2_interfaces_configured", "R2's LAN and WAN interfaces are up.", "Address and enable R2 Gi0/0 (192.168.2.1) and Gi0/1 (10.0.0.2)."),
    ("r1_static_route", "R1 has a route to LAN2.", "On R1: ip route 192.168.2.0 255.255.255.0 10.0.0.2."),
    ("r2_static_route", "R2 has a route to LAN1.", "On R2: ip route 192.168.1.0 255.255.255.0 10.0.0.1."),
    ("end_to_end_connectivity", "PC1 can reach PC2 across both routers.", "Finish both routers' interfaces and static routes, then ping end to end."),
    # Access Control Lists (Cisco IOS shell)
    ("acl_denies_guest", "Your ACL denies the guest host.", "Add a rule denying 192.168.1.20 (access-list 10 deny host 192.168.1.20)."),
    ("acl_permits_others", "Your ACL permits everyone else.", "Add a permit-any rule so other hosts still pass (access-list 10 permit any)."),
    ("acl_applied", "The ACL is applied to the traffic path.", "Apply it near the destination: interface Gi0/1 → ip access-group 10 out."),
    ("guest_blocked", "The guest can no longer reach the server.", "From GUEST, ping 192.168.2.10 — it should now fail."),
    ("trusted_allowed", "Trusted hosts still reach the server.", "From PC1, ping 192.168.2.10 — it should still succeed."),
    # OSPF single-area / troubleshooting (Cisco IOS)
    ("r1_ospf", "R1 advertises its networks in OSPF area 0.", "On R1: router ospf 1, then network statements for its LAN and link in area 0."),
    ("r2_ospf", "R2 advertises its networks in OSPF area 0.", "On R2: advertise both link networks (10.0.12.0 and 10.0.23.0) in area 0."),
    ("r3_ospf", "R3 advertises its networks in OSPF area 0.", "On R3: advertise the link and the Server LAN in area 0."),
    ("ospf_adjacencies", "All required OSPF adjacencies are up.", "Check show ip ospf neighbor — R1-R2 and R2-R3 should be FULL."),
    ("ospf_connectivity", "PC-A can reach Server-A across the OSPF network.", "From PC-A, ping 192.168.3.10 once OSPF has converged."),
    # eBGP (Cisco IOS)
    ("r1_bgp", "R1's eBGP neighbor to R2 is configured.", "On R1: router bgp 65001, then neighbor 10.0.0.2 remote-as 65002."),
    ("r2_bgp", "R2's eBGP neighbor to R1 is configured.", "On R2: router bgp 65002, then neighbor 10.0.0.1 remote-as 65001."),
    ("bgp_peering", "The eBGP session is established.", "Both routers must point at each other with the correct remote-as; check show ip bgp summary."),
    ("bgp_advertised", "Both LANs are advertised into BGP.", "network 192.168.1.0 mask 255.255.255.0 on R1, and 192.168.2.0 on R2."),
    ("bgp_connectivity", "PC1 can reach PC2 across the eBGP peering.", "From PC1, ping 192.168.2.10 once the session is up and routes are advertised."),
    # EIGRP single-AS / troubleshooting (Cisco IOS)
    ("r1_eigrp", "R1 runs EIGRP AS 100 and advertises its networks.", "On R1: router eigrp 100, then network statements for its LAN and link (wildcards 0.0.0.255)."),
    ("r2_eigrp", "R2 runs EIGRP AS 100 and advertises its networks.", "On R2: router eigrp 100, then advertise both link networks (10.0.12.0 and 10.0.23.0)."),
    ("r3_eigrp", "R3 runs EIGRP AS 100 and advertises its networks.", "On R3: router eigrp 100, then advertise the link and the Server LAN."),
    ("eigrp_adjacencies", "All required EIGRP adjacencies are up.", "Check show ip eigrp neighbors — R1-R2 and R2-R3 should appear. Both sides need AS 100."),
    ("eigrp_connectivity", "PC-A can reach Server-A across the EIGRP network.", "From PC-A, ping 192.168.3.10 once EIGRP has converged."),
]:
    VALIDATORS[_key] = _network_validator(_key, _ok, _todo)


# ---- diagnostics: a top-level finding key simply being present (Linux troubleshooting shell) ----

def _finding_present(key: str, ok: str, todo: str) -> Validator:
    def fn(args, findings):
        return (True, ok, findings.get(key)) if findings.get(key) else (False, todo, None)

    return fn


for _key, _ok, _todo in [
    ("local_ip", "You inspected the workstation's IP configuration.", "Check the local addressing (ip addr)."),
    ("dns", "You resolved the app's name to an address.", "Resolve the app hostname (dig or nslookup)."),
    ("gateway", "You confirmed the default gateway is reachable.", "Ping the default gateway."),
    ("trace", "You traced the path to the app.", "Run a traceroute to the app."),
    ("service", "You confirmed the web service responds.", "Request the app over HTTP (curl)."),
    # Log triage / brute-force investigation (Linux logs shell)
    ("log_viewed", "You opened the auth log.", "View the log (cat/tail /var/log/auth.log)."),
    ("failed_found", "You found the failed login attempts.", "Filter the failed logins (grep \"Failed password\" auth.log)."),
    ("attacker_ip", "You identified the attacker's IP.", "The brute-force comes from one IP — grep for 203.0.113.66."),
    ("breach_found", "You found the successful login.", "Find the login that succeeded (grep \"Accepted password\" auth.log)."),
    ("account_identified", "You identified the compromised account.", "Which account did the attacker get into? grep for that username."),
    # Cloud security audit (AWS CLI shell)
    ("bucket_list", "You listed the account's S3 buckets.", "List the buckets (aws s3 ls)."),
    ("public_bucket", "You found the publicly-exposed bucket.", "Check each bucket's ACL/public-access-block — one is open to AllUsers."),
    ("open_ssh", "You found the security group with SSH open to the world.", "Inspect the firewall rules (aws ec2 describe-security-groups) for 0.0.0.0/0 on port 22."),
    ("admin_user", "You found the over-privileged IAM user.", "Check users' attached policies (aws iam list-attached-user-policies) for AdministratorAccess."),
    ("stale_key", "You found the stale, never-rotated access key.", "List access keys per user (aws iam list-access-keys) and check their age."),
    # Terraform / IaC lab
    ("config_viewed", "You reviewed the infrastructure definition.", "Read the config (cat main.tf)."),
    ("init_done", "You initialized the Terraform working directory.", "Run terraform init."),
    ("security_issue", "You found the insecure default before applying.", "Scan the config (tfsec) — it flags a HIGH issue."),
    ("plan_done", "You previewed the execution plan.", "Run terraform plan (after init)."),
    ("applied", "You provisioned the resources.", "Run terraform apply (after init)."),
    # Docker + SIEM container security monitoring lab
    ("docker_verified", "You verified the Docker Engine is running.", "Check the engine: docker info (or systemctl status docker)."),
    ("nginx_running", "You deployed the Nginx container with its port published.", "docker run -d --name lab-nginx -p 8080:80 nginx."),
    ("container_investigated", "You investigated the running container.", "Inspect it: docker inspect lab-nginx (or docker logs lab-nginx)."),
    ("network_created", "You created a custom Docker network.", "docker network create security-lab."),
    ("volume_created", "You created a Docker volume for persistence.", "docker volume create <name> (databases need persistent storage)."),
    ("compose_up", "You brought up the stack with Compose.", "docker compose up -d."),
    ("siem_searched", "You searched the centralized events in the SIEM.", "siem search (optionally field=value, e.g. event_type=auth_failure)."),
    ("bruteforce_found", "You found the brute-force detection alert.", "See which detection rules fired: siem alerts."),
    ("attacker_identified", "You pinned down the attacker and their kill chain.", "Pivot on the source: siem search src_ip=<the IP that appears on every malicious event>."),
    # Blue-team log labs (generic logfile shell)
    ("beacon_dst", "You found the suspicious destination.", "One external IP is contacted over and over — grep for it in conn.log."),
    ("beacon_host", "You identified the beaconing internal host.", "Which internal host keeps talking to that destination? grep its IP."),
    ("c2_http", "You found the C2 beacon URI.", "Check http.log for the repeated request path (e.g. /api/v1/beacon)."),
    ("c2_ua", "You spotted the automated user-agent.", "Beacons rarely use a browser UA — grep http.log for the client (Go-http-client)."),
    ("dns_txt", "You found the unusual TXT queries.", "DNS tunneling uses TXT records — grep TXT in dns.log."),
    ("dns_typo", "You found the typosquatted domain.", "Look for a lookalike of globocorp.com (e.g. g1obocorp.com)."),
    ("dns_tunnel", "You identified the exfiltration domain.", "A single odd domain gets many base64-looking subdomains — grep for it (dnsexfil.xyz)."),
    ("dns_client", "You identified the exfiltrating client.", "Which internal host is sending the tunneling queries? grep its IP."),
    ("rw_ext", "You found the ransomware file extensions.", "grep for .locked / .encrypted in smb.log."),
    ("rw_host", "You identified the infected host.", "Which host is writing all those files? grep its name/IP."),
    ("rw_note", "You found the ransom note.", "Ransomware drops a note — grep for DECRYPT / readme."),
    ("rw_scope", "You assessed the scope of the damage.", "How many files were written/encrypted? grep the write operations."),
    # Python automation lab (Linux + simulated python3 shell)
    ("py_version", "You verified the Python interpreter.", "Check the interpreter (python3 --version)."),
    ("py_failed_count", "You counted the failed logins with Python.", "One-liner: python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\"."),
    ("py_ips_extracted", "You extracted the unique source IPs with Python.", "re.findall an IPv4 pattern over the log and wrap it in set()."),
    ("py_api_called", "You queried the alerts API from Python.", "urllib.request.urlopen('http://localhost:8080/api/alerts') + json.load — see help."),
    ("py_scan_done", "You port-scanned 10.0.0.8 with Python sockets.", "socket.socket().connect_ex(('10.0.0.8', port)) == 0 means open — see help."),
    # Python scripting basics (Linux + simulated python3 shell)
    ("py_basics_print", "You printed a greeting built from a variable.", "python3 -c \"name='ada'; print('hello, ' + name)\" — see help."),
    ("py_basics_loop", "You looped with for and range().", "python3 -c \"for i in range(3): print('port', i)\" — see help."),
    ("py_script_written", "You wrote a Python script to a file.", "echo \"lines = open('notes.txt').read().splitlines()\" > count.py, then append the print line with >>."),
    ("py_script_run", "You ran your Python script.", "python3 count.py — it prints the number of lines in notes.txt."),
]:
    VALIDATORS[_key] = _finding_present(_key, _ok, _todo)
