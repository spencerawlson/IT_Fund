import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LabTerminal from '@/components/labs/LabTerminal';
import { labsApi } from '@/api/labs';

// The terminal-first Interactive Lab console: the learner discovers and launches labs by typing
// (`labs`, `lab start <name|NN>`, `lab info <name>`, `help`) rather than clicking a card. `lab start`
// navigates to the lab workspace. `startHint` (a lab id/slug/number, e.g. from a "Build this" link)
// preselects a lab and shows its `lab start` line WITHOUT auto-running it — the learner types it.
//
// Reused by the standalone /labs launcher and embedded directly on the Practice page, so the
// terminal is visible the moment you arrive. One local command interpreter, no backend session here.

const CATEGORY_ORDER = ['networking', 'cloud', 'portblast', 'cybersecurity', 'python'];
const CATEGORY_LABEL = {
  networking: 'Networking & Routing',
  cloud: 'Cloud & IaC',
  cybersecurity: 'Security & Blue Team',
  portblast: 'Security & Blue Team',
  python: 'Python Automation',
};

function orderLabs(labs) {
  const rank = (c) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...labs].sort((a, b) => rank(a.category) - rank(b.category) || a.title.localeCompare(b.title));
}

const pad2 = (n) => String(n).padStart(2, '0');

export default function LabConsole({ startHint = null, prompt = 'roadtocissp@lab:~$ ' }) {
  const navigate = useNavigate();
  const [labs, setLabs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    labsApi.listDefinitions()
      .then(({ labs: defs }) => { if (live) setLabs(orderLabs(defs)); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  const lookup = useMemo(() => {
    const byToken = {};
    (labs || []).forEach((l, i) => {
      byToken[String(i + 1)] = l;
      byToken[pad2(i + 1)] = l;
      byToken[l.id.toLowerCase()] = l;
      byToken[l.slug.toLowerCase()] = l;
    });
    return byToken;
  }, [labs]);

  const listText = (filter) => {
    const shown = filter
      ? (labs || []).filter((l) => CATEGORY_LABEL[l.category]?.toLowerCase().includes(filter) || l.category.includes(filter))
      : labs || [];
    if (!shown.length) return `No labs match "${filter}". Type 'labs' to see them all.`;
    const lines = [];
    let group = null;
    (labs || []).forEach((l, i) => {
      if (!shown.includes(l)) return;
      const label = CATEGORY_LABEL[l.category] || l.category;
      if (label !== group) { group = label; lines.push('', label.toUpperCase(), '='.repeat(label.length)); }
      lines.push(`  [${pad2(i + 1)}] ${l.title}   (${l.slug})`);
    });
    lines.push('', "Type  lab start <name|number>  to begin, or  lab info <name>  for details.");
    return lines.join('\n').trimStart();
  };

  const infoText = (l) => {
    if (!l) return "No such lab. Type 'labs' to list them.";
    return [
      l.title,
      '-'.repeat(l.title.length),
      `Difficulty: ${l.difficulty}   ·   ~${l.estimated_minutes} min   ·   ${l.objectives.length} objectives`,
      '',
      l.description,
      '',
      `To begin, type:  lab start ${l.slug}`,
    ].join('\n');
  };

  const helpText = (topic) => {
    const t = (topic || '').toLowerCase().replace('lab', '').trim();
    if (t === 'start') return 'lab start <name|number> — load a lab and drop into its terminal.\n  e.g. lab start ospf-single-area   (or: lab start 05)';
    if (t === 'info') return 'lab info <name|number> — show a lab\'s mission, difficulty and objective count before starting.';
    if (t === 'list' || t === 'labs') return 'labs            — list every lab, grouped by track.\nlabs <track>    — filter (e.g. labs networking, labs cloud, labs security).';
    return [
      'Interactive Lab — commands',
      '  labs [track]        list available labs (optionally filter by track)',
      '  lab list            same as labs',
      '  lab info <name>     show a lab\'s mission and objectives',
      '  lab start <name>    load a lab (accepts its slug or number)',
      '  clear               clear the screen',
      '  help [command]      this help, or help for one command',
      '',
      'Inside a lab you also get: objectives · hint · check · topology · lab reset · lab exit · help',
    ].join('\n');
  };

  const banner = useMemo(() => {
    if (error) return [`Could not load labs: ${error}`];
    if (!labs) return ['Road to CISSP Interactive Lab', 'Loading lab catalogue...'];
    const lines = ['Road to CISSP Interactive Lab', '=============================', '', listText()];
    if (startHint && lookup[startHint.toLowerCase()]) {
      const l = lookup[startHint.toLowerCase()];
      // A lab was preselected (from the Visual Lab's "Build this" or a Practice link). We do NOT
      // auto-start it — the learner enters by typing, which is the whole point of terminal-first.
      lines.push('', `Selected lab:  ${l.title}`, '', `To begin, type:  lab start ${l.slug}`);
    } else if (startHint) {
      lines.push('', `No lab matches "${startHint}". Type 'labs' to list them.`);
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs, error, startHint]);

  const runner = async (raw) => {
    const parts = raw.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    if (!labs) return { output: 'Still loading the lab catalogue — try again in a moment.' };
    if (cmd === 'help' || cmd === '?') return { output: helpText(parts.slice(1).join(' ')) };
    if (cmd === 'labs') return { output: listText((parts[1] || '').toLowerCase()) };
    if (cmd === 'lab') {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'list') return { output: listText() };
      if (sub === 'info') return { output: infoText(lookup[(parts[2] || '').toLowerCase()]) };
      if (sub === 'start') {
        const l = lookup[(parts[2] || '').toLowerCase()];
        if (!l) return { output: `No such lab: "${parts[2] || ''}". Type 'labs' to list them.`, exit_code: 1 };
        setTimeout(() => navigate(`/labs/${l.id}`), 350);
        return { output: `Loading lab: ${l.title}...` };
      }
      return { output: 'Usage: lab list | lab info <name> | lab start <name>', exit_code: 1 };
    }
    return { output: `${cmd}: command not found. Type 'help'.`, exit_code: 127 };
  };

  return (
    <LabTerminal
      key={labs ? 'ready' : 'loading'}
      runner={runner}
      banner={banner}
      prompt={prompt}
    />
  );
}
