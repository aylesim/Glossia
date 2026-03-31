"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import NodeCatalog from "@/app/components/NodeCatalog";
import ApiKeySection from "./components/ApiKeySection";
import ComposeSection from "./components/ComposeSection";
import DomainSection from "./components/DomainSection";
import FlowStartSection, { type FlowEntry } from "./components/FlowStartSection";
import PresetSection from "./components/PresetSection";
import ResultsSection from "./components/ResultsSection";
import { BUTTON_PRIMARY_CLASS, BUTTON_SECONDARY_CLASS } from "./styles";
import { useGlossiaStudio } from "./hooks/useGlossiaStudio";

function totalSteps(_entry: FlowEntry): number {
  return 5;
}

function stepLabel(entry: FlowEntry, step: number): string {
  if (entry === "preset") {
    const labels = [
      "",
      "Workflow preset",
      "Domain & optional API key",
      "Node catalog",
      "Compose",
      "Results",
    ];
    return labels[step] ?? "";
  }
  const labels = ["", "OpenAI API key", "Domain", "Node catalog", "Compose", "Results"];
  return labels[step] ?? "";
}

function domainStep(entry: FlowEntry): number {
  return entry === "preset" ? 2 : 2;
}

function composeStep(entry: FlowEntry): number {
  return entry === "preset" ? 4 : 4;
}

function resultsStep(entry: FlowEntry): number {
  return entry === "preset" ? 5 : 5;
}

function ResultsPlaceholder({ composeAnchorRef }: { composeAnchorRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
        Nothing to show yet. Run <span className="text-[var(--fg)]">Generate</span> in the Compose section above, then
        review pseudocode, JSON, and the graph here.
      </p>
      <button
        type="button"
        onClick={() => composeAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={`${BUTTON_PRIMARY_CLASS} mt-5`}
      >
        Scroll to Compose
      </button>
    </section>
  );
}

function FlowGuidanceBar({
  step,
  entry,
  onChangePath,
}: {
  step: number;
  entry: FlowEntry;
  onChangePath: () => void;
}) {
  const total = totalSteps(entry);
  const nextLabel = step < total ? stepLabel(entry, step + 1) : null;

  return (
    <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Guided flow · {step} of {total} sections on screen
        </p>
        {nextLabel && (
          <p className="text-sm font-medium text-[var(--fg)]">
            Continue adds: <span className="text-[var(--fg-muted)]">{nextLabel}</span>
          </p>
        )}
        {!nextLabel && (
          <p className="text-sm font-medium text-[var(--fg-muted)]">All sections are visible.</p>
        )}
        <div className="flex max-w-md gap-1" aria-hidden={true}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 min-w-0 flex-1 ${i < step ? "bg-[var(--border-strong)]" : "bg-[var(--border)]"}`}
            />
          ))}
        </div>
      </div>
      <button type="button" onClick={onChangePath} className={`${BUTTON_SECONDARY_CLASS} shrink-0`}>
        Change path
      </button>
    </div>
  );
}

function renderResultsBlock(
  studio: ReturnType<typeof useGlossiaStudio>,
  composeAnchorRef: React.RefObject<HTMLDivElement | null>,
): ReactNode {
  if (!studio.state.hasOutput) {
    return <ResultsPlaceholder composeAnchorRef={composeAnchorRef} />;
  }

  return (
    <div className="space-y-6">
      {studio.state.serverError && (
        <div
          role="alert"
          className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]"
        >
          <span className="font-medium">Error · </span>
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
      />
    </div>
  );
}

export default function StudioWorkspace() {
  const studio = useGlossiaStudio();
  const composeAnchorRef = useRef<HTMLDivElement | null>(null);
  const [entry, setEntry] = useState<FlowEntry | null>(null);
  const [step, setStep] = useState(0);

  function handleChoose(next: FlowEntry) {
    setEntry(next);
    setStep(1);
  }

  function handleChangePath() {
    setEntry(null);
    setStep(0);
  }

  const domainStepIndex = entry ? domainStep(entry) : 0;
  const composeStepIndex = entry ? composeStep(entry) : 0;
  const resultsStepIndex = entry ? resultsStep(entry) : 0;

  const canProceedDomain = useMemo(
    () =>
      Boolean(studio.state.domain) &&
      studio.state.domainValidationErrors.length === 0 &&
      !studio.state.domainLoading,
    [
      studio.state.domain,
      studio.state.domainValidationErrors.length,
      studio.state.domainLoading,
    ],
  );

  if (entry === null) {
    return (
      <div className="space-y-10">
        <FlowStartSection onChoose={handleChoose} />
      </div>
    );
  }

  const maxStep = totalSteps(entry);
  const showContinue = step < maxStep;
  const isDomainStep = step === domainStepIndex;
  const continueDisabled = isDomainStep && !canProceedDomain;
  const continueHint = isDomainStep
    ? continueDisabled
      ? "Load or fix a valid domain (preset, generate, or import) before revealing the next sections."
      : undefined
    : step === composeStepIndex
      ? "Reveal Results below when you are ready. You can still generate first; an empty state will explain what to do."
      : undefined;

  return (
    <div className="space-y-10">
      <FlowGuidanceBar step={step} entry={entry} onChangePath={handleChangePath} />

      <FlowStartSection chosenEntry={entry} onChoose={handleChoose} />

      <div className="space-y-10">
        {entry === "preset" && step >= 1 && (
          <PresetSection
            selectedPresetId={studio.state.selectedPresetId}
            onSelectPreset={studio.actions.selectPreset}
          />
        )}

        {entry === "apikey" && step >= 1 && (
          <ApiKeySection
            openAiApiKey={studio.state.openAiApiKey}
            showOpenAiApiKey={studio.state.showOpenAiApiKey}
            onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
            onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
            onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
          />
        )}

        {entry === "preset" && step >= 2 && (
          <ApiKeySection
            optionalCaption={true}
            openAiApiKey={studio.state.openAiApiKey}
            showOpenAiApiKey={studio.state.showOpenAiApiKey}
            onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
            onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
            onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
          />
        )}

        {((entry === "preset" && step >= 2) || (entry === "apikey" && step >= 2)) && (
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
          />
        )}

        {((entry === "preset" && step >= 3) || (entry === "apikey" && step >= 3)) && (
          <NodeCatalog domain={studio.state.domain} />
        )}

        {((entry === "preset" && step >= 4) || (entry === "apikey" && step >= 4)) && (
          <div ref={composeAnchorRef} className="scroll-mt-8 space-y-6">
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
            />
            {studio.state.serverError && (
              <div
                role="alert"
                className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]"
              >
                <span className="font-medium">Error · </span>
                {studio.state.serverError}
              </div>
            )}
          </div>
        )}

        {step >= resultsStepIndex && renderResultsBlock(studio, composeAnchorRef)}
      </div>

      {showContinue && (
        <div className="space-y-2 border-t border-[var(--border)] pt-6">
          {continueHint && <p className="text-xs text-[var(--fg-muted)]">{continueHint}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={continueDisabled}
              onClick={() => setStep((s) => s + 1)}
              className={BUTTON_PRIMARY_CLASS}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
