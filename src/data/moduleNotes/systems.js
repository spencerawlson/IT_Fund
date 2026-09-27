// Detailed notes: concept id (or "term:<Term>") -> { body, example, tip }.
// Modules: Windows Enterprise & Active Directory, Linux Administration, Linux & Unix Fundamentals,
// Virtualization & Containers, Troubleshooting & Root Cause Analysis.
const n = (body, example, tip) => ({ body, example, tip });

export default {
  // ---------- Windows Enterprise & Active Directory ----------
  'o1-1': n(
    "Active Directory Domain Services is Microsoft's directory service. It stores objects (users, computers, groups, service accounts, printers) in a hierarchical database organised into domains, trees, and forests, and provides authentication (mainly Kerberos, with NTLM as a legacy fallback) and authorisation information across the network.\n\nUsers sign in once with domain credentials and are granted access to resources based on group membership, instead of having separate accounts on every machine. AD also underpins Group Policy, certificate services, and single sign-on to many applications, and it can be synchronised to Microsoft Entra ID (formerly Azure AD) for cloud services. Because it controls access to nearly everything, AD is a prime attack target: attackers who reach Domain Admin effectively own the organisation.",
    "A new employee's account is created once in AD, added to 'Finance' and 'VPN Users' groups, and immediately works on any company PC, file share, and VPN.",
    "Protect AD with tiered admin accounts, few Domain Admins, LAPS for local admin passwords, and monitoring for attacks such as Kerberoasting and DCSync."
  ),
  'o1-2': n(
    "A domain controller is a Windows Server that runs AD DS and holds a writable copy of the directory database (NTDS.dit). DCs authenticate users and computers (acting as the Kerberos Key Distribution Center), apply security policy, and serve LDAP queries. Most organisations run at least two DCs per domain, and several per site in larger networks, for redundancy and fast local logons.\n\nDCs replicate changes to each other automatically (multi-master replication). A few special roles, the FSMO roles such as the PDC Emulator and RID Master, live on specific DCs. Read-only domain controllers (RODCs) suit branch offices with weak physical security. Because a DC holds every password hash in the domain, DCs must be tightly secured, patched, backed up, and accessed only from privileged admin workstations.",
    "When the only DC at a branch fails, users there still log in because their computers find another DC through DNS SRV records and site links.",
    "Never browse the web or read email on a domain controller. Treat DCs as Tier 0: only Tier 0 admins log on to them."
  ),
  'o1-3': n(
    "Group Policy lets administrators define configuration and security settings once and apply them to many users and computers. Group Policy Objects (GPOs) contain computer settings (applied at startup) and user settings (applied at logon), covering password and lockout policies, security baselines, firewall rules, software installation, drive mappings, scripts, desktop restrictions, and more.\n\nGPOs are linked to sites, domains, or OUs and processed in the order LSDOU: Local, Site, Domain, OU (closest OU last), so later GPOs override earlier ones unless 'Enforced' or blocked. Security filtering and WMI filters target specific groups or machines. Tools include gpupdate /force to apply changes immediately, and gpresult /r or the Resultant Set of Policy report to see what actually applied.",
    "A security baseline GPO linked to the Workstations OU disables SMBv1, enables BitLocker, and restricts local admin rights across 5,000 PCs in one change.",
    "Troubleshoot GPOs with `gpresult /h report.html` to see which policies applied, which were filtered, and why."
  ),
  'o1-4': n(
    "NTFS permissions control access to files and folders on NTFS volumes through access control lists (ACLs). Each entry (ACE) grants or denies permissions such as Read, Read & Execute, List Folder Contents, Write, Modify, and Full Control to a user or group. Permissions inherit from parent folders by default, and explicit deny entries override allows.\n\nWhen files are accessed over the network, share permissions apply as well, and the most restrictive combination of share and NTFS permissions wins. Best practice is to set share permissions broadly (for example Authenticated Users: Change) and control access precisely with NTFS permissions assigned to groups, never to individual users, following least privilege. Moving files within the same volume keeps their permissions; copying them inherits the destination's.",
    "HR staff get Modify on \\\\files\\HR through the 'HR-Staff' group, while everyone else has no access; a departing employee loses access the moment they leave the group.",
    "Effective permission = most restrictive of share and NTFS permissions over the network. Deny beats allow."
  ),
  'o1-5': n(
    "Windows Server is Microsoft's server operating system. It is role-based: you install only the roles and features a server needs, such as AD DS (domain controller), DNS, DHCP, File and Storage Services, Print Services, Hyper-V (virtualisation), IIS (web server), Remote Desktop Services, AD Certificate Services, and Windows Server Update Services (WSUS).\n\nEditions and installation options affect its footprint: Server Core has no desktop GUI, which means a smaller attack surface and fewer patches, and is managed remotely with PowerShell, Windows Admin Center, or RSAT tools. Key administration practices include regular patching, security baselines (CIS or Microsoft), minimal installed roles, remote management over secure channels, and monitoring event logs.",
    "A company runs its domain controllers and DNS on Server Core to reduce patching and attack surface, managing them remotely with PowerShell.",
    "Install only needed roles and prefer Server Core where possible. Every extra role is extra attack surface."
  ),
  'o1-6': n(
    "Organizational Units are containers inside an AD domain that hold users, computers, groups, and other OUs, forming a hierarchy that usually mirrors how you manage things: by location, department, or device type. OUs serve two main purposes: linking Group Policy (a GPO linked to an OU applies to the objects inside it) and delegating administration (for example letting the helpdesk reset passwords only in the 'Branch-London' OU).\n\nAn OU is not a security boundary: you cannot grant access to a file share 'to an OU'. Security groups are what you use to grant access to resources. Design OUs around administration and policy needs, keep the structure reasonably flat, and avoid leaving objects in the default Users and Computers containers, which cannot have GPOs linked to them.",
    "Laptops live in the 'Workstations/Laptops' OU with a GPO enforcing BitLocker, and helpdesk staff are delegated rights to that OU only.",
    "OUs = policy and delegation. Security groups = permissions. A common exam distinction."
  ),
  'o1-7': n(
    "Active Directory depends completely on DNS. Clients find domain controllers by querying SRV records (such as _ldap._tcp.dc._msdcs.example.local), which DCs register automatically. If clients point to the wrong DNS server (for example a public resolver), they cannot find a DC, and domain logons, Group Policy, and Kerberos fail.\n\nAD-integrated DNS zones are stored inside the AD database instead of text files, so they replicate automatically to other DCs with AD replication, support multi-master updates, and allow secure dynamic updates, where only authenticated domain members can register or change their records. Domain members should use internal DNS servers only; those servers forward external queries to the internet.",
    "Logons start failing after someone sets office PCs to use 8.8.8.8 for DNS; the PCs can no longer locate a domain controller through SRV records.",
    "In AD troubleshooting, check DNS first: `nslookup -type=SRV _ldap._tcp.dc._msdcs.yourdomain` and `dcdiag /test:dns`."
  ),
  'o1-8': n(
    "Windows records events in logs viewable with Event Viewer or PowerShell (Get-WinEvent). The main logs are System (drivers, services, OS events), Application (software events), and Security (audited logons, privilege use, policy and account changes), plus many specialised logs such as PowerShell, Sysmon, and Windows Defender.\n\nKey security event IDs include 4624 (successful logon), 4625 (failed logon), 4672 (special privileges assigned), 4720 (user created), 4728/4732 (user added to a group), 4740 (account locked out), 4688 (process created), and 1102 (audit log cleared). Enable advanced audit policies through GPO and forward events to a SIEM with Windows Event Forwarding or an agent, because attackers clear local logs.",
    "A SIEM alert fires on many 4625 failures followed by a 4624 success from the same IP, a sign of a successful password-guessing attack.",
    "Event ID 1102 (security log cleared) on a server is a strong indicator of attacker anti-forensics."
  ),

  // ---------- Linux Administration ----------
  'o2-1': n(
    "Every Linux file and directory has an owner, a group, and three permission sets: owner (u), group (g), and others (o). Each set has read (r), write (w), and execute (x) bits. For files, x means the file can be run; for directories, r lists contents, w creates or deletes entries, and x allows entering (traversing) the directory.\n\nls -l shows permissions as a 10-character string such as -rwxr-xr--: the first character is the type (- file, d directory, l symlink), followed by the owner, group, and others triplets. Special bits add behaviour: setuid (s on the owner) runs a program with its owner's privileges, setgid (s on the group) inherits group ownership in directories, and the sticky bit (t, as on /tmp) lets only the owner delete their files.",
    "`-rw-r-----  root  shadow  /etc/shadow` means root can read and write, the shadow group can read, and everyone else has no access to password hashes.",
    "Unexpected setuid-root binaries are a classic privilege escalation path. Audit them with `find / -perm -4000 -type f`."
  ),
  'o2-2': n(
    "chmod changes permissions, using either octal numbers or symbolic notation. In octal, r=4, w=2, x=1 are summed for each of owner, group, and others: chmod 755 script.sh gives rwxr-xr-x, and chmod 600 id_rsa gives rw------- (owner only). Symbolically: chmod u+x script.sh adds execute for the owner, and chmod g-w,o-r file removes group write and others' read.\n\nchown changes ownership: chown alice file, chown alice:developers file, or recursively chown -R www-data:www-data /var/www. chgrp changes only the group. The umask sets default permissions for new files. Least privilege applies: config files with secrets should be 600 or 640, never world-readable, and avoid chmod 777, which lets anyone modify the file.",
    "SSH refuses a private key with 'permissions are too open' until `chmod 600 ~/.ssh/id_ed25519` restricts it to the owner.",
    "`chmod 777` is almost always wrong. It lets any user modify or replace the file, including scripts run by root."
  ),
  'term:systemd & Services': n(
    "systemd is the init system and service manager on most modern Linux distributions. It starts as process ID 1 at boot, brings up the system in parallel according to unit dependencies, and supervises services (daemons), restarting them if configured to do so. Units describe what systemd manages: .service (daemons), .timer (scheduled jobs, a cron alternative), .socket, .mount, and .target (groups of units, such as multi-user.target).\n\nsystemctl controls it: systemctl status nginx, start, stop, restart, reload (re-read the configuration), enable and disable (start at boot or not), and systemctl list-units --failed. Logs go to the journal, read with journalctl -u nginx -f (follow one service) or journalctl -b (the current boot). Custom services are defined in unit files under /etc/systemd/system.",
    "After a reboot a web app is down; `systemctl status myapp` shows it was never enabled, so `systemctl enable --now myapp` starts it now and at every boot.",
    "`start` runs a service now; `enable` makes it start at boot. You usually want both (`enable --now`)."
  ),
  'o2-4': n(
    "Package managers install, update, and remove software from trusted repositories, handling dependencies automatically and verifying package signatures. Debian and Ubuntu use apt (apt update refreshes indexes, apt install nginx, apt upgrade) on top of dpkg. RHEL, Fedora, Rocky, and Alma use dnf (formerly yum) on top of rpm. Others include zypper (SUSE), pacman (Arch), and apk (Alpine).\n\nUsing packages keeps software patched through normal update processes and makes installations auditable (dpkg -l, rpm -qa list what is installed). Downloading random binaries or piping curl output into bash bypasses signature checks and update management. Enterprises often mirror repositories internally and automate patching with unattended-upgrades, dnf-automatic, or configuration management tools.",
    "`sudo apt update && sudo apt upgrade` patches OpenSSL along with everything else on an Ubuntu server within minutes of a security advisory.",
    "Patch regularly and verify repositories are signed. A compromised or untrusted repository is a supply-chain attack path."
  ),
  'o2-5': n(
    "A Bash script is a text file of shell commands that runs in sequence, starting with a shebang line (#!/usr/bin/env bash) and made executable with chmod +x. Scripts use variables (NAME=value, used as \"$NAME\"), command substitution ($(date +%F)), conditionals (if [[ -f file ]]; then ... fi), loops (for f in *.log; do ... done), functions, and exit codes (0 means success).\n\nScripts automate backups, log rotation, user provisioning, deployments, and health checks. Robust scripts start with set -euo pipefail (stop on errors, undefined variables, and pipeline failures), quote every variable, validate input, log what they do, and are tested with shellcheck. For complex logic, move to Python or configuration management.",
    "A nightly script dumps the database with a dated file name, compresses it, uploads it to object storage, and deletes local copies older than seven days.",
    "Always quote variables (\"$file\"). Unquoted variables break on spaces and enable injection bugs; run `shellcheck` on every script."
  ),
  'o2-6': n(
    "Linux accounts are defined in /etc/passwd (username, UID, GID, home directory, shell), password hashes live in /etc/shadow (readable only by root), and groups in /etc/group. useradd or adduser creates users, usermod modifies them (usermod -aG docker alice adds a supplementary group), passwd sets passwords, and userdel removes accounts. System accounts for services typically have no login shell (/usr/sbin/nologin).\n\nsudo lets authorised users run specific commands as root or another user, logging every use, without sharing the root password. Rules live in /etc/sudoers and /etc/sudoers.d/ (always edit with visudo). Grant the narrowest rules possible, disable direct root login, remove or lock accounts of leavers promptly, and review group memberships regularly.",
    "A deploy user is allowed only `sudo systemctl restart myapp` via a sudoers rule, rather than full root access.",
    "Broad sudo rules (such as `ALL=(ALL) NOPASSWD: ALL`) or sudo access to editors and interpreters are easy privilege escalation paths."
  ),
  'o2-7': n(
    "Processes can be inspected with ps aux (a snapshot of all processes with user, CPU, memory, and command), top or htop (live views sorted by resource use), pgrep and pidof (find process IDs), and lsof or ss -p (open files and sockets per process). kill PID sends SIGTERM (a polite stop); kill -9 PID sends SIGKILL (immediate, no cleanup) and should be a last resort.\n\nLogs are the first stop when something misbehaves. Traditional text logs live in /var/log: syslog or messages (general), auth.log or secure (logins and sudo), kern.log, and application directories such as /var/log/nginx. On systemd systems, journalctl queries the journal, and dmesg shows kernel messages such as hardware errors and out-of-memory kills.",
    "A server is slow; `top` shows a runaway process at 100% CPU, and `journalctl -u app --since '10 min ago'` reveals it is stuck retrying a failed database connection.",
    "Check `dmesg` for 'Out of memory: Killed process'. The OOM killer silently terminating services explains many mystery crashes."
  ),
  'o2-8': n(
    "SSH provides encrypted remote shell access (ssh user@host), secure file transfer (scp, sftp, rsync over SSH), and tunnelling or port forwarding. The server daemon sshd is configured in /etc/ssh/sshd_config. Key-based authentication uses a key pair: the private key stays on your machine (protected by a passphrase), and the public key goes into ~/.ssh/authorized_keys on the server.\n\nHardening steps: disable password authentication (PasswordAuthentication no), disable direct root login (PermitRootLogin no), allow only specific users or groups (AllowGroups), use modern key types such as Ed25519, keep OpenSSH patched, and rate-limit or block brute force with fail2ban. For fleets, use a bastion or an SSH certificate authority, or cloud session managers that avoid exposing port 22.",
    "Internet-facing servers see thousands of SSH password-guessing attempts a day; disabling password authentication makes them all irrelevant.",
    "Always verify host key fingerprints on first connection. A changed host key warning can indicate a man-in-the-middle."
  ),

  // ---------- Linux & Unix Fundamentals ----------
  'l1-1': n(
    "The shell is the command interpreter that sits between the user and the operating system. It reads commands, expands variables and wildcards (globbing), handles pipes and redirection, and asks the kernel to run programs. Common shells are Bash (the default on most Linux systems), Zsh (the macOS default), Fish, and the minimal POSIX sh or dash used for system scripts.\n\nThe shell is also a programming environment, with variables, conditionals, loops, functions, and job control (running tasks in the background with &, and managing them with jobs, fg, and bg). Configuration files such as ~/.bashrc and ~/.zshrc set aliases, PATH, and the prompt. Scripting the shell is the foundation of Linux automation.",
    "`for host in web01 web02 web03; do ssh \"$host\" uptime; done` checks load on three servers in one line.",
    "Know your PATH. A writable directory early in root's PATH lets attackers hijack commands."
  ),
  'l1-2': n(
    "Linux follows the Filesystem Hierarchy Standard: one tree rooted at /, where extra disks are mounted as directories. /etc holds system configuration, /home holds user directories (/root for the root user), /var holds variable data such as logs (/var/log), spools, caches, and databases, and /tmp holds temporary files (often cleared on reboot).\n\n/bin, /sbin, /usr/bin, and /usr/sbin hold programs (often merged into /usr on modern distributions), and /lib holds shared libraries. /opt holds add-on software and /srv service data. /boot holds the kernel and bootloader files. /proc and /sys are virtual file systems exposing process and kernel information, and /dev contains device files. /mnt and /media are mount points.",
    "Web server configuration is in /etc/nginx, its logs in /var/log/nginx, and its site files in /var/www or /srv; knowing this, you find anything in seconds.",
    "Watch /var and /tmp disk usage. A full /var/log can stop services and logging entirely."
  ),
  'l1-3': n(
    "Each Linux file has an owner, a group, and permissions for owner, group, and others, with read, write, and execute bits (rwx). The octal shorthand adds r=4, w=2, x=1 per class. 755 (rwxr-xr-x) suits executables and directories anyone may enter, 644 (rw-r--r--) suits ordinary readable files, 600 (rw-------) suits private files such as SSH keys and secrets, and 700 (rwx------) suits private directories.\n\nchmod changes permissions, chown changes owner and group, and umask sets the default permissions for new files (a common umask of 022 yields 644 files and 755 directories). Access Control Lists (setfacl, getfacl) provide finer-grained permissions when the owner/group/other model is not enough.",
    "A web app's config file containing database passwords is set to 640, owned by root with group www-data, so the app can read it but other users cannot.",
    "Read the octal digits as owner-group-others. 640 = owner rw, group r, others nothing."
  ),
  'l1-4': n(
    "Linux is multi-user by design. Each account has a numeric UID (root is 0) and a primary group, and it can belong to supplementary groups that grant shared access (for example docker, sudo or wheel, www-data). Account data lives in /etc/passwd, hashed passwords in /etc/shadow, and groups in /etc/group; the id command shows a user's UID, GID, and groups.\n\nsudo delegates privilege precisely: users run specific commands as root (or another user), with each use logged, and no one needs to know the root password. Policies live in /etc/sudoers and drop-in files under /etc/sudoers.d/, edited safely with visudo. Membership in the sudo or wheel group typically grants full admin rights, so keep it small.",
    "Adding a developer to the docker group effectively gives them root on that host, because Docker can mount the host file system.",
    "Some group memberships (docker, lxd, disk) are equivalent to root. Treat them as privileged."
  ),
  'l1-5': n(
    "Every running program is a process with a PID, a parent (PPID), an owner, and a state (running, sleeping, stopped, zombie). Inspect processes with ps aux, ps -ef --forest (showing parent and child trees), top or htop, and pgrep name.\n\nSignals let you communicate with processes: SIGTERM (15, the default for kill) asks a program to shut down cleanly; SIGKILL (9) forces immediate termination with no cleanup; SIGHUP (1) traditionally makes daemons reload their configuration; SIGINT (2) is what Ctrl+C sends; SIGSTOP and SIGCONT pause and resume. killall and pkill signal processes by name. Use SIGTERM first and SIGKILL only if the process does not respond.",
    "`kill -HUP $(pidof nginx)` or `systemctl reload nginx` applies a configuration change without dropping active connections.",
    "An unusual parent-child relationship (such as a web server spawning a shell) is a classic sign of compromise. Use `ps -ef --forest`."
  ),
  'l1-6': n(
    "Every process has three standard streams: stdin (0, input), stdout (1, normal output), and stderr (2, error output). Redirection changes where they go: > writes stdout to a file (overwriting), >> appends, < reads input from a file, 2> redirects errors, and 2>&1 sends errors wherever stdout goes. /dev/null discards output.\n\nPipes (|) connect one command's stdout to the next command's stdin, so small tools combine into powerful pipelines. tee writes output to a file and the screen at the same time. Here-documents (<<EOF) feed multi-line input to commands. This composability, many small tools each doing one thing well, is the core of the Unix philosophy.",
    "`grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head` lists the IPs with the most failed SSH logins.",
    "`cmd > out.txt 2>&1` captures both output and errors. The order matters: `2>&1 > file` does not do the same thing."
  ),
  'l1-7': n(
    "Linux text tools turn logs and command output into answers. grep searches for patterns (-i ignore case, -r recursive, -v invert, -E extended regex, -c count). sed edits streams, for example sed 's/old/new/g' to substitute. awk processes columns and fields ('{print $1, $9}' prints fields 1 and 9 of access logs) and can sum and filter. cut extracts fields by delimiter, and tr translates characters.\n\nsort orders lines (-n numeric, -r reverse), and uniq collapses duplicates (-c counts them, but it needs sorted input). wc counts lines and words, head and tail show the start or end (tail -f follows a growing log), and xargs turns input lines into arguments for another command. Together they replace spreadsheets for quick analysis.",
    "`awk '{print $9}' access.log | sort | uniq -c | sort -nr` counts HTTP status codes in a web log in one second.",
    "`uniq` only removes adjacent duplicates. Always `sort` first."
  ),
  'l1-8': n(
    "Package management differs by distribution family. Debian and Ubuntu use .deb packages via apt and dpkg; RHEL, Fedora, Rocky, and Alma use .rpm packages via dnf (formerly yum) and rpm; Arch uses pacman; Alpine, popular in containers, uses apk; SUSE uses zypper. Universal formats such as Snap, Flatpak, and AppImage bundle dependencies for desktop apps.\n\nPackage managers resolve dependencies, verify signatures with repository GPG keys, track installed files for clean removal, and make patching a single command. Pinning or holding versions (apt-mark hold, dnf versionlock) prevents unwanted upgrades of critical packages. Prefer official and vendor repositories, verify third-party repository keys, and avoid building software from source on servers unless necessary.",
    "An Alpine-based container image installs tools with `apk add --no-cache curl`, keeping the image small and the package list auditable.",
    "Know your distribution family. Exam and interview scenarios often hinge on `apt` versus `dnf`."
  ),
  'l1-10': n(
    "SSH is the standard for secure remote administration. Generate a key pair with ssh-keygen -t ed25519, protect the private key with a passphrase, copy the public key to servers with ssh-copy-id user@host, and let ssh-agent cache the unlocked key for the session. The ~/.ssh/config file defines host aliases, users, keys, and jump hosts (ProxyJump) to simplify connections.\n\nSSH also tunnels traffic: local forwarding (-L) reaches a remote service through the SSH connection, remote forwarding (-R) exposes a local service, and dynamic forwarding (-D) creates a SOCKS proxy. Harden servers by disabling password and root logins, restricting users, keeping OpenSSH patched, and monitoring authentication logs.",
    "`ssh -J bastion.example.com admin@10.0.2.15` connects to a private server through a bastion host in one command using ProxyJump.",
    "Protect private keys like passwords. A stolen unencrypted key gives immediate access to every server that trusts it."
  ),

  // ---------- Virtualization & Containers ----------
  'v-1': n(
    "A hypervisor, or virtual machine monitor (VMM), creates and runs virtual machines by abstracting the physical hardware. It divides CPU time, memory, storage, and network access among VMs, presents each with virtual hardware, and keeps them isolated so that a crash or compromise in one VM does not affect the others or the host.\n\nModern CPUs include hardware virtualisation extensions (Intel VT-x, AMD-V) that let hypervisors run guests efficiently. Hypervisors also enable snapshots, live migration of running VMs between hosts, resource over-commitment, and high-availability restarts. They are the foundation of data-centre consolidation and of public cloud infrastructure.",
    "One physical server with 64 cores and 512 GB of RAM runs 40 VMs for different teams, each believing it has its own dedicated computer.",
    "VM escape vulnerabilities, where code breaks out of a guest into the hypervisor, are critical. Patch hypervisors promptly."
  ),
  'v-2': n(
    "A Type 1, or bare-metal, hypervisor installs directly on the physical hardware with no general-purpose host operating system underneath. Because it controls the hardware directly, it offers the best performance, efficiency, and security isolation, and it is what data centres and cloud providers run.\n\nExamples include VMware ESXi, Microsoft Hyper-V (a thin hypervisor layer beneath Windows), Xen, KVM (built into the Linux kernel, so Linux effectively becomes the hypervisor), Proxmox VE (KVM-based), and AWS Nitro. Type 1 hypervisors are managed remotely through management consoles such as vCenter or System Center, and support clustering, live migration, and high availability.",
    "An enterprise runs VMware ESXi clusters; when a host fails, its VMs restart automatically on other hosts in the cluster.",
    "Type 1 = bare metal = production data centres and clouds. Type 2 = hosted on an OS = desktops and labs."
  ),
  'v-3': n(
    "A Type 2, or hosted, hypervisor runs as an application on top of an existing operating system such as Windows, macOS, or Linux. The host OS manages the hardware, and the hypervisor requests resources through it, which adds overhead and makes the VMs depend on the host OS's stability and security.\n\nExamples include Oracle VirtualBox, VMware Workstation and Fusion, and Parallels Desktop. Type 2 hypervisors are easy to install and ideal for developers, students, testers, and security labs, for example running Kali Linux and a vulnerable Windows VM on a laptop to practise safely. Snapshots let you revert a lab VM to a clean state in seconds.",
    "A student builds a home lab in VirtualBox with a Windows Server domain controller and a Windows 10 client on an isolated internal network.",
    "Keep malware-analysis and attack lab VMs on host-only or isolated networks so nothing escapes to your real LAN."
  ),
  'v-4': n(
    "A virtual machine is a complete software-defined computer: virtual CPUs, memory, disks (image files such as VMDK, VHDX, or qcow2), and network adapters, running its own full guest operating system and kernel. To the guest, it looks like real hardware. VMs are strongly isolated from each other by the hypervisor.\n\nBecause each VM carries a whole OS, VMs are relatively heavy: gigabytes of disk and RAM, and boot times of tens of seconds or more. In return, they can run any OS (Windows next to Linux on the same host), provide strong security isolation, and can be snapshotted, cloned, templated, backed up, and live-migrated. Cloud instances such as EC2 and Azure VMs are VMs.",
    "A company keeps a legacy Windows Server 2012 application running inside an isolated VM while modernising the rest of its infrastructure.",
    "Snapshots are not backups. They live on the same storage and degrade performance if kept for long."
  ),
  'term:Container': n(
    "A container packages an application together with its libraries, dependencies, and configuration, and runs it as an isolated process on a host that shares its operating system kernel with other containers. Isolation comes from Linux kernel features: namespaces give each container its own view of processes, network, file system mounts, and users, while cgroups limit its CPU and memory.\n\nBecause there is no guest OS, containers start in milliseconds to seconds, use megabytes rather than gigabytes, and pack densely onto hosts. The same image runs identically on a laptop, a test server, and production. The trade-off is weaker isolation than VMs: a kernel vulnerability or a misconfigured container (privileged mode, a mounted Docker socket, running as root) can let an attacker reach the host.",
    "A microservice runs as 30 identical containers across 5 hosts, and new replicas start in under two seconds during a traffic spike.",
    "Harden containers: run as non-root, drop capabilities, use read-only file systems, never run privileged containers in production, and scan images for vulnerabilities."
  ),
  'v-6': n(
    "Docker popularised containers by making them easy to build, share, and run. A Dockerfile describes how to build an image: a base image (FROM), commands to install software (RUN), files to copy (COPY), environment settings, and the startup command (CMD or ENTRYPOINT). docker build produces an image made of cached layers, docker push stores it in a registry, and docker run starts containers from it.\n\nDocker Compose defines multi-container applications (such as an app, a database, and a cache) in one YAML file for local development. Best practices include small base images (distroless, Alpine, or slim variants), multi-stage builds so compilers stay out of the final image, pinned versions, a non-root USER, no secrets baked into images, and regular vulnerability scanning.",
    "A developer runs `docker compose up` and gets the same app, Postgres, and Redis versions as production, which ends 'works on my machine' problems.",
    "Anyone with access to the Docker socket (/var/run/docker.sock) effectively has root on the host."
  ),
  'v-7': n(
    "Kubernetes is an open-source platform that orchestrates containers across a cluster of machines. You declare the desired state (for example 'run five replicas of this image, exposed on port 443') in YAML manifests, and Kubernetes continuously works to make reality match: scheduling Pods onto nodes, restarting failed containers, replacing Pods on failed nodes, and rolling out new versions gradually.\n\nKey objects include Pods, Deployments (manage replicas and rolling updates), Services (stable networking and load balancing), Ingress (HTTP routing), ConfigMaps and Secrets (configuration), and Namespaces (logical separation). The control plane (API server, scheduler, controller manager, etcd) manages the worker nodes, where the kubelet runs containers. Managed services include EKS, AKS, and GKE.",
    "A node crashes at 3 a.m.; Kubernetes automatically reschedules its Pods onto healthy nodes and the service stays up without anyone being paged.",
    "Kubernetes security basics: RBAC least privilege, network policies, Pod Security Standards, secrets encryption, and restricted API server access."
  ),
  'term:Pod': n(
    "A Pod is the smallest deployable unit in Kubernetes: a wrapper around one or more containers that are scheduled together on the same node, share a network namespace (one IP address, so they talk over localhost), and can share storage volumes. Most Pods run a single main container; multi-container Pods add helpers such as sidecars (log shippers, service-mesh proxies) or init containers that run setup steps first.\n\nPods are ephemeral and disposable: they are not repaired or patched in place, but replaced. When a Pod dies, a controller such as a Deployment or StatefulSet creates a new one, usually with a new IP address, which is why applications reach Pods through Services rather than Pod IPs. Resource requests and limits tell the scheduler how much CPU and memory each Pod needs.",
    "An app Pod runs the application container plus an Envoy sidecar that handles mTLS for all its network traffic.",
    "Set resource requests and limits on every Pod. Without them, one noisy Pod can starve its neighbours on the node."
  ),
  'v-9': n(
    "Virtual machines and containers solve different problems. A VM virtualises hardware and runs a full guest OS with its own kernel, giving strong isolation, the ability to run any OS, and compatibility with legacy software, at the cost of gigabytes of overhead and slower startup. A container virtualises the operating system: it shares the host kernel and isolates processes, giving tiny footprints, near-instant startup, high density, and consistent packaging, but weaker isolation.\n\nIn practice they are complementary: containers usually run inside VMs (cloud Kubernetes nodes are VMs), combining VM-level isolation between tenants with container efficiency within them. Sandboxed runtimes such as gVisor and Kata Containers, and micro-VMs such as Firecracker (used by AWS Lambda), blur the line by giving containers VM-like isolation.",
    "A SaaS provider isolates each customer on separate VMs (strong boundary) while running each customer's microservices as containers inside those VMs.",
    "Need to run Windows and Linux side by side, or require strong isolation between untrusted tenants? Use VMs. Need density and fast deploys? Use containers."
  ),
  'v-10': n(
    "A container image is a read-only, versioned template for creating containers. It consists of stacked file-system layers (a base OS layer, then dependencies, then application code) plus metadata such as the default command and environment variables. Layers are cached and shared between images, so builds and downloads are fast.\n\nImages are stored in registries (Docker Hub, Amazon ECR, Azure ACR, GitHub Container Registry, Harbor) and identified by a tag (app:1.4.2) or, immutably, by a content digest (app@sha256:…). Because images are immutable, the same artifact moves from test to production unchanged. Security practices include trusted base images, vulnerability scanning in CI, signing images (Sigstore/cosign), deploying by digest, and generating SBOMs.",
    "Production deploys pin `myapp@sha256:9f86d0…` so the exact tested image runs, even if someone pushes a new image with the same tag.",
    "Tags such as `latest` are mutable. Pin versions or digests to avoid surprise changes and supply-chain attacks."
  ),

  // ---------- Troubleshooting & Root Cause Analysis ----------
  'tr-1': n(
    "Effective troubleshooting is a disciplined, evidence-driven process. Start by clarifying the problem: what exactly is failing, for whom, since when, and what changed recently (a deploy, a config change, a patch, a certificate expiry, or traffic growth)? Reproduce it if you can, and gather facts from logs, metrics, and error messages before forming theories.\n\nThen form a hypothesis, test it, change only one thing at a time, and observe the result. Resist random fixes and 'restart and hope', which can destroy evidence and hide the real cause. Build a mental model of how the system should work, and compare it with what you observe. Write down what you check as you go, which helps teammates and the eventual postmortem.",
    "Before rebooting a failing server, the engineer captures memory usage, the process list, and recent logs, and finds a memory leak that a reboot would have hidden until the next outage.",
    "Ask 'what changed?' first. Most incidents follow a change."
  ),
  'tr-2': n(
    "Layered diagnostics use the OSI or TCP/IP model to narrow down where a fault lives. Bottom-up starts at Layer 1 (cables, link lights, interface errors), then Layer 2 (VLAN, MAC learning), Layer 3 (IP configuration, routing, ping), Layer 4 (is the port reachable? use nc, telnet, or Test-NetConnection), and finally the application (HTTP status codes, logs, certificates). Top-down starts with the application error and works downward. Divide-and-conquer starts in the middle, for example with a ping, and moves up or down depending on the result.\n\nEach layer has typical tools: interface counters, arp and ip neigh, ping, traceroute, ss or netstat, tcpdump or Wireshark, curl -v, and application logs and metrics. Localise the fault to one layer and component before trying to fix it.",
    "Ping to the server works (L3 fine), but `curl -v https://app` fails the TLS handshake, so the problem is an expired certificate at the application layer, not the network.",
    "When unsure, start in the middle with ping. It instantly tells you whether to look up or down the stack."
  ),
  'tr-3': n(
    "The 5 Whys is a simple root cause analysis technique from Toyota: state the problem, ask why it happened, then ask why again about that answer, repeating (often about five times) until you reach a cause that, if fixed, prevents recurrence. The goal is to move past symptoms and proximate triggers to process or design causes.\n\nFor example: the site went down (why?) because the database ran out of disk (why?) because logs filled the volume (why?) because log rotation was not configured on the new server (why?) because the build template lacked it (why?) because there is no standard server baseline. The fix is the baseline, not just deleting logs. For complex incidents there are often several contributing causes, so pair 5 Whys with fishbone (Ishikawa) diagrams or timelines.",
    "A failed deploy's 5 Whys ends at 'integration tests do not run on the release branch', which produces a pipeline fix rather than blaming the engineer.",
    "If a 'why' ends with a person's name, keep asking. Look for the system or process that allowed the mistake."
  ),
  'tr-4': n(
    "An error budget turns reliability targets into a shared decision tool. If a service's SLO is 99.9% availability per month, the error budget is the remaining 0.1%, about 43 minutes of downtime or the equivalent fraction of failed requests. While budget remains, teams can ship features and take risks; if it is burned quickly, the agreed policy slows or freezes risky changes and shifts effort to reliability work.\n\nBlameless culture is the human side: postmortems focus on how the system, tools, and processes allowed a failure, not on punishing individuals. When people feel safe, they report problems and near misses honestly, which surfaces the real causes. Punishing mistakes drives them underground and makes systems less reliable.",
    "After a bad release burns 80% of the monthly error budget, the team pauses feature launches for two weeks to add canary deployments and automated rollback.",
    "Blameless does not mean no accountability. People own the follow-up actions, but the analysis targets systems."
  ),
  'tr-5': n(
    "Logs, metrics, and traces are the three core observability signals. Metrics are numeric time series (request rate, error rate, latency percentiles, CPU, queue depth). They are cheap to store and ideal for dashboards and alerts, showing that something is wrong and when it started. Logs are timestamped records of discrete events with rich context, such as error messages, request details, and stack traces. They explain what happened.\n\nTraces follow a single request across services, showing each step (span) and its duration, which pinpoints where time is spent or where errors originate in distributed systems. Used together, they form a workflow: an alert on a metric, a trace that finds the slow or failing service, and logs from that service that explain the cause. Correlate them with shared request or trace IDs.",
    "A latency alert fires; traces show 90% of the time is spent in the payment service; its logs reveal connection-pool timeouts to the database.",
    "Structured logs (JSON with consistent fields such as trace_id) make correlation across signals fast."
  ),
  'tr-6': n(
    "Many incidents fall into recurring failure modes. Resource exhaustion covers CPU saturation, memory leaks and OOM kills, full disks (often logs), exhausted file descriptors, connection pools, NAT ports, or API rate limits. Configuration errors include wrong environment variables, typos, expired certificates or secrets, stale DNS, and mismatched versions between environments.\n\nDependency failures include slow or failing downstream services, timeouts, and retry storms, where many clients retry simultaneously and overload a recovering service, triggering cascading failures across the system. Knowing these patterns speeds up diagnosis, and each has standard defences: capacity alerts, config validation, certificate expiry monitoring, timeouts, exponential backoff with jitter, circuit breakers, and bulkheads.",
    "A brief database blip causes every app server to retry immediately and repeatedly; the retry storm keeps the database overloaded long after the blip ended.",
    "Always set timeouts on network calls, and retry with exponential backoff and jitter. Never retry in tight loops."
  ),
  'tr-7': n(
    "During an incident, restoring service comes before finding the root cause. The fastest safe path is often rolling back to the last known good version or configuration, which is why every deployment should have a tested, quick rollback. Mitigations buy time when rollback is not possible: disabling a feature with a feature flag, shedding load or rate limiting, failing over to another region, scaling out, opening circuit breakers to failing dependencies, or serving degraded but functional responses.\n\nOnce users are protected, investigate the root cause calmly, with the evidence preserved. Communicate status regularly to stakeholders throughout. Afterwards, fix the underlying issue properly and hold a postmortem.",
    "A new release causes checkout errors; the on-call engineer rolls back within five minutes, then the team debugs the release in staging the next morning.",
    "Mitigate first, then investigate. Make rollback a one-click, routinely exercised operation."
  ),
  'tr-8': n(
    "A runbook documents how to handle a specific known situation: what the alert means, the dashboards and logs to check, diagnostic commands, remediation steps, escalation contacts, and how to verify recovery. A playbook covers a broader scenario, such as a ransomware response or a major outage, coordinating multiple people and decisions.\n\nRunbooks reduce cognitive load under pressure, speed up response, and let less experienced on-call engineers act safely. Link each alert directly to its runbook, keep runbooks in version control, test them in game days, and update them after every incident. Frequently used manual runbooks are prime candidates for automation.",
    "A 'disk 90% full' alert links to a runbook listing which directories to check, safe clean-up commands, and when to expand the volume instead.",
    "If an alert has no runbook, either write one or ask whether the alert is actionable at all."
  ),
  'tr-9': n(
    "Reproducing a problem reliably is often the turning point in solving it. Try to recreate the failure in a controlled environment such as staging, a local container, or a test account, using the same inputs, data, configuration, and versions. Then shrink it: remove components, inputs, and steps until you have the minimal case that still fails.\n\nBinary search helps. Revert half the recent changes (git bisect automates this for code), disable half the features, or test with half the data, and see which half contains the trigger. A minimal reproduction clearly separates data problems from configuration, code, and dependency problems, makes the fix testable, and can become a regression test so the bug never returns silently.",
    "`git bisect` pinpoints the one commit, out of 200, that introduced a memory leak by testing a handful of builds.",
    "Turn every reproduced bug into an automated test before fixing it, so the fix is proven."
  ),
  'tr-10': n(
    "Organisations get more reliable only if they learn from each incident. Capture knowledge in blameless postmortems (timeline, impact, root and contributing causes, what went well, and action items with owners and deadlines), commit messages and pull requests that explain why a fix works, updated runbooks and diagrams, and searchable knowledge-base articles.\n\nShare lessons broadly through incident reviews, internal talks, and training, so other teams avoid the same failure. Track postmortem action items to completion; unfinished action items are how the same incident happens twice. Good documentation also shortens onboarding and reduces dependence on a few key people.",
    "A monthly incident review walks through the top three postmortems, and another team discovers it has the same certificate-expiry risk and fixes it proactively.",
    "An incident is not closed until its action items are done and the runbooks are updated."
  ),
};
