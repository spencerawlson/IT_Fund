import React, { useState, useEffect } from 'react';

const COMMANDS = [
  { cmd: 'ls -la', out: 'total 12\ndrwxr-xr-x  2 user user 4096 Jul 16 10:00 .\ndrwxr-xr-x  3 user user 4096 Jul 16 09:58 ..\n-rw-r--r--  1 user user  220 Jul 16 09:58 .bashrc\n-rw-r--r--  1 user user  3771 Jul 16 09:58 .profile' },
  { cmd: 'pwd', out: '/home/user' },
  { cmd: 'cd /var/log && ls', out: 'alternatives.log  apt  auth.log  dpkg.log  faillog  journal' },
  { cmd: 'whoami', out: 'user' },
  { cmd: 'sudo apt update', out: 'Reading package lists... Done\nBuilding dependency tree... Done\nAll packages are up to date.' },
  { cmd: 'ps aux | grep nginx', out: 'root      1234  0.0  0.1  12368  1020 ?  Ss  10:02  0:00 nginx: master\nwww-data  1235  0.0  0.2  14520  2040 ?  S   10:02  0:00 nginx: worker' },
  { cmd: 'chmod 755 script.sh', out: '' },
  { cmd: 'grep "error" app.log', out: '2026-07-16 10:01:22 [error] Connection timed out\n2026-07-16 10:01:25 [error] Failed to bind to port 8000' },
];

export default function LinuxTerminalLab() {
  const [history, setHistory] = useState([{ type: 'info', text: 'Try Linux commands. Suggested: ls -la, pwd, whoami, ps aux | grep nginx' }]);
  const [input, setInput] = useState('');
  const doneRef = React.useRef(null);

  useEffect(() => { doneRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const run = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    setHistory((h) => [...h, { type: 'cmd', text: trimmed }]);
    const match = COMMANDS.find((c) => trimmed.toLowerCase() === c.cmd.toLowerCase());
    const out = match ? match.out : `bash: ${trimmed}: command not found`;
    setTimeout(() => {
      setHistory((h) => [...h, { type: 'out', text: out }]);
    }, 180);
  };

  const submit = (e) => {
    e.preventDefault();
    run(input);
    setInput('');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-white/10 bg-[#0a0e14] p-4 font-mono text-sm shadow-lg">
        <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="h-2 w-2 rounded-full bg-red-500/80" />
          <span className="h-2 w-2 rounded-full bg-amber-500/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-[11px] text-slate-400">bash — Linux terminal</span>
        </div>
        <div className="h-72 space-y-2 overflow-y-auto pr-2">
          {history.map((row, i) => (
            <div key={i} className={row.type === 'cmd' ? 'text-emerald-300' : row.type === 'out' ? 'whitespace-pre text-slate-300' : 'text-slate-500'}>
              {row.type === 'cmd' && <span>{'user@linux:~$ ' + row.text}</span>}
              {row.type === 'out' && <span>{row.text}</span>}
              {row.type === 'info' && <span>{row.text}</span>}
            </div>
          ))}
          <div ref={doneRef} />
        </div>
        <form onSubmit={submit} className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <span className="text-emerald-300">user@linux:~$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-slate-100 outline-none"
            placeholder="Type a command…"
            autoFocus
          />
        </form>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {COMMANDS.map((c) => (
          <button key={c.cmd} onClick={() => run(c.cmd)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/25 hover:bg-white/[0.07]">
            {c.cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
