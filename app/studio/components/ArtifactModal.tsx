"use client";

import { useEffect } from "react";
import type { Artifact } from "@/lib/ir/types";
import Markdown from "@/app/components/Markdown";

function download(markdown: string, title: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artifact"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ArtifactModal({
  artifact,
  open,
  onClose,
}: {
  artifact: Artifact | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !artifact) return null;
  const verification = artifact.verification;
  const checks = artifact.checks ?? [];
  const passedChecks = checks.filter((check) => check.passed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-title"
        className="flex max-h-[92dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
              {verification ? "Artifact · verified" : checks.length > 0 ? "Artifact · checked" : "Artifact"}
            </p>
            <h2 id="artifact-title" className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
              {artifact.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => download(artifact.markdown, artifact.title)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
            >
              download .md
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[var(--inverse)] px-3.5 py-1.5 text-[11px] font-medium text-[var(--inverse-fg)] hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-0 overflow-y-auto px-6 py-5 sm:px-8">
            <Markdown markdown={artifact.markdown} />
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-5 lg:border-l lg:border-t-0">
            {verification ? (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                  Verification
                </p>
                <div className="mt-2 rounded-md border border-[var(--success)]/30 bg-[var(--success-soft)] px-3 py-2.5">
                  <p className="font-mono text-[22px] tracking-[-0.02em] text-[var(--success)]">
                    {Math.round(verification.supportRate * 100)}%
                  </p>
                  <p className="mt-1 font-mono text-[9px] leading-4 text-[var(--fg-muted)]">
                    {verification.supportedClaims}/{verification.totalClaims} claims supported by an exact or
                    normalised source quote.
                  </p>
                </div>
                <dl className="mt-3 space-y-1.5">
                  {[
                    ["total claims", verification.totalClaims],
                    ["unsupported", verification.unsupportedClaims],
                    ["sources used", verification.sourcesUsed],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                      <dt className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
                        {label}
                      </dt>
                      <dd className="font-mono text-[10px] text-[var(--fg)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : checks.length > 0 ? (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                  Deterministic checks
                </p>
                <div className="mt-2 rounded-md border border-[var(--success)]/30 bg-[var(--success-soft)] px-3 py-2.5">
                  <p className="font-mono text-[22px] tracking-[-0.02em] text-[var(--success)]">
                    {Math.round((passedChecks / checks.length) * 100)}%
                  </p>
                  <p className="mt-1 font-mono text-[9px] leading-4 text-[var(--fg-muted)]">
                    {passedChecks}/{checks.length} checks passed after the node produced its output.
                  </p>
                </div>
                <ul className="mt-3 space-y-2">
                  {checks.map((check) => (
                    <li key={check.label} className="border-b border-[var(--border)] pb-2">
                      <p className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.06em]">
                        <span className="text-[var(--fg)]">{check.label}</span>
                        <span className={check.passed ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                          {check.passed ? "pass" : "fail"}
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--fg-muted)]">{check.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {artifact.sources.length > 0 ? (
              <div className="mt-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Sources</p>
                <ul className="mt-2 space-y-2">
                  {artifact.sources.map((source) => (
                    <li key={source.id} className="text-[10.5px] leading-4 text-[var(--fg-muted)]">
                      <span className="font-mono text-[var(--accent)]">[{source.id}]</span>{" "}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--accent)]"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                Deterministic check
              </p>
              <p className="mt-1.5 text-[10.5px] leading-5 text-[var(--fg-muted)]">
                {verification
                  ? "The verifier runs after the model, not inside it. It compares every claim quote with the source text and fails closed."
                  : "The checks run after the node, not inside the model. They are plain code over the produced output."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
