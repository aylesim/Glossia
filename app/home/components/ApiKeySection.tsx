import { BUTTON_SECONDARY_CLASS, FIELD_CLASS } from "../styles";

type ApiKeySectionProps = {
  openAiApiKey: string;
  showOpenAiApiKey: boolean;
  onOpenAiApiKeyChange: (value: string) => void;
  onToggleOpenAiApiKeyVisibility: () => void;
  onClearOpenAiApiKey: () => void;
  optionalCaption?: boolean;
};

export default function ApiKeySection({
  openAiApiKey,
  showOpenAiApiKey,
  onOpenAiApiKeyChange,
  onToggleOpenAiApiKeyVisibility,
  onClearOpenAiApiKey,
  optionalCaption = false,
}: ApiKeySectionProps) {
  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="border-b border-[var(--border)] pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">OpenAI API key</p>
        <p className="mt-2 text-sm font-medium">For AI-backed steps only.</p>
        {optionalCaption && (
          <p className="mt-2 text-xs font-medium text-[var(--fg)]">
            Optional on the preset path—leave blank if you only want to explore locally; add a key when you call the
            model.
          </p>
        )}
        <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
          Presets and imported domain JSON load in the browser without a key. Paste a key when you want to generate a
          domain from a description or run Compose. It is saved only in your browser; the codebase is open source if you
          want to verify how it is used.{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-[var(--fg)]"
          >
            Get a key at platform.openai.com →
          </a>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
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
          className={`${FIELD_CLASS} min-w-[12rem] flex-1 font-mono text-xs`}
        />
        <button
          type="button"
          onClick={onToggleOpenAiApiKeyVisibility}
          aria-pressed={showOpenAiApiKey}
          aria-label={showOpenAiApiKey ? "Hide API key" : "Show API key"}
          className={BUTTON_SECONDARY_CLASS}
        >
          {showOpenAiApiKey ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          onClick={onClearOpenAiApiKey}
          disabled={!openAiApiKey}
          className={BUTTON_SECONDARY_CLASS}
        >
          Clear key
        </button>
      </div>
    </section>
  );
}
