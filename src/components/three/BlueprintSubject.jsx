import React from 'react';
import { Maximize2 } from 'lucide-react';

// A Visual Lab subject shown as its R2C blueprint sheet instead of a 3D
// model. Used where a sheet teaches the device better than a model can:
// the firewall's Meshy model only reached the polished bar at ~189k tris /
// 3.5 MB, while its sheet is ~0.4 MB, needs no WebGL and labels every port.
//
// Renders at the sheet's natural aspect ratio (full stage width), so phones
// get no letterboxing; "Open full size" opens the original in a new tab for
// zooming into the port detail.
export default function BlueprintSubject({ src, alt, label }) {
  return (
    <figure className="w-full overflow-hidden rounded-xl bg-[#0D1B2A]">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
      <figcaption className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2 text-xs text-white/80">
        <span className="font-semibold text-white">{label} — technical blueprint</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-cyan-300 hover:bg-white/10 hover:text-cyan-200"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          Open full size
        </a>
      </figcaption>
    </figure>
  );
}
