export default function GlossiaIntro() {
  return (
    <section
      className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
      aria-labelledby="glossia-intro-heading"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Glossia</p>
      <h2 id="glossia-intro-heading" className="mt-2 font-mono text-base font-semibold text-[var(--fg)] sm:text-lg">
        Domain → compose → validate
      </h2>
      <div className="mt-3 max-w-3xl space-y-3 font-mono text-[11px] leading-relaxed text-[var(--fg-muted)] sm:text-xs">
        <p>
          Glossia turns natural language into a typed function graph. You first define a{" "}
          <span className="text-[var(--fg)]">domain</span>: a JSON schema of node types (inputs, outputs,
          parameters). A prompt bootstraps or refines that domain; the studio validates it and lists available
          types in the node catalog.
        </p>
        <p>
          With a valid domain, you{" "}
          <span className="text-[var(--fg)]">compose</span> a patch: instance nodes referencing those types,
          wired by directed edges. The model returns pseudocode and JSON; the patch is validated against the
          domain before it appears in the graph view (React Flow, smoothstep edges, per-type chrome).
        </p>
        <p>
          Output modes include full generation, JSON-only, or patch updates. Presets ship example domains;
          you can export, import, and edit domain JSON directly in the studio.
        </p>
      </div>
    </section>
  );
}
