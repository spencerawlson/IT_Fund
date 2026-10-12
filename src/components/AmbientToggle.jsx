import { useState } from 'react';
import { getAmbientEnabled, setAmbientEnabled } from '@/lib/ambient';

/**
 * Quiet on/off switch for the ambient background animation. Lives in the
 * AppShell sidebar footer — visible without a popup, out of the study flow.
 */
export default function AmbientToggle() {
  const [on, setOn] = useState(getAmbientEnabled);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setAmbientEnabled(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="flex w-full items-center justify-between gap-3 rounded-control px-3 py-2.5 text-small font-semibold text-ink-2 transition-colors hover:bg-black/[0.04] hover:text-ink-1"
    >
      <span>Ambient background</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-action' : 'bg-black/15'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}
