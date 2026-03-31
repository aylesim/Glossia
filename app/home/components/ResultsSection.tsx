import { useCallback, useId, useState } from "react";
import dynamic from "next/dynamic";
import { Domain } from "@/lib/domain";
import { Patch } from "@/lib/schema";
import type { OutputTab } from "../types";
import { BUTTON_SECONDARY_CLASS, FIELD_CLASS } from "../styles";

const PatchGraph = dynamic(() => import("@/app/components/PatchGraph"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[min(320px,50vh)] items-center justify-center border border-[var(--border)] bg-[var(--graph-bg)] font-mono text-xs text-[var(--fg-muted)]"
      role="status"
      aria-live="polite"
    >
      Loading graph…
    </div>
  ),
});

type ResultsSectionProps = {
  activeTab: OutputTab;
  pseudocode: string;
  rawJson: string;
  patch: Patch | null;
  domain: Domain | null;
  validationErrors: string[];
  loading: boolean;
  onSetActiveTab: (tab: OutputTab) => void;
  onPseudocodeChange: (value: string) => void;
  onRegenerateJson: () => Promise<void>;
};

function GraphPanel({ patch, domain }: { patch: Patch; domain: Domain }) {
  return (
    <div className="min-w-0">
      <div className="overflow-hidden border border-[var(--border)]">
        <PatchGraph patch={patch} domain={domain} />
      </div>
      <div className="flex flex-wrap gap-4 border border-t-0 border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--fg-subtle)]">
        <span>{patch.nodes.length} nodes</span>
        <span>{patch.edges.length} edges</span>
        <span>v{patch.version}</span>
      </div>
    </div>
  );
}

const TABS: OutputTab[] = ["pseudocode", "json", "graph"];

export default function ResultsSection({
  activeTab,
  pseudocode,
  rawJson,
  patch,
  domain,
  validationErrors,
  loading,
  onSetActiveTab,
  onPseudocodeChange,
  onRegenerateJson,
}: ResultsSectionProps) {
  const baseId = useId();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const tabId = (t: OutputTab) => `${baseId}-tab-${t}`;
  const panelId = (t: OutputTab) => `${baseId}-panel-${t}`;

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }, [rawJson]);

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <p id={`${baseId}-copy-announcer`} className="sr-only" aria-live="polite">
        {copyStatus === "copied" ? "JSON copied to clipboard." : copyStatus === "failed" ? "Copy failed." : ""}
      </p>
      <div className="min-w-0 space-y-4">
        <div className="space-y-1 border-b border-[var(--border)] pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Step 3 · Results</p>
          <p className="text-sm font-medium">Review what was generated.</p>
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            The tabs below show three views of the same result. <span className="text-[var(--fg)]">Pseudocode</span> is
            the plain-English plan the AI wrote first. Edit it here, then use &ldquo;Regenerate JSON&rdquo; to refine the
            output. <span className="text-[var(--fg)]">JSON</span> is the machine-readable patch you can copy and use
            elsewhere. <span className="text-[var(--fg)]">Graph</span> renders the nodes and edges visually. Pan and zoom
            to explore it.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Result view"
          className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-[var(--border)]"
        >
          {TABS.map((tab) => {
            const available =
              tab === "pseudocode" ? true : tab === "json" ? Boolean(rawJson) : Boolean(patch);
            const label = tab === "pseudocode" ? "Pseudocode" : tab === "json" ? "JSON" : "Graph";
            return (
              <button
                key={tab}
                id={tabId(tab)}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={panelId(tab)}
                disabled={!available}
                onClick={() => onSetActiveTab(tab)}
                className={`px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--border-strong)] text-[var(--fg)]"
                    : "border-b-2 border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                {label}
              </button>
            );
          })}
          {validationErrors.length > 0 && (
            <span className="ml-auto border border-[var(--error-border)] px-2 py-1 font-mono text-[10px] text-[var(--error-fg)]">
              {validationErrors.length} error{validationErrors.length > 1 ? "s" : ""}
            </span>
          )}
          {patch && validationErrors.length === 0 && (
            <span className="ml-auto border border-[var(--border-strong)] px-2 py-1 font-mono text-[10px] text-[var(--fg-muted)]">
              Valid
            </span>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div
            role="alert"
            className="space-y-1 border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--error-fg)]">Validation</p>
            {validationErrors.map((error, index) => (
              <p key={`${error}-${index}`} className="font-mono text-sm text-[var(--error-fg)]">
                {error}
              </p>
            ))}
          </div>
        )}

        <div
          id={panelId("pseudocode")}
          role="tabpanel"
          aria-labelledby={tabId("pseudocode")}
          hidden={activeTab !== "pseudocode"}
          className="min-w-0"
        >
          {activeTab === "pseudocode" && (
            <div className="space-y-2">
              <label htmlFor={`${baseId}-pseudocode-editor`} className="sr-only">
                Pseudocode
              </label>
              <textarea
                id={`${baseId}-pseudocode-editor`}
                value={pseudocode}
                onChange={(e) => onPseudocodeChange(e.target.value)}
                rows={12}
                className={`${FIELD_CLASS} min-h-[12rem] resize-y whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--fg-muted)]`}
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <div
          id={panelId("json")}
          role="tabpanel"
          aria-labelledby={tabId("json")}
          hidden={activeTab !== "json"}
          className="min-w-0"
        >
          {activeTab === "json" && rawJson && (
            <div className="relative">
              <pre className="max-h-96 overflow-auto whitespace-pre border border-[var(--border)] bg-[var(--code)] p-4 font-mono text-sm text-[var(--fg)]">
                {rawJson}
              </pre>
              <button
                type="button"
                onClick={() => void copyJson()}
                className="absolute right-2 top-2 border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--code)]"
                aria-describedby={`${baseId}-copy-announcer`}
              >
                {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <div
          id={panelId("graph")}
          role="tabpanel"
          aria-labelledby={tabId("graph")}
          hidden={activeTab !== "graph"}
          className="min-w-0"
        >
          {activeTab === "graph" &&
            (patch && domain ? (
              <GraphPanel patch={patch} domain={domain} />
            ) : (
              <div className="flex min-h-[min(420px,50vh)] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-sm text-[var(--fg-subtle)]">
                Graph appears when generation returns a valid patch.
              </div>
            ))}
        </div>
      </div>

      {pseudocode && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
          <p className="text-sm text-[var(--fg-muted)]">Edited pseudocode?</p>
          <button
            type="button"
            onClick={() => void onRegenerateJson()}
            disabled={loading}
            className={BUTTON_SECONDARY_CLASS}
          >
            Regenerate JSON
          </button>
        </div>
      )}
    </section>
  );
}
