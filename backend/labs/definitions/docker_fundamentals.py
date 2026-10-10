"""Docker fundamentals lab: learn the Docker CLI by doing. Data only; nothing here executes.

Eight hands-on objectives on a simulated Docker host: verify the engine, run a container, publish
a port and reach the app, exec in and read logs, build a custom image from the workspace
Dockerfile, persist data across container replacement with a volume, wire containers into a custom
network, and deploy a multi-container stack with Compose. Drives the `docker_cli` shell.
Validators are registered here (df_* namespace) so they load with the lab.
"""
from __future__ import annotations

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


# ---- outcome validators (check recorded state, not which commands were typed) ----

@validator("df_engine_verified")
def df_engine_verified(args, findings):
    if findings.get("df_engine_verified"):
        return True, "You verified the Docker Engine is up and healthy.", {"engine": "running"}
    return False, "The Docker Engine has not been verified yet.", None


@validator("df_container_running")
def df_container_running(args, findings):
    if findings.get("df_container_running"):
        return True, "You have a container running.", None
    return False, "No running container has been recorded yet.", None


@validator("df_port_mapped")
def df_port_mapped(args, findings):
    if findings.get("df_port_mapped"):
        return True, "You published a container port and reached the app through it.", None
    return False, "Publish a port (-p HOST:CONTAINER) and curl the host port.", None


@validator("df_container_explored")
def df_container_explored(args, findings):
    if findings.get("df_container_explored"):
        return True, "You ran a command inside the container and read its logs.", None
    return False, "Both docker exec and docker logs are needed here.", None


@validator("df_image_built")
def df_image_built(args, findings):
    if findings.get("df_image_built"):
        return True, "You built your own image from the Dockerfile.", None
    return False, "Build the image: docker build -t <name>:<tag> .", None


@validator("df_volume_persisted")
def df_volume_persisted(args, findings):
    if findings.get("df_volume_persisted"):
        return True, "Your data survived the container: the volume persisted it.", {"persistence": "volume"}
    return False, "Write data with a volume mounted, replace the container, and read the data back.", None


@validator("df_network_connected")
def df_network_connected(args, findings):
    if findings.get("df_network_connected"):
        return True, "Your containers talk to each other on the custom network.", None
    return False, "Create a custom network, attach containers, and ping between them by name.", None


@validator("df_compose_up")
def df_compose_up(args, findings):
    if findings.get("df_compose_up"):
        return True, "You deployed the multi-container stack with Compose.", {"services": 3}
    return False, "Bring the stack up: docker compose up -d.", None


DOCKER_FUNDAMENTALS_LAB = LabDefinition(
    id="docker-fundamentals-001",
    slug="docker-fundamentals",
    title="Docker Fundamentals: Containers by Doing",
    description=(
        "Learn the Docker CLI the way it is actually used: run containers, publish ports, exec in and "
        "read logs, build your own image from a Dockerfile, persist data with volumes, wire containers "
        "into a custom network, and deploy a three-service stack with Compose. Everything is simulated — "
        "nothing runs on a real host."
    ),
    category="devops",
    difficulty="beginner",
    estimated_minutes=45,
    shell="docker_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/docker-fundamentals:latest",
        # No image is built (mock provider simulates the engine); kept for uniformity.
        workdir="/home/student",
        idle_timeout_minutes=25,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="docker-host", role="Ubuntu Docker host (simulated)"),
    ],
    objectives=[
        LabObjective(
            id="verify-engine", label="Verify the Docker Engine", validator="df_engine_verified",
            description="Confirm the Docker daemon is installed and running before you touch containers.",
            hints=["docker info shows client/server versions plus container and image counts.",
                   "docker version and systemctl status docker also prove the engine is alive."]),
        LabObjective(
            id="run-first-container", label="Run your first container", validator="df_container_running",
            description="Pull an image and start a detached container from it.",
            hints=["docker run -d --name web nginx — Docker pulls the image automatically if it is missing.",
                   "docker ps shows running containers; docker ps -a shows stopped ones too."]),
        LabObjective(
            id="port-mapping", label="Publish a port and reach the app", validator="df_port_mapped",
            description="Map a host port to the container's port and prove the app answers through it.",
            hints=["docker run -d --name web -p 8080:80 nginx publishes host 8080 to container 80.",
                   "curl http://localhost:8080 should return the nginx welcome page."]),
        LabObjective(
            id="exec-and-logs", label="Look inside: exec and logs", validator="df_container_explored",
            description="Run a command inside the running container and read what it has been logging.",
            hints=["docker exec web cat /etc/hostname runs a command inside the container.",
                   "docker logs web shows the container's stdout history."]),
        LabObjective(
            id="build-image", label="Build your own image", validator="df_image_built",
            description="Build a custom image from the workspace Dockerfile and see it in your image list.",
            hints=["cat Dockerfile first — it builds a small Node app listening on 3000.",
                   "docker build -t hello-lab:1.0 . then docker images to confirm it exists."]),
        LabObjective(
            id="volume-persistence", label="Persist data with a volume", validator="df_volume_persisted",
            description="Prove container storage is ephemeral: write data to a volume-backed database, "
                      "delete the container, start a fresh one on the same volume, and read the data back.",
            hints=["docker volume create pgdata, then run postgres with -v pgdata:/var/lib/postgresql/data.",
                   "docker exec db psql -U postgres -c \"INSERT INTO users(name) VALUES ('ada')\" writes a row.",
                   "docker rm -f db, start a new container on pgdata, and SELECT the row back."]),
        LabObjective(
            id="custom-network", label="Network containers together", validator="df_network_connected",
            description="Create a user-defined network, attach two containers, and ping between them by name.",
            hints=["docker network create appnet, then docker run --network appnet ... for each container.",
                   "Containers on the default bridge cannot resolve each other by name — the custom network gives them DNS.",
                   "docker exec web ping -c 2 api should succeed once both share appnet."]),
        LabObjective(
            id="compose-stack", label="Deploy the stack with Compose", validator="df_compose_up",
            description="Bring up the three-service stack (web, api, db) defined in compose.yml with one command.",
            hints=["cat compose.yml to see the services, ports and the pgdata volume.",
                   "docker compose up -d starts everything; docker compose ps confirms it."]),
    ],
)
