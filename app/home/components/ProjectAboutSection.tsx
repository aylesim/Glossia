export default function ProjectAboutSection() {
  return (
    <section
      className="mb-16 border-b border-(--border) pb-16"
      aria-labelledby="project-about-heading"
    >
      <div className="max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--fg-subtle)">
          About the project
        </p>
        <h2
          id="project-about-heading"
          className="mt-4 font-serif text-4xl font-normal leading-[1.1] tracking-tight text-(--fg) sm:text-5xl"
        >
          Schema-grounded generation for typed graph composition.
        </h2>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-(--fg-muted)">
          You describe a domain in plain language — a synthesizer, a pipeline, an NLP chain — and
          the system generates its building blocks: typed node kinds, ports, and parameters. You
          then describe a flow in plain language, and the system composes a graph using exactly
          those blocks.
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-(--fg-muted)">
          Two plain-text steps, two validated artifacts, one coherent graph. The architecture keeps
          domain and patch as separate schemas so the model always operates within a bounded output
          space — which is what makes every violation catchable.
        </p>
      </div>

      <div className="mt-14 grid gap-10 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--fg-subtle)">01</p>
          <h3 className="mt-3 text-sm font-medium text-(--fg)">Schema injection as vocabulary constraint</h3>
          <p className="mt-2 text-sm leading-relaxed text-(--fg-muted)">
            The domain JSON is passed verbatim as prompt context. The model cannot reference node
            types that don't exist in it. The schema defines the grammar; the model fills it.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--fg-subtle)">02</p>
          <h3 className="mt-3 text-sm font-medium text-(--fg)">Pseudocode as intermediate representation</h3>
          <p className="mt-2 text-sm leading-relaxed text-(--fg-muted)">
            Generation goes through a pseudocode step before JSON. Pseudocode sits closer to the
            model's pretraining distribution than structured output, so the reasoning is more
            reliable. The intermediate is kept visible for inspection.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--fg-subtle)">03</p>
          <h3 className="mt-3 text-sm font-medium text-(--fg)">Hard validation boundary</h3>
          <p className="mt-2 text-sm leading-relaxed text-(--fg-muted)">
            The patch is validated with Zod against the active domain schema. No partial credit:
            the graph renders only on a clean pass. Errors surface with field-level detail.
          </p>
        </div>
      </div>
    </section>
  );
}
