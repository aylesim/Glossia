const STEPS = [
  {
    id: "domain",
    index: "01",
    title: "Domain",
    tag: "schema",
    body: "Bootstrap or import a JSON vocabulary of node types—ports, parameters, semantics. The studio validates structure and exposes types in the catalog.",
  },
  {
    id: "compose",
    index: "02",
    title: "Compose",
    tag: "patch",
    body: "Describe the pipeline in plain language. The model returns pseudocode and a patch: typed node instances linked by directed edges, checked against the domain.",
  },
  {
    id: "graph",
    index: "03",
    title: "Graph",
    tag: "view",
    body: "A valid patch renders as an interactive graph—layout, smoothstep edges, per-type chrome. Regenerate JSON, switch output tabs, or iterate on the patch.",
  },
] as const;

export default function GlossiaIntro() {
  return (
    <section
      className="mb-6 border-b border-[var(--border)] pb-6"
      aria-labelledby="glossia-intro-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">Overview</p>
          <h2
            id="glossia-intro-heading"
            className="mt-2 font-serif text-2xl font-normal leading-snug tracking-tight text-[var(--fg)] sm:text-[1.65rem]"
          >
            Natural language in, validated graphs out.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
            Glossia is a schema-grounded studio: you lock the vocabulary first, then generate pipelines that must
            conform to it.
          </p>
        </div>
        <dl className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-[var(--fg-subtle)]">
          <div>
            <dt className="uppercase tracking-wide">Input</dt>
            <dd className="mt-0.5 text-[var(--fg)]">prompt + domain JSON</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">Output</dt>
            <dd className="mt-0.5 text-[var(--fg)]">patch JSON · graph</dd>
          </div>
        </dl>
      </div>

      <ol className="mt-8 grid list-none gap-3 md:grid-cols-3 md:gap-0">
        {STEPS.map((step, i) => (
          <li key={step.id} className="relative md:px-4 md:first:pl-0 md:last:pr-0">
            {i < STEPS.length - 1 ? (
              <span
                className="pointer-events-none absolute right-0 top-8 hidden h-px w-4 translate-x-1/2 bg-[var(--border)] md:block lg:w-6"
                aria-hidden
              />
            ) : null}
            <article className="h-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] tabular-nums text-[var(--fg-subtle)]">{step.index}</span>
                <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">
                  {step.tag}
                </span>
              </div>
              <h3 className="mt-2 font-mono text-sm font-medium text-[var(--fg)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">{step.body}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
