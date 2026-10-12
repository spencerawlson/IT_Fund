#!/usr/bin/env python3
"""Practice-root user/group shims for the linux-admin lab image.

The lab container is unprivileged (all capabilities dropped, no-new-privileges), so the real
useradd/groupadd/usermod/userdel/groupmod cannot touch /etc. This script shadows those names
via /usr/local/bin symlinks and applies the same operations to a PRACTICE ROOT ($SYSROOT,
default ~/sysroot) using byte-identical /etc/passwd, /etc/group and /etc/shadow formats.

On a real host you would run the same commands as root without the shim.
"""
import os
import sys

NAME = os.path.basename(sys.argv[0])
SYSROOT = os.environ.get("SYSROOT", os.path.expanduser("~/sysroot"))
ETC = os.path.join(SYSROOT, "etc")


def _read(name):
    rows = []
    path = os.path.join(ETC, name)
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.rstrip("\n")
                if line:
                    rows.append(line.split(":"))
    return rows


def _write(name, rows):
    os.makedirs(ETC, exist_ok=True)
    with open(os.path.join(ETC, name), "w") as f:
        for r in rows:
            f.write(":".join(r) + "\n")


def _next_id(rows, idx, start=2000):
    used = {int(r[idx]) for r in rows if r[idx].isdigit()}
    n = start
    while n in used:
        n += 1
    return n


def _usage(msg=""):
    cmds = {
        "useradd": "useradd [-m] [-u UID] [-g GID] [-G g1,g2] [-s SHELL] [-d HOME] USERNAME",
        "groupadd": "groupadd [-g GID] GROUPNAME",
        "usermod": "usermod [-aG g1,g2 | -G g1,g2] [-L | -U] [-s SHELL] USERNAME",
        "userdel": "userdel [-r] USERNAME",
        "groupmod": "groupmod [-n NEWNAME] [-g GID] GROUPNAME",
    }
    if msg:
        print(f"{NAME}: {msg}", file=sys.stderr)
    print(f"usage: {cmds.get(NAME, NAME)}", file=sys.stderr)
    print(f"(practice root: {SYSROOT})", file=sys.stderr)
    sys.exit(2)


def _pop(args, *flags):
    """Pop the first matching flag (and its value unless store_true). Returns value or None."""
    for i, a in enumerate(args):
        if a in flags:
            del args[i]
            if i < len(args) and not args[i].startswith("-"):
                return args.pop(i)
            return True
    return None


def cmd_useradd(args):
    mkhome = "-m" in args
    args = [a for a in args if a != "-m"]
    uid = _pop(args, "-u")
    gid = _pop(args, "-g")
    groups = _pop(args, "-G")
    shell = _pop(args, "-s") or "/bin/bash"
    home = _pop(args, "-d")
    if len(args) != 1 or args[0].startswith("-"):
        _usage()
    username = args[0]
    passwd, group, shadow = _read("passwd"), _read("group"), _read("shadow")
    if any(r[0] == username for r in passwd):
        _usage(f"user '{username}' already exists")
    uid = int(uid) if uid else _next_id(passwd, 2)
    gid = int(gid) if gid else (uid if not any(r[2] == str(uid) for r in group) else _next_id(group, 2))
    home = home or os.path.join(SYSROOT, "home", username)
    passwd.append([username, "x", str(uid), str(gid), "", home, shell])
    if not any(r[2] == str(gid) for r in group):
        group.append([username, "x", str(gid), ""])
    shadow.append([username, "*", "20000", "0", "99999", "7", "", "", ""])
    if groups:
        members = {g.strip() for g in groups.split(",") if g.strip()}
        for r in group:
            if r[0] in members and username not in r[3].split(","):
                r[3] = ",".join([m for m in r[3].split(",") if m] + [username])
        unknown = members - {r[0] for r in group}
        if unknown:
            print(f"{NAME}: warning: groups do not exist: {', '.join(sorted(unknown))}", file=sys.stderr)
    if mkhome:
        os.makedirs(home, exist_ok=True)
    _write("passwd", passwd)
    _write("group", group)
    _write("shadow", shadow)
    print(f"user '{username}' created in practice root (uid {uid})")


def cmd_groupadd(args):
    gid = _pop(args, "-g")
    if len(args) != 1 or args[0].startswith("-"):
        _usage()
    name = args[0]
    group = _read("group")
    if any(r[0] == name for r in group):
        _usage(f"group '{name}' already exists")
    gid = int(gid) if gid else _next_id(group, 2)
    group.append([name, "x", str(gid), ""])
    _write("group", group)
    print(f"group '{name}' created in practice root (gid {gid})")


def cmd_usermod(args):
    append = "-a" in args
    args = [a for a in args if a != "-a"]
    groups = _pop(args, "-G")
    lock = "-L" in args
    unlock = "-U" in args
    args = [a for a in args if a not in ("-L", "-U")]
    shell = _pop(args, "-s")
    if len(args) != 1 or args[0].startswith("-"):
        _usage()
    username = args[0]
    passwd, group, shadow = _read("passwd"), _read("group"), _read("shadow")
    if not any(r[0] == username for r in passwd):
        _usage(f"user '{username}' does not exist")
    if groups is not None:
        members = {g.strip() for g in groups.split(",") if g.strip()}
        unknown = members - {r[0] for r in group}
        if unknown:
            _usage(f"groups do not exist: {', '.join(sorted(unknown))}")
        for r in group:
            has = username in r[3].split(",")
            want = r[0] in members
            if want and not has:
                r[3] = ",".join([m for m in r[3].split(",") if m] + [username])
            elif not append and has and not want and r[0] != username:
                r[3] = ",".join(m for m in r[3].split(",") if m and m != username)
        _write("group", group)
        print(f"user '{username}' groups updated: {groups}")
    if shell:
        for r in passwd:
            if r[0] == username:
                r[6] = shell
        _write("passwd", passwd)
        print(f"user '{username}' shell set to {shell}")
    if lock or unlock:
        for r in shadow:
            if r[0] == username:
                r[1] = ("!" + r[1].lstrip("!")) if lock else r[1].lstrip("!")
        _write("shadow", shadow)
        print(f"user '{username}' {'locked' if lock else 'unlocked'}")


def cmd_userdel(args):
    remove_home = "-r" in args
    args = [a for a in args if a != "-r"]
    if len(args) != 1 or args[0].startswith("-"):
        _usage()
    username = args[0]
    passwd, group, shadow = _read("passwd"), _read("group"), _read("shadow")
    entry = next((r for r in passwd if r[0] == username), None)
    if not entry:
        _usage(f"user '{username}' does not exist")
    passwd = [r for r in passwd if r[0] != username]
    shadow = [r for r in shadow if r[0] != username]
    for r in group:
        r[3] = ",".join(m for m in r[3].split(",") if m and m != username)
    _write("passwd", passwd)
    _write("group", group)
    _write("shadow", shadow)
    if remove_home and entry[5].startswith(SYSROOT):
        import shutil
        shutil.rmtree(entry[5], ignore_errors=True)
    print(f"user '{username}' removed from practice root")


def cmd_groupmod(args):
    newname = _pop(args, "-n")
    newgid = _pop(args, "-g")
    if len(args) != 1 or args[0].startswith("-"):
        _usage()
    name = args[0]
    group = _read("group")
    entry = next((r for r in group if r[0] == name), None)
    if not entry:
        _usage(f"group '{name}' does not exist")
    if newname:
        if any(r[0] == newname for r in group):
            _usage(f"group '{newname}' already exists")
        entry[0] = newname
    if newgid:
        entry[2] = str(int(newgid))
    _write("group", group)
    print(f"group '{name}' modified")


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        _usage()
    dispatch = {"useradd": cmd_useradd, "groupadd": cmd_groupadd, "usermod": cmd_usermod,
                "userdel": cmd_userdel, "groupmod": cmd_groupmod}
    fn = dispatch.get(NAME)
    if not fn:
        print(f"{NAME}: unknown shim (expected one of: {', '.join(dispatch)})", file=sys.stderr)
        sys.exit(2)
    try:
        fn(args)
    except BrokenPipeError:
        sys.exit(0)


if __name__ == "__main__":
    main()
