export default function OverviewSection() {
  return (
    <section className="mb-16 border-b border-[var(--border)] pb-16">
      <div className="space-y-12">
        <div className="space-y-6">
          <h2 className="max-w-xl text-2xl font-light leading-snug tracking-tight sm:text-3xl">
            Turn descriptions into structured graphs you can inspect and validate.
          </h2>
          <p className="max-w-prose text-sm leading-[1.75] text-[var(--fg-muted)]">
            You define a domain (the vocabulary of node types, ports, and parameters), then describe a flow in plain
            language. An LLM proposes pseudocode and patch JSON; the client validates with Zod and draws the graph.
            Domain and patch stay separate sources of truth, which helps when you experiment across MIDI, image
            pipelines, NLP chains, or modular synths.
          </p>
          <p className="max-w-prose text-sm leading-[1.75] text-[var(--fg)]">
            Below, pick a starting path, then use <span className="text-[var(--fg-muted)]">Continue</span> to reveal the
            next block. Everything already on the page stays put—new sections are added underneath so you can scroll
            back at any time.
          </p>
        </div>
        <ol className="list-none space-y-8 p-0">
          <li className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">01</p>
            <p className="mt-2 text-sm font-medium">Pick how you start</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Preset path loads a bundled domain first; API key is offered in the same step as the domain editor and is
              optional until you call the model. API key path starts with your key. The choice stays visible at the top
              after you decide.
            </p>
          </li>
          <li className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">02</p>
            <p className="mt-2 text-sm font-medium">Stack the steps</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Each Continue reveals the next section below the previous ones. Domain only unlocks further when the JSON
              validates. Use Change path to reset from scratch.
            </p>
          </li>
          <li className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">03</p>
            <p className="mt-2 text-sm font-medium">Compose, then review</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Generate from compose, then open results for pseudocode, JSON, and the graph. If you jump to results early,
              a short note points you back to compose.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}
