"""Blue-team log-analysis labs (data only; nothing here executes).

All three drive the generic `logfile` shell over per-lab datasets in labs/logsets.py, modelled on
common detections (C2 beaconing, DNS tunneling/typosquatting, ransomware over SMB). Each is a
five-step investigation validated against what the learner uncovered with real grep/cat/wc.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

_ENV = LabEnvironmentConfig(provider="mock", prefers_docker=True, image="road-to-cissp/log-triage:latest",
        workdir="/home/analyst",
                            idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True)

C2_BEACON_LAB = LabDefinition(
    id="sec-c2beacon-001",
    slug="c2-beacon-hunt",
    title="C2 Beacon Hunt",
    description=(
        "A workstation may be beaconing to a command-and-control server at a steady interval. Hunt it "
        "in the connection and HTTP logs with grep: find the destination, the infected host, and the "
        "tell-tale beacon URI and automated user-agent."
    ),
    category="cybersecurity", difficulty="intermediate", estimated_minutes=20, shell="logfile",
    environment=_ENV,
    targets=[LabTarget(hostname="soc", role="SOC analyst workstation")],
    objectives=[
        LabObjective(id="view", label="Review the connection log", validator="log_viewed", hints=["cat conn.log"]),
        LabObjective(id="dst", label="Find the repeatedly-contacted destination", validator="beacon_dst",
                     hints=["One external IP recurs on a steady interval — grep 185.220.101.47 conn.log (and wc -l to count)."]),
        LabObjective(id="host", label="Identify the beaconing internal host", validator="beacon_host",
                     hints=["Which internal host keeps calling it? grep 10.0.0.23 conn.log."]),
        LabObjective(id="uri", label="Find the C2 beacon URI", validator="c2_http",
                     hints=["Pivot to http.log: grep /api/v1/beacon http.log."]),
        LabObjective(id="ua", label="Spot the automated user-agent", validator="c2_ua",
                     hints=["Beacons rarely use a browser — grep Go-http-client http.log."]),
    ],
)

DNS_TUNNEL_LAB = LabDefinition(
    id="sec-dns-typo-001",
    slug="dns-tunneling-and-typosquatting",
    title="DNS Tunneling & Typosquatting",
    description=(
        "The corporate domain is globocorp.com. The DNS log hides two abuses: a typosquatted lookalike "
        "domain and data exfiltration over DNS TXT records. Use grep to surface the TXT tunneling, the "
        "typosquat, the exfil domain and the internal client responsible."
    ),
    category="cybersecurity", difficulty="intermediate", estimated_minutes=20, shell="logfile",
    environment=_ENV,
    targets=[LabTarget(hostname="soc", role="SOC analyst workstation")],
    objectives=[
        LabObjective(id="view", label="Review the DNS log", validator="log_viewed", hints=["cat dns.log"]),
        LabObjective(id="txt", label="Find the unusual TXT queries", validator="dns_txt",
                     hints=["DNS tunneling abuses TXT records — grep TXT dns.log."]),
        LabObjective(id="typo", label="Find the typosquatted domain", validator="dns_typo",
                     hints=["Look for a lookalike of globocorp.com — grep g1obocorp dns.log."]),
        LabObjective(id="tunnel", label="Identify the exfiltration domain", validator="dns_tunnel",
                     hints=["One odd domain gets many base64-looking subdomains — grep dnsexfil dns.log."]),
        LabObjective(id="client", label="Identify the exfiltrating client", validator="dns_client",
                     hints=["Which internal host sends the tunneling queries? grep 10.0.0.88 dns.log."]),
    ],
)

RANSOMWARE_LAB = LabDefinition(
    id="sec-ransomware-001",
    slug="ransomware-over-smb",
    title="Ransomware over SMB",
    description=(
        "A file server is misbehaving. Investigate the SMB log for ransomware: find the encrypted file "
        "extensions, the infected host, the ransom note it dropped, and assess how many files were hit."
    ),
    category="cybersecurity", difficulty="beginner", estimated_minutes=20, shell="logfile",
    environment=_ENV,
    targets=[LabTarget(hostname="soc", role="SOC analyst workstation")],
    objectives=[
        LabObjective(id="view", label="Review the SMB log", validator="log_viewed", hints=["cat smb.log"]),
        LabObjective(id="ext", label="Find the ransomware file extensions", validator="rw_ext",
                     hints=["grep .locked smb.log (also try .encrypted)."]),
        LabObjective(id="host", label="Identify the infected host", validator="rw_host",
                     hints=["Which host is writing all those files? grep win10-victim smb.log."]),
        LabObjective(id="note", label="Find the ransom note", validator="rw_note",
                     hints=["Ransomware drops a note — grep DECRYPT smb.log."]),
        LabObjective(id="scope", label="Assess the scope of the damage", validator="rw_scope",
                     hints=["How many files were written? grep write smb.log (and wc -l)."]),
    ],
)
