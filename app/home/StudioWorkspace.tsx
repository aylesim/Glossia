"use client";

import { useRef, useState, type ReactNode } from "react";
import NodeCatalog from "@/app/components/NodeCatalog";
import ApiKeySection from "./components/ApiKeySection";
import ComposeSection from "./components/ComposeSection";
import DomainSection from "./components/DomainSection";
import FlowStartSection, { type FlowEntry } from "./components/FlowStartSection";
import PresetSection from "./components/PresetSection";
import ResultsSection from "./components/ResultsSection";
import StudioGraphColumn from "./components/StudioGraphColumn";
import { BUTTON_PRIMARY_CLASS, BUTTON_PRIMARY_COMPACT_CLASS } from "./styles";
import { useGlossiaStudio } from "./hooks/useGlossiaStudio";

function ResultsPlaceholder({
  composeAnchorRef,
  compact,
}: {
  composeAnchorRef: React.RefObject<HTMLDivElement | null>;
  compact: boolean;
}) {
  return (
    <section
      className={
        compact
          ? "rounded border border-[var(--border)] border-dashed bg-[var(--surface)] p-2.5 text-center"
          : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
      }
    >
      <p className={`text-[var(--fg-muted)] ${compact ? "font-mono text-[10px] leading-snug" : "text-sm leading-relaxed"}`}>
        No output. Run <span className="text-[var(--fg)]">Generate</span> in Compose.
      </p>
      <button
        type="button"
        onClick={() => composeAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={compact ? `${BUTTON_PRIMARY_COMPACT_CLASS} mt-2` : `${BUTTON_PRIMARY_CLASS} mt-5`}
      >
        {compact ? "Compose" : "Scroll to Compose"}
      </button>
    </section>
  );
}

function renderResultsBlock(
  studio: ReturnType<typeof useGlossiaStudio>,
  composeAnchorRef: React.RefObject<HTMLDivElement | null>,
): ReactNode {
  const compact = true;
  if (!studio.state.hasOutput) {
    return <ResultsPlaceholder composeAnchorRef={composeAnchorRef} compact={compact} />;
  }

  return (
    <div className="space-y-2">
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
  );
}

export default function StudioWorkspace() {
  const studio = useGlossiaStudio();
  const composeAnchorRef = useRef<HTMLDivElement | null>(null);
  const [entry, setEntry] = useState<FlowEntry | null>(null);

  function handleChoose(next: FlowEntry) {
    setEntry(next);
  }

  const hasValidDomain =
    Boolean(studio.state.domain) &&
    studio.state.domainValidationErrors.length === 0 &&
    !studio.state.domainLoading;

  if (entry === null) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-2xl font-light tracking-tight">Studio</h2>
          <p className="max-w-2xl text-sm text-[var(--fg-muted)]">
            Domain, compose, then review results.
          </p>
        </section>
        <FlowStartSection onChoose={handleChoose} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(300px,26rem)_1fr] lg:items-start lg:gap-6">
      <div className="min-w-0 space-y-2 border-[var(--border)] lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:border-r lg:pr-3">
        <FlowStartSection chosenEntry={entry} onChoose={handleChoose} compact />

        {entry === "preset" && (
          <>
            <PresetSection
              selectedPresetId={studio.state.selectedPresetId}
              onSelectPreset={studio.actions.selectPreset}
              compact
            />
            <ApiKeySection
              optionalCaption={true}
              openAiApiKey={studio.state.openAiApiKey}
              showOpenAiApiKey={studio.state.showOpenAiApiKey}
              onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
              onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
              onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
              compact
            />
          </>
        )}

        {entry === "apikey" && (
          <ApiKeySection
            openAiApiKey={studio.state.openAiApiKey}
            showOpenAiApiKey={studio.state.showOpenAiApiKey}
            onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
            onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
            onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
            compact
          />
        )}

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

        {hasValidDomain && <NodeCatalog domain={studio.state.domain} compact />}

        <div ref={composeAnchorRef} className="scroll-mt-6 space-y-2">
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
        </div>

        {!hasValidDomain && (
          <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[10px] text-[var(--fg-muted)]">
            Valid domain required for full node list.
          </div>
        )}

        {renderResultsBlock(studio, composeAnchorRef)}
      </div>

      <div className="w-full min-w-0 lg:sticky lg:top-20 lg:self-start">
        <StudioGraphColumn
          patch={studio.state.patch}
          domain={studio.state.domain}
          hasOutput={studio.state.hasOutput}
        />
      </div>
    </div>
  );
}
