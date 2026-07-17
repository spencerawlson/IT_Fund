import React, { useState, useEffect } from 'react';

const TASKS = [
  { id: '1', title: 'Read a file', prompt: 'Use pathlib to read a text file and print the first line.', starter: "from pathlib import Path\npath = Path('notes.txt'\n# TODO: print first line if file exists", check: (code) => code.includes("read_text") || code.includes("read_text()"), tip: 'Path("notes.txt").read_text().splitlines()[0]' },
  { id: '2', title: 'Count words', prompt: 'Count how many times "cloud" appears in a string.', starter: "text = 'Cloud computing is great. Cloud is scalable.'\ncount = 0\n# TODO: count occurrences of 'cloud'", check: (code) => code.toLowerCase().includes('count(') || code.includes('.count'), tip: 'text.lower().count("cloud")' },
  { id: '3', title: 'Fetch URL', prompt: 'Use requests.get to fetch https://httpbin.org/get and print status.', starter: "import requests\nresp = requests.get('https://httpbin.org/get'\n# TODO: print status code", check: (code) => code.includes('status_code') || code.includes('status code'), tip: 'print(resp.status_code)' },
  { id: '4', title: 'Walk files', prompt: 'Use pathlib to list .py files in the current directory.', starter: "from pathlib import Path\nroot = Path('.'\n# TODO: list .py files in current folder", check: (code) => code.includes('*.py') || code.includes('rglob') || code.includes('glob'), tip: 'list(root.glob("*.py"))' },
  { id: '5', title: 'Parse CSV', prompt: 'Read a CSV file and print the header row.', starter: "import csv\n# TODO: open 'data.csv' and print first row", check: (code) => code.includes('csv.reader') || code.includes('DictReader'), tip: 'next(csv.reader(open("data.csv")))' },
  { id: '6', title: 'Run a subprocess', prompt: 'Use subprocess.run to echo hello and capture output.', starter: "import subprocess\n# TODO: run echo hello and capture output", check: (code) => code.includes('subprocess.run') && code.includes('capture_output'), tip: 'subprocess.run(["echo", "hello"], capture_output=True, text=True).stdout.strip()' },
];

export default function PythonAutomationLab() {
  const [taskId, setTaskId] = useState(TASKS[0].id);
  const [code, setCode] = useState(TASKS[0].starter);
  const [result, setResult] = useState(null);

  const task = TASKS.find((t) => t.id === taskId);

  useEffect(() => {
    setCode(task.starter);
    setResult(null);
  }, [taskId]);

  const validate = () => {
    const ok = typeof task.check === 'function' ? task.check(code) : true;
    setResult({ ok, tip: task.tip });
  };

  const run = () => {
    setResult({ ok: true, output: 'Simulated run completed. Config/logging buffers are unchanged by this demo.' });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{task.title}</h3>
          <p className="text-sm text-slate-400">{task.prompt}</p>
        </div>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white">
          {TASKS.map((t) => (
            <option key={t.id} value={t.id}>{t.id}. {t.title}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#060a10] p-4 font-mono text-sm shadow-lg">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="h-64 w-full bg-transparent text-slate-100 outline-none" spellCheck={false} />
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <button onClick={run} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15">Run</button>
          <button onClick={validate} className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20">Validate</button>
        </div>
        {result && (
          <div className={`mt-3 rounded-lg border p-3 text-xs ${result.ok ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200' : 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200'}`}>
            {result.output || (result.ok ? 'Looks good.' : 'Not quite there.')}
            {result.tip && <div className="mt-2 text-slate-300">Hint: <code className="text-slate-200">{result.tip}</code></div>}
          </div>
        )}
      </div>
    </div>
  );
}
