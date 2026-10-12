# Audit logs & fail2ban

Someone is hammering SSH on this host. Work ~/audit/auth.log like an analyst.

1. Skim it: `cat ~/audit/auth.log` (or `tail -40`).
2. Find the brute-force source: which IP has the most `Failed password` lines?
     grep 'Failed password' ~/audit/auth.log | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort | uniq -c | sort -rn
3. Count exactly: `grep -c 'Failed password.*203.0.113.66' ~/audit/auth.log`
4. Prove the REAL sshd filter matches those lines:
     fail2ban-regex ~/audit/auth.log /etc/fail2ban/filter.d/sshd.conf
   Read the "Matched lines" count.
5. Author ~/audit/jail.local — a real fail2ban jail (bans cannot be enforced in
   this unprivileged container, so correctness is what counts):
     [sshd]
     enabled = true
     bantime  = 3600
     findtime = 600
     maxretry = 5
6. Decide: with maxretry=5 over findtime=600, which IPs would your jail ban?

Tune the numbers deliberately: too aggressive bans your own users, too lax
lets the brute force run.
