// Vector diagram kit for the per-lesson slide decks (2026-11-23).
//
// One small reusable set of inline SVG templates — layers, flow, comparison,
// cycle, client-server, topology, concept — drawn from the R2C light-only
// tokens (white page, #C4B5FD primary surface, near-black text). A diagram
// is a PLACEHOLDER that genuinely explains the slide's shape: it carries
// only generic chrome (numbers, Client/Server, request/response, vs) plus,
// for the layers template, the real stack item names from the lesson itself.
// It never carries lesson copy — the caption next to it does that.
// Hand-refinable per lesson later without touching the carousel.

import { ACTION, ACTION_SURFACE, INK } from '@/lib/design/tokens';

const W = 400;
const H = 225;

function ArrowMarker() {
  return (
    <defs>
      <marker
        id="slide-arrow"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={ACTION.action} />
      </marker>
    </defs>
  );
}

function labelFits(text, maxWidth, fontSize = 12) {
  // Rough width estimate; only compress labels that would overflow the bar.
  return String(text).length * fontSize * 0.6 <= maxWidth ? undefined : maxWidth;
}

function LayersDiagram({ labels }) {
  const items = labels.length > 0 ? labels : ['1', '2', '3', '4'];
  const n = items.length;
  const top = 14;
  const gap = 8;
  const barHeight = (H - top * 2 - gap * (n - 1)) / n;
  const barWidth = 320;
  const x = (W - barWidth) / 2;
  return (
    <g>
      {items.map((label, i) => {
        const y = top + i * (barHeight + gap);
        return (
          <g key={label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={8}
              fill={ACTION_SURFACE.surface}
              fillOpacity={0.35 + (0.65 * (n - i)) / n}
            />
            <text
              x={W / 2}
              y={y + barHeight / 2 + 4}
              textAnchor="middle"
              fontSize={12}
              fill={ACTION_SURFACE.surfaceInk}
              textLength={labelFits(label, barWidth - 24)}
              lengthAdjust="spacingAndGlyphs"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function FlowDiagram() {
  const boxes = [
    { x: 24, label: '1' },
    { x: 154, label: '2' },
    { x: 284, label: '3' },
  ];
  return (
    <g>
      <ArrowMarker />
      {boxes.map((box, i) => (
        <g key={box.label}>
          <rect
            x={box.x}
            y={80}
            width={92}
            height={64}
            rx={10}
            fill="#FFFFFF"
            stroke={ACTION.action}
            strokeWidth={2}
          />
          <text x={box.x + 46} y={119} textAnchor="middle" fontSize={20} fontWeight={600} fill={ACTION.action}>
            {box.label}
          </text>
          {i < boxes.length - 1 && (
            <line
              x1={box.x + 94}
              y1={112}
              x2={box.x + 128}
              y2={112}
              stroke={ACTION.action}
              strokeWidth={2}
              markerEnd="url(#slide-arrow)"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function ComparisonDiagram() {
  return (
    <g>
      <rect x={20} y={40} width={160} height={145} rx={12} fill={ACTION_SURFACE.surface} fillOpacity={0.45} />
      <rect
        x={220}
        y={40}
        width={160}
        height={145}
        rx={12}
        fill="#FFFFFF"
        stroke={INK.ink2}
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />
      <text x={100} y={120} textAnchor="middle" fontSize={28} fontWeight={600} fill={ACTION_SURFACE.surfaceInk}>
        A
      </text>
      <text x={300} y={120} textAnchor="middle" fontSize={28} fontWeight={600} fill={INK.ink2}>
        B
      </text>
      <circle cx={200} cy={112} r={22} fill={ACTION.action} />
      <text x={200} y={117} textAnchor="middle" fontSize={13} fontWeight={600} fill={ACTION.actionInk}>
        vs
      </text>
    </g>
  );
}

function CycleDiagram() {
  const nodes = [
    { cx: 200, cy: 50, label: '1' },
    { cx: 262, cy: 112, label: '2' },
    { cx: 200, cy: 174, label: '3' },
    { cx: 138, cy: 112, label: '4' },
  ];
  return (
    <g>
      <circle cx={200} cy={112} r={62} fill="none" stroke={ACTION.action} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4 6" />
      {nodes.map((node) => (
        <g key={node.label}>
          <circle cx={node.cx} cy={node.cy} r={24} fill="#FFFFFF" stroke={ACTION.action} strokeWidth={2} />
          <text x={node.cx} y={node.cy + 5} textAnchor="middle" fontSize={15} fontWeight={600} fill={ACTION.action}>
            {node.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function ClientServerDiagram() {
  return (
    <g>
      <ArrowMarker />
      <rect x={24} y={78} width={120} height={70} rx={10} fill={ACTION_SURFACE.surface} />
      <text x={84} y={119} textAnchor="middle" fontSize={14} fontWeight={600} fill={ACTION_SURFACE.surfaceInk}>
        Client
      </text>
      <rect x={256} y={78} width={120} height={70} rx={10} fill="#FFFFFF" stroke={ACTION.action} strokeWidth={2} />
      <text x={316} y={119} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK.ink1}>
        Server
      </text>
      <line x1={152} y1={98} x2={248} y2={98} stroke={ACTION.action} strokeWidth={2} markerEnd="url(#slide-arrow)" />
      <text x={200} y={90} textAnchor="middle" fontSize={10} fill={INK.ink2}>
        request
      </text>
      <line x1={248} y1={128} x2={152} y2={128} stroke={ACTION.action} strokeWidth={2} markerEnd="url(#slide-arrow)" />
      <text x={200} y={148} textAnchor="middle" fontSize={10} fill={INK.ink2}>
        response
      </text>
    </g>
  );
}

function TopologyDiagram() {
  const satellites = [
    { cx: 90, cy: 55 },
    { cx: 310, cy: 55 },
    { cx: 90, cy: 170 },
    { cx: 310, cy: 170 },
  ];
  return (
    <g>
      {satellites.map((sat) => (
        <g key={`${sat.cx}-${sat.cy}`}>
          <line x1={200} y1={112} x2={sat.cx} y2={sat.cy} stroke={ACTION.action} strokeOpacity={0.5} strokeWidth={2} />
          <circle cx={sat.cx} cy={sat.cy} r={18} fill="#FFFFFF" stroke={ACTION.action} strokeWidth={2} />
          <circle cx={sat.cx} cy={sat.cy} r={5} fill={ACTION_SURFACE.surface} />
        </g>
      ))}
      <circle cx={200} cy={112} r={26} fill={ACTION.action} />
      <circle cx={200} cy={112} r={7} fill={ACTION.actionInk} />
    </g>
  );
}

function ConceptDiagram() {
  const satellites = [
    { cx: 110, cy: 60 },
    { cx: 290, cy: 60 },
    { cx: 110, cy: 165 },
    { cx: 290, cy: 165 },
  ];
  return (
    <g>
      {satellites.map((sat) => (
        <g key={`${sat.cx}-${sat.cy}`}>
          <line x1={200} y1={112} x2={sat.cx} y2={sat.cy} stroke={ACTION_SURFACE.surface} strokeWidth={2} />
          <circle cx={sat.cx} cy={sat.cy} r={14} fill="#FFFFFF" stroke={ACTION_SURFACE.surface} strokeWidth={2} />
        </g>
      ))}
      <circle cx={200} cy={112} r={30} fill={ACTION_SURFACE.surface} />
      <circle cx={200} cy={112} r={6} fill={ACTION_SURFACE.surfaceInk} />
    </g>
  );
}

const TEMPLATES = {
  layers: LayersDiagram,
  flow: FlowDiagram,
  comparison: ComparisonDiagram,
  cycle: CycleDiagram,
  'client-server': ClientServerDiagram,
  topology: TopologyDiagram,
  concept: ConceptDiagram,
};

export default function SlideDiagram({ diagram, title }) {
  const template = diagram?.template && TEMPLATES[diagram.template] ? diagram.template : 'concept';
  const Diagram = TEMPLATES[template];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${template} diagram for ${title || 'this slide'}`}
      fontFamily="inherit"
      className="h-full w-full"
    >
      <Diagram labels={diagram?.labels || []} />
    </svg>
  );
}
