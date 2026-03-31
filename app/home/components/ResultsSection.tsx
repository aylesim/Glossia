import dynamic from "next/dynamic";
import { Domain } from "@/lib/domain";
import { Patch } from "@/lib/schema";
import type { OutputTab } from "../types";
import { BUTTON_SECONDARY_CLASS } from "../styles";

const PatchGraph = dynamic(() => import("@/app/components/PatchGraph"), { ssr: false });

type ResultsSectionProps = {
  activeTab: OutputTab;
  pseudocode: string;
  rawJson: string;
  patch: Patch | null;
  domain: Domain | null;
  validationErrors: string[];
  loading: boolean;
  onSetActiveTab: (tab: OutputTab) => void;
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

export default function ResultsSection({
  activeTab,
  pseudocode,
  rawJson,
  patch,
  domain,
  validationErrors,
  loading,
  onSetActiveTab,
  onRegenerateJson,
}: ResultsSectionProps) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="min-w-0 space-y-4">
        <div className="space-y-1 border-b border-[var(--border)] pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Step 3 · Results</p>
          <p className="text-sm font-medium">Review what was generated.</p>
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            The tabs below show three views of the same result. <span className="text-[var(--fg)]">Pseudocode</span> is
            the plain-English plan the AI wrote first. You can edit it and click &ldquo;Regenerate JSON&rdquo; to refine
            the output. <span className="text-[var(--fg)]">JSON</span> is the machine-readable patch you can copy and use
            elsewhere. <span className="text-[var(--fg)]">Graph</span> renders the nodes and edges visually. Pan and
            scroll to explore it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-[var(--border)]">
          {(["pseudocode", "json", "graph"] as OutputTab[]).map((tab) => {
            const available = tab === "pseudocode" ? Boolean(pseudocode) : tab === "json" ? Boolean(rawJson) : Boolean(patch);
            return (
              <button
                key={tab}
                type="button"
                disabled={!available}
                onClick={() => onSetActiveTab(tab)}
                className={`px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--border-strong)] text-[var(--fg)]"
                    : "border-b-2 border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                {tab === "pseudocode" ? "Pseudocode" : tab === "json" ? "JSON" : "Graph"}
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
          <div className="space-y-1 border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--error-fg)]">Validation</p>
            {validationErrors.map((error, index) => (
              <p key={`${error}-${index}`} className="font-mono text-sm text-[var(--error-fg)]">
                {error}
              </p>
            ))}
          </div>
        )}

        {activeTab === "graph" && patch && domain ? (
          <GraphPanel patch={patch} domain={domain} />
        ) : (
          <div className="min-w-0 space-y-10">
            <div className="min-w-0 space-y-4">
              {activeTab === "pseudocode" && pseudocode && (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap border border-[var(--border)] bg-[var(--code)] p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
                  {pseudocode}
                </pre>
              )}

              {activeTab === "json" && rawJson && (
                <div className="relative">
                  <pre className="max-h-96 overflow-auto whitespace-pre border border-[var(--border)] bg-[var(--code)] p-4 font-mono text-sm text-[var(--fg)]">
                    {rawJson}
                  </pre>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(rawJson)}
                    className="absolute right-2 top-2 border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {patch && domain ? (
              <div className="min-w-0">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Graph</p>
                <GraphPanel patch={patch} domain={domain} />
              </div>
            ) : (
              <div className="flex min-h-[min(420px,50vh)] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-sm text-[var(--fg-subtle)]">
                Graph appears when generation returns a valid patch.
              </div>
            )}
          </div>
        )}
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
