# SSH hardening — workflow

1. Generate a key pair (no passphrase for the lab):
     ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ''
     cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
     chmod 600 ~/.ssh/authorized_keys
2. Harden ~/ssh-lab/sshd_config:
     Port 2222                  # non-root sshd cannot bind 22 anyway
     PasswordAuthentication no  # keys only
     PermitRootLogin no
     PubkeyAuthentication yes
   Check the EFFECTIVE config (catches typos and defaults):
     sshd -T -f ~/ssh-lab/sshd_config | grep -Ei 'port|passwordauth|pubkey|permitroot'
3. Start the daemon (as your user, on the high port):
     /usr/sbin/sshd -f ~/ssh-lab/sshd_config -E ~/ssh-lab/sshd.log
     ss -tlnp | grep 2222
4. Prove key-only login works:
     ssh -p 2222 -o StrictHostKeyChecking=no student@localhost 'echo SSH_LOGIN_OK'

If sshd complains, read ~/ssh-lab/sshd.log — it tells you exactly what is wrong.
