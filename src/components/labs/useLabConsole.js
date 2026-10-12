import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labsApi } from '@/api/labs';

// Shared command interpreter for the terminal-first Interactive Lab consoles.
// Used by both the standalone /labs launcher (LabLauncher) and the Practice-page
// embed (LabConsole), so the banner and commands can never drift apart again.
//
// Navigation model:
//   labs            → clear screen, show numbered TRACK titles with lab counts
//   labs <N>        → clear screen, show only track N's labs (numbered 1..M)
//   lab <N>         → same as `labs <N>`
//   lab start <N>   → start the Nth lab in the current view
//   lab info <N>    → details for the Nth lab in the current view
//   back            → back to the track list
// Slugs and ids always work globally: `lab start terraform-aws-001`.

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

function orderedCategories(labs) {
  return [...new Set(orderLabs(labs).map((l) => l.category))];
}

const pad2 = (n) => String(n).padStart(2, '0');

// ---------- Pure, exported for tests ----------

export function getOrderedCategories(labs) {
  return [...new Set(orderLabs(labs).map((l) => l.category))];
}

export function buildTrackList(labs, categories) {
  const lines = ['LAB TRACKS', '==========', ''];
  categories.forEach((c, i) => {
    const n = labs.filter((l) => l.category === c).length;
    lines.push(`  [${i + 1}] ${CATEGORY_LABEL[c] || c}   (${n} lab${n === 1 ? '' : 's'})`);
  });
  lines.push('', 'Type  labs <#>  to open a track (e.g. labs 1).');
  return lines.join('\n');
}

export function buildTrackLabs(labs, category) {
  const list = labs.filter((l) => l.category === category);
  const label = CATEGORY_LABEL[category] || category;
  const lines = [label.toUpperCase(), '='.repeat(label.length), ''];
  list.forEach((l, i) => lines.push(`  [${i + 1}] ${l.title}`));
  lines.push('', 'Type  lab info <#>  for details,  lab start <#>  to begin,  back  for tracks.');
  return lines.join('\n');
}

/** Resolve a `labs <token>` / `lab <token>` argument to a category, or null. */
export function resolveTrack(categories, token) {
  const n = parseInt(token, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= categories.length) return categories[n - 1];
  const q = (token || '').toLowerCase();
  return categories.find((c) => c.includes(q) || (CATEGORY_LABEL[c] || '').toLowerCase().includes(q)) || null;
}

export function buildSearchResults(labs, term) {
  const q = (term || '').toLowerCase().trim();
  return labs.filter((l) =>
    l.title.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q),
  );
}

export function useLabConsole({ startHint = null } = {}) {
  const navigate = useNavigate();
  const [labs, setLabs] = useState(null);
  const [error, setError] = useState('');
  // { type: 'tracks' } | { type: 'track', category }
  const [view, setView] = useState({ type: 'tracks' });

  useEffect(() => {
    let live = true;
    labsApi.listDefinitions()
      .then(({ labs: defs }) => { if (live) setLabs(orderLabs(defs)); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  const categories = useMemo(() => (labs ? getOrderedCategories(labs) : []), [labs]);

  const visibleLabs = useMemo(() => {
    if (!labs) return [];
    if (view.type === 'track') return labs.filter((l) => l.category === view.category);
    return [];
  }, [labs, view]);

  // Global lookup by slug/id (numbers are view-contextual, resolved separately).
  const bySlug = useMemo(() => {
    const m = {};
    (labs || []).forEach((l) => {
      m[l.id.toLowerCase()] = l;
      m[l.slug.toLowerCase()] = l;
    });
    return m;
  }, [labs]);

  const trackListText = () => {
    const lines = ['LAB TRACKS', '==========', ''];
    categories.forEach((c, i) => {
      const n = labs.filter((l) => l.category === c).length;
      lines.push(`  [${i + 1}] ${CATEGORY_LABEL[c] || c}   (${n} lab${n === 1 ? '' : 's'})`);
    });
    lines.push('', 'Type  labs <#>  to open a track (e.g. labs 1).');
    return { output: lines.join('\n'), clear: true };
  };

  const trackLabsText = (category) => {
    const list = labs.filter((l) => l.category === category);
    const label = CATEGORY_LABEL[category] || category;
    const lines = [label.toUpperCase(), '='.repeat(label.length), ''];
    list.forEach((l, i) => lines.push(`  [${i + 1}] ${l.title}`));
    lines.push('', 'Type  lab info <#>  for details,  lab start <#>  to begin,  back  for tracks.');
    return { output: lines.join('\n'), clear: true };
  };

  const searchText = (term) => {
    const q = (term || '').toLowerCase().trim();
    if (!q) return { output: `Usage: search <keyword> — e.g. search terraform` };
    const hits = (labs || []).filter((l) =>
      l.title.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q),
    );
    if (!hits.length) return { output: `No labs match "${term}". Type 'labs' to browse tracks.` };
    const lines = [`${hits.length} match${hits.length === 1 ? '' : 'es'} for "${term}":`, ''];
    hits.forEach((l) => lines.push(`  ${l.title}   (${l.slug})`));
    lines.push('', `Type  lab start <slug>  to begin (e.g. lab start ${hits[0].slug}).`);
    return { output: lines.join('\n'), clear: true };
  };

  const infoText = (l) => {
    if (!l) return { output: "No such lab. Type 'labs' to browse tracks." };
    return {
      output: [
        l.title,
        '-'.repeat(l.title.length),
        `Difficulty: ${l.difficulty}   ·   ~${l.estimated_minutes} min   ·   ${l.objectives.length} objectives`,
        '',
        l.description,
        '',
        `To begin, type:  lab start ${l.slug}`,
      ].join('\n'),
    };
  };

  const helpText = (topic) => {
    const t = (topic || '').toLowerCase().replace('lab', '').trim();
    if (t === 'start') return { output: 'lab start <#> — start the Nth lab in the current view.\n  lab start <slug> also works from anywhere (e.g. lab start terraform-aws-001).' };
    if (t === 'info') return { output: 'lab info <#> — details for the Nth lab in the current view.' };
    if (t === 'list' || t === 'labs') return { output: 'labs          — clear screen, list the lab tracks.\nlabs <#>       — clear screen, list that track\'s labs only.' };
    return {
      output: [
        'Interactive Lab — commands',
        '  labs            clear screen, list the lab tracks',
        '  labs <#>        clear screen, list that track\'s labs only',
        '  lab <#>         same as labs <#>',
        '  lab info <#>    details for the Nth lab in the current view',
        '  lab start <#>   start the Nth lab (or: lab start <slug>)',
        '  search <word>   find labs by title or topic',
        '  back            back to the track list',
        '  clear           clear the screen',
        '  help [command]  this help, or help for one command',
        '',
        'Inside a lab you also get: objectives · hint · check · topology · lab reset · lab exit · help',
      ].join('\n'),
    };
  };

  const resolveLab = (token) => {
    if (!token) return null;
    const n = parseInt(token, 10);
    if (!Number.isNaN(n) && n >= 1) {
      if (view.type === 'track' && n <= visibleLabs.length) return visibleLabs[n - 1];
      return bySlug[token.toLowerCase()] || null;
    }
    return bySlug[token.toLowerCase()] || null;
  };

  const openTrack = (token) => {
    const category = resolveTrack(categories, token);
    if (category) {
      setView({ type: 'track', category });
      return trackLabsText(category);
    }
    return { output: `No track "${token}". Type 'labs' to see them.`, exit_code: 1 };
  };

  const banner = useMemo(() => {
    if (error) return [`Could not load labs: ${error}`];
    if (!labs) return ['Road to CISSP — Interactive Labs', 'Loading lab catalogue...'];
    const lines = [
      'Road to CISSP — Interactive Labs',
      '=================================',
      '',
      `${labs.length} hands-on labs across ${categories.length} tracks.`,
      '',
      `Type  labs          to browse the tracks`,
      `Type  search <word> to find a lab (e.g. search terraform)`,
      `Type  help          for all commands`,
    ];
    if (startHint) {
      const l = bySlug[startHint.toLowerCase()];
      if (l) lines.push('', `Selected lab:  ${l.title}`, '', `To begin, type:  lab start ${l.slug}`);
      else lines.push('', `No lab matches "${startHint}". Type 'labs' to browse.`);
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs, error, startHint]);

  const runner = async (raw) => {
    const parts = raw.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    if (!labs) return { output: 'Still loading the lab catalogue — try again in a moment.' };
    if (cmd === 'help' || cmd === '?') return helpText(parts.slice(1).join(' '));
    if (cmd === 'back') {
      setView({ type: 'tracks' });
      return trackListText();
    }
    if (cmd === 'labs') {
      const arg = parts[1];
      if (!arg) {
        setView({ type: 'tracks' });
        return trackListText();
      }
      return openTrack(arg);
    }
    if (cmd === 'tracks' || cmd === 'categories') {
      setView({ type: 'tracks' });
      return trackListText();
    }
    if (cmd === 'search' || cmd === 'find') return searchText(parts.slice(1).join(' '));
    if (cmd === 'lab') {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'list') {
        setView({ type: 'tracks' });
        return trackListText();
      }
      if (sub === 'info') {
        const tok = parts[2] || '';
        if (/^\d+$/.test(tok) && view.type !== 'track') {
          return { output: `Pick a track first: labs <#>, then lab info <#> within it.`, exit_code: 1 };
        }
        return infoText(resolveLab(tok));
      }
      if (sub === 'start') {
        const tok = parts[2] || '';
        if (/^\d+$/.test(tok) && view.type !== 'track') {
          // A bare number outside a track view opens the track (his flow: `lab 1`).
          const n = parseInt(tok, 10);
          if (n >= 1 && n <= categories.length) return openTrack(tok);
          return { output: `No track "${tok}". Type 'labs' to see them.`, exit_code: 1 };
        }
        const l = resolveLab(tok);
        if (!l) return { output: `No such lab: "${tok}". Type 'labs' to browse.`, exit_code: 1 };
        setTimeout(() => navigate(`/labs/${l.id}`), 350);
        return { output: `Loading lab: ${l.title}...` };
      }
      // `lab <N>` with no subcommand opens track N (his flow).
      if (sub && !['info', 'start', 'list'].includes(sub)) return openTrack(sub);
      return { output: 'Usage: lab <#> | lab info <#> | lab start <#|slug>', exit_code: 1 };
    }
    return { output: `${cmd}: command not found. Type 'help'.`, exit_code: 127 };
  };

  return { labs, error, banner, runner, readyKey: labs ? 'ready' : 'loading' };
}
