import type { ChangeEvent, RefObject } from "react";
import {
  BUTTON_PRIMARY_CLASS,
  BUTTON_PRIMARY_COMPACT_CLASS,
  BUTTON_SECONDARY_CLASS,
  BUTTON_SECONDARY_COMPACT_CLASS,
  FIELD_CLASS,
  FIELD_COMPACT_CLASS,
} from "../styles";

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
  compact?: boolean;
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
  compact = false,
}: DomainSectionProps) {
  function handleClearDomain() {
    if (!window.confirm("Clear the domain, prompt, JSON editor, and all generated outputs?")) return;
    onClearDomain();
  }

  const field = compact ? FIELD_COMPACT_CLASS : FIELD_CLASS;
  const btnPri = compact ? BUTTON_PRIMARY_COMPACT_CLASS : BUTTON_PRIMARY_CLASS;
  const btnSec = compact ? BUTTON_SECONDARY_COMPACT_CLASS : BUTTON_SECONDARY_CLASS;
  const shell = compact
    ? "space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
    : "space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell}>
      <div className={compact ? "border-b border-[var(--border)] pb-1.5" : "border-b border-[var(--border)] pb-4"}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Domain</p>
        {!compact && (
          <>
            <p className="mt-2 text-sm font-medium">Define the available node types.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Generate from a description, import JSON, or edit manually.
            </p>
          </>
        )}
        {compact && (
          <p className="mt-0.5 font-mono text-[9px] text-[var(--fg-muted)]">describe · import · edit JSON</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="studio-domain-prompt" className={`text-[var(--fg-muted)] ${compact ? "font-mono text-[9px] uppercase tracking-wide" : "text-xs"}`}>
          Prompt
        </label>
        <div className={`grid ${compact ? "gap-1.5" : "gap-3 md:grid-cols-[1fr_auto]"}`}>
          <textarea
            id="studio-domain-prompt"
            value={domainPrompt}
            onChange={(event) => onDomainPromptChange(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Describe domain to generate…"
            className={`${field} resize-none`}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void onBootstrapDomain();
            }}
          />
          <div className={`flex ${compact ? "flex-wrap gap-1" : "gap-2 md:flex-col"}`}>
            <button
              type="button"
              onClick={() => void onBootstrapDomain()}
              disabled={domainLoading || !domainPrompt.trim()}
              className={btnPri}
            >
              {domainLoading ? "…" : compact ? "Generate" : "Generate domain"}
            </button>
            <button type="button" onClick={handleClearDomain} className={btnSec}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={`flex min-w-0 flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
        <button
          type="button"
          onClick={onExportDomain}
          disabled={!hasDomain}
          className={`${btnSec} shrink-0`}
        >
          Export
        </button>
        <button type="button" onClick={onTriggerImportDomain} className={`${btnSec} shrink-0`}>
          Import
        </button>
      </div>

      <div className="space-y-1">
        <label htmlFor="studio-domain-json" className={`text-[var(--fg-muted)] ${compact ? "font-mono text-[9px] uppercase tracking-wide" : "text-xs"}`}>
          domain.json
        </label>
        <textarea
          id="studio-domain-json"
          value={domainRawJson}
          onChange={(event) => onDomainRawJsonChange(event.target.value)}
          rows={compact ? 6 : 10}
          placeholder="{}"
          className={`${field} resize-y bg-[var(--code)] font-mono ${compact ? "text-[10px] leading-snug" : "text-xs leading-relaxed"}`}
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
        <div
          role="alert"
          className={`border border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-fg)] ${compact ? "px-2 py-1.5 font-mono text-[10px]" : "px-4 py-3 text-sm"}`}
        >
          <span className="font-medium">Domain · </span>
          {domainError}
        </div>
      )}

      {domainValidationErrors.length > 0 && (
        <div
          role="alert"
          className={`space-y-0.5 border border-[var(--error-border)] bg-[var(--error-bg)] ${compact ? "px-2 py-1.5" : "space-y-1 px-4 py-3"}`}
        >
          {domainValidationErrors.map((error, index) => (
            <p key={`${error}-${index}`} className={`font-mono text-[var(--error-fg)] ${compact ? "text-[10px] leading-snug" : "text-sm"}`}>
              {error}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
