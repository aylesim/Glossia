import Link from "next/link";
import HeroGraph from "./components/HeroGraph";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

const HYPOTHESES = [
  {
    id: "H1",
    title: "Type check before runtime",
    body: "A domain declares node types and ports, with params for each node. A patch that uses a type outside that domain is rejected before the scheduler starts.",
    observed: "Invalid patches are rejected before execution.",
    tone: "var(--chart-1)",
  },
  {
    id: "H2",
    title: "Repair with deterministic diagnostics",
    body: "The analyzer returns a machine-readable issue with a node or edge. A bounded repair pass can use that report without a second model deciding whether the graph is valid.",
    observed: "10/10 cases valid after at most two repairs.",
    tone: "var(--chart-2)",
  },
  {
    id: "H3",
    title: "Trace as the unit of comparison",
    body: "Each run records the prompt version and model. It also keeps token use and cost per node, with latency and output in the same step record.",
    observed: "12 step records in the recorded run.",
    tone: "var(--chart-4)",
  },
  {
    id: "H4",
    title: "Citation check after generation",
    body: "A claim is supported only when its quoted text appears in the cited source. The check is deterministic and runs after the model.",
    observed: "10/10 claims supported in the recorded brief.",
    tone: "var(--chart-5)",
  },
];

const SCOPE = [
  {
    inside: "A typed graph compiled from a prompt",
    outside: "Model reliability in general",
  },
  {
    inside: "Execution with per-node traces and cost",
    outside: "Production readiness",
  },
  {
    inside: "Citation checks against a four-source corpus",
    outside: "Open-web or PDF ingestion",
  },
];

const RESULTS = [
  ["Valid graphs", "10/10", "recorded fixtures"],
  ["Node recall", "1.00", "recorded fixtures"],
  ["Node precision", "0.82", "recorded fixtures"],
  ["Edge F1", "0.70", "recorded fixtures"],
  ["Parameter accuracy", "1.00", "recorded fixtures"],
  ["Mean repair attempts", "2.00", "the fixture adapter returns an invalid first patch"],
  ["p50 latency", "0.5s", "recorded fixtures"],
  ["Recorded cost", "$0.00", "recorded fixtures"],
];

const LIMITS = [
  "Ten hand-written cases and one research domain. The suite does not establish how the analyzer behaves on other workflows.",
  "Four hand-written sources in the default corpus. There is no live web or PDF ingestion.",
  "The fixture adapter returns recorded patches. The live path was exercised against a local OpenAI-compatible mock, not a real provider in this environment.",
  "Structural scoring only. There is no calibrated LLM judge for brief quality.",
  "In-process run registry and file persistence. A multi-instance deployment needs an event bus and a database.",
  "Read-only graph. There is no editor, authentication or share link.",
];

const INSPECT = [
  ["/studio", "Open the prototype", "Run the recorded case and inspect the trace."],
  ["/eval", "Read the evaluation", "See every case and every metric."],
  [
    "https://github.com/aylesim/Glossia/blob/main/docs/architecture.md",
    "Architecture",
    "Compiler and runtime boundaries.",
  ],
  [
    "https://github.com/aylesim/Glossia/blob/main/docs/REVIEW.md",
    "Review notes",
    "Current gaps and the order I would close them.",
  ],
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
                typed LLM workflows
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                <span>working note 01</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span>October 2026</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span>status: prototype</span>
              </div>
              <h1 className="mt-3 text-[clamp(2.2rem,4vw,3.35rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-[var(--fg)]">
                Typed graphs for
                <br />
                LLM workflows.
              </h1>
              <p className="mt-5 max-w-[560px] text-[15px] leading-7 text-[var(--fg-muted)]">
                Glossia is a research prototype, not a product. It compiles a natural-language request
                into a typed graph, checks the graph before execution, runs it as a DAG, and records the
                result. The current study asks whether deterministic checks and a bounded repair loop can
                catch model errors before they reach execution.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 font-mono text-[9px] uppercase tracking-[0.1em]">
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-1.5 text-[var(--fg)] transition-colors hover:text-[var(--accent)]"
                >
                  Open the prototype <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/eval"
                  className="inline-flex items-center gap-1.5 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                >
                  Read the evaluation <span aria-hidden>→</span>
                </Link>
                <a
                  href="https://github.com/aylesim/Glossia"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                >
                  Source <span aria-hidden>↗</span>
                </a>
              </div>
              <p className="mt-6 max-w-[520px] font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-[var(--fg-subtle)]">
                The default path uses recorded fixtures. A live adapter can call OpenAI-compatible models
                for comparison.
              </p>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <HeroGraph />
              <p className="mt-2 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-[var(--fg-subtle)]">
                Instrumented example run. Eight of twelve nodes shown.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 divide-x divide-[var(--border)] px-4 sm:px-6 md:grid-cols-4">
            {[
              ["10", "structural cases"],
              ["1.00", "node recall"],
              ["0.70", "edge F1"],
              ["$0.00", "recorded run cost"],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-5 first:pl-0 last:pr-0 sm:px-6">
                <p className="font-mono text-[22px] tracking-[-0.02em] text-[var(--fg)]">{value}</p>
                <p className="mt-1 max-w-[150px] font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.08em] text-[var(--fg-subtle)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
          <div className="grid gap-8 border-b border-[var(--border)] pb-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                scope
              </p>
              <h2 className="mt-2 max-w-[500px] text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                A narrow test, with the limits in view.
              </h2>
            </div>
            <div>
              <p className="max-w-[620px] text-[13px] leading-6 text-[var(--fg-muted)]">
                The claim is narrow. If a domain encodes the legal node types, ports and parameters, then a
                deterministic analyzer should catch many model errors before execution. If the analyzer can
                explain an error precisely enough, a bounded repair pass should recover a valid graph
                without a second model deciding validity.
              </p>
              <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="grid grid-cols-2 border-b border-[var(--border)] bg-[var(--surface-raised)]">
                  <span className="px-3 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                    in this prototype
                  </span>
                  <span className="border-l border-[var(--border)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                    not claimed here
                  </span>
                </div>
                {SCOPE.map((row) => (
                  <div key={row.inside} className="grid grid-cols-2 border-b border-[var(--border)] last:border-b-0">
                    <span className="px-3 py-2 text-[11.5px] leading-5 text-[var(--fg)]">{row.inside}</span>
                    <span className="border-l border-[var(--border)] px-3 py-2 text-[11.5px] leading-5 text-[var(--fg-muted)]">
                      {row.outside}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                hypotheses
              </p>
              <h2 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[32px]">
                What the prototype tests.
              </h2>
            </div>
            <p className="max-w-[360px] text-[12px] leading-6 text-[var(--fg-muted)]">
              Each hypothesis has a corresponding implementation and a result from the recorded fixture
              set. None of them is a claim about model behavior in general.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {HYPOTHESES.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                    {entry.id}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.tone }} />
                </div>
                <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
                  {entry.title}
                </h3>
                <p className="mt-2 text-[12px] leading-5 text-[var(--fg-muted)]">{entry.body}</p>
                <p className="mt-4 border-t border-[var(--border)] pt-3 font-mono text-[9px] leading-5 text-[var(--fg)]">
                  <span className="uppercase tracking-[0.08em] text-[var(--fg-subtle)]">observed </span>
                  {entry.observed}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-18">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                method
              </p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                How the prototype works.
              </h2>
              <div className="mt-4 space-y-3 text-[12.5px] leading-6 text-[var(--fg-muted)]">
                <p>
                  The compiler receives a JSON Schema generated from the domain. It parses the model
                  output, fills in the research question and passes the patch to the analyzer. The analyzer
                  checks each node type and its declared params, then follows the port connections and
                  required inputs. It rejects cycles and unreachable nodes. If it finds an error, the
                  compiler sends the issue list back for a repair pass. The limit is two repairs.
                </p>
                <p>
                  A valid patch runs on a DAG scheduler. Nodes receive typed inputs from upstream ports and
                  run in parallel where the graph allows it. Each step writes a record with its status and token use, then keeps latency and cost fields. A content-addressed cache stores completed steps, so a repeated run
                  can return the same result without model calls.
                </p>
                <p>
                  The evaluation suite runs the same contract against ten structural cases. It scores
                  whether the graph is valid and how closely its nodes and edges match the expected patch.
                  It also records parameter accuracy and the number of repair attempts. Latency and cost
                  are kept per case.
                </p>
              </div>
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
      "params": { "maxSources": 4 } },
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
                results
              </p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                Recorded results.
              </h2>
            </div>
            <p className="max-w-[360px] text-[12px] leading-6 text-[var(--fg-muted)]">
              These numbers describe the ten-case fixture set and one recorded run. They are not a
              benchmark of model quality.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                  {["metric", "value", "condition"].map((label) => (
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
                {RESULTS.map((row) => (
                  <tr key={row[0]} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-3 py-2.5 text-[12px] text-[var(--fg)]">{row[0]}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--fg)]">{row[1]}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--fg-muted)]">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-[760px] font-mono text-[9px] leading-5 text-[var(--fg-subtle)]">
            Mean repair attempts is a property of the fixture adapter. It deliberately returns an invalid
            first patch so the repair path is exercised.
          </p>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                  limits
                </p>
                <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                  What this does not show.
                </h2>
              </div>
              <p className="max-w-[360px] text-[12px] leading-6 text-[var(--fg-muted)]">
                The prototype is intentionally small. These gaps matter more than the passing numbers.
              </p>
            </div>
            <ul className="mt-6 grid gap-x-8 gap-y-3 md:grid-cols-2">
              {LIMITS.map((limit, index) => (
                <li key={limit} className="flex gap-3 border-t border-[var(--border)] pt-3">
                  <span className="font-mono text-[9px] text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[12px] leading-5 text-[var(--fg-muted)]">{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                inspect
              </p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-[36px]">
                The code and the numbers are public.
              </h2>
              <p className="mt-4 max-w-[460px] text-[12.5px] leading-6 text-[var(--fg-muted)]">
                The prototype is intentionally small. The question is whether the type and trace layers
                carry enough information to make the behavior of the model debuggable.
              </p>
              <Link
                href="/studio"
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-4 py-2.5 text-[12px] font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90"
              >
                Open the prototype <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              {INSPECT.map(([href, title, detail]) => {
                const external = href.startsWith("http");
                const className =
                  "flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-raised)]";
                const content = (
                  <>
                    <span>
                      <span className="block text-[12px] font-medium text-[var(--fg)]">{title}</span>
                      <span className="mt-0.5 block text-[11px] leading-5 text-[var(--fg-muted)]">
                        {detail}
                      </span>
                    </span>
                    <span className="font-mono text-[9px] text-[var(--fg-subtle)]">
                      {external ? "↗" : "→"}
                    </span>
                  </>
                );
                return external ? (
                  <a key={href} href={href} target="_blank" rel="noreferrer" className={className}>
                    {content}
                  </a>
                ) : (
                  <Link key={href} href={href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
