import React, { useState } from 'react';
import { FlaskConical, Clapperboard } from 'lucide-react';
import LoadBalancerSimulator from './LoadBalancerSimulator';
import LoadBalancerWalkthrough from './LoadBalancerWalkthrough';

// Visual Lab subject "Load Balancer": two halves of one idea.
//  - Simulator: a live load balancer you can drive — six strategies, traffic
//    controls, per-server speed and weight, kill/revive, live p95 and a
//    nginx.conf that updates as you play.
//  - Guided walkthrough: the four beats from the thachdv.it Reel — one
//    server overloaded, round robin's blind spot, least connections fixing
//    it, a server dying at peak — auto-playing with captions.
export default function LoadBalancerAnimation() {
  const [tab, setTab] = useState('simulator');

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Load balancer views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'simulator'}
          onClick={() => setTab('simulator')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'simulator' ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
          }`}
        >
          <FlaskConical size={16} /> Interactive simulator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'walkthrough'}
          onClick={() => setTab('walkthrough')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'walkthrough' ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
          }`}
        >
          <Clapperboard size={16} /> Guided walkthrough
        </button>
      </div>

      {tab === 'simulator' ? (
        <div>
          <p className="mb-4 text-sm text-ink-2">
            Drive the balancer yourself. Pick a strategy, push traffic, make a server slow, kill one — and watch
            p95, the 503s and the config move. Round robin spreads requests evenly; it does not spread the load.
          </p>
          <LoadBalancerSimulator />
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-ink-2">
            The story in four beats: one server drowns, round robin helps and then fools you, least connections
            fixes it, and a dead server gets skipped. It plays on its own — pause or step through at your pace.
          </p>
          <LoadBalancerWalkthrough />
        </div>
      )}
    </div>
  );
}
