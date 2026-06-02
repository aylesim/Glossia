"use client";

import NodeCatalog from "@/app/components/NodeCatalog";
import ApiKeySection from "./components/ApiKeySection";
import ComposeSection from "./components/ComposeSection";
import DomainSection from "./components/DomainSection";
import PresetSection from "./components/PresetSection";
import ResultsSection from "./components/ResultsSection";
import StudioGraphColumn from "./components/StudioGraphColumn";
import { useGlossiaStudio } from "./hooks/useGlossiaStudio";

function PanelStatus({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--fg-muted)]">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-[var(--border-strong)]" : "bg-[var(--border)]"}`}
        aria-hidden
      />
      <span className="text-[var(--fg-subtle)]">{label}</span>
      <span className="text-[var(--fg)]">{detail}</span>
    </span>
  );
}

export default function StudioWorkspace() {
  const studio = useGlossiaStudio();

  const hasValidDomain =
    Boolean(studio.state.domain) &&
    studio.state.domainValidationErrors.length === 0 &&
    !studio.state.domainLoading;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Studio</p>
          <h2 className="mt-1 font-mono text-sm font-medium tracking-tight text-[var(--fg)]">
            Domain → compose → validate
          </h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <PanelStatus
            label="domain"
            ok={hasValidDomain}
            detail={hasValidDomain ? (studio.state.domain?.id ?? "ok") : "pending"}
          />
          <PanelStatus
            label="output"
            ok={studio.state.hasOutput}
            detail={studio.state.hasOutput ? studio.state.activeTab : "none"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 sm:flex-row sm:items-start sm:gap-4">
        <PresetSection
          selectedPresetId={studio.state.selectedPresetId}
          onSelectPreset={studio.actions.selectPreset}
          compact
          toolbar
        />
        <div
          className="shrink-0 bg-[var(--border)] max-sm:h-px max-sm:w-full sm:w-px sm:self-stretch"
          aria-hidden
        />
        <ApiKeySection
          optionalCaption
          llmProvider={studio.state.llmProvider}
          onLlmProviderChange={studio.actions.setLlmProvider}
          llmModel={studio.state.llmModel}
          llmModelSource={studio.state.llmModelSource}
          onLlmModelSourceChange={studio.actions.setLlmModelSource}
          modelOptions={studio.state.modelOptions}
          modelsLoading={studio.state.modelsLoading}
          modelsError={studio.state.modelsError}
          onLlmModelChange={studio.actions.setLlmModel}
          onRefreshModels={studio.actions.refreshOpenRouterModels}
          openAiApiKey={studio.state.openAiApiKey}
          showOpenAiApiKey={studio.state.showOpenAiApiKey}
          onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
          onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
          onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
          compact
          toolbar
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,20rem)_minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-2 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:pr-1">
          <DomainSection
            domainPrompt={studio.state.domainPrompt}
            domainLoading={studio.state.domainLoading}
            domainRawJson={studio.state.domainRawJson}
            domainError={studio.state.domainError}
            domainValidationErrors={studio.state.domainValidationErrors}
            hasDomain={Boolean(studio.state.domain)}
            importInputRef={studio.refs.importInputRef}
            onDomainPromptChange={studio.actions.setDomainPrompt}
            onBootstrapDomain={studio.actions.bootstrapDomain}
            onClearDomain={studio.actions.clearDomain}
            onDomainRawJsonChange={studio.actions.setDomainRawJson}
            onExportDomain={studio.actions.exportDomainToFile}
            onTriggerImportDomain={studio.actions.triggerImportDomain}
            onDomainFileInputChange={studio.actions.handleDomainFileInputChange}
            compact
          />
          {hasValidDomain && studio.state.domain ? (
            <NodeCatalog domain={studio.state.domain} compact />
          ) : (
            <div className="rounded border border-dashed border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-[10px] text-[var(--fg-muted)]">
              Node catalog unlocks when domain JSON validates.
            </div>
          )}
        </div>

        <div className="space-y-2 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:pr-1">
          <ComposeSection
            showMidiExamples={studio.state.showMidiExamples}
            canCompose={studio.state.canCompose}
            prompt={studio.state.prompt}
            mode={studio.state.mode}
            loading={studio.state.loading}
            onLoadExample={studio.actions.loadExample}
            onPromptChange={studio.actions.setPrompt}
            onSetMode={studio.actions.setMode}
            onGenerate={studio.actions.generate}
            compact
          />
          {studio.state.serverError && (
            <div
              role="alert"
              className="rounded border border-[var(--error-border)] bg-[var(--error-bg)] px-2 py-1.5 font-mono text-[10px] text-[var(--error-fg)]"
            >
              {studio.state.serverError}
            </div>
          )}
          <ResultsSection
            activeTab={studio.state.activeTab}
            pseudocode={studio.state.pseudocode}
            rawJson={studio.state.rawJson}
            patch={studio.state.patch}
            domain={studio.state.domain}
            validationErrors={studio.state.validationErrors}
            loading={studio.state.loading}
            onSetActiveTab={studio.actions.setActiveTab}
            onPseudocodeChange={studio.actions.setPseudocode}
            onRegenerateJson={() => studio.actions.generate("json")}
            omitGraph
            compact
          />
        </div>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <StudioGraphColumn
            patch={studio.state.patch}
            domain={studio.state.domain}
            hasOutput={studio.state.hasOutput}
          />
        </div>
      </div>
    </div>
  );
}
