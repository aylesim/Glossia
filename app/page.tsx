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
    spec: ["JSON Schema structured output", "20+ deterministic checks", "repair with a visible diff"],
    tone: "var(--chart-1)",
  },
  {
    index: "02",
    title: "Run",
    tag: "graph → execution",
    body: "The patch is not a diagram. A DAG scheduler executes nodes with real inputs and outputs, streams events, retries transient failures, enforces a budget and can be cancelled mid-flight.",
    spec: ["parallel branches", "SSE + trace spans", "content-addressed cache"],
    tone: "var(--chart-2)",
  },
  {
    index: "03",
    title: "Prove",
    tag: "run → evidence",
    body: "Every run leaves a trace: prompt version, model, tokens, cost, attempts and outputs. The golden set runs the same graph contract again and again, so a regression is a number before it is an incident.",
    spec: ["cost per step", "10-case golden set", "repair-rate metrics"],
    tone: "var(--chart-4)",
  },
];

const BREAKS = [
  {
    failure: "unknown param",
    detected: "deterministic analyzer",
    action: "autofix + repair pass",
    code: "UNKNOWN_PARAM",
  },
  {
    failure: "text output → JSON port",
    detected: "port type check",
    action: "reject before runtime",
    code: "PORT_TYPE_MISMATCH",
  },
  {
    failure: "token / cost budget",
    detected: "budget tracker",
    action: "stop, keep partial trace",
    code: "BUDGET_EXCEEDED",
  },
  {
    failure: "claim without a source",
    detected: "citation verifier",
    action: "mark unsupported",
    code: "MISSING_QUOTE",
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
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-12 h-[520px] opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "linear-gradient(to bottom, black, transparent 88%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
            <div className="max-w-[610px] animate-fade-up">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                workflow runtime / proof of concept
              </div>
              <h1 className="mt-5 text-[clamp(2.4rem,4.6vw,3.9rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-[var(--fg)]">
                Compile, run, and
                <br />
                verify LLM workflows.
              </h1>
              <p className="mt-5 max-w-[540px] text-[15px] leading-7 text-[var(--fg-muted)]">
                A typed IR for LLM workflows: natural language becomes a schema-validated graph, executes
                with traces and cost, and is checked by deterministic verification. Not a chat UI — the
                runtime after the prompt.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-4 py-2.5 text-[13px] font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90"
                >
                  Open console <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/studio?demo=1"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--fg)] transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  Run the recorded demo
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
                <span>no API key in demo</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span>BYOK for live models</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span>OpenAI-compatible</span>
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <HeroGraph />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                <span>one graph · four sources · one verifier</span>
                <span className="text-[var(--fg-muted)]">fan-out → verify → brief</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 divide-x divide-[var(--border)] px-4 sm:px-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 py-5 first:pl-0 last:pr-0 sm:px-6">
                <p className="font-mono text-[22px] tracking-[-0.02em] text-[var(--fg)]">{stat.value}</p>
                <p className="mt-1 max-w-[150px] font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.08em] text-[var(--fg-subtle)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                system / three stages
              </p>
              <h2 className="mt-2 max-w-[620px] text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                The interesting part starts after the model returns.
              </h2>
            </div>
            <p className="max-w-[330px] text-[12.5px] leading-6 text-[var(--fg-muted)]">
              Most demos stop at generation. Glossia treats the generated graph as a program to validate,
              execute and measure.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {ACTS.map((act) => (
              <article
                key={act.title}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--fg-subtle)]">
                    {act.index}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: act.tone }} />
                </div>
                <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
                  {act.title}
                </h3>
                <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                  {act.tag}
                </p>
                <p className="mt-3 text-[12px] leading-5 text-[var(--fg-muted)]">{act.body}</p>
                <ul className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3">
                  {act.spec.map((item) => (
                    <li key={item} className="flex items-start gap-2 font-mono text-[10px] text-[var(--fg)]">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: act.tone }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-18">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                the contract
              </p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                JSON is not the artifact.
                <br />
                The program is.
              </h2>
              <p className="mt-4 max-w-[460px] text-[12.5px] leading-6 text-[var(--fg-muted)]">
                Every node is typed, every edge names its ports, and every param is declared by the domain.
                That is what makes the model output checkable, runnable and diffable.
              </p>
              <ul className="mt-5 space-y-2.5 text-[12px] leading-5 text-[var(--fg-muted)]">
                <li className="flex gap-2.5">
                  <span className="font-mono text-[9px] text-[var(--accent)]">01</span>
                  Domain = the type system. A patch that uses a type outside it cannot run.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-[9px] text-[var(--accent)]">02</span>
                  Ports carry types. A text output cannot silently feed a JSON input.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-[9px] text-[var(--accent)]">03</span>
                  Every error points at a node or an edge, with a suggested fix where one is safe.
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--code)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                  patch.json / 12 nodes
                </span>
                <span className="rounded border border-[var(--success)]/30 bg-[var(--success-soft)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--success)]">
                  valid
                </span>
              </div>
              <pre className="overflow-auto p-4 font-mono text-[10px] leading-[1.75] text-[var(--fg-muted)]">
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

        <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                failure modes
              </p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                The demo is the failure path.
              </h2>
            </div>
            <p className="max-w-[330px] text-[12.5px] leading-6 text-[var(--fg-muted)]">
              A system that only works on the happy path is a slide deck. These are the four failures the
              runtime is built to make cheap.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                  {["failure", "detected by", "action", "code"].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BREAKS.map((row) => (
                  <tr key={row.failure} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-3 py-2.5 text-[12px] text-[var(--fg)]">{row.failure}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--fg-muted)]">{row.detected}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--fg-muted)]">{row.action}</td>
                    <td className="px-3 py-2.5 font-mono text-[9px] text-[var(--accent)]">{row.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--inverse)] text-[var(--inverse-fg)]">
          <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-18">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-50">evidence / eval lab</p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[36px]">
                Quality becomes a number.
              </h2>
              <p className="mt-4 max-w-[470px] text-[12.5px] leading-6 opacity-65">
                The same graph contract runs against a small golden set. Validity, node recall, edge F1,
                repair rate, latency and cost are recorded per case, so a prompt change can be compared
                instead of argued about.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/eval"
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--inverse-fg)] px-4 py-2.5 text-[12px] font-medium text-[var(--inverse)] transition-opacity hover:opacity-90"
                >
                  Open eval lab <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--inverse-fg)_25%,transparent)] px-4 py-2.5 text-[12px] font-medium opacity-80 transition-opacity hover:opacity-100"
                >
                  Run the graph
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 self-end">
              {[
                ["100%", "pass rate", "10/10 demo cases"],
                ["1.00", "node recall", "precision 0.82"],
                ["0.70", "edge F1", "param accuracy 1.00"],
                ["0.4s", "p50 latency", "p95 0.5s · $0.00"],
              ].map(([value, label, detail]) => (
                <div key={label} className="border-t border-[color-mix(in_srgb,var(--inverse-fg)_18%,transparent)] pt-3">
                  <p className="font-mono text-[20px] tracking-[-0.02em]">{value}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] opacity-70">{label}</p>
                  <p className="mt-0.5 text-[10px] leading-4 opacity-45">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
              ten minutes / no key
            </p>
            <h2 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)]">
              Open the console. Break the graph.
            </h2>
            <p className="mt-2 max-w-[540px] text-[12.5px] leading-6 text-[var(--fg-muted)]">
              The demo runs on recorded fixtures, so it is deterministic and free. Switch to live when you
              want a real model and your own key.
            </p>
          </div>
          <Link
            href="/studio?demo=1"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-4 py-2.5 text-[12px] font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90"
          >
            Open the demo console <span aria-hidden>→</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
