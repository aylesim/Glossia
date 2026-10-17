const NODES = [
  { id: "q", label: "question", x: 8, y: 127, color: "var(--chart-1)" },
  { id: "plan", label: "plan", x: 112, y: 127, color: "var(--chart-2)" },
  { id: "search", label: "search", x: 216, y: 53, color: "var(--chart-3)" },
  { id: "fetch", label: "fetch", x: 320, y: 53, color: "var(--chart-3)" },
  { id: "retrieve", label: "retrieve", x: 216, y: 201, color: "var(--chart-4)" },
  { id: "extract", label: "extract", x: 320, y: 201, color: "var(--chart-4)" },
  { id: "verify", label: "verify", x: 424, y: 127, color: "var(--chart-5)" },
  { id: "brief", label: "brief", x: 528, y: 127, color: "var(--accent)" },
] as const;

const EDGES = [
  { from: "q", to: "plan", active: false },
  { from: "plan", to: "search", active: false },
  { from: "plan", to: "retrieve", active: true },
  { from: "search", to: "fetch", active: false },
  { from: "retrieve", to: "extract", active: true },
  { from: "fetch", to: "verify", active: true },
  { from: "extract", to: "verify", active: true },
  { from: "verify", to: "brief", active: false },
] as const;

const W = 92;
const H = 46;

function center(id: string) {
  const node = NODES.find((entry) => entry.id === id)!;
  return { x: node.x + W / 2, y: node.y + H / 2, left: node.x, right: node.x + W, top: node.y, bottom: node.y + H };
}

function edgePath(from: string, to: string): string {
  const a = center(from);
  const b = center(to);
  if (Math.abs(a.y - b.y) < 4) {
    return `M ${a.right} ${a.y} C ${a.right + 24} ${a.y}, ${b.left - 24} ${b.y}, ${b.left} ${b.y}`;
  }
  return `M ${a.right} ${a.y} C ${a.right + 26} ${a.y}, ${b.left - 26} ${b.y}, ${b.left} ${b.y}`;
}

export default function HeroGraph() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            run_8f2c · demo
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--fg-subtle)]">
          <span>12 nodes</span>
          <span className="text-[var(--fg-subtle)]">·</span>
          <span>18 edges</span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--fg-muted)]">
            $0.00
          </span>
        </div>
      </div>

      <div className="px-3 pt-2">
        <svg viewBox="0 0 620 300" className="w-full" role="img" aria-label="A compiled research workflow with a fan-out over sources and a verification step">
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
            </marker>
            <marker id="hero-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const a = center(edge.from);
            const b = center(edge.to);
            const d = edgePath(edge.from, edge.to);
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={edge.active ? "var(--accent)" : "var(--border-strong)"}
                  strokeWidth={edge.active ? 1.4 : 1}
                  strokeOpacity={edge.active ? 0.9 : 0.55}
                  markerEnd={edge.active ? "url(#hero-arrow-accent)" : "url(#hero-arrow)"}
                  className={edge.active ? "animate-dash" : undefined}
                  style={edge.active ? { strokeDasharray: "4 6" } : undefined}
                />
                <circle cx={a.right} cy={a.y} r="1.6" fill={edge.active ? "var(--accent)" : "var(--border-strong)"} />
                <circle cx={b.left} cy={b.y} r="1.6" fill={edge.active ? "var(--accent)" : "var(--border-strong)"} />
              </g>
            );
          })}

          {NODES.map((node) => {
            const isVerify = node.id === "verify";
            const isBrief = node.id === "brief";
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={W}
                  height={H}
                  rx="9"
                  fill={isBrief ? "var(--accent)" : "var(--surface-raised)"}
                  stroke={isBrief ? "var(--accent)" : isVerify ? "var(--accent)" : "var(--border)"}
                  strokeWidth={isVerify ? 1.4 : 1}
                />
                <rect
                  x={node.x + 10}
                  y={node.y + 11}
                  width="5"
                  height="5"
                  rx="2.5"
                  fill={isBrief ? "var(--accent-fg)" : node.color}
                />
                <text
                  x={node.x + 21}
                  y={node.y + 16}
                  fill={isBrief ? "var(--accent-fg)" : "var(--fg)"}
                  fontSize="9.5"
                  fontFamily="var(--font-mono), monospace"
                  letterSpacing="0.02em"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + 10}
                  y={node.y + 33}
                  fill={isBrief ? "var(--accent-fg)" : "var(--fg-subtle)"}
                  fontSize="7.5"
                  fontFamily="var(--font-mono), monospace"
                  opacity={isBrief ? 0.7 : 1}
                >
                  {node.id === "q" ? "input.question" : isBrief ? "verified" : `node.${node.id}`}
                </text>
                {isVerify ? (
                  <circle cx={node.x + W - 12} cy={node.y + 13} r="3" fill="var(--accent)">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                ) : null}
              </g>
            );
          })}

          <g>
            <rect x="424" y="238" width="188" height="34" rx="8" fill="var(--bg-elevated)" stroke="var(--border)" />
            <circle cx="440" cy="255" r="3" fill="var(--success)" />
            <text x="450" y="258" fill="var(--fg-muted)" fontSize="8.5" fontFamily="var(--font-mono), monospace">
              100% claims supported · 4 sources
            </text>
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] px-4 py-3">
        {[
          { label: "compile", width: "w-[38%]", tone: "var(--chart-1)" },
          { label: "retrieve", width: "w-[54%]", tone: "var(--chart-4)" },
          { label: "extract", width: "w-[78%]", tone: "var(--chart-2)" },
          { label: "verify", width: "w-[30%]", tone: "var(--chart-5)" },
        ].map((step) => (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
              <span>{step.label}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div className={`h-full rounded-full ${step.width}`} style={{ background: step.tone }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
