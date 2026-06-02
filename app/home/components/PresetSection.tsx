import { STUDIO_PRESETS } from "@/lib/domain-presets";

type PresetSectionProps = {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  compact?: boolean;
  toolbar?: boolean;
};

const cardBaseLoose =
  "flex min-h-[5.5rem] flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

const cardBaseCompact =
  "flex min-h-0 flex-col items-start gap-0.5 rounded border p-1.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]";

const cardBaseToolbar =
  "flex min-h-[1.75rem] flex-col justify-center rounded border px-2 py-1 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]";

function cardClass(selected: boolean, compact: boolean, toolbar: boolean) {
  const base = toolbar ? cardBaseToolbar : compact ? cardBaseCompact : cardBaseLoose;
  if (selected) {
    return `${base} border-[var(--border-strong)] bg-[var(--surface-raised)]`;
  }
  return `${base} border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]`;
}

export default function PresetSection({
  selectedPresetId,
  onSelectPreset,
  compact = false,
  toolbar = false,
}: PresetSectionProps) {
  const shell = toolbar
    ? "flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-[3] lg:flex-row lg:items-center lg:gap-3"
    : compact
      ? "space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
      : "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5";

  return (
    <section className={shell} aria-labelledby="presets-heading">
      <div
        className={
          toolbar
            ? "shrink-0"
            : compact
              ? "flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0"
              : "space-y-1"
        }
      >
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] ${toolbar ? "whitespace-nowrap" : ""}`}
        >
          Presets
        </p>
        {!compact && (
          <>
            <h3 id="presets-heading" className="text-base font-medium sm:text-lg">
              Pick a bundled workflow
            </h3>
            <p className="text-sm text-[var(--fg-muted)]">
              Loads domain, compose prompt, and sample output in one click when available.
            </p>
          </>
        )}
        {compact && (
          <h3 id="presets-heading" className="sr-only">
            Workflow presets
          </h3>
        )}
      </div>

      <div
        className={
          toolbar
            ? "grid min-w-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-4"
            : compact
              ? "grid grid-cols-2 gap-1"
              : "grid gap-3 sm:grid-cols-2"
        }
        role="group"
        aria-label="Workflow presets"
      >
        {STUDIO_PRESETS.map((preset) => {
          const selected = selectedPresetId === preset.id;
          return (
            <div
              key={preset.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${preset.name} workflow preset`}
              onClick={() => onSelectPreset(preset.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPreset(preset.id);
                }
              }}
              className={cardClass(selected, compact, toolbar)}
              title={toolbar ? preset.domain.description : undefined}
            >
              <span
                className={`font-medium leading-tight text-[var(--fg)] ${
                  toolbar
                    ? "truncate font-mono text-[10px]"
                    : compact
                      ? "line-clamp-2 font-mono text-[10px]"
                      : "line-clamp-2 text-base"
                }`}
              >
                {preset.name}
              </span>
              {!toolbar && (
                <span
                  className={`line-clamp-2 leading-snug text-[var(--fg-muted)] ${compact ? "text-[9px] leading-tight" : "text-sm"}`}
                >
                  {preset.domain.description}
                </span>
              )}
              {!compact && (
                <span className="mt-auto pt-1 text-xs text-[var(--fg-subtle)]">{selected ? "Selected" : "Select"}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
