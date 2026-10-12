# Permissions & ACLs — practice area

Work through these in order. Verify each step with the command shown.

1. secret.txt is world-readable. Nobody else should read it:
     chmod 600 secret.txt && stat -c '%a %n' secret.txt
2. deploy.sh is a script but not executable:
     chmod 755 deploy.sh && ls -l deploy.sh
3. shared/ should be a collaboration directory for the devs group, with new files
   inheriting the group (setgid). You are already in the devs group:
     chgrp devs shared && chmod 2770 shared && stat -c '%a %G %n' shared
4. report.txt must additionally be readable by alice (who is NOT in your group)
   without opening it to everyone — an ACL, not a mode change:
     setfacl -m u:alice:r-- report.txt && getfacl report.txt
5. dropbox/ should let anyone drop a file but only owners delete their own
   (like /tmp):
     chmod 1777 dropbox && stat -c '%a %n' dropbox

Note: chown to another user needs root, so ownership changes here use chgrp to a
group you belong to. The chmod/chown syntax is identical on a real host.
