import React, { useState, useEffect } from 'react';

const TASKS = [
  { id: '1', title: 'Select rows', prompt: 'Write a SQL SELECT for users older than 21 from table users.', starter: "SELECT *\nFROM users\nWHERE age > 21;", check: (code) => code.toLowerCase().includes('select') && code.toLowerCase().includes('where'), tip: 'Use WHERE for filtering rows.' },
  { id: '2', title: 'Join orders', prompt: 'Join users with orders on user_id and show name + total.', starter: "SELECT u.name, o.total\nFROM users u\nJOIN orders o ON u.id = o.user_id;", check: (code) => code.toLowerCase().includes('join'), tip: 'JOIN combines rows from two tables.' },
  { id: '3', title: 'Group counts', prompt: 'Count orders per user and sort highest first.', starter: "SELECT user_id, COUNT(*) AS total_orders\nFROM orders\nGROUP BY user_id\nORDER BY total_orders DESC;", check: (code) => code.toLowerCase().includes('group by') && code.toLowerCase().includes('count'), tip: 'GROUP BY + COUNT gives aggregated counts.' },
  { id: '4', title: 'Create table', prompt: 'Create a books table with id, title, author_id, and price.', starter: "CREATE TABLE books (\n  id SERIAL PRIMARY KEY,\n  title TEXT NOT NULL,\n  author_id INT,\n  price NUMERIC(10,2)\n);", check: (code) => code.toLowerCase().includes('create table') && code.toLowerCase().includes('primary key'), tip: 'Use PRIMARY KEY for unique row identification.' },
  { id: '5', title: 'Insert rows', prompt: 'Insert two books into books()', starter: "INSERT INTO books (title, author_id, price)\nVALUES ('Clean Code', 1, 35.00);", check: (code) => code.toLowerCase().includes('insert into'), tip: 'INSERT INTO adds rows.' },
  { id: '6', title: 'Update safely', prompt: 'Update price by 10% only where id is known.', starter: "UPDATE books\nSET price = price * 1.10\nWHERE id = 1;", check: (code) => code.toLowerCase().includes('update') && code.toLowerCase().includes('where'), tip: 'Always prefer UPDATE ... WHERE ...' },
];

export default function SqlLab() {
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
    setResult({ ok: true, output: 'Query plan: Seq Scan on users (cost=0.00..35.00 rows=1000 width=44)\nPlanning time: 0.05 ms' });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink-1">{task.title}</h3>
          <p className="text-sm text-ink-2">{task.prompt}</p>
        </div>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink-1 shadow-sm">
          {TASKS.map((t) => (
            <option key={t.id} value={t.id}>{t.id}. {t.title}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-xl border border-terminal-border bg-terminal-bg p-4 font-mono text-sm text-terminal-text shadow-lg">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="h-64 w-full bg-transparent text-terminal-text caret-terminal-bright outline-none" spellCheck={false} />
        <div className="mt-3 flex items-center gap-2 border-t border-terminal-border pt-3">
          <button onClick={run} className="rounded-lg bg-action-surface px-3 py-1.5 text-xs font-semibold text-action-surface-ink transition hover:bg-action-surface-hover">Run</button>
          <button onClick={validate} className="rounded-lg border border-terminal-text/40 bg-terminal-text/10 px-3 py-1.5 text-xs font-semibold text-terminal-bright transition hover:bg-terminal-text/20">Validate</button>
        </div>
        {result && (
          <div className={`mt-3 rounded-lg border p-3 text-xs ${result.ok ? 'border-terminal-text/30 bg-terminal-text/[0.08] text-terminal-text' : 'border-amber-500/40 bg-amber-500/[0.08] text-amber-200'}`}>
            {result.output || (result.ok ? 'Looks good.' : 'Not quite there.')}
            {result.tip && <div className="mt-2 text-terminal-muted">Hint: <code className="text-terminal-bright">{result.tip}</code></div>}
          </div>
        )}
      </div>
    </div>
  );
}
