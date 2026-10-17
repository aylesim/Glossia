import Link from "next/link";
import HeroGraph from "./components/HeroGraph";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

const ACTS = [
  {
    index: "01",
    title: "Compile",
    tag: "intent → typed graph",
    body: "A domain is a type system: node types, typed ports and declared params. The model writes a program in that language. A deterministic analyzer checks the result, and a repair loop fixes what the model got wrong.",
    points: ["JSON Schema structured output", "20+ deterministic checks", "repair with a visible diff"],
    tone: "var(--chart-1)",
  },
  {
    index: "02",
    title: "Run",
    tag: "graph → real execution",
    body: "The patch is not a diagram. A DAG scheduler executes nodes with real inputs and outputs, streams events, retries transient failures, enforces a budget and can be cancelled mid-flight.",
    points: ["parallel branches", "SSE events + trace spans", "content-addressed cache"],
    tone: "var(--chart-2)",
  },
  {
    index: "03",
    title: "Prove",
    tag: "run → evidence",
    body: "Every run leaves a trace: prompt, model, tokens, cost, attempts and outputs. The golden set runs the same graph contract again and again, so a prompt regression is a number before it is an incident.",
    points: ["cost per step", "10-case golden set", "repair-rate metrics"],
    tone: "var(--chart-5)",
  },
];

const BREAKS = [
  {
    label: "schema error",
    tone: "var(--warning)",
    title: "The model invents a param.",
    body: "The analyzer catches `max_results` on a node that only declares `maxSources`. The repair prompt gets the exact error, the model returns the full patch, and the diff shows the fix.",
    code: "UNKNOWN_PARAM → repair → diff",
  },
  {
    label: "port mismatch",
    tone: "var(--danger)",
    title: "A text output meets a JSON port.",
    body: "Ports are typed. The edge is rejected before the runtime starts, and the issue is attached to the exact node and edge instead of a wall of text.",
    code: "text → json  ✕  PORT_TYPE_MISMATCH",
  },
  {
    label: "budget stop",
    tone: "var(--chart-4)",
    title: "A run cannot finish.",
    body: "The budget is checked before every model call. When it runs out, the run stops cleanly with the steps it completed, the cost so far and a partial artifact.",
    code: "$0.25 / $0.25  →  stopped",
  },
];

const STATS = [
  { value: "12", label: "nodes in the hero graph" },
  { value: "10", label: "structural eval cases" },
  { value: "2", label: "repair attempts, max" },
  { value: "$0.00", label: "demo run, no key" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 38%), radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--chart-1) 9%, transparent), transparent 42%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
            <div className="max-w-[600px] animate-fade-up">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                LLM workflow compiler / proof of concept
              </p>
              <h1 className="mt-5 font-serif text-[clamp(2.5rem,5.2vw,4.5rem)] font-normal leading-[0.98] tracking-[-0.035em] text-[var(--fg)]">
                Describe the workflow.
                <br />
                Glossia compiles it,
                <br />
                <em className="italic text-[var(--accent)]">runs it, and proves it.</em>
              </h1>
              <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-[var(--fg-muted)]">
                A typed IR for LLM workflows: natural language becomes a schema-validated graph, executes
                with traces and cost, and is verified by deterministic checks. Not another chat UI — the
                layer after the prompt.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110"
                >
                  Open the studio <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/studio?demo=1"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--fg)] transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  Try the recorded demo
                </Link>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                No API key in demo mode · bring your own key for live models
              </p>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <HeroGraph />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                <span>one graph · four sources · one verifier</span>
                <span className="text-[var(--fg-muted)]">fan-out → verify → brief</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)]">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 divide-x divide-[var(--border)] px-5 sm:px-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 py-6 first:pl-0 last:pr-0 sm:px-6">
                <p className="font-serif text-3xl tracking-[-0.02em] text-[var(--fg)]">{stat.value}</p>
                <p className="mt-1.5 max-w-[150px] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-[var(--fg-subtle)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                One system, three acts
              </p>
              <h2 className="mt-3 max-w-[640px] font-serif text-3xl leading-tight tracking-[-0.02em] text-[var(--fg)] sm:text-4xl">
                The interesting part starts after the model returns.
              </h2>
            </div>
            <p className="max-w-[320px] text-sm leading-6 text-[var(--fg-muted)]">
              Most demos stop at generation. Glossia treats the generated graph as a program to validate,
              execute and measure.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ACTS.map((act) => (
              <article
                key={act.title}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-subtle)]">
                    {act.index}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: act.tone }} />
                </div>
                <h3 className="mt-4 font-serif text-2xl tracking-[-0.01em] text-[var(--fg)]">{act.title}</h3>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                  {act.tag}
                </p>
                <p className="mt-4 text-[13px] leading-6 text-[var(--fg-muted)]">{act.body}</p>
                <ul className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
                  {act.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-[12px] text-[var(--fg)]">
                      <span
                        className="mt-[6px] h-1 w-1 shrink-0 rounded-full"
                        style={{ background: act.tone }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                The graph is the contract
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.02em] text-[var(--fg)] sm:text-4xl">
                JSON is not the artifact.
                <br />
                The program is.
              </h2>
              <p className="mt-5 max-w-[460px] text-sm leading-7 text-[var(--fg-muted)]">
                Every node is typed, every edge names its ports, and every param is declared by the domain.
                That is what makes the model output checkable, runnable and diffable.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[var(--fg-muted)]">
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-[var(--accent)]">→</span>
                  Domain = the type system. A patch that uses a type outside it cannot run.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-[var(--accent)]">→</span>
                  Ports carry types. A text output cannot silently feed a JSON input.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-[var(--accent)]">→</span>
                  Every error points at a node or an edge, with a suggested fix where one is safe.
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--code)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                  patch.json / 12 nodes
                </span>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[9px] text-[var(--fg-muted)]">
                  valid
                </span>
              </div>
              <pre className="overflow-auto p-5 font-mono text-[10.5px] leading-[1.75] text-[var(--fg-muted)]">
{`{
  "version": "2",
  "domainId": "research-brief",
  "nodes": [
    { "id": "q",      "type": "input.question",
      "params": { "question": "How should a team ship..." } },
    { "id": "plan",   "type": "llm.plan",
      "params": { "maxQueries": 3 } },
    { "id": "search", "type": "tool.search",
      "params": { "maxSources": 4, "corpus": "demo" } },
    { "id": "verify", "type": "verify.citations",
      "params": { "strict": true } }
  ],
  "edges": [
    { "from": "q", "fromPort": "question",
      "to": "plan", "toPort": "question" },
    { "from": "plan", "fromPort": "queries",
      "to": "search", "toPort": "queries" },
    { "from": "verify", "fromPort": "verified",
      "to": "out", "toPort": "verified" }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-[680px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              What breaks (and what happens next)
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.02em] text-[var(--fg)] sm:text-4xl">
              The demo is the failure path.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--fg-muted)]">
              A system that only works on the happy path is a slide deck. These are the three failures the
              demo is built to show.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BREAKS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"
                    style={{
                      color: item.tone,
                      borderColor: `color-mix(in srgb, ${item.tone} 40%, transparent)`,
                      background: `color-mix(in srgb, ${item.tone} 10%, transparent)`,
                    }}
                  >
                    {item.label}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--fg-subtle)]">caught</span>
                </div>
                <h3 className="mt-4 text-[15px] font-medium leading-snug text-[var(--fg)]">{item.title}</h3>
                <p className="mt-2.5 text-[12.5px] leading-6 text-[var(--fg-muted)]">{item.body}</p>
                <p className="mt-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--code)] px-2.5 py-2 font-mono text-[9.5px] text-[var(--fg-subtle)]">
                  {item.code}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--inverse)] text-[var(--inverse-fg)]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-20">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">Proof, not vibes</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.02em] sm:text-4xl">
                Quality becomes a number.
              </h2>
              <p className="mt-5 max-w-[480px] text-sm leading-7 opacity-70">
                The same graph contract runs against a small golden set. Validity, node recall, edge F1,
                repair rate, latency and cost are recorded per case, so a prompt change can be compared
                instead of argued about.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/eval"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--inverse-fg)] px-5 py-2.5 text-sm font-medium text-[var(--inverse)] transition-opacity hover:opacity-90"
                >
                  Open the eval lab <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--inverse-fg)_25%,transparent)] px-5 py-2.5 text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
                >
                  Run the graph
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-end">
              {[
                ["validity@1", "schema-valid first pass"],
                ["validity@repair", "schema-valid after repair"],
                ["node recall", "expected steps present"],
                ["edge F1", "data-flow shape"],
                ["repair rate", "how often the loop runs"],
                ["p50 / p95", "latency per compile"],
              ].map(([label, detail]) => (
                <div key={label} className="border-t border-[color-mix(in_srgb,var(--inverse-fg)_18%,transparent)] pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em]">{label}</p>
                  <p className="mt-1 text-[11px] leading-5 opacity-55">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center lg:py-20">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              Ten minutes, no key
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.02em] text-[var(--fg)] sm:text-4xl">
              Try the graph. Then break it.
            </h2>
            <p className="mt-3 max-w-[520px] text-sm leading-7 text-[var(--fg-muted)]">
              The demo runs on recorded fixtures, so it is deterministic and free. Switch to live mode when
              you want a real model and your own key.
            </p>
          </div>
          <Link
            href="/studio?demo=1"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110"
          >
            Open the demo studio <span aria-hidden>→</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
