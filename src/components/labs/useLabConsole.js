import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labsApi } from '@/api/labs';

// Shared command interpreter for the terminal-first Interactive Lab consoles.
// Used by both the standalone /labs launcher (LabLauncher) and the Practice-page
// embed (LabConsole), so the banner and commands can never drift apart again.

const CATEGORY_ORDER = ['networking', 'cloud', 'devops', 'portblast', 'cybersecurity', 'python', 'linux'];
const CATEGORY_LABEL = {
  networking: 'Networking & Routing',
  cloud: 'Cloud & IaC',
  devops: 'DevOps & IaC',
  cybersecurity: 'Security & Blue Team',
  portblast: 'Security & Blue Team',
  python: 'Python Automation',
  linux: 'Linux',
};

function orderLabs(labs) {
  const rank = (c) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...labs].sort((a, b) => rank(a.category) - rank(b.category) || a.title.localeCompare(b.title));
}

const pad2 = (n) => String(n).padStart(2, '0');

export function useLabConsole({ startHint = null } = {}) {
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

  const tracksText = () => {
    const counts = {};
    (labs || []).forEach((l) => { counts[l.category] = (counts[l.category] || 0) + 1; });
    const lines = ['LAB TRACKS', '==========', ''];
    [...new Set(orderLabs(labs || []).map((l) => l.category))].forEach((c) => {
      const label = CATEGORY_LABEL[c] || c;
      lines.push(`  ${label} — ${counts[c]} lab${counts[c] === 1 ? '' : 's'}   (labs ${c})`);
    });
    lines.push('', `Type 'labs' for every title, or 'labs <track>' to browse one track.`);
    return lines.join('\n');
  };

  const searchText = (term) => {
    const q = (term || '').toLowerCase().trim();
    if (!q) return `Usage: search <keyword> — e.g. search terraform`;
    const hits = (labs || []).map((l, i) => ({ l, i })).filter(({ l }) =>
      l.title.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q),
    );
    if (!hits.length) return `No labs match "${term}". Type 'labs' to browse them all.`;
    const lines = [`${hits.length} match${hits.length === 1 ? '' : 'es'} for "${term}":`, ''];
    hits.forEach(({ l, i }) => lines.push(`  [${pad2(i + 1)}] ${l.title}   (${l.slug})`));
    lines.push('', `Type  lab info <number>  for details,  lab start <number>  to begin.`);
    return lines.join('\n');
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
      '  tracks              browse lab tracks with lab counts',
      '  labs [track]        list lab titles, optionally filtered by track',
      '  search <keyword>    find labs by title or topic (e.g. search terraform)',
      '  lab list            same as labs',
      '  lab info <name|#>   show a lab\'s mission, difficulty and objective count',
      '  lab start <name|#>   load a lab (accepts its slug or number)',
      '  clear               clear the screen',
      '  help [command]      this help, or help for one command',
      '',
      'Inside a lab you also get: objectives · hint · check · topology · lab reset · lab exit · help',
    ].join('\n');
  };

  const banner = useMemo(() => {
    if (error) return [`Could not load labs: ${error}`];
    if (!labs) return ['Road to CISSP — Interactive Labs', 'Loading lab catalogue...'];
    const lines = [
      'Road to CISSP — Interactive Labs',
      '=================================',
      '',
      `${labs.length} hands-on labs across ${new Set(labs.map((l) => l.category)).size} tracks.`,
      '',
      `Type  tracks          to browse by track`,
      `Type  labs            to list every lab title`,
      `Type  search <word>   to find a lab (e.g. search terraform)`,
      `Type  lab start <#>   to launch one (e.g. lab start 07)`,
      '',
      `Type 'help' for all commands.`,
    ];
    if (startHint && lookup[startHint.toLowerCase()]) {
      const l = lookup[startHint.toLowerCase()];
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
    if (cmd === 'tracks' || cmd === 'categories') return { output: tracksText() };
    if (cmd === 'search' || cmd === 'find') return { output: searchText(parts.slice(1).join(' ')) };
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

  return { labs, error, banner, runner, readyKey: labs ? 'ready' : 'loading' };
}
