import React, { useState, useRef, useEffect } from 'react';
import { TerminalSquare, Command } from 'lucide-react';

// Internal paths use '/' for both shells.
const BASH_FS = {
  '/': { type: 'dir', children: ['home', 'etc', 'var', 'usr', 'tmp'] },
  '/home': { type: 'dir', children: ['user'] },
  '/home/user': { type: 'dir', children: ['notes.txt', 'script.sh', '.bashrc', 'projects'] },
  '/home/user/projects': { type: 'dir', children: ['app.py', 'README.md'] },
  '/etc': { type: 'dir', children: ['hosts', 'passwd', 'os-release'] },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: ['auth.log', 'syslog'] },
  '/usr': { type: 'dir', children: ['bin'] },
  '/usr/bin': { type: 'dir', children: [] },
  '/tmp': { type: 'dir', children: [] },
  '/home/user/notes.txt': { type: 'file', content: 'TODO:\n- Practice subnetting\n- Re-read OSI model\n- Set up SSH keys' },
  '/home/user/script.sh': { type: 'file', content: '#!/bin/bash\necho "Hello, Linux!"\nfor i in 1 2 3; do\n  echo "Count: $i"\ndone' },
  '/home/user/.bashrc': { type: 'file', content: 'export PS1="\\u@\\h:\\w$ "\nalias ll="ls -la"' },
  '/home/user/projects/app.py': { type: 'file', content: 'print("Hello from Python")' },
  '/home/user/projects/README.md': { type: 'file', content: '# Projects\nMy learning sandbox.' },
  '/etc/hosts': { type: 'file', content: '127.0.0.1   localhost\n::1         localhost\n192.168.1.1 router' },
  '/etc/passwd': { type: 'file', content: 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:User:/home/user:/bin/bash' },
  '/etc/os-release': { type: 'file', content: 'NAME="Ubuntu"\nVERSION="22.04 LTS"' },
  '/var/log/auth.log': { type: 'file', content: 'Jul 4 09:12:01 host sshd[842]: Accepted publickey for user from 10.0.0.5' },
  '/var/log/syslog': { type: 'file', content: 'Jul 4 09:12:00 host systemd[1]: Started nginx.service.' },
};

const PS_FS = {
  '/': { type: 'dir', children: ['Users', 'Windows'] },
  '/Users': { type: 'dir', children: ['user'] },
  '/Users/user': { type: 'dir', children: ['Desktop', 'Documents', 'notes.txt'] },
  '/Users/user/Desktop': { type: 'dir', children: ['shortcut.lnk'] },
  '/Users/user/Documents': { type: 'dir', children: ['report.docx', 'servers.txt'] },
  '/Windows': { type: 'dir', children: ['System32'] },
  '/Windows/System32': { type: 'dir', children: ['drivers', 'config'] },
  '/Users/user/notes.txt': { type: 'file', content: 'TODO:\r\n- Review Group Policy\r\n- Check NTFS permissions\r\n- Patch servers' },
  '/Users/user/Documents/servers.txt': { type: 'file', content: 'DC01\t10.0.0.10\r\nFS01\t10.0.0.20\r\nWEB01\t10.0.0.30' },
  '/Users/user/Documents/report.docx': { type: 'file', content: '[Binary file — cannot display as text]' },
  '/Users/user/Desktop/shortcut.lnk': { type: 'file', content: '[Windows shortcut]' },
};

const BASH_HOME = '/home/user';

function normalize(parts) {
  const stack = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return '/' + stack.join('/');
}
function resolve(cwd, arg) {
  if (!arg || arg === '.') return cwd;
  const isAbs = arg.startsWith('/');
  const combined = (isAbs ? '' : cwd) + '/' + arg;
  return normalize(combined.split('/'));
}
function childPath(path, name) {
  return (path === '/' ? '' : path) + '/' + name;
}
function getNode(path, fs) {
  return fs[path] || null;
}
function displayCwd(cwd, mode) {
  if (mode === 'ps') return 'C:' + (cwd === '/' ? '\\' : cwd.replace(/\//g, '\\'));
  if (cwd === BASH_HOME) return '~';
  if (cwd.startsWith(BASH_HOME + '/')) return '~' + cwd.slice(BASH_HOME.length);
  return cwd;
}
function prompt(cwd, mode) {
  return mode === 'ps' ? `PS ${displayCwd(cwd, mode)}> ` : `user@host:${displayCwd(cwd, mode)}$ `;
}

function runCommand(raw, mode, cwd, fs, histArr) {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };
  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);
  const out = [];

  const alias = (c) => {
    if (mode === 'ps') {
      const map = {
        'dir': 'ls', 'Get-ChildItem': 'ls', 'gci': 'ls',
        'cd': 'cd', 'Set-Location': 'cd', 'sl': 'cd',
        'pwd': 'pwd', 'Get-Location': 'pwd', 'gl': 'pwd',
        'cat': 'cat', 'type': 'cat', 'Get-Content': 'cat', 'gc': 'cat',
        'echo': 'echo', 'Write-Output': 'echo', 'write': 'echo',
        'clear': 'clear', 'cls': 'clear', 'Clear-Host': 'clear',
        'ps': 'ps', 'Get-Process': 'ps', 'gps': 'ps',
        'ipconfig': 'ifconfig', 'Get-NetIPConfiguration': 'ifconfig',
        'date': 'date', 'Get-Date': 'date',
        'help': 'help', 'whoami': 'whoami', 'history': 'history', 'ping': 'ping',
      };
      return map[c] || c;
    }
    const map = { 'll': 'lsl', 'dir': 'ls' };
    return map[c] || c;
  };
  const c = alias(cmd);

  switch (c) {
    case 'help':
      out.push(mode === 'ps'
        ? 'Commands: dir, cd, Get-Location, type, echo, whoami, Get-Process, ipconfig, Get-Date, ping, cls, help, history'
        : 'Commands: ls, cd, pwd, cat, echo, whoami, ps, ifconfig, ip, ping, uname, date, man, history, clear, help');
      out.push('Tip: use ↑/↓ to recall commands. This is a simulated shell — files are not persisted.');
      break;
    case 'pwd':
      out.push(mode === 'ps' ? displayCwd(cwd, mode) : cwd);
      break;
    case 'ls': {
      const target = args[0] ? resolve(cwd, args[0].replace(/\\/g, '/')) : cwd;
      const node = getNode(target, fs);
      if (!node) out.push(`ls: ${args[0] || target}: No such file or directory`);
      else if (node.type === 'file') out.push(args[0] || target);
      else out.push((node.children || []).join('   ') || '(empty)');
      break;
    }
    case 'lsl': {
      const target = args[0] ? resolve(cwd, args[0].replace(/\\/g, '/')) : cwd;
      const node = getNode(target, fs);
      if (!node || node.type !== 'dir') { out.push('ls: not a directory'); break; }
      (node.children || []).forEach((name) => {
        const child = getNode(childPath(target, name), fs);
        const isDir = child && child.type === 'dir';
        out.push(`${isDir ? 'drwxr-xr-x' : '-rw-r--r--'}  user  ${isDir ? name + '/' : name}`);
      });
      break;
    }
    case 'cd': {
      if (!args[0]) return { lines: [], cwd: mode === 'ps' ? '/Users/user' : BASH_HOME };
      const target = resolve(cwd, args[0].replace(/\\/g, '/'));
      const node = getNode(target, fs);
      if (node && node.type === 'dir') return { lines: [], cwd: target };
      out.push(`cd: ${args[0]}: No such directory`);
      break;
    }
    case 'cat': {
      if (!args[0]) { out.push('usage: cat <file>'); break; }
      const target = resolve(cwd, args[0].replace(/\\/g, '/'));
      const node = getNode(target, fs);
      if (!node) out.push(`cat: ${args[0]}: No such file`);
      else if (node.type === 'dir') out.push(`cat: ${args[0]}: Is a directory`);
      else (node.content || '').split(/\r?\n/).forEach((l) => out.push(l));
      break;
    }
    case 'echo':
      out.push(args.join(' ').replace(/^["']|["']$/g, ''));
      break;
    case 'whoami':
      out.push(mode === 'ps' ? 'host\\user' : 'user');
      break;
    case 'date':
      out.push(new Date().toString());
      break;
    case 'uname':
      if (mode === 'ps') { out.push('PowerShell does not use uname.'); break; }
      out.push(args[0] === '-a' ? 'Linux host 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux' : 'Linux');
      break;
    case 'ps':
      if (mode === 'ps') {
        out.push('Handles  NPM(K)    PM(K)      WS(K)     Id  ProcessName');
        out.push('    120      12    18400      22000    731  nginx');
        out.push('     85       8    12000      15000    740  sshd');
        out.push('    200      15    30000      38000   1204  powershell');
      } else {
        out.push('  PID TTY          TIME CMD');
        out.push('  842 pts/0    00:00:00 bash');
        out.push('  731 ?        00:00:01 nginx');
        out.push('  740 ?        00:00:00 sshd');
        out.push('  901 pts/0    00:00:00 ps');
      }
      break;
    case 'ifconfig':
      if (mode === 'ps') {
        out.push('Windows IP Configuration');
        out.push('');
        out.push('Ethernet adapter Ethernet0:');
        out.push('   IPv4 Address. . . . . . . . . . . : 192.168.1.42');
        out.push('   Subnet Mask . . . . . . . . . . . : 255.255.255.0');
        out.push('   Default Gateway . . . . . . . . . : 192.168.1.1');
      } else {
        out.push('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
        out.push('        inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255');
        out.push('        ether 08:00:27:5a:3b:9c');
        out.push('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536');
        out.push('        inet 127.0.0.1  netmask 255.0.0.0');
      }
      break;
    case 'ping': {
      const host = args.find((a) => !a.startsWith('-')) || '8.8.8.8';
      for (let i = 0; i < 4; i++) {
        if (mode === 'ps') out.push(`Reply from ${host}: bytes=32 time=${10 + i}ms TTL=117`);
        else out.push(`64 bytes from ${host}: icmp_seq=${i + 1} ttl=117 time=${(10 + i).toFixed(1)} ms`);
      }
      if (mode === 'ps') out.push(`\nPing statistics for ${host}: Packets: Sent = 4, Received = 4, Lost = 0`);
      else out.push(`\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss`);
      break;
    }
    case 'man':
      if (mode === 'ps') { out.push('Get-Help <cmdlet>'); break; }
      out.push(args[0] ? `${args[0]} — see the concept cards in the OS / Linux modules for details.` : 'What manual page do you want?');
      break;
    case 'history':
      histArr.forEach((h, i) => out.push(`  ${i + 1}  ${h}`));
      break;
    case 'clear':
      return { lines: [], clear: true };
    default:
      out.push(mode === 'ps'
        ? `${cmd}: The term '${cmd}' is not recognized. Try 'help'.`
        : `${cmd}: command not found. Try 'help'.`);
  }
  return { lines: out };
}

export default function TerminalSimulator() {
  const [mode, setMode] = useState('bash');
  const [cwd, setCwd] = useState('/home/user');
  const [input, setInput] = useState('');
  const [blocks, setBlocks] = useState([{ type: 'prompt', text: '' }]);
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const fs = mode === 'ps' ? PS_FS : BASH_FS;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [blocks]);

  const switchMode = (m) => {
    setMode(m);
    setCwd(m === 'ps' ? '/Users/user' : '/home/user');
    setBlocks([{ type: 'prompt', text: '' }]);
    setHistory([]);
    setInput('');
  };

  const submit = (e) => {
    e.preventDefault();
    const raw = input;
    const newHistory = raw.trim() ? [...history, raw] : history;
    const result = runCommand(raw, mode, cwd, fs, history);
    let newCwd = cwd;

    if (result.clear) {
      setBlocks([{ type: 'prompt', text: '' }]);
    } else {
      if (result.cwd) newCwd = result.cwd;
      setCwd(newCwd);
      const additions = [{ type: 'cmd', text: raw, prompt: prompt(cwd, mode) }];
      result.lines.forEach((line) => additions.push({ type: 'out', text: line }));
      setBlocks((b) => [...b, ...additions, { type: 'prompt', text: '' }]);
    }
    setHistory(newHistory);
    setHistIdx(-1);
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(idx); setInput(history[idx]); }
    }
  };

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/[0.06] p-1">
        <button
          onClick={() => switchMode('bash')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'bash' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <TerminalSquare size={14} /> Bash
        </button>
        <button
          onClick={() => switchMode('ps')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'ps' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Command size={14} /> PowerShell
        </button>
      </div>

      <div
        className="h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/55 backdrop-blur-xl p-4 font-mono text-[13px] leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        <p className="mb-2 text-slate-400">
          {mode === 'bash' ? 'Ubuntu 22.04 LTS — type `help` to see commands.' : 'Windows PowerShell — type `help` to see commands.'}
        </p>
        {blocks.map((b, i) => {
          if (b.type === 'cmd') {
            return (
              <div key={i} className="whitespace-pre-wrap break-words">
                <span className="text-teal-400">{b.prompt}</span>
                <span className="text-white">{b.text}</span>
              </div>
            );
          }
          if (b.type === 'out') {
            return <div key={i} className="whitespace-pre-wrap break-words text-slate-300">{b.text}</div>;
          }
          return null;
        })}
        <form onSubmit={submit} className="flex items-center">
          <span className="whitespace-pre text-teal-400">{prompt(cwd, mode)}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="ml-1 flex-1 bg-transparent text-white caret-teal-400 outline-none"
          />
        </form>
        <div ref={endRef} />
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Try: <span className="font-mono text-slate-400">ls</span>, <span className="font-mono text-slate-400">cd projects</span>, <span className="font-mono text-slate-400">cat notes.txt</span>, <span className="font-mono text-slate-400">ping 192.168.1.1</span> — use ↑ to recall history.
      </p>
    </div>
  );
}