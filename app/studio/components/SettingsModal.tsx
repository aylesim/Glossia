"use client";

import { useEffect, useState } from "react";
import type { LiveLlmProviderId, ModelInfo } from "@/lib/llm/registry";
import type { StudioMode } from "../types";

export default function SettingsModal({
  open,
  onClose,
  mode,
  onModeChange,
  provider,
  onProviderChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  budget,
  onBudgetChange,
  models,
}: {
  open: boolean;
  onClose: () => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  provider: LiveLlmProviderId;
  onProviderChange: (provider: LiveLlmProviderId) => void;
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
  models: ModelInfo[];
}) {
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const providerModels = models.filter((entry) => entry.provider === provider);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-md"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">Workspace</p>
            <h2 id="settings-title" className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
              Model &amp; budget
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
          >
            close
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <fieldset>
            <legend className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
              Execution mode
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { id: "demo" as const, title: "Recorded", detail: "fixtures, no model calls" },
                { id: "live" as const, title: "Live", detail: "real model · your key · real cost" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onModeChange(option.id)}
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                    mode === option.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="block text-[12px] font-medium text-[var(--fg)]">{option.title}</span>
                  <span className="mt-0.5 block font-mono text-[8.5px] leading-4 text-[var(--fg-subtle)]">
                    {option.detail}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                Provider
              </span>
              <select
                value={provider}
                onChange={(event) => onProviderChange(event.target.value as LiveLlmProviderId)}
                className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 text-[12px] text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                Model
              </span>
              <select
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 text-[12px] text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              >
                {providerModels.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
              API key {mode === "demo" ? "(not needed for recorded fixtures)" : ""}
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => onApiKeyChange(event.target.value)}
                placeholder={mode === "demo" ? "switch to live to use a key" : "sk-…"}
                disabled={mode === "demo"}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 font-mono text-[11px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
              >
                {showKey ? "hide" : "show"}
              </button>
            </div>
            <span className="mt-1.5 block font-mono text-[8.5px] leading-4 text-[var(--fg-subtle)]">
              Stored in this tab&apos;s sessionStorage. Sent only with generation requests; never persisted or logged.
            </span>
          </label>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                Run budget
              </span>
              <span className="font-mono text-[10px] text-[var(--fg)]">${budget.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={budget}
              onChange={(event) => onBudgetChange(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
            <span className="mt-1 block font-mono text-[8.5px] leading-4 text-[var(--fg-subtle)]">
              Hard stop before a model call that would exceed it. The run keeps its partial trace.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            {mode === "demo" ? "deterministic · no model calls" : "live calls are billed by the provider"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--inverse)] px-4 py-2 text-[12px] font-medium text-[var(--inverse-fg)] hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
