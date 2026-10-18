const NODES = [
  { id: "q", label: "question", type: "input.question", x: 12, y: 82, color: "var(--chart-1)" },
  { id: "plan", label: "plan", type: "llm.plan", x: 112, y: 82, color: "var(--chart-2)" },
  { id: "search", label: "search", type: "tool.search", x: 212, y: 32, color: "var(--chart-3)" },
  { id: "retrieve", label: "retrieve", type: "transform.retrieve", x: 212, y: 132, color: "var(--chart-4)" },
  { id: "extract", label: "extract", type: "llm.extract", x: 312, y: 32, color: "var(--chart-2)" },
  { id: "draft", label: "draft", type: "llm.draft", x: 312, y: 132, color: "var(--chart-2)" },
  { id: "verify", label: "verify", type: "verify.citations", x: 412, y: 82, color: "var(--chart-5)" },
  { id: "brief", label: "brief", type: "output.brief", x: 512, y: 82, color: "var(--chart-6)" },
] as const;

const EDGES = [
  { from: "q", to: "plan", active: false },
  { from: "plan", to: "search", active: false },
  { from: "plan", to: "retrieve", active: true },
  { from: "search", to: "extract", active: false },
  { from: "retrieve", to: "draft", active: true },
  { from: "extract", to: "verify", active: true },
  { from: "draft", to: "verify", active: true },
  { from: "verify", to: "brief", active: true },
] as const;

const W = 84;
const H = 38;

function anchor(id: string) {
  const node = NODES.find((entry) => entry.id === id)!;
  return {
    left: node.x,
    right: node.x + W,
    centerY: node.y + H / 2,
  };
}

function edgePath(from: string, to: string) {
  const a = anchor(from);
  const b = anchor(to);
  if (Math.abs(a.centerY - b.centerY) < 3) {
    return `M ${a.right} ${a.centerY} L ${b.left} ${b.centerY}`;
  }
  const mid = (a.right + b.left) / 2;
  return `M ${a.right} ${a.centerY} C ${mid} ${a.centerY}, ${mid} ${b.centerY}, ${b.left} ${b.centerY}`;
}

const TRACE = [
  ["plan", "llm", "182ms", "1.2k tok", "ok"],
  ["extract", "llm", "180ms", "2.8k tok", "ok"],
  ["outline", "llm", "183ms", "1.1k tok", "ok"],
  ["draft", "llm", "364ms", "3.4k tok", "ok"],
  ["verify", "tool", "15ms", "—", "ok"],
] as const;

export default function HeroGraph() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex h-9 items-center justify-between border-b border-[var(--border)] px-3">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          run_8f2c
          <span className="text-[var(--border-strong)]">/</span>
          <span>research-brief</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--success)]">
            completed
          </span>
          <span className="font-mono text-[8px] text-[var(--fg-subtle)]">1.0s</span>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-[var(--border)] border-b border-[var(--border)]">
        {[
          ["nodes", "12"],
          ["edges", "18"],
          ["cost", "$0.0000"],
          ["verified", "100%"],
        ].map(([label, value]) => (
          <div key={label} className="px-3 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">{label}</p>
            <p className="mt-0.5 font-mono text-[12px] text-[var(--fg)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg)] px-2 py-3">
        <svg viewBox="0 0 608 210" className="w-full" role="img" aria-label="A compiled research workflow with a verification step">
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
            </marker>
            <marker id="hero-arrow-active" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const color = edge.active ? "var(--accent)" : "var(--border-strong)";
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={edgePath(edge.from, edge.to)}
                fill="none"
                stroke={color}
                strokeWidth={edge.active ? 1.3 : 1}
                strokeOpacity={edge.active ? 0.9 : 0.6}
                markerEnd={edge.active ? "url(#hero-arrow-active)" : "url(#hero-arrow)"}
                className={edge.active ? "animate-dash" : undefined}
              />
            );
          })}

          {NODES.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={W}
                height={H}
                rx="5"
                fill="var(--surface)"
                stroke={node.id === "verify" ? "var(--accent)" : "var(--border)"}
                strokeWidth={node.id === "verify" ? 1.2 : 1}
              />
              <rect x={node.x + 8} y={node.y + 9} width="5" height="5" rx="1" fill={node.color} />
              <text
                x={node.x + 17}
                y={node.y + 15}
                fill="var(--fg)"
                fontSize="8.5"
                fontFamily="var(--font-geist-sans), sans-serif"
                fontWeight="500"
              >
                {node.label}
              </text>
              <text
                x={node.x + 8}
                y={node.y + 29}
                fill="var(--fg-subtle)"
                fontSize="6.8"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {node.type}
              </text>
              <circle cx={node.x + W - 8} cy={node.y + 9} r="1.8" fill="var(--success)" />
            </g>
          ))}

          <g>
            <rect x="412" y="170" width="184" height="26" rx="5" fill="var(--surface)" stroke="var(--border)" />
            <circle cx="424" cy="183" r="2.4" fill="var(--success)" />
            <text x="432" y="186" fill="var(--fg-muted)" fontSize="7.2" fontFamily="var(--font-geist-mono), monospace">
              10/10 claims supported · 4 sources
            </text>
          </g>
        </svg>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">trace</span>
          <span className="font-mono text-[8px] text-[var(--fg-subtle)]">last 5 spans</span>
        </div>
        <table className="w-full border-collapse font-mono text-[8.5px]">
          <tbody>
            {TRACE.map((row) => (
              <tr key={row[0]} className="border-t border-[var(--border)]">
                <td className="px-3 py-1.5 text-[var(--fg)]">{row[0]}</td>
                <td className="px-2 py-1.5 text-[var(--fg-subtle)]">{row[1]}</td>
                <td className="px-2 py-1.5 text-right text-[var(--fg-muted)]">{row[2]}</td>
                <td className="px-2 py-1.5 text-right text-[var(--fg-subtle)]">{row[3]}</td>
                <td className="px-3 py-1.5 text-right text-[var(--success)]">{row[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
