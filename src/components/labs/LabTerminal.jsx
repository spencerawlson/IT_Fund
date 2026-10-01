import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { labsApi } from '@/api/labs';

// A simulated shell for a lab session. The learner types real tools (nmap, Cisco IOS config, dig,
// ping...) and the backend returns realistic canned output for a *provided* environment while
// executing nothing; the findings each command establishes are recorded server-side, so objectives
// tick off as you work. The prompt is dynamic: shells whose prompt changes (e.g. IOS modes, or
// switching devices with `connect`) return a new one with each command. This is a UI over the
// LabProvider `exec` seam — real execution can be swapped in later with no change here.
//
// Exposes an imperative `send(command)` so the workspace's device-console tabs can `connect <device>`.

const LabTerminal = forwardRef(function LabTerminal(
  { sessionId, banner = [], prompt: initialPrompt = 'student@lab:~$ ', disabled = false, onSession, onError, onPrompt },
  ref,
) {
  // lines: { kind: 'sys' | 'cmd' | 'out' | 'err', text, prompt? }
  const [lines, setLines] = useState(() => banner.map((text) => ({ kind: 'sys', text })));
  const [prompt, setPrompt] = useState(initialPrompt);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false); // guards double-submit without disabling (disabling drops focus)
  const promptRef = useRef(initialPrompt);
  promptRef.current = prompt;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines, busy]);

  const append = (items) => setLines((prev) => [...prev, ...items]);

  const runCommand = async (raw) => {
    if (busyRef.current) return; // a command is already in flight; ignore this one
    const trimmed = raw.trim();
    const promptAt = promptRef.current; // the prompt this command was typed at
    if (trimmed) setHistory((h) => [...h, raw]);

    append([{ kind: 'cmd', text: raw, prompt: promptAt }]);
    if (!trimmed) return;

    if (trimmed === 'clear' || trimmed === 'cls') {
      setLines([]);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const res = await labsApi.exec(sessionId, raw);
      if (res.clear) {
        setLines([]);
      } else if (res.output) {
        append(res.output.split('\n').map((text) => ({ kind: res.exit_code ? 'err' : 'out', text })));
      }
      if (res.prompt) {
        setPrompt(res.prompt);
        if (onPrompt) onPrompt(res.prompt);
      }
      if (res.session && onSession) onSession(res.session);
    } catch (err) {
      append([{ kind: 'err', text: err.message || 'Command failed.' }]);
      if (onError) onError(err.message || 'Command failed.');
    } finally {
      busyRef.current = false;
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  useImperativeHandle(ref, () => ({
    send: (command) => runCommand(command),
    focus: () => inputRef.current?.focus(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sessionId]);

  const submit = (e) => {
    e.preventDefault();
    const raw = input;
    setInput('');
    setHistIdx(-1);
    runCommand(raw);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
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

  const colour = (kind) =>
    kind === 'cmd' ? 'text-white'
      : kind === 'err' ? 'text-red-400'
        : kind === 'sys' ? 'text-slate-500'
          : 'text-slate-300';

  return (
    <div
      className="h-[26rem] overflow-y-auto rounded-xl border border-black/20 bg-[#0a0e14] p-4 font-mono text-[13px] leading-relaxed shadow-inner sm:h-[30rem]"
      onClick={() => inputRef.current?.focus()}
      role="log"
      aria-live="polite"
      aria-label="Lab terminal"
    >
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap break-words ${colour(l.kind)}`}>
          {l.kind === 'cmd' ? <><span className="text-emerald-400">{l.prompt || prompt}</span>{l.text}</> : (l.text || ' ')}
        </div>
      ))}

      {!disabled ? (
        <form onSubmit={submit} className="flex items-center">
          <span className="whitespace-pre text-emerald-400">{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Terminal command"
            className="ml-1 min-w-0 flex-1 bg-transparent text-white caret-emerald-400 outline-none disabled:opacity-60"
          />
        </form>
      ) : (
        <div className="text-slate-500">— session ended —</div>
      )}
      <div ref={endRef} />
    </div>
  );
});

export default LabTerminal;
