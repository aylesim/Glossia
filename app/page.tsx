import Link from "next/link";
import HeroGraph from "./components/HeroGraph";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

const HYPOTHESES = [
  {
    id: "H1",
    title: "Type check before runtime",
    body: "A domain declares node types, ports, and params. Patches outside that domain are rejected before the scheduler starts.",
  },
  {
    id: "H2",
    title: "Repair with deterministic diagnostics",
    body: "The analyzer returns a machine-readable issue on a node or edge. A bounded repair pass can use that report without a second model deciding validity.",
  },
  {
    id: "H3",
    title: "Trace as the unit of comparison",
    body: "Each run records prompt version, model, token use, cost, latency, and output per step.",
  },
  {
    id: "H4",
    title: "Citation check after generation",
    body: "A claim is supported only when its quoted text appears in the cited source. The check is deterministic and runs after the model.",
  },
];

const LIMITS = [
  "Ten hand-written cases and one research domain.",
  "Four hand-written sources in the default corpus; no live web or PDF ingestion.",
  "The fixture adapter returns recorded patches; live path was exercised against a local OpenAI-compatible mock.",
  "Structural scoring only; no calibrated LLM judge for brief quality.",
  "In-process run registry and file persistence.",
  "Read-only graph; no editor, authentication, or share link.",
];

const LINKS = [
  ["/studio", "Prototype", "Run the recorded case and inspect the trace."],
  ["/eval", "Evaluation", "Cases and metrics from the fixture suite."],
  [
    "https://github.com/aylesim/Glossia/blob/main/docs/architecture.md",
    "Architecture",
    "Compiler and runtime boundaries.",
  ],
  [
    "https://github.com/aylesim/Glossia/blob/main/docs/REVIEW.md",
    "Review notes",
    "Open gaps and likely next steps.",
  ],
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />

      <main>
        <section className="border-b border-[var(--border)]">
          <div className="mx-auto grid w-full max-w-[1000px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-start lg:gap-14 lg:py-16">
            <header className="max-w-[32rem]">
              <p className="font-mono text-[10px] text-[var(--fg-subtle)]">working note · october 2026</p>
              <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--fg)]">
                Typed graphs for LLM workflows
              </h1>
              <p className="mt-4 text-[15px] leading-7 text-[var(--fg-muted)]">
                Glossia compiles a natural-language request into a typed graph, checks it before execution,
                runs it as a DAG, and records per-node traces. The study is whether deterministic checks and a
                bounded repair loop can catch model errors before execution.
              </p>
              <p className="mt-4 text-[13px] leading-6 text-[var(--fg-subtle)]">
                Default path uses recorded fixtures. A live adapter can call OpenAI-compatible models.
              </p>
              <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <Link href="/studio" className="text-[var(--fg)] hover:underline">
                  Prototype
                </Link>
                <Link href="/eval" className="text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline">
                  Evaluation
                </Link>
                <a
                  href="https://github.com/aylesim/Glossia"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline"
                >
                  Source
                </a>
              </nav>
            </header>

            <div>
              <HeroGraph />
              <p className="mt-2 font-mono text-[10px] text-[var(--fg-subtle)]">
                Example run, eight of twelve nodes
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6">
          <section className="border-b border-[var(--border)] py-12">
            <h2 className="font-mono text-[10px] text-[var(--fg-subtle)]">Hypotheses</h2>
            <p className="mt-2 max-w-[40rem] text-[13px] leading-6 text-[var(--fg-muted)]">
              Four concrete checks tied to the implementation. None is a claim about model behavior in general.
            </p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-x-10">
              {HYPOTHESES.map((entry) => (
                <li key={entry.id}>
                  <p className="font-mono text-[10px] text-[var(--fg-subtle)]">{entry.id}</p>
                  <p className="mt-1 text-[15px] font-medium text-[var(--fg)]">{entry.title}</p>
                  <p className="mt-1.5 text-[13px] leading-6 text-[var(--fg-muted)]">{entry.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-b border-[var(--border)] py-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <h2 className="font-mono text-[10px] text-[var(--fg-subtle)]">Method</h2>
                <div className="mt-4 space-y-4 text-[13px] leading-6 text-[var(--fg-muted)]">
                  <p>
                    The compiler receives a JSON Schema from the domain, parses model output, and passes the
                    patch to the analyzer. The analyzer checks node types, params, port wiring, cycles, and
                    unreachable nodes. On error, the compiler may run up to two repair passes using the issue
                    list.
                  </p>
                  <p>
                    Valid patches run on a DAG scheduler with parallel steps where the graph allows. Each step
                    writes status, tokens, latency, and cost; a content-addressed cache can skip repeated model
                    calls.
                  </p>
                </div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--code)]">
                <div className="border-b border-[var(--border)] px-3 py-2 font-mono text-[10px] text-[var(--fg-subtle)]">
                  patch.json
                </div>
                <pre className="overflow-auto p-4 font-mono text-[10px] leading-relaxed text-[var(--fg-muted)]">
                  {`{
  "version": "2",
  "domainId": "research-brief",
  "nodes": [
    { "id": "q", "type": "input.question" },
    { "id": "plan", "type": "llm.plan" },
    { "id": "search", "type": "tool.search" },
    { "id": "verify", "type": "verify.citations" }
  ],
  "edges": [ ... ]
}`}
                </pre>
              </div>
            </div>
          </section>

          <section className="grid gap-12 py-12 lg:grid-cols-2 lg:gap-10">
            <div>
              <h2 className="font-mono text-[10px] text-[var(--fg-subtle)]">Limits</h2>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-[13px] leading-6 text-[var(--fg-muted)]">
                {LIMITS.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-[10px] text-[var(--fg-subtle)]">Links</h2>
              <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {LINKS.map(([href, title, detail]) => {
                  const external = href.startsWith("http");
                  const rowClass = "block py-3 text-[13px] hover:bg-[var(--surface-raised)]";
                  const inner = (
                    <>
                      <span className="text-[var(--fg)]">{title}</span>
                      <span className="mt-0.5 block text-[12px] leading-5 text-[var(--fg-muted)]">
                        {detail}
                      </span>
                    </>
                  );
                  return (
                    <li key={href}>
                      {external ? (
                        <a href={href} target="_blank" rel="noreferrer" className={rowClass}>
                          {inner}
                        </a>
                      ) : (
                        <Link href={href} className={rowClass}>
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
