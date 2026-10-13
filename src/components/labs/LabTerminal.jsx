import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { labsApi } from '@/api/labs';

// A shell for a lab session. The learner types real tools (nmap, Cisco IOS config, dig,
// ping...) and the backend answers through the LabProvider `exec` seam. Simulated labs return
// realistic canned output while executing nothing and record findings server-side, so objectives
// tick off as you work; live-execution labs (Docker) run the commands for real in a container,
// and the learner attests each objective in the workspace instead. The prompt is dynamic:
// shells whose prompt changes (e.g. IOS modes, or switching devices with `connect`) return a
// new one with each command.
//
// Exposes an imperative `send(command)` so the workspace's device-console tabs can `connect <device>`.

const LabTerminal = forwardRef(function LabTerminal(
  { sessionId, runner, banner = [], prompt: initialPrompt = 'student@lab:~$ ', disabled = false, onSession, onError, onPrompt },
  ref,
) {
  // How a command is executed: a caller-supplied runner (e.g. the local lab launcher) or, by default,
  // the backend lab session's exec endpoint. Both return { output, exit_code, clear, prompt, session? }.
  const exec = runner || ((cmd) => labsApi.exec(sessionId, cmd));
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
      const res = await exec(raw);
      const items = res.output
        ? res.output.split('\n').map((text) => ({ kind: res.exit_code ? 'err' : 'out', text }))
        : [];
      // `clear` wipes the screen first (including the echoed command), then the
      // command's own output is the only thing shown — `labs` leaves just titles.
      setLines(res.clear ? items : (prev) => [...prev, ...items]);
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

  // Solarized terminal: green output on the deep blue-green base, brighter green for
  // commands, Solarized muted text for the banner, and a readable red for errors.
  const colour = (kind) =>
    kind === 'cmd' ? 'text-terminal-bright'
      : kind === 'err' ? 'text-terminal-error'
        : kind === 'sys' ? 'text-terminal-muted'
          : 'text-terminal-text';

  return (
    <div
      className="h-[26rem] overflow-y-auto rounded-xl border border-terminal-border bg-terminal-bg p-4 font-mono text-[13px] leading-relaxed shadow-inner sm:h-[30rem]"
      onClick={() => inputRef.current?.focus()}
      role="log"
      aria-live="polite"
      aria-label="Lab terminal"
    >
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap break-words ${colour(l.kind)}`}>
          {l.kind === 'cmd' ? <><span className="text-terminal-text">{l.prompt || prompt}</span>{l.text}</> : (l.text || ' ')}
        </div>
      ))}

      {!disabled ? (
        <form onSubmit={submit} className="flex items-center">
          <span className="whitespace-pre text-terminal-text">{prompt}</span>
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
            className="ml-1 min-w-0 flex-1 bg-transparent text-terminal-bright caret-terminal-bright outline-none disabled:opacity-60"
          />
        </form>
      ) : (
        <div className="text-terminal-muted">— session ended —</div>
      )}
      <div ref={endRef} />
    </div>
  );
});

export default LabTerminal;
