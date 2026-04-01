export type FlowEntry = "preset" | "apikey";

type FlowStartSectionProps = {
  onChoose: (entry: FlowEntry) => void;
  chosenEntry?: FlowEntry | null;
  compact?: boolean;
};

const cardBaseLoose =
  "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

const cardBaseCompact =
  "flex flex-col items-start gap-0.5 rounded border p-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]";

function cardClass(chosenEntry: FlowEntry | null, value: FlowEntry, compact: boolean) {
  const cardBase = compact ? cardBaseCompact : cardBaseLoose;
  const selected = chosenEntry === value;
  if (selected) {
    return `${cardBase} border-[var(--border-strong)] bg-[var(--surface-raised)]`;
  }
  if (chosenEntry === null) {
    return `${cardBase} border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]`;
  }
  return `${cardBase} border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]`;
}

export default function FlowStartSection({ onChoose, chosenEntry = null, compact = false }: FlowStartSectionProps) {
  const shell = compact
    ? "space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
    : "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell} aria-labelledby="studio-start-heading">
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        <h2
          id="studio-start-heading"
          className={
            compact
              ? "font-mono text-[11px] font-semibold uppercase tracking-wide text-[var(--fg)]"
              : "text-lg font-medium sm:text-xl"
          }
        >
          {compact ? "Start mode" : "How do you want to start?"}
        </h2>
        {!compact && (
          <p className="text-sm text-[var(--fg-muted)]">You can switch modes anytime.</p>
        )}
      </div>

      <div className={`grid ${compact ? "grid-cols-2 gap-1.5" : "gap-3 sm:grid-cols-2"}`} role="group" aria-label="Starting mode">
        <div
          role="button"
          tabIndex={0}
          aria-pressed={chosenEntry === "preset"}
          aria-label="Quick preset"
          onClick={() => onChoose("preset")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChoose("preset");
            }
          }}
          className={cardClass(chosenEntry, "preset", compact)}
        >
          <span className={`font-medium text-[var(--fg)] ${compact ? "font-mono text-[10px] uppercase tracking-wide" : "text-base"}`}>
            {compact ? "Preset" : "Quick preset"}
          </span>
          {!compact && (
            <span className="text-sm text-[var(--fg-muted)]">
              Load a domain and examples instantly, then generate variations.
            </span>
          )}
          <span className={`text-[var(--fg-subtle)] ${compact ? "font-mono text-[9px]" : "mt-1 text-xs"}`}>
            {compact
              ? chosenEntry === "preset"
                ? "●"
                : chosenEntry === null
                  ? "·"
                  : "→"
              : chosenEntry === "preset"
                ? "Selected"
                : chosenEntry === null
                  ? "Select"
                  : "Switch to this"}
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-pressed={chosenEntry === "apikey"}
          aria-label="Full control with OpenAI API key"
          onClick={() => onChoose("apikey")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChoose("apikey");
            }
          }}
          className={cardClass(chosenEntry, "apikey", compact)}
        >
          <span className={`font-medium text-[var(--fg)] ${compact ? "font-mono text-[10px] uppercase tracking-wide" : "text-base"}`}>
            {compact ? "API key" : "Full control"}
          </span>
          {!compact && (
            <span className="text-sm text-[var(--fg-muted)]">
              Add your API key and build domain and flow from scratch.
            </span>
          )}
          <span className={`text-[var(--fg-subtle)] ${compact ? "font-mono text-[9px]" : "mt-1 text-xs"}`}>
            {compact
              ? chosenEntry === "apikey"
                ? "●"
                : chosenEntry === null
                  ? "·"
                  : "→"
              : chosenEntry === "apikey"
                ? "Selected"
                : chosenEntry === null
                  ? "Select"
                  : "Switch to this"}
          </span>
        </div>
      </div>
    </section>
  );
}
