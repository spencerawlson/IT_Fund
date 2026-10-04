"""Container security monitoring lab (Docker + SIEM). Data only; nothing here executes.

A defensive lab: build a small container environment, centralize its telemetry, and investigate a
simulated attack with a SIEM. Drives the `docker_siem` shell. Phase 1 = terminal + objectives; a
visual SIEM Event Explorer is a planned follow-on.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

DOCKER_SIEM_LAB = LabDefinition(
    id="sec-docker-siem-001",
    slug="docker-siem-container-security",
    title="Docker + SIEM: Container Security Monitoring",
    description=(
        "Stand up a containerized environment (Nginx, a network, a volume, a Compose stack), then pivot "
        "to the blue-team side: centralize the telemetry and use a SIEM to find a brute-force alert and "
        "reconstruct an attacker's kill chain. Learn Docker fundamentals and SIEM detection/investigation "
        "in one place. Everything is simulated — nothing runs on a real host."
    ),
    category="cybersecurity",
    difficulty="intermediate",
    estimated_minutes=45,
    shell="docker_siem",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/docker-siem:latest",
        # No docker-siem image is built (Docker-in-Docker is incompatible with
        # the hardened provider; see backend/labs/images/README.md). Kept for
        # uniformity: used only by a real provider, never sent to the client.
        workdir="/home/student",
        idle_timeout_minutes=25,
        max_runtime_minutes=75,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="docker-host", role="Ubuntu Docker host"),
        LabTarget(hostname="lab-nginx", role="Nginx container"),
        LabTarget(hostname="lab-api", role="FastAPI container"),
        LabTarget(hostname="lab-postgres", role="PostgreSQL container"),
    ],
    objectives=[
        LabObjective(id="verify-docker", label="Verify the Docker Engine", validator="docker_verified",
                     hints=["docker info — shows the client/server, versions, container and image counts. (systemctl status docker also works.)"]),
        LabObjective(id="run-nginx", label="Deploy the Nginx container", validator="nginx_running",
                     hints=["docker run -d --name lab-nginx -p 8080:80 nginx — -d detaches, -p publishes host:container ports."]),
        LabObjective(id="investigate", label="Investigate the container", validator="container_investigated",
                     hints=["docker inspect lab-nginx (IP, state, ports) or docker logs lab-nginx (access log)."]),
        LabObjective(id="network", label="Create a custom Docker network", validator="network_created",
                     hints=["docker network create security-lab — isolates lab traffic and enables container DNS."]),
        LabObjective(id="volume", label="Create a volume for persistence", validator="volume_created",
                     hints=["docker volume create pgdata — container storage is ephemeral; databases need a volume."]),
        LabObjective(id="compose", label="Bring up the stack with Compose", validator="compose_up",
                     hints=["docker compose up -d — starts nginx, api, postgres and the log-collector together."]),
        LabObjective(id="siem-search", label="Search the centralized events (SIEM)", validator="siem_searched",
                     hints=["siem search — or filter, e.g. siem search event_type=auth_failure. Remote log copies survive even if local logs are tampered with."]),
        LabObjective(id="bruteforce", label="Find the brute-force detection alert", validator="bruteforce_found",
                     hints=["siem alerts — which detection rules fired, and from which source? (A rule: auth_failure >= 5 from one source in 2 minutes.)"]),
        LabObjective(id="attacker", label="Reconstruct the attacker's kill chain", validator="attacker_identified",
                     hints=["Find the IP on every malicious event, then pivot: siem search src_ip=<that IP> to see scan → failures → success → access → privileged."]),
    ],
)
