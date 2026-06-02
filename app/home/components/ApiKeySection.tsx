import type { LlmProvider } from "@/lib/llm-provider";
import type { LlmModelOption, LlmModelSource } from "@/lib/llm-models";
import { BUTTON_SECONDARY_CLASS, BUTTON_SECONDARY_COMPACT_CLASS, FIELD_CLASS, FIELD_COMPACT_CLASS } from "../styles";

type ApiKeySectionProps = {
  llmProvider: LlmProvider;
  onLlmProviderChange: (provider: LlmProvider) => void;
  llmModel: string;
  llmModelSource: LlmModelSource;
  onLlmModelSourceChange: (source: LlmModelSource) => void;
  modelOptions: LlmModelOption[];
  modelsLoading: boolean;
  modelsError: string;
  onLlmModelChange: (model: string) => void;
  onRefreshModels?: () => void;
  openAiApiKey: string;
  showOpenAiApiKey: boolean;
  onOpenAiApiKeyChange: (value: string) => void;
  onToggleOpenAiApiKeyVisibility: () => void;
  onClearOpenAiApiKey: () => void;
  optionalCaption?: boolean;
  compact?: boolean;
  toolbar?: boolean;
};

const PROVIDER_LINKS: Record<LlmProvider, { href: string; label: string }> = {
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com" },
  openrouter: { href: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
};

const MODEL_PLACEHOLDER: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "anthropic/claude-3.5-sonnet",
};

function labelClass(compact: boolean) {
  return compact
    ? "w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]"
    : "font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]";
}

function ModelSourceToggle({
  llmModelSource,
  onLlmModelSourceChange,
  compact,
}: {
  llmModelSource: LlmModelSource;
  onLlmModelSourceChange: (source: LlmModelSource) => void;
  compact: boolean;
}) {
  const item =
    "px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors";
  const active = "bg-[var(--inverse-bg)] text-[var(--inverse-fg)]";
  const idle = "text-[var(--fg-muted)] hover:text-[var(--fg)]";

  return (
    <div
      className="inline-flex shrink-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-raised)]"
      role="group"
      aria-label="Model input mode"
    >
      <button
        type="button"
        onClick={() => onLlmModelSourceChange("preset")}
        aria-pressed={llmModelSource === "preset"}
        className={`${item} ${llmModelSource === "preset" ? active : idle}`}
      >
        {compact ? "List" : "From list"}
      </button>
      <button
        type="button"
        onClick={() => onLlmModelSourceChange("custom")}
        aria-pressed={llmModelSource === "custom"}
        className={`${item} border-l border-[var(--border)] ${llmModelSource === "custom" ? active : idle}`}
      >
        Custom
      </button>
    </div>
  );
}

function ModelField({
  id,
  llmProvider,
  llmModel,
  llmModelSource,
  modelOptions,
  modelsLoading,
  modelsError,
  onLlmModelChange,
  onRefreshModels,
  field,
  btnSec,
}: {
  id: string;
  llmProvider: LlmProvider;
  llmModel: string;
  llmModelSource: LlmModelSource;
  modelOptions: LlmModelOption[];
  modelsLoading: boolean;
  modelsError: string;
  onLlmModelChange: (model: string) => void;
  onRefreshModels?: () => void;
  field: string;
  btnSec: string;
}) {
  const inList = modelOptions.some((model) => model.id === llmModel);

  if (llmModelSource === "custom") {
    return (
      <input
        id={id}
        type="text"
        value={llmModel}
        onChange={(event) => onLlmModelChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={MODEL_PLACEHOLDER[llmProvider]}
        className={`${field} min-w-0 flex-1 font-mono text-[10px]`}
      />
    );
  }

  return (
    <>
      <select
        id={id}
        value={llmModel}
        onChange={(event) => onLlmModelChange(event.target.value)}
        disabled={modelsLoading && modelOptions.length === 0}
        title={modelsError || undefined}
        className={`${field} min-w-0 flex-1 font-mono text-[10px]`}
      >
        {modelsLoading && modelOptions.length === 0 ? (
          <option value={llmModel}>Loading free…</option>
        ) : (
          <>
            {!inList && llmModel ? (
              <option value={llmModel}>{llmModel}</option>
            ) : null}
            {modelOptions.length === 0 ? (
              <option value={llmModel}>{modelsError ? "Load failed" : "No models"}</option>
            ) : (
              modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            )}
          </>
        )}
      </select>
      {llmProvider === "openrouter" && onRefreshModels ? (
        <button
          type="button"
          onClick={onRefreshModels}
          disabled={modelsLoading}
          className={btnSec}
          aria-label="Refresh free models"
          title="Refresh free models"
        >
          ↻
        </button>
      ) : null}
    </>
  );
}

export default function ApiKeySection({
  llmProvider,
  onLlmProviderChange,
  llmModel,
  llmModelSource,
  onLlmModelSourceChange,
  modelOptions,
  modelsLoading,
  modelsError,
  onLlmModelChange,
  onRefreshModels,
  openAiApiKey,
  showOpenAiApiKey,
  onOpenAiApiKeyChange,
  onToggleOpenAiApiKeyVisibility,
  onClearOpenAiApiKey,
  optionalCaption = false,
  compact = false,
  toolbar = false,
}: ApiKeySectionProps) {
  const field = compact || toolbar ? FIELD_COMPACT_CLASS : FIELD_CLASS;
  const btnSec = compact || toolbar ? BUTTON_SECONDARY_COMPACT_CLASS : BUTTON_SECONDARY_CLASS;
  const providerLink = PROVIDER_LINKS[llmProvider];
  const rowLabel = labelClass(compact || toolbar);

  if (toolbar) {
    return (
      <section className="min-w-0 flex-1">
        <div className="grid gap-2">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 sm:grid-cols-[3rem_auto_minmax(0,1fr)]">
            <span className={rowLabel}>LLM</span>
            <div className="col-span-1 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-span-2">
              <label htmlFor="studio-llm-provider" className="sr-only">
                Provider
              </label>
              <select
                id="studio-llm-provider"
                value={llmProvider}
                onChange={(event) => onLlmProviderChange(event.target.value as LlmProvider)}
                className={`${field} w-auto shrink-0 font-mono text-[10px]`}
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <ModelSourceToggle
                llmModelSource={llmModelSource}
                onLlmModelSourceChange={onLlmModelSourceChange}
                compact
              />
              {optionalCaption ? (
                <span className="font-mono text-[9px] text-[var(--fg-subtle)]">key opt.</span>
              ) : null}
              <a
                href={providerLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[9px] text-[var(--fg-muted)] underline underline-offset-2 hover:text-[var(--fg)] sm:ml-0"
              >
                {providerLink.label}
              </a>
            </div>

            <span className={rowLabel}>Model</span>
            <div className="col-span-1 flex min-w-0 items-center gap-1 sm:col-span-2">
              <ModelField
                id="studio-llm-model"
                llmProvider={llmProvider}
                llmModel={llmModel}
                llmModelSource={llmModelSource}
                modelOptions={modelOptions}
                modelsLoading={modelsLoading}
                modelsError={modelsError}
                onLlmModelChange={onLlmModelChange}
                onRefreshModels={onRefreshModels}
                field={field}
                btnSec={btnSec}
              />
            </div>

            <span className={rowLabel}>Key</span>
            <div className="col-span-1 flex min-w-0 flex-wrap items-center gap-1 sm:col-span-2">
              <label htmlFor="studio-api-key" className="sr-only">
                API key
              </label>
              <input
                id="studio-api-key"
                type={showOpenAiApiKey ? "text" : "password"}
                value={openAiApiKey}
                onChange={(event) => onOpenAiApiKeyChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={llmProvider === "openrouter" ? "sk-or-…" : "sk-…"}
                className={`${field} min-w-0 flex-1 font-mono text-[10px]`}
              />
              <button
                type="button"
                onClick={onToggleOpenAiApiKeyVisibility}
                aria-pressed={showOpenAiApiKey}
                aria-label={showOpenAiApiKey ? "Hide API key" : "Show API key"}
                className={btnSec}
              >
                {showOpenAiApiKey ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={onClearOpenAiApiKey}
                disabled={!openAiApiKey}
                className={btnSec}
              >
                Clear
              </button>
            </div>
          </div>
          {llmProvider === "openrouter" && llmModelSource === "preset" && modelsError ? (
            <p className="font-mono text-[9px] text-[var(--fg-muted)]">{modelsError}</p>
          ) : null}
        </div>
      </section>
    );
  }

  const shell = compact
    ? "space-y-3 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
    : "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell}>
      <div className={compact ? "space-y-2" : "space-y-3 border-b border-[var(--border)] pb-4"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            LLM settings
          </p>
          {compact && optionalCaption ? (
            <span className="font-mono text-[9px] text-[var(--fg-subtle)]">optional w/ preset</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="studio-llm-provider-full" className={rowLabel}>
            Provider
          </label>
          <select
            id="studio-llm-provider-full"
            value={llmProvider}
            onChange={(event) => onLlmProviderChange(event.target.value as LlmProvider)}
            className={`${field} w-auto font-mono text-xs`}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
          <ModelSourceToggle
            llmModelSource={llmModelSource}
            onLlmModelSourceChange={onLlmModelSourceChange}
            compact={compact}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="studio-llm-model-full" className={rowLabel}>
            Model
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <ModelField
              id="studio-llm-model-full"
              llmProvider={llmProvider}
              llmModel={llmModel}
              llmModelSource={llmModelSource}
              modelOptions={modelOptions}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              onLlmModelChange={onLlmModelChange}
              onRefreshModels={onRefreshModels}
              field={field}
              btnSec={btnSec}
            />
          </div>
        </div>

        {!compact ? (
          <>
            <p className="text-sm font-medium">Needed only for model generation.</p>
            {optionalCaption ? (
              <p className="text-xs font-medium text-[var(--fg-muted)]">
                Optional when you start from a preset.
              </p>
            ) : null}
            <p className="text-sm text-[var(--fg-muted)]">
              Keys and model choice stay in local browser storage.{" "}
              <a
                href={providerLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-[var(--fg)]"
              >
                Get a key →
              </a>
            </p>
          </>
        ) : (
          <p className="font-mono text-[9px] text-[var(--fg-muted)]">
            local only ·{" "}
            <a
              href={providerLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg)] underline underline-offset-2"
            >
              {providerLink.label}
            </a>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className={rowLabel}>API key</p>
        <div className="flex flex-wrap gap-2">
          <input
            id="studio-api-key-full"
            type={showOpenAiApiKey ? "text" : "password"}
            value={openAiApiKey}
            onChange={(event) => onOpenAiApiKeyChange(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={llmProvider === "openrouter" ? "sk-or-…" : "sk-…"}
            className={`${field} min-w-0 flex-1 font-mono ${compact ? "text-[10px]" : "text-xs"}`}
          />
          <button
            type="button"
            onClick={onToggleOpenAiApiKeyVisibility}
            aria-pressed={showOpenAiApiKey}
            className={btnSec}
          >
            {showOpenAiApiKey ? "Hide" : "Show"}
          </button>
          <button type="button" onClick={onClearOpenAiApiKey} disabled={!openAiApiKey} className={btnSec}>
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
