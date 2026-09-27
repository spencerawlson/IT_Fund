import React from 'react';

export default function FallbackPanel({ label, children }) {
  return (
    <div className="rounded-xl glass p-6 text-center text-sm text-slate-300">
      <p className="text-white">{label}</p>
      <p className="mt-2 text-xs text-slate-400">{children}</p>
    </div>
  );
}
