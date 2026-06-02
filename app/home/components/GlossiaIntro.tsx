"use client";

import { useEffect, useState } from "react";

const PROMPT = "A novel about wolves";

const PHASES = [
  {
    id: "spark",
    emoji: "📝",
    label: "You describe an idea",
    line: "“A novel about wolves…”",
    caption: "Context emojis gather around your prompt",
  },
  {
    id: "vocab",
    emoji: "🧩",
    label: "Node types unlock",
    line: "Character · Scene · Chapter · Beat",
    caption: "The domain defines story building blocks",
  },
  {
    id: "story",
    emoji: "📖",
    label: "You tell the story",
    line: "A young wolf crosses the river at dusk…",
    caption: "Plain language becomes structured flow",
  },
  {
    id: "graph",
    emoji: "🗺️",
    label: "The graph composes",
    line: "Luna → River → Legend → Novel",
    caption: "Validated nodes and edges, then the diagram",
  },
] as const;

const CONTEXT_EMOJIS = [
  { emoji: "🐺", className: "left-[6%] top-[18%]", delay: 0 },
  { emoji: "📖", className: "left-[22%] top-[52%]", delay: 80 },
  { emoji: "🌲", className: "right-[28%] top-[14%]", delay: 160 },
  { emoji: "🌙", className: "right-[8%] top-[38%]", delay: 240 },
  { emoji: "❄️", className: "right-[18%] top-[58%]", delay: 320 },
  { emoji: "🏔️", className: "left-[38%] top-[62%]", delay: 400 },
] as const;

const VOCAB_CHIPS = [
  { emoji: "🧑", label: "Character" },
  { emoji: "🌲", label: "Scene" },
  { emoji: "📑", label: "Chapter" },
  { emoji: "⚡", label: "Beat" },
  { emoji: "💡", label: "Theme" },
] as const;

const STORY_LINES = [
  "A young wolf leaves the pack when the first snow falls.",
  "She crosses the frozen river as the moon climbs the pines.",
  "The elders whisper the legend of the white wolf—and her path changes.",
] as const;

const GRAPH_NODES = [
  { id: "luna", label: "Luna", x: 14, y: 38 },
  { id: "river", label: "River", x: 40, y: 20 },
  { id: "elders", label: "Elders", x: 40, y: 56 },
  { id: "legend", label: "Legend", x: 66, y: 38 },
  { id: "novel", label: "Novel", x: 88, y: 38 },
] as const;

const GRAPH_EDGES = [
  { d: "M 22 38 L 32 20", delay: 0 },
  { d: "M 22 38 L 32 56", delay: 120 },
  { d: "M 48 20 L 58 38", delay: 240 },
  { d: "M 48 56 L 58 38", delay: 360 },
  { d: "M 74 38 L 80 38", delay: 480 },
] as const;

const PHASE_MS = [4800, 3800, 5200, 5000] as const;

function IntroStage({
  phase,
  typed,
  emojisReady,
}: {
  phase: number;
  typed: string;
  emojisReady: boolean;
}) {
  const graphLit = phase === 3;
  const visibleGraphNodes = phase === 3 ? 5 : 0;

  return (
    <div
      className="glossia-intro-stage relative aspect-[5/3] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--graph-bg)]"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, var(--graph-dots) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {phase === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <p className="glossia-intro-glow max-w-[92%] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-center font-mono text-[11px] leading-snug text-[var(--fg)] sm:text-xs">
            <span className="text-[var(--fg-subtle)]">you · </span>
            {typed}
            {typed.length < PROMPT.length ? (
              <span className="glossia-intro-cursor ml-0.5 inline-block w-[5px] bg-[var(--fg)]" />
            ) : (
              <span className="text-[var(--fg-muted)]">…</span>
            )}
          </p>
          {CONTEXT_EMOJIS.map((item) => (
            <span
              key={item.emoji}
              className={`absolute text-xl sm:text-2xl ${item.className} ${
                emojisReady ? "glossia-intro-emoji-pop glossia-intro-emoji-float" : "scale-0 opacity-0"
              }`}
              style={{ animationDelay: emojisReady ? `${item.delay}ms` : undefined }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
      ) : null}

      {phase === 1 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--fg-subtle)]">domain · story nodes</p>
          <div className="flex flex-wrap justify-center gap-2">
            {VOCAB_CHIPS.map((chip, i) => (
              <span
                key={chip.label}
                className="glossia-intro-emoji-pop inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1 font-mono text-[10px] text-[var(--fg)]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-sm">{chip.emoji}</span>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 2 ? (
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--fg-subtle)]">your story</p>
          {STORY_LINES.map((line, i) => (
            <p
              key={line}
              className="glossia-intro-story-line rounded border border-[var(--border)] bg-[var(--surface-raised)]/90 px-2.5 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--fg)] sm:text-[10px]"
              style={{ animationDelay: `${i * 450}ms` }}
            >
              <span className="mr-1.5 text-[var(--fg-subtle)]">{i + 1}.</span>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {phase === 3 ? (
        <div className="absolute bottom-2 left-2 right-2 top-8">
          <svg className="h-full w-full" viewBox="0 0 100 72" preserveAspectRatio="xMidYMid meet">
            <g className="glossia-intro-edges" stroke="var(--graph-edge)" strokeWidth="1.2" fill="none">
              {GRAPH_EDGES.map((edge) => (
                <path
                  key={edge.d}
                  d={edge.d}
                  className="glossia-intro-edge"
                  style={{ animationDelay: `${edge.delay}ms` }}
                />
              ))}
            </g>
            {GRAPH_NODES.map((node, i) => {
              if (i >= visibleGraphNodes) return null;
              return (
                <g
                  key={node.id}
                  className="glossia-intro-node glossia-intro-node-pop"
                  style={{ animationDelay: `${i * 140}ms` }}
                >
                  <rect
                    x={node.x - 9}
                    y={node.y - 7}
                    width="18"
                    height="14"
                    rx="2"
                    fill="var(--graph-node-bg)"
                    stroke={node.id === "novel" ? "var(--border-strong)" : "var(--graph-node-border)"}
                    strokeWidth={node.id === "novel" ? 1.5 : 1}
                    className={node.id === "novel" ? "glossia-intro-graph-pulse" : undefined}
                  />
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    fontSize="4.5"
                    fill="var(--graph-node-title)"
                    fontFamily="var(--font-geist-mono), monospace"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}

      <div
        className={`absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all duration-500 ${
          graphLit
            ? "glossia-intro-glow bg-[var(--inverse-bg)] text-[var(--inverse-fg)]"
            : "bg-[var(--surface)] text-[var(--fg-subtle)]"
        }`}
      >
        {phase === 0 ? "idea" : phase === 1 ? "nodes" : phase === 2 ? "story" : "graph"}
      </div>
    </div>
  );
}

export default function GlossiaIntro() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const [emojisReady, setEmojisReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion || phase !== 0) return;
    setEmojisReady(false);
    setTyped("");
    let i = 0;
    const tick = window.setInterval(() => {
      i += 1;
      setTyped(PROMPT.slice(0, i));
      if (i >= PROMPT.length) {
        window.clearInterval(tick);
        window.setTimeout(() => setEmojisReady(true), 250);
      }
    }, 58);
    return () => window.clearInterval(tick);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion) return;
    setTyped(PROMPT);
    setEmojisReady(true);
    setPhase(PHASES.length - 1);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const ms = PHASE_MS[phase] ?? 4200;
    const id = window.setTimeout(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, ms);
    return () => window.clearTimeout(id);
  }, [phase, reducedMotion]);

  const active = reducedMotion ? PHASES.length - 1 : phase;

  return (
    <section
      className="glossia-intro mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_0_var(--border)]"
      aria-labelledby="glossia-intro-heading"
    >
      <div className="glossia-intro-shimmer pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent opacity-60" />

      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:p-5">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--fg-subtle)]">
            <span className="glossia-intro-sparkle mr-1" aria-hidden>
              ✨
            </span>
            How Glossia works
          </p>
          <h2
            id="glossia-intro-heading"
            className="mt-2 font-mono text-lg font-semibold leading-tight tracking-tight text-[var(--fg)] sm:text-xl"
          >
            From a sentence
            <span className="block text-[var(--fg-muted)]">to a living graph.</span>
          </h2>
          <p className="mt-3 max-w-md font-mono text-[11px] leading-relaxed text-[var(--fg-muted)] sm:text-xs">
            Type any world—like a wolf novel. Glossia gathers context, builds node types, understands your
            story, then composes the diagram.
          </p>

          <ol className="mt-4 grid list-none gap-1.5 sm:grid-cols-2">
            {PHASES.map((step, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-all duration-500 ${
                    on
                      ? "glossia-intro-glow scale-[1.02] border-[var(--border-strong)] bg-[var(--surface-raised)]"
                      : done
                        ? "border-[var(--border)] bg-[var(--surface-raised)]/50 opacity-80"
                        : "border-transparent bg-transparent opacity-50"
                  }`}
                >
                  <span
                    className={`text-lg leading-none transition-transform duration-500 ${on ? "glossia-intro-bounce" : ""}`}
                    aria-hidden
                  >
                    {step.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-medium text-[var(--fg)]">{step.label}</p>
                    <p className="font-mono text-[9px] text-[var(--fg-subtle)]">{step.caption}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <IntroStage phase={active} typed={reducedMotion ? PROMPT : typed} emojisReady={reducedMotion || emojisReady} />
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 font-mono text-[10px] text-[var(--fg)] transition-opacity duration-500">
              <span aria-hidden>{PHASES[active].emoji} </span>
              {PHASES[active].line}
            </p>
            <div className="flex shrink-0 gap-1" role="tablist" aria-label="Demo step">
              {PHASES.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={step.label}
                  onClick={() => {
                    setPhase(i);
                    if (i === 0 && !reducedMotion) {
                      setTyped("");
                      setEmojisReady(false);
                    }
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? "w-5 bg-[var(--border-strong)]" : "w-1.5 bg-[var(--border)] hover:bg-[var(--fg-subtle)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
