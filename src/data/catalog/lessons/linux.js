// Reading content for the Linux Administration course, keyed by lesson (deck) id.
// Strings support `inline code` only. Every section is aligned with the lesson's questions in
// src/data/academy/linux.js, so reading first prepares you for the practice.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'lx-cli': {
    overview: [
      'The command line is the native interface of every Linux server, container, and cloud VM you will ever touch. Graphical tools come and go; the shell is always there, scriptable and identical everywhere. This lesson builds the muscle memory: knowing where you are, moving around, creating and destroying files, finding things, and getting help.',
      'You will learn the ten commands that cover ninety percent of daily work — `pwd`, `ls`, `cd`, `cp`, `mv`, `rm`, `mkdir`, `touch`, `find`, and `man` — plus the shell habits (tab completion, history, `sudo !!`) that separate beginners from operators.',
    ],
    learn: [
      {
        heading: 'Where you are and what is around you',
        body: [
          '`pwd` prints your working directory as an absolute path, starting at `/` (the root). An absolute path like `/etc/ssh/sshd_config` works from anywhere; a relative path like `../logs` or `docs/report.txt` is interpreted from where you currently stand.',
          '`ls` lists directory contents. The flags you will use daily: `-l` for the long format (permissions, owner, size, date), `-a` to show hidden dotfiles, and `-h` for human-readable sizes. `cd ~` (or bare `cd`) takes you home; `cd -` jumps back to the previous directory.',
        ],
      },
      {
        heading: 'Creating, moving, and destroying',
        body: [
          '`mkdir -p projects/2026/q1` creates the whole chain at once, `touch file` creates an empty file or updates timestamps, `cp -r` copies trees, and `mv` both moves and renames. `rm -rf` deletes recursively without asking and without a trash can — the most feared command for a reason: double-check the path before pressing enter.',
          '`find /var -name "app.log"` walks the filesystem looking for a name. Quote the pattern so the shell does not expand it first. When you forget a flag, `man <command>` opens the built-in manual (q quits, / searches); for quick examples, `tldr <command>` is faster to skim.',
        ],
      },
      {
        heading: 'Finding files and getting help',
        body: [
          'Two commands answer most \'where is it?\' questions. `find /var/log -name \'*.log\' -mtime -1` searches a directory tree by name, type, size or modification time and can act on what it finds (`-exec`, or `-delete` with care). `locate` searches a prebuilt index and is much faster, but only knows about files that existed at the last `updatedb` run. `which python3` shows which executable your shell will actually run.',
          'When you meet an unfamiliar command, the documentation is already on the system. `man ls` opens the manual page, `ls --help` prints a short summary, and `apropos compress` searches manual page descriptions for a keyword. Tab completion saves typing and catches typos: press Tab once to complete a path, twice to list the options. `history` and Ctrl+R let you find and rerun earlier commands instead of retyping them.',
        ],
      },
    ],
    examples: [
      {
        title: 'Daily navigation',
        code: code(
          'pwd                      # /home/ana — where am I?',
          'ls -la                   # details + hidden files',
          'cd /var/log && ls -lh   # jump and inspect',
          'cd -                     # back to where I was',
        ),
        explanation: 'This four-command loop covers most filesystem exploration you will ever do.',
      },
      {
        title: 'The classic permission-denied recovery',
        code: code(
          'mkdir /opt/app           # permission denied',
          'sudo !!                  # re-run the last command with sudo',
        ),
        explanation: '`!!` expands to the previous command — the fastest fix for a forgotten sudo.',
      },
    ],
    cheatSheet: [
      ['pwd', 'Print working directory (absolute path)'],
      ['ls -la', 'Long listing including hidden dotfiles'],
      ['cd ~ / cd -', 'Go home / jump to previous directory'],
      ['mkdir -p a/b/c', 'Create nested directories in one step'],
      ['cp -r / mv', 'Copy trees / move or rename'],
      ['rm -rf dir/', 'Delete recursively, no prompt, no undo'],
      ['find /var -name "x"', 'Search the filesystem by name'],
      ['man <cmd> / tldr <cmd>', 'Full manual / quick examples'],
      ['Tab', 'Autocomplete commands, paths, options'],
      ['sudo !!', 'Re-run the previous command with sudo'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'GNU Bash manual', url: 'https://www.gnu.org/software/bash/manual/bash.html' },
      { title: 'GNU Coreutils manual', url: 'https://www.gnu.org/software/coreutils/manual/html_node/index.html' },
      { title: 'Linux man-pages project', url: 'https://man7.org/linux/man-pages/' },
    ],
  },
  'lx-perms': {
    overview: [
      'Linux security starts with three letters: r, w, x. Every file and directory carries nine permission bits — read, write, execute for the owner, the group, and everyone else — and most "permission denied" mysteries (and most privilege-escalation findings) trace back to them.',
      'This lesson teaches you to read `ls -l` output fluently, speak both chmod dialects (numeric like 755 and symbolic like `u+x`), change ownership with chown, predict new-file permissions with umask, and understand the three special bits: SUID, SGID, and the sticky bit.',
    ],
    learn: [
      {
        heading: 'Reading and setting the nine bits',
        body: [
          'In `-rwxr-xr--`, the leading `-` is the file type, then come owner (rwx), group (r-x), others (r--). Numeric mode adds the values r=4, w=2, x=1 per group: 755 is rwxr-xr-x, 644 is rw-r--r--. Symbolic mode is more surgical: `chmod u+x script.sh` adds execute for the owner only; `chmod go-w file` removes write for group and others.',
          '`chown ana:devs file` sets owner and group (root/sudo only). New files get permissions from a base (666 for files, 777 for directories) minus the umask: with the common umask 022, new files are 644 and new directories 755.',
        ],
      },
      {
        heading: 'The special bits: SUID, SGID, sticky',
        body: [
          'SUID (4) on an executable runs it with the file owner\'s privileges — `/usr/bin/passwd` is owned by root so anyone can change their own password safely. It shows as an `s`: `-rwsr-xr-x`. SGID (2) on a directory makes new files inherit the directory\'s group, perfect for shared project folders.',
          'The sticky bit (1) on a directory like /tmp means anyone can create files but only the owner (or root) can delete them — shown as `t` in `drwxrwxrwt`. World-writable SUID binaries are a classic audit finding: find them with `find / -perm -4000 2>/dev/null`.',
        ],
      },
      {
        heading: 'Access control lists and troubleshooting',
        body: [
          'The nine permission bits allow one owner, one group and everyone else. When you need more, for example giving a second team read access without changing the group, POSIX ACLs add entries per user or group: `setfacl -m u:ana:r report.txt` grants Ana read access, and `getfacl report.txt` shows the full list. A `+` at the end of the mode in `ls -l` output tells you a file has an ACL.',
          'When access is denied, check every directory in the path, not just the file: a user needs execute (x) permission on each parent directory to reach a file inside it. `namei -l /srv/app/config.yml` lists the owner and mode of every component in one go. Also remember that SELinux or AppArmor can deny access even when the permission bits allow it; `ls -Z` shows SELinux labels and the audit log records the denials.',
        ],
      },
    ],
    examples: [
      {
        title: 'Locking down a deploy key script',
        code: code(
          'chmod 740 deploy.sh      # rwxr----- : owner full, group read, others nothing',
          'chown ana:devs deploy.sh',
          'ls -l deploy.sh          # -rwxr----- 1 ana devs ...',
        ),
        explanation: 'Numeric for the broad strokes, then verify with ls -l.',
      },
      {
        title: 'A shared project directory',
        code: code(
          'mkdir /srv/web && chgrp devs /srv/web',
          'chmod 2770 /srv/web      # rwxrwx--- + SGID: new files inherit group devs',
        ),
        explanation: 'SGID keeps group ownership consistent no matter who creates the file.',
      },
    ],
    cheatSheet: [
      ['r=4, w=2, x=1', 'Add per group to get numeric mode (755, 644, 600)'],
      ['chmod u+x / go-w', 'Symbolic: add execute for owner / remove write for group+others'],
      ['chown user:group file', 'Change owner and group (needs root)'],
      ['umask 022 → 644/755', 'New files 666-umask, new dirs 777-umask'],
      ['SUID (4, s)', 'Executable runs with the file owner\'s privileges'],
      ['SGID (2, s)', 'On dirs: new files inherit the directory\'s group'],
      ['Sticky bit (1, t)', 'On dirs: only owners can delete their files'],
      ['find / -perm -4000', 'Hunt SUID binaries during an audit'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'GNU Coreutils — File permissions', url: 'https://www.gnu.org/software/coreutils/manual/html_node/File-permissions.html' },
      { title: 'chmod(1) — Linux man page', url: 'https://man7.org/linux/man-pages/man1/chmod.1.html' },
      { title: 'Arch Wiki — File permissions and attributes', url: 'https://wiki.archlinux.org/title/File_permissions_and_attributes' },
    ],
  },
  'lx-users': {
    overview: [
      'Every process on a Linux box runs as some user, and every user is a line in /etc/passwd. Identity is the foundation that permissions, sudo, and SSH all build on — and misconfigured accounts are among the most common findings in real audits.',
      'This lesson covers the account files (/etc/passwd vs /etc/shadow), creating and modifying users, groups, the sudo mechanism and its visudo safety net, and the difference between su and sudo — the identity layer behind CISSP Domain 5.',
    ],
    learn: [
      {
        heading: 'The account files',
        body: [
          '/etc/passwd holds one line per user: name, UID, GID, home, shell. Password hashes have not lived there for decades — they are in /etc/shadow, readable only by root, alongside ageing policy (expiry, warning days, lockout). UID 0 is root, whatever the name on the line.',
          'Create accounts with `useradd -m ana` (-m builds the home directory), set the secret with `passwd ana`, inspect with `id ana`. Modify with usermod: `-aG` appends groups (never omit -a, or you replace all supplementary groups), `-L` locks the account without deleting anything.',
        ],
      },
      {
        heading: 'sudo: privilege with a paper trail',
        body: [
          '`sudo` runs one command with elevated privileges under rules in /etc/sudoers. It asks for your password (not root\'s) and logs the invocation — that audit trail is why enterprises prefer it over shared root passwords. Always edit sudoers with `visudo`: it validates syntax before saving, because one typo can lock every admin out.',
          '`su -` switches to root (or another user) and needs the target\'s password; `sudo -i` gets you a root shell with your own credentials. Prefer sudo\'s fine-grained rules ("may restart nginx") over handing out full root wherever you can.',
        ],
      },
      {
        heading: 'Managing accounts safely',
        body: [
          'Day-to-day account work uses a few commands. `usermod -aG docker ana` adds Ana to a supplementary group; without `-a` the `-G` option replaces all her groups, a common mistake that removes access. `passwd -l ana` locks the password, `chage -l ana` shows password ageing, and `userdel -r ana` removes the account and its home directory. `id ana` and `groups ana` show what she belongs to, and changes to groups only apply at her next login.',
          'Edit sudo rules with `visudo`, never directly: it checks the syntax before saving, so a typo cannot lock everyone out of sudo. Prefer dropping files into `/etc/sudoers.d/` and granting specific commands rather than full root, for example `%webops ALL=(root) /usr/bin/systemctl restart nginx`. Review `/var/log/auth.log` or `journalctl _COMM=sudo` to see who used sudo and for what.',
        ],
      },
    ],
    examples: [
      {
        title: 'Onboarding a deploy user',
        code: code(
          'sudo useradd -m -G devs deploy',
          'sudo passwd deploy',
          'id deploy                 # uid=1002(deploy) gid=1002(deploy) groups=1002(deploy),1001(devs)',
        ),
        explanation: 'Create, set a secret, verify — the standard account provisioning flow.',
      },
      {
        title: 'Least-privilege sudo rule',
        code: code(
          '# in sudoers via visudo:',
          'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart webapp',
        ),
        explanation: 'This user can restart exactly one service — not run arbitrary commands as root.',
      },
    ],
    cheatSheet: [
      ['/etc/passwd', 'Account info (world-readable, no hashes)'],
      ['/etc/shadow', 'Password hashes + ageing (root only)'],
      ['UID 0', 'Superuser, regardless of the username'],
      ['useradd -m ana', 'Create user with home directory'],
      ['usermod -aG grp user', '-a appends groups (never omit it)'],
      ['usermod -L user', 'Lock account without deleting'],
      ['visudo', 'Edit sudoers with syntax validation'],
      ['su - vs sudo -i', 'Needs root password vs your password + logging'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'useradd(8) — Linux man page', url: 'https://man7.org/linux/man-pages/man8/useradd.8.html' },
      { title: 'passwd(5) — Linux man page', url: 'https://man7.org/linux/man-pages/man5/passwd.5.html' },
      { title: 'sudo manual — sudo.ws', url: 'https://www.sudo.ws/docs/man/sudo.man/' },
    ],
  },
  'lx-text': {
    overview: [
      'On Linux, everything interesting is text: logs, configs, command output. The operators who find answers fastest are the ones fluent in pipelines — chaining small single-purpose tools with pipes and redirection until the data confesses.',
      'This lesson covers the pipeline toolkit: grep for searching, `>`/`>>`/`2>` for redirection, cut/sort/uniq/wc for shaping, and sed/awk for the jobs the small tools cannot do. These are the exact skills SOC analysts use on logs every day.',
    ],
    learn: [
      {
        heading: 'Pipes and redirection',
        body: [
          'The pipe `|` connects stdout to stdin: `dmesg | grep -i usb` searches kernel messages. `>` overwrites a file, `>>` appends — both create it if missing. Every process has three streams: stdin (0), stdout (1), stderr (2), so `2>` captures errors and `command > /dev/null 2>&1` silences everything.',
          'Chain freely: `grep "Failed" /var/log/auth.log | cut -d" " -f11 | sort | uniq -c | sort -rn` extracts attacker IPs from SSH logs, counts them, and ranks them. Read it right to left when debugging: each stage transforms the stream.',
        ],
      },
      {
        heading: 'The text toolkit',
        body: [
          '`grep -i` searches case-insensitively, `-r` recurses, `-c` counts matching lines. `cut -d: -f1` takes fields by delimiter; `sort | uniq -c` counts duplicates (uniq needs sorted input); `wc -l` counts lines. `head`/`tail` preview ends; `tail -f` follows a live log.',
          'For the rest there is sed and awk. `sed -i \'s/foo/bar/g\' file` edits in place (s = substitute, g = global). `awk -F: \'{print $1}\' /etc/passwd` prints the first field of each line — $0 is the whole line, $1/$2 are fields, -F sets the delimiter.',
        ],
      },
      {
        heading: 'A worked pipeline: top talkers in a web log',
        body: [
          'Suppose you need the ten IP addresses that made the most requests to a web server. Each line of an nginx or Apache access log starts with the client IP, so `awk \'{print $1}\' access.log` extracts it. `sort` groups identical addresses together, `uniq -c` counts each group, `sort -rn` orders by count, highest first, and `head -10` keeps the top ten. Joined with pipes: `awk \'{print $1}\' access.log | sort | uniq -c | sort -rn | head -10`.',
          'The same pattern answers many questions by changing the first step. `grep \' 404 \' access.log | awk \'{print $7}\' | sort | uniq -c | sort -rn | head` lists the most requested missing pages. For anything larger or repeated, `awk` alone can count with an associative array, and `sed -n \'/10:00/,/10:05/p\'` extracts a time window. Build pipelines one stage at a time and check the output at each step.',
        ],
      },
    ],
    examples: [
      {
        title: 'Top SSH brute-force sources',
        code: code(
          'grep "Failed password" /var/log/auth.log \\',
          '  | awk \'{print $(NF-3)}\' \\',
          '  | sort | uniq -c | sort -rn | head',
        ),
        explanation: 'Filter → extract the IP field → count → rank. The core SOC log-triage pattern.',
      },
      {
        title: 'In-place config edit',
        code: code(
          'sed -i \'s/^#*PasswordAuthentication.*/PasswordAuthentication no/\' /etc/ssh/sshd_config',
          'grep -i passwordauthentication /etc/ssh/sshd_config   # verify',
        ),
        explanation: 'sed rewrites the line whether or not it was commented; grep confirms the result.',
      },
    ],
    cheatSheet: [
      ['cmd1 | cmd2', 'Pipe stdout into the next command\'s stdin'],
      ['> (overwrite) / >> (append)', 'Redirect stdout to a file'],
      ['2> / 2>&1', 'Redirect stderr / merge stderr into stdout'],
      ['grep -ri "pat" dir/', 'Recursive case-insensitive search'],
      ['cut -d: -f1', 'First :-delimited field'],
      ['sort | uniq -c | sort -rn', 'Count and rank duplicates'],
      ['sed -i \'s/a/b/g\' f', 'In-place global replace'],
      ['awk -F: \'{print $1}\'', 'Print first field ($0 = whole line)'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'grep(1) — Linux manual page', url: 'https://man7.org/linux/man-pages/man1/grep.1.html' },
      { title: 'gawk(1) — Linux manual page', url: 'https://man7.org/linux/man-pages/man1/gawk.1.html' },
      { title: 'The GNU Awk User\'s Guide', url: 'https://www.gnu.org/software/gawk/manual/html_node/index.html' },
    ],
  },
  'lx-packages': {
    overview: [
      'Software on Linux comes from repositories — signed, versioned collections that resolve dependencies for you. The package manager is the difference between a system you can patch in one command and a snowflake server nobody dares touch.',
      'This lesson covers both major families (apt/dpkg on Debian/Ubuntu, dnf/rpm on RHEL/Fedora): installing, querying, cleaning up, where repositories are defined, and why the repo should be your first and usually only source of software.',
    ],
    learn: [
      {
        heading: 'The two families',
        body: [
          'Debian/Ubuntu: `apt` is the friendly frontend, `dpkg` the low-level tool underneath. RHEL/Fedora: `dnf` frontend, `rpm` underneath. The verbs rhyme: `apt install nginx` / `dnf install nginx`, `apt remove` / `dnf remove`.',
          '`apt update` refreshes the package index (the catalogue of what is available); `apt upgrade` actually installs newer versions. Running upgrade without update works from a stale list — always update first.',
        ],
      },
      {
        heading: 'Query, clean, and stay safe',
        body: [
          'Interrogate the system: `dpkg -l | grep ssh` lists installed packages matching ssh; `dpkg -S /usr/bin/curl` (or `rpm -qf`) tells you which package owns a file — invaluable when a binary misbehaves. `apt autoremove` drops orphaned dependencies.',
          'Prefer the distro repository over a downloaded .deb/.rpm: repo packages are signed, dependency-resolved, and — critically — get security updates automatically. A manually installed package is a package you must remember to patch forever.',
        ],
      },
      {
        heading: 'Repositories, signing keys and pinning',
        body: [
          'Packages come from repositories listed in `/etc/apt/sources.list.d/` on Debian and Ubuntu, or `/etc/yum.repos.d/` on RHEL and Fedora. Each repository signs its metadata, and the package manager refuses unsigned or wrongly signed packages; that check is what stops a tampered mirror from installing malware. Add third-party repositories only from vendors you trust, with their signing key stored in `/etc/apt/keyrings/` and referenced by `signed-by`, rather than trusting the key for every repository.',
          'On servers, control when packages change. `apt-mark hold nginx` or `dnf versionlock` keeps a package at its current version until you are ready to test an upgrade. Unattended security updates (`unattended-upgrades` or `dnf-automatic`) are a good default for security patches, while larger upgrades go through a test environment first. Universal formats such as Snap and Flatpak bundle their own dependencies and update separately from the system package manager.',
        ],
      },
    ],
    examples: [
      {
        title: 'Install and verify',
        code: code(
          'sudo apt update && sudo apt install -y nginx',
          'dpkg -l | grep nginx        # confirm installed version',
          'dpkg -S /usr/sbin/nginx     # which package owns the binary',
        ),
        explanation: 'Update the index, install, then verify what you actually got.',
      },
    ],
    cheatSheet: [
      ['apt (Debian/Ubuntu) / dnf (RHEL/Fedora)', 'High-level: install, remove, upgrade'],
      ['dpkg / rpm', 'Low-level: query and manipulate single packages'],
      ['apt update → apt upgrade', 'Refresh index, then install newer versions'],
      ['dpkg -l | grep x / rpm -qa | grep x', 'List installed packages matching x'],
      ['dpkg -S path / rpm -qf path', 'Which package owns a file'],
      ['apt autoremove', 'Remove orphaned auto-installed dependencies'],
      ['/etc/apt/sources.list[.d]', 'Where apt repositories are defined'],
      ['Prefer the repo', 'Signed, dependency-resolved, auto-updated'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Debian Reference — Package management', url: 'https://www.debian.org/doc/manuals/debian-reference/ch02.en.html' },
      { title: 'Package management — Ubuntu Server documentation', url: 'https://ubuntu.com/server/docs/how-to/software/package-management/' },
      { title: 'DNF Documentation', url: 'https://dnf.readthedocs.io/en/latest/' },
    ],
  },
  'lx-systemd': {
    overview: [
      'systemd is PID 1 on virtually every modern Linux distribution: it boots the system, supervises services, and collects their logs. Whether you are deploying an app or debugging why one will not start, systemctl and journalctl are the two commands that matter most.',
      'This lesson covers starting, stopping, enabling, and inspecting services, reading logs with journalctl, where unit files live, what replaced runlevels, and systemd timers — the modern answer to cron.',
    ],
    learn: [
      {
        heading: 'Services: now vs at boot',
        body: [
          '`systemctl status nginx` shows everything: active state, whether it starts at boot, recent log lines, and the main PID. `start`/`stop`/`restart` act now; `enable`/`disable` control boot behaviour. `systemctl enable --now nginx` does both in one move.',
          'Custom unit files go in /etc/systemd/system/; the distro ships its own in /lib/systemd/system — override with drop-in files rather than editing those. After any edit, `systemctl daemon-reload` makes systemd re-read the definitions.',
        ],
      },
      {
        heading: 'Logs and scheduling',
        body: [
          'journalctl is the unified log reader: `journalctl -u nginx -f` follows one service live, `--since "1 hour ago"` bounds the window, `-p err` filters to errors and above. `systemctl --failed` lists everything currently in a failed state — the first command in any "the app is down" drill.',
          'systemd timers are cron\'s successor: a .timer unit triggers a .service unit on a schedule, with journald logging and dependency handling built in. The old SysV runlevels are now targets — `multi-user.target` and `graphical.target` — switched with `systemctl isolate`.',
        ],
      },
      {
        heading: 'Writing your own service unit',
        body: [
          'To run an application as a managed service, create a unit file such as `/etc/systemd/system/myapp.service`. The `[Unit]` section holds a description and ordering (`After=network-online.target`); `[Service]` sets `ExecStart=/opt/myapp/bin/server`, `User=myapp`, and `Restart=on-failure`; `[Install]` sets `WantedBy=multi-user.target` so `systemctl enable` starts it at boot. Run `systemctl daemon-reload` after creating or editing a unit.',
          'systemd can also sandbox the service with a few lines: `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes` and `ReadWritePaths=/var/lib/myapp`. `systemd-analyze security myapp` scores how exposed a unit is and lists the options that would tighten it. Override a packaged unit with `systemctl edit nginx`, which writes a drop-in file instead of changing the vendor\'s original.',
        ],
      },
    ],
    examples: [
      {
        title: 'Why will the app not start?',
        code: code(
          'systemctl --failed              # what is broken?',
          'systemctl status webapp         # active state + recent logs',
          'journalctl -u webapp --since "15 min ago" -p err',
        ),
        explanation: 'Failed units → unit status → filtered logs: the standard triage sequence.',
      },
    ],
    cheatSheet: [
      ['systemctl status <svc>', 'Active/enabled state + recent logs'],
      ['start vs enable', 'Run now vs start at boot (use --now for both)'],
      ['journalctl -u <svc> -f', 'Follow a service\'s logs live'],
      ['journalctl --since "1h ago" -p err', 'Errors from the last hour'],
      ['systemctl --failed', 'List failed units'],
      ['/etc/systemd/system/', 'Your unit files (never edit /lib directly)'],
      ['systemctl daemon-reload', 'Re-read unit files after edits'],
      ['systemd timer', '.timer triggers .service — cron with logging'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'systemd — freedesktop.org manual', url: 'https://www.freedesktop.org/software/systemd/man/latest/systemd.html' },
      { title: 'systemctl — freedesktop.org manual', url: 'https://www.freedesktop.org/software/systemd/man/latest/systemctl.html' },
      { title: 'journalctl — freedesktop.org manual', url: 'https://www.freedesktop.org/software/systemd/man/latest/journalctl.html' },
    ],
  },
  'lx-network': {
    overview: [
      'When the app cannot reach the database, the network tools tell you whether it is DNS, routing, the firewall, or the service itself. Linux replaced the old net-tools long ago — this lesson teaches the modern iproute2 toolkit and the SSH skills every remote admin uses daily.',
      'You will learn `ip` and `ss` (the replacements for ifconfig and netstat), reading the routing table, curl for HTTP debugging, scp for file transfer, the files behind name resolution, and how to test a port properly.',
    ],
    learn: [
      {
        heading: 'The modern toolkit: ip and ss',
        body: [
          '`ip addr` shows interfaces and addresses (`ip -brief addr` for the compact view); `ip route` shows the routing table, and `ip route get 8.8.8.8` reveals exactly which interface and source IP the kernel would use. `ss -tulpn` lists listening TCP/UDP sockets with process names — the fast, modern netstat.',
          'For HTTP, `curl -I https://example.com` sends a HEAD request and prints just the headers: status codes, redirects, server banners. `ping -c 4 host` sends four ICMP echoes (plain ping runs forever on Linux). Remember: ping cannot test ports — ICMP has no port concept.',
        ],
      },
      {
        heading: 'SSH, copying, and name resolution',
        body: [
          '`ssh -i ~/.ssh/deploy.pem user@host` connects with a specific key — the basis of automation and jump hosts. `scp file.txt user@host:/tmp/` copies over the same encrypted channel (`-r` for directories; rsync for repeated syncs).',
          'Name resolution checks /etc/hosts before DNS (order in /etc/nsswitch.conf); /etc/resolv.conf says which DNS servers to query. To test a TCP port, `nc -vz host 443` — open vs refused vs timeout tells you whether the service, the firewall, or the route is at fault.',
        ],
      },
      {
        heading: 'Troubleshooting a connection step by step',
        body: [
          'When a service cannot be reached, check each layer in turn. `ip addr` and `ip route` confirm the host has an address and a default route. `ping` to the gateway tests the local network, and `ping 1.1.1.1` tests the path out. `dig example.com` (or `resolvectl query`) tests name resolution separately from connectivity. If names fail but IP addresses work, the fault is DNS.',
          'Then test the port itself. On the server, `ss -tlnp` shows whether the service is listening and on which address; a service bound to 127.0.0.1 cannot be reached from other machines. From the client, `nc -zv server 443` or `curl -v https://server` tests the TCP connection and shows TLS errors. If the service listens but the client cannot connect, check the host firewall (`ufw status`, `nft list ruleset`) and any network firewall between them. `tcpdump -i eth0 port 443` shows whether packets arrive at all.',
        ],
      },
    ],
    examples: [
      {
        title: 'Is it DNS, the route, or the service?',
        code: code(
          'getent hosts db.internal      # does the name resolve?',
          'ip route get 10.0.5.8         # which interface/source would we use?',
          'nc -vz 10.0.5.8 5432          # is the postgres port reachable?',
          'ss -tulpn | grep 5432         # (on the server) is anything listening?',
        ),
        explanation: 'Resolve → route → connect → listen: isolate the layer before you guess.',
      },
    ],
    cheatSheet: [
      ['ip addr / ip route', 'Interfaces+addresses / routing table (replaces ifconfig/route)'],
      ['ss -tulpn', 'Listening sockets with processes (replaces netstat)'],
      ['curl -I <url>', 'HTTP headers only (HEAD request)'],
      ['ping -c 4 host', 'Four ICMP echoes, then stop'],
      ['ssh -i key user@host', 'Connect with a specific private key'],
      ['scp [-r] src user@host:dst', 'Copy over SSH'],
      ['/etc/hosts → DNS', 'Resolution order (see nsswitch.conf)'],
      ['nc -vz host port', 'Test a TCP port (ping cannot do this)'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'ip(8) — Linux man page', url: 'https://man7.org/linux/man-pages/man8/ip.8.html' },
      { title: 'ss(8) — Linux man page', url: 'https://man7.org/linux/man-pages/man8/ss.8.html' },
      { title: 'Linux kernel networking documentation', url: 'https://www.kernel.org/doc/html/latest/networking/' },
    ],
  },
  'lx-bash': {
    overview: [
      'If you do it twice, script it. Bash turns your hard-won command-line knowledge into repeatable automation: backups, log analysis, provisioning, health checks. It is also the first language of incident response — the one you will reach for at 3am.',
      'This lesson covers script anatomy (shebang, permissions), variables and arguments, conditionals and loops, functions, exit codes, and the safety habits — quoting, `set -euo pipefail` — that separate scripts you trust from scripts that delete the wrong directory.',
    ],
    learn: [
      {
        heading: 'Anatomy of a trustworthy script',
        body: [
          'Start with `#!/usr/bin/env bash` (the shebang picks the interpreter portably), make it executable with `chmod +x`, and run it as `./script.sh` — the current directory is deliberately not in PATH. `$?` holds the last command\'s exit code (0 = success); `$@`/`$#` are the arguments and their count.',
          'The safety line `set -euo pipefail` belongs at the top of any script that matters: exit on any error, treat unset variables as errors, and make pipelines fail when any stage fails. Quote every expansion — `"$file"`, never `$file` — or a filename with a space becomes two arguments.',
        ],
      },
      {
        heading: 'Logic: conditionals, loops, functions',
        body: [
          'Test with `[ ... ]`: `-f` for files, `-d` for directories, `-z` for empty strings. `for f in *.log; do ...; done` iterates globs; the safe line-by-line reader is `while IFS= read -r line; do ...; done < file` — never `for line in $(cat file)`, which mangles whitespace.',
          'Functions group logic: `backup() { ...; }`. A function "returns" an exit status via `return N` (0-255); real data goes on stdout and is captured with `result=$(backup)`. `return "text"` does not do what you hope.',
        ],
      },
      {
        heading: 'Inputs, quoting and checking your scripts',
        body: [
          'Most broken scripts fail on quoting. Always quote variables, `"$file"` rather than `$file`, so names containing spaces or wildcards are passed as one argument. Use `"$@"` to pass all of a script\'s arguments on unchanged. Read input with `read -r name`, and check required arguments early: `[[ $# -eq 1 ]] || { echo "usage: $0 <dir>" >&2; exit 2; }`.',
          'Clean up after yourself with a trap: `tmp=$(mktemp); trap \'rm -f "$tmp"\' EXIT` deletes the temporary file however the script ends. Before running a script on a server, check it with ShellCheck (`shellcheck deploy.sh`), which catches unquoted variables, unused variables and common logic errors. Running with `bash -x script.sh` prints each command as it executes, which is the fastest way to see where a script goes wrong.',
        ],
      },
    ],
    examples: [
      {
        title: 'Nightly log backup',
        code: code(
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          'src="/var/log/app"',
          'dst="/backup/app-$(date +%F).tar.gz"',
          'tar -czf "$dst" "$src"',
          'echo "Backed up to $dst"',
        ),
        explanation: 'Shebang, strict mode, quoted variables, date-stamped output — the template for reliable automation.',
      },
      {
        title: 'Check every host in a list',
        code: code(
          '#!/usr/bin/env bash',
          'while IFS= read -r host; do',
          '  if ping -c 1 -W 2 "$host" > /dev/null 2>&1; then',
          '    echo "$host is up"',
          '  else',
          '    echo "$host is DOWN"',
          '  fi',
          'done < hosts.txt',
        ),
        explanation: 'Line-by-line reading, a conditional on the exit code, and clear output per host.',
      },
    ],
    cheatSheet: [
      ['#!/usr/bin/env bash', 'Shebang: portable interpreter selection'],
      ['chmod +x + ./script.sh', 'Make executable; . not in PATH by default'],
      ['$? / $@ / $#', 'Last exit code / arguments / argument count'],
      ['set -euo pipefail', 'Fail fast: errors, unset vars, pipeline failures'],
      ['"$var" (always quote)', 'Prevents word splitting and globbing'],
      ['[ -f / -d / -z ]', 'Test file / directory / empty string'],
      ['while IFS= read -r line', 'Safe line-by-line file reading'],
      ['return N (0-255)', 'Function exit status; data goes on stdout'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Bash Reference Manual — Shell Scripts', url: 'https://www.gnu.org/software/bash/manual/html_node/Shell-Scripts.html' },
      { title: 'Advanced Bash-Scripting Guide', url: 'https://tldp.org/LDP/abs/html/' },
      { title: 'Bash Reference Manual — Introduction', url: 'https://www.gnu.org/software/bash/manual/html_node/Introduction.html' },
    ],
  },
  'lx-logs': {
    overview: [
      'When something breaks, the system already wrote down why — your job is knowing where to look. Logs are the flight recorders of Linux: boot messages, auth events, service output, and kernel warnings, all timestamped and waiting.',
      'This lesson maps the evidence: journald vs /var/log, following logs live, dmesg for the kernel, and the resource tools (df, du, top, ps, ss) that answer "is it disk, memory, CPU, or the network?" in the first sixty seconds of an incident.',
    ],
    learn: [
      {
        heading: 'Where the evidence lives',
        body: [
          'Traditional services log to /var/log/ (syslog, auth.log, per-service directories); systemd services log to the journal — query with journalctl. `tail -f` follows any file live (`-F` survives rotation). `dmesg | tail` shows recent kernel messages: hardware events, driver issues, and the dreaded OOM killer.',
          'Filter ruthlessly: `journalctl -u nginx --since "30 min ago" -p err`, `grep "Failed password" /var/log/auth.log | tail`. During an incident you want the last error before the failure, not the whole file.',
        ],
      },
      {
        heading: 'The first sixty seconds',
        body: [
          '`uptime` gives load averages (1/5/15 min); sustained load above your CPU core count means queuing. `df -h` checks filesystem space, `du -sh *` finds the hog — and if df says full but du disagrees, check inodes with `df -i`.',
          '`top` (P sorts by CPU, M by memory) or `htop` finds the hungry process; `ps aux | grep app` inspects one service; `ss -tulpn | grep :8080` confirms what actually listens. `strace -p <pid>` traces system calls when a process fails mysteriously — it shows every file it touches.',
        ],
      },
      {
        heading: 'Searching logs effectively',
        body: [
          'journalctl filters are the quickest way to narrow down an event: `journalctl -u nginx --since \'2026-05-12 09:00\' --until \'09:30\'` shows one service in a time window, `-p warning` shows warnings and worse, `-b -1` shows the previous boot (useful after a crash), and `-o json-pretty` exposes every field. For classic text logs, `grep -i error /var/log/syslog | tail -50` and `zgrep` for rotated, compressed files cover most needs.',
          'Logs are only useful if they are kept and protected. logrotate compresses and deletes old files on a schedule; check `/etc/logrotate.d/` so logs do not fill the disk. journald keeps logs in memory only unless `/var/log/journal` exists or `Storage=persistent` is set. For security, forward logs to a central server or SIEM, so an attacker who gains root on the host cannot quietly delete the evidence.',
        ],
      },
    ],
    examples: [
      {
        title: '"No space left on device" drill',
        code: code(
          'df -h /                    # which filesystem is full?',
          'du -sh /var/* | sort -rh | head   # biggest directories',
          'df -i /                    # out of inodes instead? (millions of tiny files)',
          'lsof | grep deleted        # space held by deleted-but-open files',
        ),
        explanation: 'Filesystem → directories → inodes → deleted handles: the disk-full checklist in order.',
      },
    ],
    cheatSheet: [
      ['/var/log/ + journalctl', 'Traditional files vs systemd journal — check both'],
      ['tail -f file', 'Follow a log live (-F survives rotation)'],
      ['dmesg | tail', 'Kernel messages: hardware, drivers, OOM kills'],
      ['df -h / du -sh *', 'Filesystem free space / directory sizes'],
      ['df -i', 'Inode exhaustion (the other "disk full")'],
      ['top/htop, ps aux', 'Who is eating CPU and memory'],
      ['ss -tulpn', 'What actually listens on which port'],
      ['strace -p <pid>', 'Trace system calls of a misbehaving process'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'journalctl(1) — Linux manual page', url: 'https://man7.org/linux/man-pages/man1/journalctl.1.html' },
      { title: 'rsyslogd(8) — Linux manual page', url: 'https://man7.org/linux/man-pages/man8/rsyslogd.8.html' },
      { title: 'Systemd/Journal — ArchWiki', url: 'https://wiki.archlinux.org/title/Systemd/Journal' },
    ],
  },
  'lx-secure': {
    overview: [
      'A default Linux install is not a hardened server. This lesson is the minimum viable checklist before any box touches the internet: SSH done right, a default-deny firewall, brute-force protection, prompt patching, and the principle of least privilege applied to accounts and services.',
      'These are the controls behind CISSP Domains 3 and 7 — and the exact items interviewers probe when they ask "how would you secure a fresh VPS?"',
    ],
    learn: [
      {
        heading: 'SSH and the front door',
        body: [
          'Move to key-based authentication and turn passwords off: in /etc/sshd_config set `PasswordAuthentication no` and `PermitRootLogin no`, then `systemctl reload sshd`. Protect the private key with `chmod 600` — SSH refuses keys readable by others rather than risk leaking them.',
          'fail2ban watches the logs and firewall-bans IPs after repeated failures — the standard brute-force mitigation for SSH. Change the default port only as obscurity on top of real controls, never instead of them.',
        ],
      },
      {
        heading: 'Firewall, patching, least privilege',
        body: [
          'Default-deny inbound, then open only what the box needs: `ufw default deny incoming` + `ufw allow 22/tcp` (Ubuntu), or firewall-cmd zones on RHEL. Enable automatic security updates (unattended-upgrades / dnf-automatic) so patches do not depend on human memory.',
          'Apply least privilege everywhere: dedicated low-privilege accounts per service (never run daemons as root), sudo rules scoped to single commands, no world-writable configs. AIDE/Tripwire file-integrity monitoring then alerts when system files change unexpectedly — baseline right after a clean install.',
        ],
      },
      {
        heading: 'Watching for intrusion',
        body: [
          'Hardening reduces the chance of a break-in; monitoring tells you when one happens. Check `/var/log/auth.log` (or `journalctl -u ssh`) for repeated failed logins and successful logins from unexpected addresses. Fail2ban reads those logs and temporarily blocks addresses that fail too often. The `last` and `lastb` commands list recent successful and failed logins.',
          'For deeper visibility, auditd records security-relevant events such as changes to `/etc/passwd` or use of privileged commands, according to rules you define. File integrity monitoring tools such as AIDE record hashes of system files and report changes. Combine them with mandatory access control (SELinux on RHEL-family systems, AppArmor on Ubuntu), left in enforcing mode rather than disabled, so a compromised service is confined to what its policy allows.',
        ],
      },
    ],
    examples: [
      {
        title: 'Hardening a fresh VPS',
        code: code(
          'apt update && apt upgrade -y            # patch first',
          'ufw default deny incoming               # default deny',
          'ufw allow 22/tcp && ufw enable          # SSH only, then on',
          '# /etc/ssh/sshd_config: PasswordAuthentication no, PermitRootLogin no',
          'systemctl reload sshd && apt install -y fail2ban',
        ),
        explanation: 'Patch → firewall → SSH keys-only → brute-force protection: the internet-facing checklist in order.',
      },
    ],
    cheatSheet: [
      ['PasswordAuthentication no', 'SSH: keys only, in sshd_config'],
      ['PermitRootLogin no', 'SSH: no direct root login'],
      ['chmod 600 ~/.ssh/id_rsa', 'Private keys readable only by you'],
      ['ufw default deny incoming', 'Firewall: deny everything, then allow needs'],
      ['fail2ban', 'Auto-ban IPs after repeated login failures'],
      ['unattended-upgrades', 'Security patches without human memory'],
      ['Least privilege', 'Service accounts, scoped sudo, no world-writable configs'],
      ['AIDE / Tripwire', 'File integrity monitoring against tampering'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'sshd_config(5) — Linux manual page', url: 'https://man7.org/linux/man-pages/man5/sshd_config.5.html' },
      { title: 'CIS Benchmark for Ubuntu Linux', url: 'https://www.cisecurity.org/benchmark/ubuntu_linux' },
      { title: 'SSH Academy — SSH.COM', url: 'https://www.ssh.com/academy/ssh' },
    ],
  },
};
