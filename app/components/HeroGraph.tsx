const NODES = [
  { id: "q", label: "question", type: "input.question", x: 12, y: 82 },
  { id: "plan", label: "plan", type: "llm.plan", x: 112, y: 82 },
  { id: "search", label: "search", type: "tool.search", x: 212, y: 32 },
  { id: "retrieve", label: "retrieve", type: "transform.retrieve", x: 212, y: 132 },
  { id: "extract", label: "extract", type: "llm.extract", x: 312, y: 32 },
  { id: "draft", label: "draft", type: "llm.draft", x: 312, y: 132 },
  { id: "verify", label: "verify", type: "verify.citations", x: 412, y: 82 },
  { id: "brief", label: "brief", type: "output.brief", x: 512, y: 82 },
] as const;

const EDGES = [
  { from: "q", to: "plan" },
  { from: "plan", to: "search" },
  { from: "plan", to: "retrieve" },
  { from: "search", to: "extract" },
  { from: "retrieve", to: "draft" },
  { from: "extract", to: "verify" },
  { from: "draft", to: "verify" },
  { from: "verify", to: "brief" },
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

export default function HeroGraph() {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="bg-[var(--bg)] px-2 py-3">
        <svg
          viewBox="0 0 608 180"
          className="w-full"
          role="img"
          aria-label="Compiled research workflow graph"
        >
          <defs>
            <marker
              id="hero-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
            </marker>
          </defs>

          {EDGES.map((edge) => (
            <path
              key={`${edge.from}-${edge.to}`}
              d={edgePath(edge.from, edge.to)}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={1}
              markerEnd="url(#hero-arrow)"
            />
          ))}

          {NODES.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={W}
                height={H}
                rx="4"
                fill="var(--surface)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={node.x + 8}
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
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
