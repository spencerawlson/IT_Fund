import React from 'react';
import LabTerminal from '@/components/labs/LabTerminal';
import { useLabConsole } from '@/components/labs/useLabConsole';

// The terminal-first Interactive Lab console: the learner discovers and launches labs by typing
// (`tracks`, `labs`, `search <word>`, `lab start <name|NN>`, `lab info <name>`, `help`) rather
// than scrolling a wall of text. `lab start` navigates to the lab workspace. `startHint`
// (a lab id/slug/number, e.g. from a "Build this" link) preselects a lab and shows its
// `lab start` line WITHOUT auto-running it — the learner types it.
//
// Reused by the standalone /labs launcher and embedded directly on the Practice page, so the
// terminal is visible the moment you arrive. One local command interpreter, no backend session here.
// Shared logic lives in useLabConsole so the two surfaces can never drift apart.

export default function LabConsole({ startHint = null, prompt = 'roadtocissp@lab:~$ ' }) {
  const { banner, runner, readyKey } = useLabConsole({ startHint });

  return (
    <LabTerminal
      key={readyKey}
      runner={runner}
      banner={banner}
      prompt={prompt}
    />
  );
}
