import { useCallback, useEffect, useId, useState } from "react";
import dynamic from "next/dynamic";
import { Domain } from "@/lib/domain";
import { Patch } from "@/lib/schema";
import type { OutputTab } from "../types";
import { BUTTON_SECONDARY_CLASS, BUTTON_SECONDARY_COMPACT_CLASS, FIELD_CLASS, FIELD_COMPACT_CLASS } from "../styles";

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
  omitGraph?: boolean;
  compact?: boolean;
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

const TABS_ALL: OutputTab[] = ["pseudocode", "json", "graph"];
const TABS_TEXT: OutputTab[] = ["pseudocode", "json"];

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
  omitGraph = false,
  compact = false,
}: ResultsSectionProps) {
  const baseId = useId();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const tabs = omitGraph ? TABS_TEXT : TABS_ALL;
  const field = compact ? FIELD_COMPACT_CLASS : FIELD_CLASS;
  const btnSec = compact ? BUTTON_SECONDARY_COMPACT_CLASS : BUTTON_SECONDARY_CLASS;

  useEffect(() => {
    if (omitGraph && activeTab === "graph") {
      onSetActiveTab("pseudocode");
    }
  }, [omitGraph, activeTab, onSetActiveTab]);

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

  const shell = compact
    ? "rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
    : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell}>
      <p id={`${baseId}-copy-announcer`} className="sr-only" aria-live="polite">
        {copyStatus === "copied" ? "JSON copied to clipboard." : copyStatus === "failed" ? "Copy failed." : ""}
      </p>
      <div className={`min-w-0 ${compact ? "space-y-2" : "space-y-4"}`}>
        <div className={`border-b border-[var(--border)] ${compact ? "space-y-0.5 pb-1.5" : "space-y-1 pb-4"}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Results</p>
          {!compact && (
            <p className="text-sm font-medium">
              {omitGraph ? "Review pseudocode and JSON." : "Review text output, JSON, and graph."}
            </p>
          )}
          {compact && (
            <p className="font-mono text-[9px] text-[var(--fg-muted)]">pseudo · json</p>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Result view"
          className={`flex flex-wrap items-center border-b border-[var(--border)] ${compact ? "gap-x-0 gap-y-1" : "gap-x-1 gap-y-2"}`}
        >
          {tabs.map((tab) => {
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
                className={`font-mono uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-[var(--border-strong)] ${
                  compact
                    ? `px-2 py-1 text-[9px] focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] ${
                        activeTab === tab
                          ? "border-b border-[var(--border-strong)] text-[var(--fg)]"
                          : "border-b border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      }`
                    : `px-3 py-2 text-[10px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${
                        activeTab === tab
                          ? "border-b-2 border-[var(--border-strong)] text-[var(--fg)]"
                          : "border-b-2 border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      }`
                }`}
              >
                {label}
              </button>
            );
          })}
          {validationErrors.length > 0 && (
            <span
              className={`ml-auto border border-[var(--error-border)] font-mono text-[var(--error-fg)] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
            >
              {compact
                ? `${validationErrors.length} err`
                : `${validationErrors.length} error${validationErrors.length > 1 ? "s" : ""}`}
            </span>
          )}
          {patch && validationErrors.length === 0 && (
            <span
              className={`ml-auto border border-[var(--border-strong)] font-mono text-[var(--fg-muted)] ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}
            >
              {compact ? "OK" : "Valid"}
            </span>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div
            role="alert"
            className={`border border-[var(--error-border)] bg-[var(--error-bg)] ${compact ? "space-y-0.5 px-2 py-1.5" : "space-y-1 px-4 py-3"}`}
          >
            {!compact && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--error-fg)]">Validation</p>
            )}
            {validationErrors.map((error, index) => (
              <p key={`${error}-${index}`} className={`font-mono text-[var(--error-fg)] ${compact ? "text-[10px] leading-snug" : "text-sm"}`}>
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
                rows={compact ? 6 : 12}
                className={`${field} resize-y whitespace-pre-wrap font-mono leading-relaxed text-[var(--fg-muted)] ${compact ? "min-h-[7rem] text-[10px]" : "min-h-[12rem] text-sm"}`}
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
              <pre
                className={`overflow-auto whitespace-pre border border-[var(--border)] bg-[var(--code)] font-mono text-[var(--fg)] ${compact ? "max-h-48 p-2 text-[10px] leading-snug" : "max-h-96 p-4 text-sm"}`}
              >
                {rawJson}
              </pre>
              <button
                type="button"
                onClick={() => void copyJson()}
                className={`absolute border border-[var(--border)] bg-[var(--surface-raised)] font-mono uppercase tracking-wide text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] ${compact ? "right-1 top-1 px-1.5 py-0.5 text-[9px]" : "right-2 top-2 px-2 py-1 text-[10px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--code)]"}`}
                aria-describedby={`${baseId}-copy-announcer`}
              >
                {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {!omitGraph ? (
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
        ) : null}
      </div>

      {pseudocode && (
        <div
          className={`flex flex-wrap items-center border-t border-[var(--border)] ${compact ? "mt-2 gap-2 pt-2" : "mt-6 gap-3 pt-6"}`}
        >
          {!compact && <p className="text-sm text-[var(--fg-muted)]">Edited pseudocode?</p>}
          <button
            type="button"
            onClick={() => void onRegenerateJson()}
            disabled={loading}
            className={btnSec}
          >
            {compact ? "Re-JSON" : "Regenerate JSON"}
          </button>
        </div>
      )}
    </section>
  );
}
