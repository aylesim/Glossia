const STEPS = [
  {
    id: "domain",
    index: "01",
    title: "Domain",
    tag: "building blocks",
    body: "Start by defining which kinds of nodes exist in your project (for example: character, place, scene). Glossia checks the definition and lists them in the catalog so every later step uses the same vocabulary.",
    exampleLabel: "Example prompt",
    example:
      "A fairy-tale domain with the big bad wolf, three little pigs, straw house, wooden house, brick house, and the forest path.",
  },
  {
    id: "compose",
    index: "02",
    title: "Compose",
    tag: "your pipeline",
    body: "Describe what you want to happen in everyday language. Glossia turns that into a concrete pipeline: which nodes to use, how to connect them, and the settings on each step.",
    exampleLabel: "Example prompt",
    example:
      "The big bad wolf huffs and puffs at the straw house, then the wooden one; the pigs run to the brick house and stay safe inside.",
  },
  {
    id: "graph",
    index: "03",
    title: "Graph",
    tag: "visual result",
    body: "When the pipeline is valid, you see it as a diagram: boxes for steps and arrows for how data flows. You can inspect the JSON, regenerate, or keep editing until it matches what you had in mind.",
    exampleLabel: "Example result",
    example:
      "Wolf → StrawHouse → WoodenHouse → BrickHouse → PigsSafe",
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
            Describe it in words. Glossia draws the graph.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
            A proof of concept for using large language models and natural language to describe workflows, turn them
            into structured pipelines, and validate the result before you rely on it.
          </p>
        </div>
        <dl className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-[var(--fg-subtle)]">
          <div>
            <dt className="uppercase tracking-wide">You write</dt>
            <dd className="mt-0.5 text-[var(--fg)]">prompts in plain language</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">You get</dt>
            <dd className="mt-0.5 text-[var(--fg)]">a checked pipeline + diagram</dd>
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
            <article className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] tabular-nums text-[var(--fg-subtle)]">{step.index}</span>
                <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">
                  {step.tag}
                </span>
              </div>
              <h3 className="mt-2 font-mono text-sm font-medium text-[var(--fg)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">{step.body}</p>
              <div className="mt-auto border-t border-[var(--border)] pt-3">
                <p className="font-mono text-[9px] uppercase tracking-wide text-[var(--fg-subtle)]">
                  {step.exampleLabel}
                </p>
                <p className="mt-1.5 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--fg)]">
                  {step.example}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
