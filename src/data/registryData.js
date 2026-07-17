export const REGISTRY_DATA = {
  windows: {
    title: 'Windows Registry',
    overview:
      'The Windows Registry is a hierarchical database that stores low-level settings for the OS, installed software, and hardware. It is loaded early in boot and is required for nearly every OS operation. Treat it as production state: every write changes behavior immediately or on next use, and incorrect changes can make the system unbootable.',
    notes: [
      'Regedit loads only the default ControlSet on boot. If you edit HKLM\\SYSTEM\\ControlSet001, reboot before assuming it took effect.',
      '32-bit vs 64-bit views: on 64-bit Windows, 32-bit apps see HKLM\\SOFTWARE\\Wow6432Node unless explicitly redirected. Mismatched views are a common source of “I edited it but nothing happened.”',
      'Registry reflectors and backwards links keep legacy and new views in sync; they do not update instantly. A second logon/reboot may be needed.',
      'Transaction mechanism: RegNotifyChangeKeyValue provides change notification, but there is no atomic undo. If an install corrupts a value, recovery depends on restore points or manual repair.',
      'Group Policy often overwrites HKLM or HKCU values at gpupdate; registry edits under Group Policy-controlled paths are ephemeral.',
      'Some keys require TrustedInstaller or SYSTEM ownership; even administrators must take ownership before editing.',
      'Reg.exe and PowerShell provide scriptable equivalents of Regedit and are preferred for repeatable changes.',
      'Hives are files: SYSTEM, SOFTWARE, SAM, SECURITY, DEFAULT. Corruption in one can render recovery difficult without a known-good Restore Point.',
    ],
    caveats: [
      'Always back up the key or hive before editing.',
      'Edit one value, then reboot/test before changing anything else.',
      'Avoid live editing HKCU\\Environment from within the current shell; log off/on to verify.',
      'Use System Restore or Windows Recovery before risky HKLM edits.',
    ],
    roots: [
      { root: 'HKLM', path: 'HKEY_LOCAL_MACHINE', note: 'System-wide hardware, OS, and software settings.' },
      { root: 'HKCU', path: 'HKEY_CURRENT_USER', note: 'Current user preferences and environment.' },
      { root: 'HKU', path: 'HKEY_USERS', note: 'All loaded user profiles.' },
      { root: 'HKCC', path: 'HKEY_CURRENT_CONFIG', note: 'Hardware profile used at system startup.' },
      { root: 'HKCR', path: 'HKEY_CLASSES_ROOT', note: 'File associations, COM classes, and ProgIDs.' },
    ],
    keys: [
      { name: 'Software', path: 'HKLM\\SOFTWARE', desc: 'Installed software and default settings.' },
      { name: 'System', path: 'HKLM\\SYSTEM', desc: 'Drivers, services, boot configuration, and ControlSet. Edit only if you know which ControlSet is current.' },
      { name: 'Security', path: 'HKLM\\SECURITY', desc: 'Security policies, audit settings, and permissions.' },
      { name: 'Environment', path: 'HKCU\\Environment', desc: 'User PATH, TEMP, and process environment variables; log on required.' },
      { name: 'Control Panel', path: 'HKCU\\Control Panel', desc: 'Desktop, keyboard, mouse, and regional settings.' },
      { name: 'AppEvents', path: 'HKCU\\AppEvents', desc: 'System sound schemes and event labels.' },
      { name: 'Classes', path: 'HKCR\\.ext', desc: 'Default program for file extensions; merged from HKLM and HKCU.' },
    ],
    valueTypes: [
      { type: 'REG_SZ', note: 'Text string. The most common value type.' },
      { type: 'REG_DWORD', note: '32-bit number; often 0/1 for feature flags, or bitmask for options.' },
      { type: 'REG_QWORD', note: '64-bit number; used for 64-bit counters and large values.' },
      { type: 'REG_BINARY', note: 'Raw binary data; common for boot flags, GUIDs, or firmware settings.' },
      { type: 'REG_MULTI_SZ', note: 'Multiple strings separated by null terminators and a final empty string.' },
      { type: 'REG_EXPAND_SZ', note: 'String with expandable variables like %SystemRoot%; resolved at read time.' },
    ],
    safePractices: [
      'Export the key before editing.',
      'Use Regedit’s search sparingly; prefer exact paths.',
      'Change one value at a time and reboot/test.',
      'Use System Restore before risky edits.',
      'Prefer Group Policy or official tools over raw registry edits.',
      'Take ownership when required, but restore ACLs afterward when possible.',
    ],
  },
  linux: {
    title: 'Linux Configuration',
    overview:
      'Linux does not have a single registry-like database. Settings are spread across files, text-based configs, kernel parameters, directory services, and desktop databases. The main system-wide configuration tree is /etc, runtime state lives in /proc and /sys, user-specific desktop settings live in dconf/GSettings, and many modern services also honour drop-in .d directories.',
    notes: [
      'sudo is required for system-wide changes under /etc, /sys, and /proc/sys.',
      'Syntax errors in certain configs can break services or boot: /etc/fstab, /etc/sudoers, /etc/passwd, sshd_config.',
      'Some runtime settings require reloading the service or a sysctl -p; the change does not apply automatically.',
      'Use journalctl -u <unit> or dmesg immediately after changes to verify behavior.',
      'xdg-user-dirs is often preferred over directly editing home directory names; the mapping lives at ~/.config/user-dirs.dirs.',
      'systemd unit overrides live in /etc/systemd/system/<unit>.d/; avoid editing the main unit directly when possible.',
      'NetworkManager and systemd-resolved often manage resolv.conf; editing the file may be overwritten.',
      'Linux runs as one user by default; privilege separation happens via users, groups, and capabilities rather than per-user registries.',
      'Cached configs: many apps write to ~/.cache or XDG_CACHE_HOME; stale caches can make config edits appear to have no effect.',
      "Container/file-based secret stores: don't put secrets in /etc without considering secrets management; the Registry analogue here is more 'app config path + file permissions' than a central DB.",
    ],
    caveats: [
      'sudo is required for system-wide changes.',
      'Back up config files before editing.',
      'Syntax errors in certain configs can break services or boot.',
      'Some runtime settings require reloading the service or sysctl -p.',
      "Network mgmt tools may overwrite files like resolv.conf automatically.",
    ],
    roots: [
      { root: '/etc', path: '/etc', note: 'System-wide configuration files and .d drop-in snippets.' },
      { root: '~/.config', path: '~/.config', note: 'Per-user application settings, XDG config home.' },
      { root: '/proc/sys', path: '/proc/sys', note: 'Live kernel parameters; sysctl knobs. Writes are runtime only unless also in /etc/sysctl.conf.' },
      { root: '/sys', path: '/sys', note: 'Sysfs kernel objects: devices, power, PCI, thermal, cgroup state.' },
      { root: 'dconf/GSettings', path: 'dconf / GSettings', note: 'Desktop and app settings via schemas and keys; use dconf-editor or gsettings CLI.' },
    ],
    keys: [
      { name: 'fstab', path: '/etc/fstab', desc: 'Mount table for filesystems at boot. Mistakes prevent boot.' },
      { name: 'hostname', path: '/etc/hostname', desc: 'Static hostname declaration.' },
      { name: 'resolv.conf', path: '/etc/resolv.conf', desc: 'DNS resolver; often managed by NetworkManager/systemd-resolved.' },
      { name: 'sshd_config', path: '/etc/ssh/sshd_config', desc: 'OpenSSH daemon and auth controls.' },
      { name: 'sysctl.conf', path: '/etc/sysctl.conf', desc: 'Persistent kernel parameters; /etc/sysctl.d/ is preferred on modern systems.' },
      { name: 'nginx.conf', path: '/etc/nginx/nginx.conf', desc: 'Web server global context and includes.' },
      { name: 'users/groups', path: '/etc/passwd, /etc/group, /etc/shadow', desc: 'Accounts, groups, and password hashes; never edit shadow as a non-root or with a text editor without vipw.' },
      { name: 'sudoers', path: '/etc/sudoers', note: 'sudo policy. Edit only via visudo; syntax errors can lock out privilege escalation.' },
      { name: 'tmpfiles.d', path: '/etc/tmpfiles.d/*.conf', note: 'Volatile files and permissions at boot: runtime dirs, ownership, modes.' },
      { name: 'logind.conf', path: '/etc/systemd/logind.conf', note: 'Login session behavior: lid switch, power key, multi-session.' },
    ],
    valueTypes: [
      { type: 'Key-value', note: 'Most configs: option=value, YAML, JSON, or TOML.' },
      { type: 'File mode', note: 'Permissions/ownership via chmod/chown. Mode is a major security boundary.' },
      { type: 'Kernel int/bool', note: 'sysctl values: net.ipv4.ip_forward, fs.file-max, kernel.sched_*.' },
      { type: 'DBus/GSettings', note: 'Desktop schemas and keys; gsettings get/recursively list useful for inspection.' },
      { type: 'Drop-ins', note: 'Layered config via .d directories; enables local changes without forking main files.' },
    ],
    safePractices: [
      'Back up edits with cp ...{,.bak} or VCS.',
      'Prefer .d snippets over editing main files.',
      'Test network changes before disconnecting: ssh or console access first.',
      'Verify with journalctl -u <unit> and sysctl --system.',
      'Use sosreport or tar of /etc to recover from broken admin states.',
      'For critical files, use tools like visudo, vipw, or specialized editors when available.',
    ],
  },
};

export function getRegistrySide(side) {
  return REGISTRY_DATA[side] || null;
}

export function listSides() {
  return Object.keys(REGISTRY_DATA);
}
