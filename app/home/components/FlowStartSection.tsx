export type FlowEntry = "preset" | "apikey";

type FlowStartSectionProps = {
  onChoose: (entry: FlowEntry) => void;
  chosenEntry?: FlowEntry | null;
};

export default function FlowStartSection({ onChoose, chosenEntry = null }: FlowStartSectionProps) {
  const locked = chosenEntry !== null;

  return (
    <section
      className="border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-6"
      aria-labelledby="flow-start-heading"
    >
      <div className="space-y-2 border-b border-[var(--border)] pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Start here</p>
        <h2 id="flow-start-heading" className="text-lg font-medium text-[var(--fg)] sm:text-xl">
          Choose how you want to begin
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Pick one path. New steps appear <span className="text-[var(--fg)]">below</span> as you continue; everything above
          stays on the page. Presets load locally first; your API key is only needed when you call the model for a new
          domain or graph.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div
          role={locked ? undefined : "button"}
          tabIndex={locked ? undefined : 0}
          aria-label={locked ? undefined : "Use a workflow preset"}
          onClick={locked ? undefined : () => onChoose("preset")}
          onKeyDown={
            locked
              ? undefined
              : (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChoose("preset");
                  }
                }
          }
          className={`flex flex-col items-start gap-3 border p-5 text-left transition-colors ${
            locked && chosenEntry === "preset"
              ? "border-[var(--border-strong)] bg-[var(--surface-raised)]"
              : locked
                ? "border-[var(--border)] bg-[var(--surface)] opacity-50"
                : "cursor-pointer border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Option A</span>
          <span className="text-base font-medium text-[var(--fg)]">Use a workflow preset</span>
          <span className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Load a ready-made domain, compose prompt, and—when available—a sample graph. Explore the studio without an
            API key until you want fresh output from the model.
          </span>
          <span className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {locked && chosenEntry === "preset" ? "Your path" : "Select this path →"}
          </span>
        </div>

        <div
          role={locked ? undefined : "button"}
          tabIndex={locked ? undefined : 0}
          aria-label={locked ? undefined : "Use my OpenAI API key"}
          onClick={locked ? undefined : () => onChoose("apikey")}
          onKeyDown={
            locked
              ? undefined
              : (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChoose("apikey");
                  }
                }
          }
          className={`flex flex-col items-start gap-3 border p-5 text-left transition-colors ${
            locked && chosenEntry === "apikey"
              ? "border-[var(--border-strong)] bg-[var(--surface-raised)]"
              : locked
                ? "border-[var(--border)] bg-[var(--surface)] opacity-50"
                : "cursor-pointer border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Option B</span>
          <span className="text-base font-medium text-[var(--fg)]">Use my OpenAI API key</span>
          <span className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Paste your key first, then describe or import a domain and run compose. The key is stored only in your
            browser; you can skip presets and experiment end to end.
          </span>
          <span className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {locked && chosenEntry === "apikey" ? "Your path" : "Select this path →"}
          </span>
        </div>
      </div>
    </section>
  );
}
