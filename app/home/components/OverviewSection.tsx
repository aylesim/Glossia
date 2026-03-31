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
        </div>
        <div className="space-y-8">
          <div className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">01</p>
            <p className="mt-2 text-sm font-medium">Bootstrap the domain</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Describe the problem space, import JSON, or choose a workflow preset (after the API key) to load domain
              plus starter prompt (and a sample graph when the preset includes one).
            </p>
          </div>
          <div className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">02</p>
            <p className="mt-2 text-sm font-medium">Compose the graph</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Prompt for a pipeline. Full generation, pseudocode only, or JSON from edited pseudocode.
            </p>
          </div>
          <div className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">03</p>
            <p className="mt-2 text-sm font-medium">Review outputs</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Pseudocode, copyable JSON, and a pannable graph. Tabs switch the main view; validation appears above the
              content.
            </p>
          </div>
          <div className="border-l-2 border-[var(--border-strong)] pl-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">04</p>
            <p className="mt-2 text-sm font-medium">API key</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Paste an OpenAI API key in the field below so you can try the app in the browser. Nodes are semantic
              stubs, not a live runtime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
