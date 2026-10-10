"""All lab definitions, collected into one registry keyed by lab id.

To add a lab: define a LabDefinition in a module here and add it to ALL_LABS. registry.py validates
at import time that every objective references a known validator, so a typo fails fast.
"""
from labs.definitions.blue_team import C2_BEACON_LAB, DNS_TUNNEL_LAB, RANSOMWARE_LAB
from labs.definitions.cloud import CLOUD_AUDIT_LAB, TERRAFORM_LAB
from labs.definitions.container_security import DOCKER_SIEM_LAB
from labs.definitions.docker_fundamentals import DOCKER_FUNDAMENTALS_LAB
from labs.definitions.cybersecurity import LOG_TRIAGE_LAB, NMAP_ENUMERATION_LAB, PORTBLAST_COMPARISON_LAB
from labs.definitions.kubernetes import K8S_FUNDAMENTALS_LAB
from labs.definitions.pentesting import PENTEST_METHODOLOGY_LAB
from labs.definitions.terraform_fundamentals import TERRAFORM_FUNDAMENTALS_LAB
from labs.definitions.python_basics import PYTHON_BASICS_LAB
from labs.definitions.python_lab import PYTHON_AUTOMATION_LAB
from labs.definitions.python_netauto import PYTHON_NETAUTO_LAB
from labs.definitions.networking import (
    ACL_LAB,
    BGP_LAB,
    DNS_CONNECTIVITY_LAB,
    EIGRP_LAB,
    EIGRP_TSHOOT_LAB,
    OSPF_LAB,
    OSPF_TSHOOT_LAB,
    RIP_LAB,
    RIP_TSHOOT_LAB,
    STATIC_ROUTING_LAB,
    VLAN_ROUTING_LAB,
)

ALL_LABS = [
    NMAP_ENUMERATION_LAB,
    PORTBLAST_COMPARISON_LAB,
    PENTEST_METHODOLOGY_LAB,
    K8S_FUNDAMENTALS_LAB,
    TERRAFORM_FUNDAMENTALS_LAB,
    LOG_TRIAGE_LAB,
    VLAN_ROUTING_LAB,
    STATIC_ROUTING_LAB,
    ACL_LAB,
    OSPF_LAB,
    OSPF_TSHOOT_LAB,
    EIGRP_LAB,
    EIGRP_TSHOOT_LAB,
    RIP_LAB,
    RIP_TSHOOT_LAB,
    BGP_LAB,
    DNS_CONNECTIVITY_LAB,
    CLOUD_AUDIT_LAB,
    TERRAFORM_LAB,
    DOCKER_SIEM_LAB,
    DOCKER_FUNDAMENTALS_LAB,
    C2_BEACON_LAB,
    DNS_TUNNEL_LAB,
    RANSOMWARE_LAB,
    PYTHON_BASICS_LAB,
    PYTHON_NETAUTO_LAB,
    PYTHON_AUTOMATION_LAB,
]
