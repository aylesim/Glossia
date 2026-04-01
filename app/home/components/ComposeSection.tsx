import { EXAMPLES } from "@/lib/examples";
import type { GenerateMode } from "@/lib/api-types";
import { BUTTON_PRIMARY_CLASS, BUTTON_PRIMARY_COMPACT_CLASS, FIELD_CLASS, FIELD_COMPACT_CLASS } from "../styles";

type ComposeSectionProps = {
  showMidiExamples: boolean;
  canCompose: boolean;
  prompt: string;
  mode: GenerateMode;
  loading: boolean;
  onLoadExample: (index: number) => void;
  onPromptChange: (value: string) => void;
  onSetMode: (mode: GenerateMode) => void;
  onGenerate: (overrideMode?: GenerateMode) => Promise<void>;
  compact?: boolean;
};

const MODES: { value: GenerateMode; label: string; short: string }[] = [
  { value: "full", label: "Full", short: "Full" },
  { value: "pseudocode", label: "Pseudocode", short: "Pseudo" },
  { value: "json", label: "JSON from pseudocode", short: "JSON" },
];

export default function ComposeSection({
  showMidiExamples,
  canCompose,
  prompt,
  mode,
  loading,
  onLoadExample,
  onPromptChange,
  onSetMode,
  onGenerate,
  compact = false,
}: ComposeSectionProps) {
  const field = compact ? FIELD_COMPACT_CLASS : FIELD_CLASS;
  const btnPri = compact ? BUTTON_PRIMARY_COMPACT_CLASS : BUTTON_PRIMARY_CLASS;
  const shell = compact
    ? "space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
    : "space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell}>
      <div className={compact ? "border-b border-[var(--border)] pb-1.5" : "border-b border-[var(--border)] pb-4"}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Compose</p>
        {!compact && (
          <>
            <p className="mt-2 text-sm font-medium">Describe the flow to generate.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              `Full` generates everything, `Pseudocode` drafts the plan, `JSON from pseudocode` converts text into a
              patch.
            </p>
          </>
        )}
        {compact && (
          <p className="mt-0.5 font-mono text-[9px] text-[var(--fg-muted)]">full · pseudo · json ← pseudo</p>
        )}
      </div>

      {showMidiExamples && (
        <div className={`flex flex-wrap border border-[var(--border)] ${compact ? "text-[10px]" : "text-xs"}`}>
          {EXAMPLES.map((example, index) => (
            <button
              key={example.label}
              type="button"
              onClick={() => onLoadExample(index)}
              className={`border-r border-[var(--border)] text-[var(--fg-muted)] transition-colors last:border-r-0 hover:bg-[var(--surface-raised)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] ${compact ? "px-2 py-1 font-mono" : "px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"}`}
            >
              {example.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {!canCompose && (
          <p className={`text-[var(--fg-muted)] ${compact ? "font-mono text-[9px]" : "text-xs"}`}>
            Valid domain required.
          </p>
        )}
        <label htmlFor="studio-compose-prompt" className={`text-[var(--fg-muted)] ${compact ? "font-mono text-[9px] uppercase tracking-wide" : "text-xs"}`}>
          Prompt
        </label>
        <textarea
          id="studio-compose-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={compact ? 2 : 3}
          disabled={!canCompose}
          placeholder={canCompose ? "Flow description…" : "Define domain first"}
          className={`${field} resize-none disabled:opacity-45`}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void onGenerate();
          }}
        />
      </div>

      <div className={`flex flex-wrap items-center ${compact ? "gap-1.5" : "gap-3"}`}>
        <div
          role="radiogroup"
          aria-label="Generation mode"
          className={`flex flex-wrap border border-[var(--border)] ${compact ? "text-[10px]" : "text-xs"}`}
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowRight" &&
              event.key !== "ArrowLeft" &&
              event.key !== "Home" &&
              event.key !== "End"
            ) {
              return;
            }
            event.preventDefault();
            const i = MODES.findIndex((m) => m.value === mode);
            let next = i;
            if (event.key === "ArrowRight") next = (i + 1) % MODES.length;
            if (event.key === "ArrowLeft") next = (i - 1 + MODES.length) % MODES.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = MODES.length - 1;
            const nextMode = MODES[next]!.value;
            onSetMode(nextMode);
            queueMicrotask(() => document.getElementById(`compose-mode-${nextMode}`)?.focus());
          }}
        >
          {MODES.map((item) => (
            <button
              key={item.value}
              id={`compose-mode-${item.value}`}
              type="button"
              role="radio"
              aria-checked={mode === item.value}
              tabIndex={mode === item.value ? 0 : -1}
              onClick={() => onSetMode(item.value)}
              className={`border-r border-[var(--border)] font-mono transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] ${compact ? "px-2 py-1 uppercase tracking-wide" : "px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"} ${
                mode === item.value
                  ? "bg-[var(--inverse-bg)] text-[var(--inverse-fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
              }`}
            >
              {compact ? item.short : item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!canCompose || loading || !prompt.trim()}
          className={btnPri}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {loading ? "…" : "Generate"}
        </button>
      </div>
    </section>
  );
}
