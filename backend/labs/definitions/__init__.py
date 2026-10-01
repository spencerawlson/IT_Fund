"""All lab definitions, collected into one registry keyed by lab id.

To add a lab: define a LabDefinition in a module here and add it to ALL_LABS. registry.py validates
at import time that every objective references a known validator, so a typo fails fast.
"""
from labs.definitions.blue_team import C2_BEACON_LAB, DNS_TUNNEL_LAB, RANSOMWARE_LAB
from labs.definitions.cloud import CLOUD_AUDIT_LAB, TERRAFORM_LAB
from labs.definitions.container_security import DOCKER_SIEM_LAB
from labs.definitions.cybersecurity import LOG_TRIAGE_LAB, NMAP_ENUMERATION_LAB, PORTBLAST_COMPARISON_LAB
from labs.definitions.networking import (
    ACL_LAB,
    DNS_CONNECTIVITY_LAB,
    STATIC_ROUTING_LAB,
    VLAN_ROUTING_LAB,
)

ALL_LABS = [
    NMAP_ENUMERATION_LAB,
    PORTBLAST_COMPARISON_LAB,
    LOG_TRIAGE_LAB,
    VLAN_ROUTING_LAB,
    STATIC_ROUTING_LAB,
    ACL_LAB,
    DNS_CONNECTIVITY_LAB,
    CLOUD_AUDIT_LAB,
    TERRAFORM_LAB,
    DOCKER_SIEM_LAB,
    C2_BEACON_LAB,
    DNS_TUNNEL_LAB,
    RANSOMWARE_LAB,
]
