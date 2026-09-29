# Road to CISSP — Claude Code Master Prompt

You are working inside my existing project: **Road to CISSP**.

This is an existing cybersecurity, networking, Linux, cloud, programming, and certification learning platform.

**Do not rebuild the application from scratch.**

Before changing code:

1. Inspect the repository structure.
2. Identify the frontend framework.
3. Identify the backend/API architecture.
4. Identify authentication.
5. Identify database/schema conventions.
6. Identify the existing Academy/course/lesson structure.
7. Identify deployment configuration.
8. Identify existing Python services.
9. Identify whether Docker is already used.
10. Identify where an interactive lab system should integrate.

Then give me a concise implementation plan and begin implementing Phase 1.

## Product vision

Road to CISSP should evolve from:

`LEARN -> QUIZ`

into:

`LEARN -> PRACTICE -> VALIDATE -> UNDERSTAND -> PROGRESS`

Students should be able to launch interactive laboratories directly from lessons.

Networking example:

`Learn VLANs -> Launch Lab -> Configure switches/router -> Test connectivity -> Validate configuration`

Cybersecurity example:

`Learn Nmap -> Launch Lab -> Enumerate authorized target -> Identify services -> Research discovered software -> Validate findings`

PortBlast example:

`Manual reconnaissance -> Record findings -> Run PortBlast -> Receive structured JSON -> Compare manual findings with PortBlast`

## PortBlast philosophy

PortBlast is my proprietary cybersecurity tool. It currently integrates/orchestrates workflows involving tools such as RustScan, Nmap, SearchSploit, and Metasploit-related discovery/research. PortBlast can collect findings and store/return structured JSON.

PortBlast must **not** replace learning standard cybersecurity tools.

Teaching order:

1. Teach the native tool.
2. Student uses the native tool.
3. Explain the output.
4. Student completes objectives.
5. Validate the result.
6. Introduce PortBlast afterward.
7. Run PortBlast against the same lab target.
8. Compare PortBlast results with manual findings.

Conceptually:

`Nmap -> RustScan -> SearchSploit -> Metasploit research -> Manual findings -> PortBlast -> Structured JSON -> Compare results`

Do not expose proprietary PortBlast source code or internal implementation details to students.

## Lab types

The architecture must eventually support networking, Linux, cybersecurity, cloud, Python/automation, PortBlast, and certification-oriented labs.

Future networking labs may include IP addressing, subnetting, VLANs, trunks, STP, inter-VLAN routing, static routing, OSPF, ACLs, NAT, DHCP, DNS, IPv6, BGP, and troubleshooting.

Future Linux labs may include users/groups, permissions, processes, systemd, SSH, networking, logs, firewall, and Bash.

Future cybersecurity labs may include Nmap, RustScan, packet analysis, service enumeration, vulnerability research, SearchSploit, controlled Metasploit labs, web security, firewall analysis, log analysis, and incident response.

Only authorized disposable targets may be used for offensive-security exercises.

## Architecture

Prefer a Python backend for lab orchestration. If compatible with the existing project, use Python, FastAPI, WebSockets, and Docker initially.

Do not rewrite the existing web frontend in Python. If it is React/Next.js/etc., keep it.

Prefer xterm.js or the project's appropriate terminal component for the browser terminal.

Conceptual architecture:

```text
Browser
   |
   | HTTPS / WebSocket
   v
Road to CISSP Application
   |
   v
Lab API
   |
   v
Python Lab Orchestrator
   |
   +----------------------+
   |                      |
   v                      v
DockerLabProvider      Future Providers
                          |
                          +-- ProxmoxLabProvider
                          +-- KubernetesLabProvider
```

Do not tightly couple the application to Docker.

## Python reference code

A separate DOCX file named `Road_to_CISSP_Interactive_Lab_Python_Code.docx` contains reference Python code for:

- lab domain models
- LabProvider abstraction
- Nmap enumeration lab
- outcome-based validators
- PortBlast comparison lab
- student command examples
- normalized PortBlast JSON

Use that code as a reference. Adapt it to the repository rather than copying it blindly.

## Lab session model

Create a persistent LabSession concept with fields equivalent to:

- id
- lab_id
- user_id
- status
- created_at
- started_at
- expires_at
- completed_at
- environment_id
- progress
- validation_results

Possible states:

`CREATING`, `READY`, `RUNNING`, `VALIDATING`, `COMPLETED`, `FAILED`, `EXPIRED`, `DESTROYING`, `DESTROYED`

Integrate this into the project's existing database conventions. Do not create a second database architecture if one already exists.

## API

Implement or adapt APIs equivalent to:

```text
POST   /api/labs/{lab_id}/start
GET    /api/labs/sessions/{session_id}
POST   /api/labs/sessions/{session_id}/validate
POST   /api/labs/sessions/{session_id}/reset
DELETE /api/labs/sessions/{session_id}

WS     /api/labs/sessions/{session_id}/terminal
```

Actual paths may change to fit the repository.

## Browser terminal

Create a browser terminal, preferably with xterm.js when appropriate.

Terminal states should include:

- Environment starting...
- Connecting...
- Connected
- Disconnected
- Reconnecting...
- Environment expired

The browser must never receive Docker socket access, SSH private keys, Proxmox/hypervisor credentials, database credentials, or orchestration credentials.

## Lab workspace UI

Create reusable components appropriate to the existing frontend, conceptually:

- LabWorkspace
- LabTerminal
- LabTopology
- LabInstructions
- LabObjectives
- LabProgress
- LabToolbar
- LabTimer
- LabHint
- LabValidationResults

Desktop concept:

```text
+------------------------------------------------------------+
| ROAD TO CISSP LAB                 TIMER | RESET | EXIT     |
+----------------------+-------------------------------------+
| Instructions         |          LAB TOPOLOGY               |
| Objectives           |          TARGET INFO                |
+----------------------+-------------------------------------+
| TERMINAL                                                   |
| student@cyberlab:~$ _                                      |
+------------------------------------------------------------+
| HINT                             CHECK MY WORK              |
+------------------------------------------------------------+
```

Make it responsive.

## Validation philosophy

Do not simply validate whether a student typed a specific command.

Bad:

```python
if command == "nmap -sV target.lab":
    passed = True
```

Good: inspect whether the student actually discovered and recorded the target's services.

The platform should validate the resulting lab state whenever possible. This allows students to solve objectives through different valid approaches.

## Cybersecurity lab #1: Service Enumeration with Nmap

Create an intentionally vulnerable, controlled target called `target.lab` inside the isolated lab network.

Teach progressively:

```bash
nmap target.lab
nmap -sV target.lab
nmap -sC -sV target.lab
nmap -p- target.lab
```

Explain what each command does. Do not simply dump commands.

Teach:

`command -> purpose -> output -> interpretation`

Objectives:

1. Determine whether `target.lab` is reachable.
2. Discover exposed TCP ports.
3. Identify services.
4. Identify relevant service versions.
5. Record findings.

## RustScan progression

After Nmap fundamentals, introduce:

```bash
rustscan -a target.lab
rustscan -a target.lab -- -sV
```

Explain why someone might combine RustScan with Nmap. Do not introduce PortBlast before the learner understands the native workflow.

## Vulnerability research

Only after enumeration, introduce vulnerability research.

Example:

```bash
searchsploit "<product> <version>"
msfconsole
```

Inside Metasploit, teach research/configuration commands such as:

```text
search <product>
info <module>
use <module>
show options
show targets
```

Any exploitation functionality must be limited to explicitly designated disposable lab targets.

## PortBlast comparison lab

After students have learned the manual workflow, introduce PortBlast.

The lab should guide them through:

1. Manual enumeration.
2. Service/version identification.
3. Vulnerability research.
4. Recording findings.
5. Running PortBlast against the same authorized target.
6. Viewing PortBlast structured JSON.
7. Comparing manual findings with PortBlast findings.

If PortBlast's actual JSON differs from the normalized model in the code document, create a `PortBlastAdapter`. Do not rewrite PortBlast merely to fit the Road to CISSP application.

The comparison UI should show manual findings beside PortBlast findings, including target status, ports, services, versions, vulnerability research, and relevant module research.

The educational question is: **What did I discover manually, and what did PortBlast automate?**

## Networking lab #1

Create/scaffold a **VLAN and Inter-VLAN Routing** lab.

Conceptual topology:

```text
PC1
 |
SW1
 |
R1
 |
SW2
 |
PC2
```

Teach interface configuration, IP addressing, VLAN creation, access ports, trunk ports, router configuration, inter-VLAN routing, and connectivity testing.

Machine-readable objectives should include concepts equivalent to:

- vlan10_exists
- vlan20_exists
- sw1_trunk_configured
- sw2_trunk_configured
- router_interfaces_configured
- pc1_reaches_gateway
- pc2_reaches_gateway
- pc1_reaches_pc2

Networking validators should inspect resulting configuration/state rather than checking whether a particular command was typed.

## Suggested lab organization

Prefer a modular organization resembling:

```text
labs/
    definitions/
        networking/
            vlan_routing.py
        cybersecurity/
            nmap_enumeration.py
            rustscan_enumeration.py
            portblast_comparison.py
    providers/
        base.py
        mock.py
        docker.py
    validators/
        networking.py
        ports.py
        services.py
        portblast.py
    services/
        sessions.py
        cleanup.py
        terminal.py
    models.py
```

Adapt naming to the existing repository. Do not force this structure if the project already has a better modular pattern.

## Security requirements

Treat every terminal command as untrusted input.

Every student session must be isolated.

Implement/design:

- per-session isolation
- dedicated lab networks
- CPU limits
- RAM limits
- PID/process limits
- disk/storage limits
- session expiration
- idle expiration
- automatic cleanup
- command auditing
- reset functionality
- deny-by-default networking

Cybersecurity environments should not have unrestricted Internet access.

A student environment should only be able to reach:

1. designated lab targets
2. explicitly required Road to CISSP services
3. explicitly approved package infrastructure when necessary

Prevent students from using Road to CISSP infrastructure to scan arbitrary Internet systems.

Never expose `/var/run/docker.sock`, host filesystem access, Proxmox credentials, cloud credentials, application secrets, database credentials, SSH private keys, or orchestration credentials inside student environments.

Do not run student terminals as privileged containers. Do not use `--privileged` merely to make a demo work.

## Network isolation

Cybersecurity labs should conceptually look like:

```text
Internet
   X
   |
Student Environment
   |
Isolated Lab Network
   |
Authorized Target(s)
```

The student machine should only reach designated lab targets.

If DNS is needed, `target.lab` should resolve internally. Do not depend on public DNS for internal targets.

## Session cleanup

Implement a cleanup service.

When a session expires, the user presses Stop or Reset, an environment fails, or maximum runtime is exceeded, associated resources must be destroyed safely.

Avoid orphaned containers and networks.

Cleanup must be idempotent: calling cleanup twice should not cause a failure.

## Phase 1

Do not attempt to build the entire cyber range immediately.

Implement:

1. Lab domain models
2. LabSession persistence
3. LabProvider interface
4. MockLabProvider
5. safe DockerLabProvider scaffold/implementation
6. FastAPI lab endpoints if compatible
7. WebSocket terminal architecture
8. Lab Workspace UI
9. xterm.js integration
10. validator framework
11. Nmap enumeration lab
12. VLAN lab scaffold
13. PortBlast comparison scaffold
14. session expiration
15. cleanup system
16. documentation

If safe Docker execution is not possible in the current hosting environment, use MockLabProvider. Do not weaken isolation just to make the demo work.

## Phase 2 preparation

Design Phase 1 so we can later add RustScan labs, SearchSploit labs, Metasploit labs, Wireshark/packet analysis, Linux privilege labs, firewall labs, SSH labs, incident-response labs, cloud security labs, and AWS/Azure/GCP labs.

Also preserve the provider abstraction so environments can eventually run on my Proxmox infrastructure.

## Testing

Add tests for:

- lab definitions
- session creation
- session authorization
- session expiration
- validator dispatch
- cleanup
- reset
- invalid lab IDs
- invalid session IDs
- access to another user's session

Security tests should verify that users cannot:

- access another student's lab
- request arbitrary Docker images
- select arbitrary target IPs
- change allowed targets from the client
- inject orchestration options
- obtain backend credentials

## Implementation process

First inspect the repository.

Then report:

1. Existing architecture
2. Existing technology stack
3. Where the lab engine belongs
4. What existing code can be reused
5. Database changes required
6. Security concerns
7. Implementation sequence

Then implement Phase 1.

Do not stop after simply describing it unless there is a major architectural decision that genuinely requires my input.

After implementation, run the project's tests, linting, type checking, and build. Fix problems introduced by your changes. Do not delete existing functionality simply to make tests pass.

## Final report

When finished, report:

- Files created
- Files modified
- Database changes
- API endpoints
- WebSocket endpoints
- Labs created
- Validators created
- Security controls implemented
- Security controls still required
- How to run locally
- How to create a new lab
- How to create a new validator
- How PortBlast integration works
- Known limitations
- Next recommended development step

## Architectural rule

Do not put Docker orchestration directly into web/API routes.

Keep the layers separated:

`API -> Lab Service -> LabProvider -> Docker/Proxmox`

This separation is required so Road to CISSP can move from local Docker-based labs to Proxmox or Kubernetes-backed labs later without redesigning the application.
