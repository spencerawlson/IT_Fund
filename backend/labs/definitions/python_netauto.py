"""Python for network automation lab: parse configs, generate device configs, save them."""
from labs.models import (
    LabDefinition,
    LabDifficulty,
    LabEnvironmentConfig,
    LabObjective,
    LabTarget,
)

PYTHON_NETAUTO_LAB = LabDefinition(
    id="py-netauto-001",
    slug="python-network-automation",
    title="Python for Network Automation",
    description=(
        "The network engineer's Python workflow: parse a switch config to find every access port "
        "in VLAN 10, generate day-0 configs for three switches with a loop, save them to a file, "
        "and verify the result. The same shapes real Netmiko/NetBox automation is built from."
    ),
    category="python",
    difficulty="beginner",
    estimated_minutes=25,
    shell="linux_python",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/python-netauto:latest",
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="auto01", role="Your automation workstation"),
        LabTarget(hostname="SW-ACCESS-01", role="Switch whose config you parse"),
    ],
    objectives=[
        LabObjective(id="py-version", label="Verify Python is available", validator="py_version",
                     hints=["python3 --version"]),
        LabObjective(id="parse", label="List the VLAN 10 access ports in switch.cfg",
                     validator="py_netauto_parse",
                     hints=["cat switch.cfg first, then: python3 -c \"print([l for l in open('switch.cfg') if 'vlan 10' in l])\" — see help"]),
        LabObjective(id="generate", label="Generate hostname configs for 3 switches in a loop",
                     validator="py_netauto_generate",
                     hints=["python3 -c \"for sw in ['sw1','sw2','sw3']: print('hostname ' + sw)\""]),
        LabObjective(id="save", label="Save the generated configs to day0.txt",
                     validator="py_netauto_saved",
                     hints=["python3 -c \"open('day0.txt','w').write('\\n'.join('hostname '+sw for sw in ['sw1','sw2','sw3']))\""]),
        LabObjective(id="verify", label="Verify day0.txt with cat",
                     validator="py_netauto_verified",
                     hints=["cat day0.txt — the three hostname lines should be there"]),
    ],
)
