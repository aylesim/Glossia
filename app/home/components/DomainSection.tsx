import type { ChangeEvent, RefObject } from "react";
import { BUTTON_PRIMARY_CLASS, BUTTON_SECONDARY_CLASS, FIELD_CLASS } from "../styles";

type DomainSectionProps = {
  domainPrompt: string;
  domainLoading: boolean;
  domainRawJson: string;
  domainError: string;
  domainValidationErrors: string[];
  hasDomain: boolean;
  importInputRef: RefObject<HTMLInputElement | null>;
  onDomainPromptChange: (value: string) => void;
  onBootstrapDomain: () => Promise<void>;
  onClearDomain: () => void;
  onDomainRawJsonChange: (value: string) => void;
  onExportDomain: () => void;
  onTriggerImportDomain: () => void;
  onDomainFileInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export default function DomainSection({
  domainPrompt,
  domainLoading,
  domainRawJson,
  domainError,
  domainValidationErrors,
  hasDomain,
  importInputRef,
  onDomainPromptChange,
  onBootstrapDomain,
  onClearDomain,
  onDomainRawJsonChange,
  onExportDomain,
  onTriggerImportDomain,
  onDomainFileInputChange,
}: DomainSectionProps) {
  return (
    <section className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="border-b border-[var(--border)] pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Step 1 · Domain</p>
        <p className="mt-2 text-sm font-medium">Define the vocabulary of your graph.</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
          A domain is a schema that lists every node type available, together with their ports and parameters. Think of
          it as the &ldquo;alphabet&rdquo; the AI will use when building your graph. You have three ways to set one up:
        </p>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--fg-muted)]">
          <li>
            <span className="text-[var(--fg)]">Describe it</span>: type a plain-English description below and click
            &ldquo;Generate domain&rdquo;. The AI will invent suitable node types for you.
          </li>
          <li>
            <span className="text-[var(--fg)]">Pick a preset</span>: use the workflow preset block above to load domain,
            compose prompt, and sample outputs together.
          </li>
          <li>
            <span className="text-[var(--fg)]">Import a file</span>: load a <code>.json</code> file you exported from a
            previous session.
          </li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          Once a domain is loaded the JSON editor below shows its contents. You can edit it directly; changes are
          validated automatically.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--fg-muted)]">
          Describe the kind of system you want to model (e.g. &ldquo;a modular audio synthesiser&rdquo;, &ldquo;an image
          processing pipeline&rdquo;, &ldquo;a text NLP chain&rdquo;).
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            value={domainPrompt}
            onChange={(event) => onDomainPromptChange(event.target.value)}
            rows={3}
            placeholder="Describe the domain to generate (e.g. image processing pipeline, modular synth, text NLP chain)..."
            className={`${FIELD_CLASS} resize-none`}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void onBootstrapDomain();
            }}
          />
          <div className="flex gap-2 md:flex-col">
            <button
              type="button"
              onClick={() => void onBootstrapDomain()}
              disabled={domainLoading || !domainPrompt.trim()}
              className={BUTTON_PRIMARY_CLASS}
            >
              {domainLoading ? "Generating…" : "Generate domain"}
            </button>
            <button type="button" onClick={onClearDomain} className={BUTTON_SECONDARY_CLASS}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportDomain}
          disabled={!hasDomain}
          className={`${BUTTON_SECONDARY_CLASS} shrink-0`}
        >
          Export
        </button>
        <button type="button" onClick={onTriggerImportDomain} className={`${BUTTON_SECONDARY_CLASS} shrink-0`}>
          Import
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--fg-muted)]">
          The raw domain JSON. Edits you make here are validated live; errors appear below. You normally don&apos;t need
          to touch this unless you want fine-grained control over node types.
        </p>
        <textarea
          value={domainRawJson}
          onChange={(event) => onDomainRawJsonChange(event.target.value)}
          rows={10}
          placeholder="Domain JSON editor"
          className={`${FIELD_CLASS} resize-y bg-[var(--code)] font-mono text-xs leading-relaxed`}
        />
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void onDomainFileInputChange(event);
        }}
      />

      {domainError && (
        <div className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]">
          <span className="font-medium">Domain error · </span>
          {domainError}
        </div>
      )}

      {domainValidationErrors.length > 0 && (
        <div className="space-y-1 border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3">
          {domainValidationErrors.map((error, index) => (
            <p key={`${error}-${index}`} className="font-mono text-sm text-[var(--error-fg)]">
              {error}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
