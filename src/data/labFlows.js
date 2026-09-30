// Data for the Visual Lab's animated flow diagrams (rendered by components/lab/FlowDiagram.jsx).
// These replace the old text-only step cards for the "practice" subjects. Each node has an icon and
// an accent; keep bodies to one or two sentences so the diagram stays visual, not a wall of text.
import {
  Users, Shuffle, Server, Database, Zap, Activity,
  Search, Truck, Wrench, Gauge, BarChart3, DollarSign, RefreshCw, FlaskConical,
} from 'lucide-react';

export const LAB_FLOWS = {
  'system-architecture': {
    tags: ['Multi-AZ', 'Graceful failover', 'Circuit breaker', 'Health checks'],
    nodes: [
      { title: 'Client', icon: Users, accent: 'slate', body: 'A request enters over HTTPS with sensible timeouts and retries so one slow hop never hangs the user.' },
      { title: 'Load Balancer', icon: Shuffle, accent: 'blue', body: 'Routes by path and health, spreading traffic across zones and failing over fast when a target goes unhealthy.' },
      { title: 'App Pool', icon: Server, accent: 'blue', body: 'Stateless instances across two availability zones, updated with rolling deploys so there is no downtime window.' },
      { title: 'Cache', icon: Zap, accent: 'teal', body: 'A Redis layer absorbs hot reads; on a miss it falls back to the database, shielding it from read storms.' },
      { title: 'Database', icon: Database, accent: 'teal', body: 'A primary with an async replica, automated failover, and point-in-time recovery for durability.' },
      { title: 'Observability', icon: Activity, accent: 'amber', body: 'Metrics, logs, and traces cover every hop against a P90 latency SLO, so regressions are seen before users feel them.' },
    ],
  },
  'cloud-migration': {
    tags: ['Wave planning', 'Cutover window', 'Rollback plan', 'DNS switch'],
    nodes: [
      { title: 'Assess', icon: Search, accent: 'slate', body: 'Inventory apps, dependencies, data gravity, and compliance needs to decide what moves, and in what order.' },
      { title: 'Lift & Shift', icon: Truck, accent: 'blue', body: 'Rehost with minimal change using image replication — fast to move, cheap to reverse if a wave misbehaves.' },
      { title: 'Refactor', icon: Wrench, accent: 'blue', body: 'Replace monoliths with managed services, queues, and containers where the payoff justifies the rework.' },
      { title: 'Optimize', icon: Gauge, accent: 'teal', body: 'Right-size instances, autoscale, adopt savings plans, and delete idle resources to control cost.' },
    ],
  },
  'capacity-planning': {
    tags: ['Utilization target', 'Burst budget', 'Multi-region', 'Chaos validation'],
    nodes: [
      { title: 'Inputs', icon: BarChart3, accent: 'slate', body: 'Baseline QPS, peak multiplier, session length, and payload size — the raw numbers every estimate builds on.' },
      { title: 'Headroom', icon: Gauge, accent: 'blue', body: 'Target 60–70% CPU at peak, leaving buffer to absorb an instance failure without tipping over.' },
      { title: 'Burst', icon: Zap, accent: 'amber', body: 'Reserve surge capacity with scheduled scaling or warm standby pools for known spikes.' },
      { title: 'Load Test', icon: FlaskConical, accent: 'teal', body: 'Drive synthetic peak traffic in staging to validate autoscaling rules and cold-start latency before real users do.' },
      { title: 'Cost Profile', icon: DollarSign, accent: 'teal', body: 'Mix on-demand baseline, spot for batch, savings plans, and right-sizing to keep the bill honest.' },
      { title: 'Review', icon: RefreshCw, accent: 'blue', body: 'Re-forecast monthly, watch for traffic anomalies, and audit zone health so the plan stays current.' },
    ],
  },
};
