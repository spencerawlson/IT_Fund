import React from 'react';
import LoadBalancerSimulator from './LoadBalancerSimulator';

// Visual Lab subject "Load Balancer": the interactive simulator, and only
// the simulator. The guided walkthrough is gone — the simulator replaces
// it. One screen: strategy controls on the left, the flow diagram and
// metrics in the middle, the server pool on the right.
export default function LoadBalancerAnimation() {
  return (
    <div>
      <p className="mb-4 text-sm text-ink-2">
        Drive the balancer yourself. Pick a strategy, push traffic, make a server slow, kill one — and watch
        p95, the 503s and the config move. Round robin spreads requests evenly; it does not spread the load.
      </p>
      <LoadBalancerSimulator />
    </div>
  );
}
