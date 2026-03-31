"use client";

import NodeCatalog from "@/app/components/NodeCatalog";
import ApiKeySection from "./home/components/ApiKeySection";
import ComposeSection from "./home/components/ComposeSection";
import DomainSection from "./home/components/DomainSection";
import HomeHeader from "./home/components/HomeHeader";
import OverviewSection from "./home/components/OverviewSection";
import PresetSection from "./home/components/PresetSection";
import ResultsSection from "./home/components/ResultsSection";
import { useGlossiaStudio } from "./home/hooks/useGlossiaStudio";

export default function HomePage() {
  const studio = useGlossiaStudio();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <HomeHeader />

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-10">
        <OverviewSection />

        <div className="space-y-10">
          <ApiKeySection
            openAiApiKey={studio.state.openAiApiKey}
            showOpenAiApiKey={studio.state.showOpenAiApiKey}
            onOpenAiApiKeyChange={studio.actions.setOpenAiApiKey}
            onToggleOpenAiApiKeyVisibility={studio.actions.toggleOpenAiApiKeyVisibility}
            onClearOpenAiApiKey={studio.actions.clearOpenAiApiKey}
          />

          <PresetSection
            selectedPresetId={studio.state.selectedPresetId}
            onSelectPreset={studio.actions.selectPreset}
          />

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

          <NodeCatalog domain={studio.state.domain} />

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
            <div className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]">
              <span className="font-medium">Error · </span>
              {studio.state.serverError}
            </div>
          )}

          {studio.state.hasOutput && (
            <ResultsSection
              activeTab={studio.state.activeTab}
              pseudocode={studio.state.pseudocode}
              rawJson={studio.state.rawJson}
              patch={studio.state.patch}
              domain={studio.state.domain}
              validationErrors={studio.state.validationErrors}
              loading={studio.state.loading}
              onSetActiveTab={studio.actions.setActiveTab}
              onRegenerateJson={() => studio.actions.generate("json")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
