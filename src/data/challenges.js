export const CHALLENGES = [
  // CLI Fix — type the correct command
  { id: 'cli1', type: 'cli', prompt: 'You are in /home/user/projects. View the contents of app.py.', context: 'cwd: /home/user/projects', accepts: ['cat app.py'], explanation: '`cat app.py` prints the file contents to the terminal.' },
  { id: 'cli2', type: 'cli', prompt: 'You are in /home/user. List all files (including hidden) in long format.', context: 'cwd: /home/user', accepts: ['ls -la', 'ls -al', 'll'], explanation: '`ls -la` shows all files (-a) in long format (-l). `ll` is a common alias.' },
  { id: 'cli3', type: 'cli', prompt: 'Move into the /var/log directory.', context: 'cwd: /home/user', accepts: ['cd /var/log'], explanation: '`cd /var/log` changes the working directory.' },
  { id: 'cli4', type: 'cli', prompt: 'Print your current working directory to the screen.', context: 'cwd: /home/user', accepts: ['pwd'], explanation: '`pwd` (print working directory) outputs the current path.' },
  { id: 'cli5', type: 'cli', prompt: 'Ping the gateway at 192.168.1.1 (Linux).', context: 'cwd: /home/user', accepts: ['ping 192.168.1.1'], explanation: '`ping 192.168.1.1` sends ICMP echo requests to the host.' },
  { id: 'cli6', type: 'cli', prompt: 'Display the word hello on screen.', context: 'cwd: /home/user', accepts: ['echo hello', 'echo "hello"', "echo 'hello'"], explanation: '`echo hello` prints text to standard output.' },

  // Subnetting — multiple choice
  { id: 'sub1', type: 'subnet', prompt: 'You need at least 60 usable hosts with minimal waste. Which CIDR mask?', options: ['/25 (126 usable)', '/26 (62 usable)', '/27 (30 usable)', '/28 (14 usable)'], correct: 1, explanation: '/26 gives 62 usable hosts — fits 60 with the least waste. /25 wastes too many.' },
  { id: 'sub2', type: 'subnet', prompt: 'What is the network address of 192.168.1.130/26?', options: ['192.168.1.0', '192.168.1.64', '192.168.1.128', '192.168.1.192'], correct: 2, explanation: '/26 increments in blocks of 64. .130 falls in the 128–191 block, so the network address is .128.' },
  { id: 'sub3', type: 'subnet', prompt: 'How many usable host addresses are in a /28?', options: ['14', '16', '30', '62'], correct: 0, explanation: '/28 = 4 host bits → 16 addresses, minus network & broadcast = 14 usable.' },
  { id: 'sub4', type: 'subnet', prompt: 'A subnet mask of 255.255.255.0 equals which CIDR?', options: ['/8', '/16', '/24', '/32'], correct: 2, explanation: '255.255.255.0 = 24 network bits = /24.' },

  // Firewall — multiple choice
  { id: 'fw1', type: 'firewall', prompt: 'You must allow HTTPS but block SSH. Which rule set is correct?', options: ['Allow 443, Deny 22, Deny *', 'Allow 22, Deny 443', 'Deny *, Allow 22', 'Allow 443 only, no default deny'], correct: 0, explanation: 'Allow 443 (HTTPS), explicitly Deny 22 (SSH), then default Deny for everything else.' },
  { id: 'fw2', type: 'firewall', prompt: 'Rules: Allow 443, Allow 80, Deny 22, Deny *. A packet on port 22 arrives. Result?', options: ['Allowed', 'Dropped', 'Sent to server', 'Rate-limited'], correct: 1, explanation: 'Port 22 matches the Deny rule — the packet is dropped at the firewall.' },
  { id: 'fw3', type: 'firewall', prompt: 'What does a "default deny" policy mean?', options: ['All traffic is allowed by default', 'All traffic is blocked unless explicitly allowed', 'Only TCP is blocked', 'Deny only port 22'], correct: 1, explanation: 'Default deny blocks everything not matching an explicit allow rule — the safest baseline.' },
  { id: 'fw4', type: 'firewall', prompt: 'Block RDP (3389) from outside but keep HTTPS working. Best approach?', options: ['Allow 443, Deny 3389, Deny *', 'Allow 3389, Deny 443', 'Deny 443, Allow 3389', 'Allow *, Deny 3389'], correct: 0, explanation: 'Allow 443 for HTTPS, Deny 3389 for RDP, then default Deny for the rest.' },
];

export const TYPE_META = {
  cli: { label: 'CLI Fix', icon: 'Terminal' },
  subnet: { label: 'Subnetting', icon: 'Calculator' },
  firewall: { label: 'Firewall', icon: 'Shield' },
};