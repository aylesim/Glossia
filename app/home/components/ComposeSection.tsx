import { EXAMPLES } from "@/lib/examples";
import type { GenerateMode } from "@/lib/api-types";
import { BUTTON_PRIMARY_CLASS, FIELD_CLASS } from "../styles";

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
};

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
}: ComposeSectionProps) {
  return (
    <section className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="border-b border-[var(--border)] pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Step 2 · Graph</p>
        <p className="mt-2 text-sm font-medium">Describe the flow you want to build.</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
          Now that the AI knows your vocabulary, tell it what you want to wire together. Write a plain-English
          description of the pipeline, for example &ldquo;read a MIDI file, transpose every note up by 5 semitones, then
          write the result to disk&rdquo;.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">Choose a generation mode before clicking Generate:</p>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--fg-muted)]">
          <li>
            <span className="text-[var(--fg)]">Full</span>: produces pseudocode and JSON in one shot. Best for a first
            attempt.
          </li>
          <li>
            <span className="text-[var(--fg)]">Pseudocode</span>: only generates the human-readable plan. Useful if you
            want to review the logic before committing to JSON.
          </li>
          <li>
            <span className="text-[var(--fg)]">JSON from pseudocode</span>: converts pseudocode you have already reviewed
            (and optionally edited) into the final patch JSON.
          </li>
        </ul>
      </div>

      {showMidiExamples && (
        <div className="flex flex-wrap border border-[var(--border)] text-xs">
          {EXAMPLES.map((example, index) => (
            <button
              key={example.label}
              type="button"
              onClick={() => onLoadExample(index)}
              className="border-r border-[var(--border)] px-3 py-2 text-[var(--fg-muted)] transition-colors last:border-r-0 hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
            >
              {example.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {!canCompose && (
          <p className="text-xs text-[var(--fg-muted)]">
            Complete Step 1 first. A domain must be loaded before you can generate a graph.
          </p>
        )}
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={3}
          disabled={!canCompose}
          placeholder={canCompose ? "Describe the flow to build in the current domain…" : "Define a domain first in Step 1"}
          className={`${FIELD_CLASS} resize-none disabled:opacity-45`}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void onGenerate();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap border border-[var(--border)] text-xs">
          {(["full", "pseudocode", "json"] as GenerateMode[]).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => onSetMode(nextMode)}
              className={`border-r border-[var(--border)] px-3 py-2 transition-colors last:border-r-0 ${
                mode === nextMode
                  ? "bg-[var(--inverse-bg)] text-[var(--inverse-fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
              }`}
            >
              {nextMode === "full" ? "Full" : nextMode === "pseudocode" ? "Pseudocode" : "JSON from pseudocode"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!canCompose || loading || !prompt.trim()}
          className={BUTTON_PRIMARY_CLASS}
        >
          {loading ? "Generating…" : "Generate ⌘↵"}
        </button>
      </div>
    </section>
  );
}
