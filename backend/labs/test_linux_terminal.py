"""Tests for the Linux terminal essentials lab (linux_cli shell + definition + validators)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import linux_cli
from labs.definitions.linux_terminal import LINUX_TERMINAL_LAB
from labs.validators import VALIDATORS

LAB = LINUX_TERMINAL_LAB
VALIDATOR_NAMES = [o.validator for o in LAB.objectives]


def _run(cmds, findings=None):
    """Thread findings through the shell like the mock provider does."""
    f = findings if findings is not None else {}
    last = None
    for c in cmds:
        last = linux_cli.run(LAB, c, f)
        f = {**f, **last.findings}
    return f, last


def _validate(name, findings):
    fn = VALIDATORS[name]
    return fn({}, findings)


# ---- lab definition ----

def test_lab_definition_loads():
    assert LAB.id == "linux-terminal-001"
    assert LAB.slug == "linux-terminal"
    assert LAB.category == "linux"
    assert LAB.difficulty == "beginner"
    assert LAB.shell == "linux_cli"
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert len(set(ids)) == 8
    for o in LAB.objectives:
        assert o.label and o.description and o.hints, o.id


def test_all_objective_validators_registered():
    for name in VALIDATOR_NAMES:
        assert name in VALIDATORS, f"validator {name!r} not registered"
    assert len(set(VALIDATOR_NAMES)) == 8


def test_lab_in_registry():
    from labs.definitions import ALL_LABS
    assert any(l.id == "linux-terminal-001" for l in ALL_LABS)


def test_shell_registered():
    from labs.shells import has_shell, meta
    assert has_shell(LAB)
    m = meta(LAB)
    assert m["prompt"].endswith("$ ")
    assert isinstance(m["banner"], list) and len(m["banner"]) >= 2


def test_help_and_unknown_command():
    _, res = _run(["help"])
    assert "systemctl" in res.output and "grep" in res.output
    _, res = _run(["frobnicate"])
    assert res.exit_code == 127


def test_clear():
    _, res = _run(["clear"])
    assert res.clear is True


def test_empty_command():
    _, res = _run([""])
    assert res.exit_code == 0 and res.output == ""


# ---- navigation ----

def test_pwd_ls_cd():
    f, res = _run(["pwd"])
    assert res.output == "/home/student"
    _, res = _run(["ls"], f)
    assert "notes.txt" in res.output and "projects" in res.output
    # hidden file only with -a
    assert ".hidden_config" not in res.output
    _, res = _run(["ls -a"], f)
    assert ".hidden_config" in res.output
    # long format shows modes
    _, res = _run(["ls -l notes.txt"], f)
    assert res.output.startswith("-rw-r--r--")
    # cd and pwd round-trip
    f, _ = _run(["cd /var/log"], f)
    _, res = _run(["pwd"], f)
    assert res.output == "/var/log"
    _, res = _run(["ls"], f)
    assert "syslog" in res.output
    f, _ = _run(["cd"], f)
    _, res = _run(["pwd"], f)
    assert res.output == "/home/student"


def test_cd_errors():
    _, res = _run(["cd /nope"])
    assert res.exit_code == 1 and "No such file or directory" in res.output
    _, res = _run(["cd /var/log/syslog"])
    assert res.exit_code == 1 and "Not a directory" in res.output


def test_cd_dotdot_and_tilde():
    f, _ = _run(["cd /var/log"])
    f, _ = _run(["cd .."], f)
    _, res = _run(["pwd"], f)
    assert res.output == "/var"
    f, _ = _run(["cd ~/projects"], f)
    _, res = _run(["pwd"], f)
    assert res.output == "/home/student/projects"


def test_navigation_objective():
    f, _ = _run([])
    passed, _, _ = _validate("lt_navigated", f)
    assert not passed
    f, _ = _run(["cd /var/log"], f)
    passed, msg, _ = _validate("lt_navigated", f)
    assert passed, msg


# ---- file operations ----

def test_mkdir_cp_mv_rm():
    f, _ = _run(["mkdir ~/projects/backup"])
    _, res = _run(["ls ~/projects"], f)
    assert "backup" in res.output
    f, _ = _run(["cp ~/notes.txt ~/projects/backup/"], f)
    _, res = _run(["ls ~/projects/backup"], f)
    assert "notes.txt" in res.output
    # mv renames
    f, _ = _run(["mv ~/projects/backup/notes.txt ~/projects/backup/notes.bak"], f)
    _, res = _run(["ls ~/projects/backup"], f)
    assert "notes.bak" in res.output and "notes.txt" not in res.output
    # rm removes
    f, _ = _run(["rm ~/projects/backup/notes.bak"], f)
    _, res = _run(["ls ~/projects/backup"], f)
    assert "notes.bak" not in res.output


def test_mkdir_existing_fails():
    _, res = _run(["mkdir ~/projects"])
    assert res.exit_code == 1 and "File exists" in res.output


def test_rm_dir_needs_recursive():
    _, res = _run(["rm ~/projects"])
    assert res.exit_code == 1 and "Is a directory" in res.output
    f, _ = _run(["mkdir -p /tmp/deep/nest"])
    f, _ = _run(["rm -r /tmp/deep"], f)
    _, res = _run(["ls /tmp"], f)
    assert "deep" not in res.output


def test_cat():
    _, res = _run(["cat ~/todo.txt"])
    assert "TODO" in res.output
    _, res = _run(["cat /nope"])
    assert res.exit_code == 1 and "No such file" in res.output
    _, res = _run(["cat ~/projects"])
    assert res.exit_code == 1 and "Is a directory" in res.output


def test_tar_roundtrip():
    f, _ = _run(["tar -czf /tmp/notes.tar.gz ~/notes.txt"])
    _, res = _run(["tar -tzf /tmp/notes.tar.gz"], f)
    assert "notes.txt" in res.output


def test_backup_objective_end_to_end():
    f, _ = _run([])
    assert not _validate("lt_backup_created", f)[0]
    f, _ = _run(["mkdir ~/projects/backup", "cp ~/notes.txt ~/projects/backup/"], f)
    passed, msg, _ = _validate("lt_backup_created", f)
    assert passed, msg


def test_backup_rejects_wrong_content():
    f, _ = _run(["mkdir -p ~/projects/backup", "echo different > ~/projects/backup/notes.txt"])
    assert not _validate("lt_backup_created", f)[0]


# ---- permissions ----

def test_chmod_octal_and_symbolic():
    f, _ = _run(["chmod 600 ~/notes.txt"])
    _, res = _run(["ls -l ~/notes.txt"], f)
    assert res.output.startswith("-rw-------")
    f, _ = _run(["chmod 644 ~/todo.txt"], f)
    f, _ = _run(["chmod g-w ~/todo.txt"], f)
    _, res = _run(["ls -l ~/todo.txt"], f)
    assert res.output.startswith("-rw-r--r--")


def test_chmod_invalid():
    _, res = _run(["chmod 999 ~/notes.txt"])
    assert res.exit_code == 1
    _, res = _run(["chmod 600 /nope"])
    assert res.exit_code == 1 and "No such file" in res.output


def test_chown():
    f, _ = _run(["sudo chown root ~/todo.txt"])
    _, res = _run(["ls -l ~/todo.txt"], f)
    assert "root" in res.output.split()[2]
    _, res = _run(["chown nobody-xyz ~/todo.txt"], f)
    assert res.exit_code == 1 and "invalid user" in res.output


def test_permissions_objective():
    f, _ = _run([])
    assert not _validate("lt_permissions_hardened", f)[0]
    f, _ = _run(["chmod 600 ~/notes.txt"], f)
    assert _validate("lt_permissions_hardened", f)[0]
    # 644 must not pass
    f, _ = _run(["chmod 644 ~/notes.txt"], f)
    assert not _validate("lt_permissions_hardened", f)[0]


# ---- text processing ----

def test_grep_basic_and_flags():
    _, res = _run(["grep ERROR /var/log/syslog"])
    lines = [l for l in res.output.splitlines() if l.strip()]
    assert len(lines) == 3
    assert all("ERROR" in l for l in lines)
    _, res = _run(["grep -c ERROR /var/log/syslog"])
    assert res.output.strip() == "3"
    _, res = _run(["grep -n ERROR /var/log/syslog"])
    assert res.output.splitlines()[0].startswith("2:")
    _, res = _run(["grep -i error /var/log/syslog"])
    assert len(res.output.splitlines()) == 3
    # no match -> exit 1
    _, res = _run(["grep ZZZZNOTHERE /var/log/syslog"])
    assert res.exit_code == 1


def test_grep_missing_file():
    _, res = _run(["grep ERROR /nope"])
    assert res.exit_code == 2


def test_redirect_and_append():
    f, _ = _run(["grep ERROR /var/log/syslog > ~/errors.txt"])
    _, res = _run(["cat ~/errors.txt"], f)
    assert len(res.output.splitlines()) == 3
    f, _ = _run(["echo hello >> ~/errors.txt"], f)
    _, res = _run(["cat ~/errors.txt"], f)
    assert res.output.splitlines()[-1] == "hello"
    # > truncates
    f, _ = _run(["echo fresh > ~/errors.txt"], f)
    _, res = _run(["cat ~/errors.txt"], f)
    assert res.output.strip() == "fresh"


def test_find():
    _, res = _run(["find /var/log -name syslog"])
    assert res.output.strip() == "/var/log/syslog"
    _, res = _run(["find /etc/nginx -name '*.conf*'"])
    assert "nginx.conf" in res.output and "nginx.conf.bak" in res.output
    _, res = _run(["find /etc/nginx -name 'nginx.conf'"])
    assert res.output.strip() == "/etc/nginx/nginx.conf"
    _, res = _run(["find /nope -name x"])
    assert res.exit_code == 1


def test_echo():
    _, res = _run(["echo hello world"])
    assert res.output == "hello world"


def test_errors_objective_end_to_end():
    f, _ = _run([])
    assert not _validate("lt_errors_extracted", f)[0]
    f, _ = _run(["grep ERROR /var/log/syslog > ~/errors.txt"], f)
    passed, msg, _ = _validate("lt_errors_extracted", f)
    assert passed, msg


def test_errors_rejects_partial():
    f, _ = _run(["grep 'disk I/O' /var/log/syslog > ~/errors.txt"])
    assert not _validate("lt_errors_extracted", f)[0]


def test_errors_rejects_polluted():
    f, _ = _run(["grep -v ERROR /var/log/syslog > ~/errors.txt"])
    # file has non-ERROR lines -> must fail
    assert not _validate("lt_errors_extracted", f)[0]


# ---- processes ----

def test_ps_and_top_show_runaway():
    _, res = _run(["ps aux"])
    assert "backup-agent" in res.output and "98.7" in res.output
    _, res = _run(["top"])
    assert "901" in res.output and "backup-agent" in res.output


def test_kill():
    f, _ = _run(["kill 901"])
    _, res = _run(["ps aux"], f)
    assert "backup-agent" not in res.output
    assert _validate("lt_runaway_killed", f)[0]


def test_kill_bad_pid():
    _, res = _run(["kill 99999"])
    assert res.exit_code == 1 and "No such process" in res.output


def test_kill_own_shell_refused():
    _, res = _run(["kill 1450"])
    assert res.exit_code == 1


def test_kill_wrong_pid_does_not_complete_objective():
    f, _ = _run(["kill 412"])  # sshd, not the runaway
    assert not _validate("lt_runaway_killed", f)[0]


# ---- services: nginx troubleshooting ----

def test_systemctl_status_failed():
    _, res = _run(["systemctl status nginx"])
    assert "failed" in res.output
    assert "journalctl -u nginx" in res.output


def test_systemctl_status_active():
    _, res = _run(["systemctl status sshd"])
    assert "active (running)" in res.output


def test_systemctl_unknown_unit():
    _, res = _run(["systemctl status nope"])
    assert res.exit_code == 4


def test_journalctl_points_at_typo():
    _, res = _run(["journalctl -u nginx"])
    assert 'servre_name' in res.output
    assert 'nginx.conf:12' in res.output


def test_journalctl_n_flag():
    _, res = _run(["journalctl -u nginx -n 2"])
    assert len(res.output.splitlines()) == 2


def test_nginx_start_fails_while_broken():
    _, res = _run(["systemctl start nginx"])
    assert res.exit_code == 1
    assert "journalctl" in res.output


def test_nginx_fix_flow_end_to_end():
    f, _ = _run([])
    assert not _validate("lt_nginx_fixed", f)[0]
    # diagnose
    _, res = _run(["systemctl status nginx"], f)
    assert "failed" in res.output
    _, res = _run(["journalctl -u nginx"], f)
    assert "servre_name" in res.output
    # compare broken vs backup
    _, res = _run(["cat /etc/nginx/nginx.conf"], f)
    assert "servre_name" in res.output
    # repair from backup and start
    f, _ = _run(["cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf",
                 "systemctl start nginx"], f)
    _, res = _run(["systemctl is-active nginx"], f)
    assert res.output.strip() == "active"
    passed, msg, _ = _validate("lt_nginx_fixed", f)
    assert passed, msg


def test_nginx_restart_and_stop():
    f, _ = _run(["cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf",
                 "systemctl start nginx"])
    f, _ = _run(["systemctl stop nginx"], f)
    _, res = _run(["systemctl is-active nginx"], f)
    assert res.output.strip() == "failed"
    f, _ = _run(["systemctl restart nginx"], f)
    _, res = _run(["systemctl is-active nginx"], f)
    assert res.output.strip() == "active"


# ---- networking ----

def test_ip_addr():
    _, res = _run(["ip addr"])
    assert "10.0.2.15/24" in res.output
    assert "127.0.0.1/8" in res.output


def test_ss_shows_ssh():
    _, res = _run(["ss -tuln"])
    assert "0.0.0.0:22" in res.output


def test_df():
    _, res = _run(["df -h"])
    assert "/dev/sda2" in res.output


def test_ssh_port_objective():
    f, _ = _run([])
    assert not _validate("lt_ssh_port_found", f)[0]
    f, _ = _run(["echo 22 > ~/ssh_port.txt"], f)
    assert _validate("lt_ssh_port_found", f)[0]


def test_ssh_port_rejects_wrong():
    f, _ = _run(["echo 80 > ~/ssh_port.txt"])
    assert not _validate("lt_ssh_port_found", f)[0]


# ---- users ----

def test_useradd_and_passwd():
    f, _ = _run(["useradd -m deploy"])
    assert _validate("lt_user_created", f)[0] is False  # no password yet
    f, res = _run(["passwd deploy"], f)
    assert "password updated successfully" in res.output
    assert _validate("lt_user_created", f)[0]
    # home dir created with -m
    _, res = _run(["ls /home"], f)
    assert "deploy" in res.output


def test_useradd_duplicate_fails():
    f, _ = _run(["useradd -m deploy"])
    _, res = _run(["useradd deploy"], f)
    assert res.exit_code == 9 and "already exists" in res.output


def test_passwd_unknown_user():
    _, res = _run(["passwd ghost"])
    assert res.exit_code == 6


def test_user_created_needs_password():
    f, _ = _run(["useradd deploy"])  # no -m, no passwd
    passed, _, _ = _validate("lt_user_created", f)
    assert not passed


# ---- misc ----

def test_sudo_passthrough():
    _, res = _run(["sudo whoami"])
    assert res.output == "student"  # simulated: runs as invoking user context
    f, _ = _run(["sudo mkdir /tmp/sudodir"])
    _, res = _run(["ls /tmp"], f)
    assert "sudodir" in res.output


def test_system_commands():
    _, res = _run(["whoami"])
    assert res.output == "student"
    _, res = _run(["hostname"])
    assert res.output == "linux-lab"
    _, res = _run(["uname"])
    assert "Linux" in res.output
    _, res = _run(["id"])
    assert "uid=1000(student)" in res.output


def test_determinism():
    _, r1 = _run(["ps aux"])
    _, r2 = _run(["ps aux"])
    assert r1.output == r2.output
    _, r1 = _run(["ls -l /var/log"])
    _, r2 = _run(["ls -l /var/log"])
    assert r1.output == r2.output


def test_full_lab_walkthrough():
    """Complete all 8 objectives in order, like a student would."""
    cmds = [
        "cat ~/todo.txt",
        "pwd",
        "ls -la",
        "cd /var/log",          # 1 navigate
        "cd ~",
        "mkdir ~/projects/backup",
        "cp ~/notes.txt ~/projects/backup/",   # 2 backup
        "chmod 600 ~/notes.txt",               # 3 permissions
        "grep ERROR /var/log/syslog > ~/errors.txt",  # 4 errors
        "ps aux",
        "kill 901",                            # 5 runaway
        "systemctl status nginx",
        "journalctl -u nginx",
        "cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf",
        "systemctl start nginx",                # 6 nginx
        "ss -tuln",
        "echo 22 > ~/ssh_port.txt",             # 7 ssh port
        "useradd -m deploy",
        "passwd deploy",                        # 8 user
    ]
    f, _ = _run(cmds)
    for name in VALIDATOR_NAMES:
        passed, msg, _ = _validate(name, f)
        assert passed, f"{name}: {msg}"
