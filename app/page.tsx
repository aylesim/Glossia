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
    body: "The analyzer returns a machine-readable issue on a node or edge. A bounded repair pass uses that report; a second model does not decide validity.",
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
  "Four hand-written sources; no live web or PDF ingestion.",
  "Default path uses recorded fixtures.",
  "Structural scoring only.",
  "In-process run registry. Read-only graph.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1000px] px-4 py-12 sm:px-6">
        <header className="max-w-[36rem]">
          <h1 className="text-[clamp(1.75rem,3.5vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--fg)]">
            Typed graphs for LLM workflows
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[var(--fg-muted)]">
            Glossia compiles a natural-language request into a typed graph, checks it before execution,
            runs it as a DAG, and records per-node traces. The study is whether deterministic checks and a
            bounded repair loop can catch model errors before execution.
          </p>
        </header>

        <div className="mt-10">
          <HeroGraph />
        </div>

        <section className="mt-12 border-t border-[var(--border)] pt-10">
          <h2 className="text-[13px] font-medium text-[var(--fg)]">Hypotheses</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-x-10">
            {HYPOTHESES.map((entry) => (
              <li key={entry.id}>
                <p className="text-[15px] font-medium text-[var(--fg)]">{entry.title}</p>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--fg-muted)]">{entry.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-[var(--border)] pt-10">
          <h2 className="text-[13px] font-medium text-[var(--fg)]">Limits</h2>
          <ul className="mt-4 list-disc space-y-2 pl-4 text-[13px] leading-6 text-[var(--fg-muted)]">
            {LIMITS.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
