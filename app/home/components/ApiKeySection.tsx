import { BUTTON_SECONDARY_CLASS, BUTTON_SECONDARY_COMPACT_CLASS, FIELD_CLASS, FIELD_COMPACT_CLASS } from "../styles";

type ApiKeySectionProps = {
  openAiApiKey: string;
  showOpenAiApiKey: boolean;
  onOpenAiApiKeyChange: (value: string) => void;
  onToggleOpenAiApiKeyVisibility: () => void;
  onClearOpenAiApiKey: () => void;
  optionalCaption?: boolean;
  compact?: boolean;
  toolbar?: boolean;
};

export default function ApiKeySection({
  openAiApiKey,
  showOpenAiApiKey,
  onOpenAiApiKeyChange,
  onToggleOpenAiApiKeyVisibility,
  onClearOpenAiApiKey,
  optionalCaption = false,
  compact = false,
  toolbar = false,
}: ApiKeySectionProps) {
  const field = compact ? FIELD_COMPACT_CLASS : FIELD_CLASS;
  const btnSec = compact ? BUTTON_SECONDARY_COMPACT_CLASS : BUTTON_SECONDARY_CLASS;
  const shell = toolbar
    ? "flex min-w-0 flex-col gap-1.5 lg:min-w-[14rem] lg:flex-[2] lg:flex-row lg:items-center lg:gap-2"
    : compact
      ? "space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
      : "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  return (
    <section className={shell}>
      <div
        className={
          toolbar
            ? "flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0"
            : compact
              ? "space-y-1"
              : "border-b border-[var(--border)] pb-4"
        }
      >
        {!toolbar && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">OpenAI API key</p>
            {compact && optionalCaption && (
              <span className="font-mono text-[9px] text-[var(--fg-subtle)]">optional w/ preset</span>
            )}
          </div>
        )}
        {toolbar && (
          <>
            <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              API key
            </p>
            {optionalCaption && (
              <span className="font-mono text-[9px] text-[var(--fg-subtle)]">opt.</span>
            )}
          </>
        )}
        {!compact && !toolbar && (
          <>
            <p className="mt-2 text-sm font-medium">Needed only for model generation.</p>
            {optionalCaption && (
              <p className="mt-2 text-xs font-medium text-[var(--fg-muted)]">
                Optional when you start from a preset.
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Your key stays in local browser storage.{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-[var(--fg)]"
              >
                Create a key on platform.openai.com →
              </a>
            </p>
          </>
        )}
        {compact && !toolbar && (
          <p className="font-mono text-[9px] text-[var(--fg-muted)]">
            local only ·{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg)] underline underline-offset-2"
            >
              platform.openai.com
            </a>
          </p>
        )}
        {toolbar && (
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] text-[var(--fg-muted)] underline underline-offset-2 hover:text-[var(--fg)]"
          >
            openai
          </a>
        )}
      </div>
      <div className={`flex min-w-0 flex-1 flex-wrap ${compact || toolbar ? "gap-1" : "gap-2"}`}>
        <label htmlFor="studio-openai-key" className="sr-only">
          OpenAI API key
        </label>
        <input
          id="studio-openai-key"
          type={showOpenAiApiKey ? "text" : "password"}
          value={openAiApiKey}
          onChange={(event) => onOpenAiApiKeyChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-…"
          className={`${field} min-w-0 flex-1 font-mono ${compact ? "text-[10px]" : "text-xs"}`}
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
        <button type="button" onClick={onClearOpenAiApiKey} disabled={!openAiApiKey} className={btnSec}>
          Clear
        </button>
      </div>
    </section>
  );
}
