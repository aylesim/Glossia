import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { EXAMPLES } from "@/lib/examples";
import { Domain, validateDomain } from "@/lib/domain";
import { STUDIO_PRESETS, getStudioPresetById } from "@/lib/domain-presets";
import { Patch } from "@/lib/schema";
import type {
  DomainBootstrapRequest,
  DomainBootstrapResponse,
  GenerateMode,
  GenerateRequest,
  GenerateResponse,
  OpenRouterModelsResponse,
} from "@/lib/api-types";
import type { OutputTab } from "../types";
import { LlmProvider, parseLlmProvider } from "@/lib/llm-provider";
import {
  DEFAULT_LLM_MODEL_BY_PROVIDER,
  DEFAULT_LLM_MODEL_SOURCE,
  OPENAI_MODEL_OPTIONS,
  parseStoredLlmModelSources,
  parseStoredLlmModels,
  type LlmModelOption,
  type LlmModelSource,
} from "@/lib/llm-models";

const LOCAL_STORAGE_DOMAIN_KEY = "glossia.current-domain.v1";
const LOCAL_STORAGE_OPENAI_KEY = "glossia.openai-api-key.v1";
const LOCAL_STORAGE_LLM_PROVIDER_KEY = "glossia.llm-provider.v1";
const LOCAL_STORAGE_LLM_MODELS_KEY = "glossia.llm-models.v1";
const LOCAL_STORAGE_LLM_MODEL_SOURCE_KEY = "glossia.llm-model-source.v1";

type StudioState = {
  selectedPresetId: string;
  domainPrompt: string;
  domainRawJson: string;
  domain: Domain | null;
  domainValidationErrors: string[];
  domainError: string;
  domainLoading: boolean;
  prompt: string;
  mode: GenerateMode;
  loading: boolean;
  pseudocode: string;
  rawJson: string;
  patch: Patch | null;
  validationErrors: string[];
  serverError: string;
  activeTab: OutputTab;
  openAiApiKey: string;
  showOpenAiApiKey: boolean;
  llmProvider: LlmProvider;
  llmModel: string;
  llmModelSource: LlmModelSource;
  modelOptions: LlmModelOption[];
  modelsLoading: boolean;
  modelsError: string;
  hasOutput: boolean;
  canCompose: boolean;
  showMidiExamples: boolean;
};

type StudioActions = {
  setDomainPrompt: (value: string) => void;
  setDomainRawJson: (value: string) => void;
  bootstrapDomain: () => Promise<void>;
  clearDomain: () => void;
  selectPreset: (presetId: string) => void;
  triggerImportDomain: () => void;
  handleDomainFileInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportDomainToFile: () => void;
  setPrompt: (value: string) => void;
  setMode: (value: GenerateMode) => void;
  generate: (overrideMode?: GenerateMode) => Promise<void>;
  loadExample: (index: number) => void;
  setActiveTab: (tab: OutputTab) => void;
  setPseudocode: (value: string) => void;
  setOpenAiApiKey: (value: string) => void;
  setLlmProvider: (provider: LlmProvider) => void;
  setLlmModel: (model: string) => void;
  setLlmModelSource: (source: LlmModelSource) => void;
  refreshOpenRouterModels: () => void;
  toggleOpenAiApiKeyVisibility: () => void;
  clearOpenAiApiKey: () => void;
};

type StudioRefs = {
  importInputRef: RefObject<HTMLInputElement | null>;
};

export type GlossiaStudioModel = {
  state: StudioState;
  actions: StudioActions;
  refs: StudioRefs;
};

export function useGlossiaStudio(): GlossiaStudioModel {
  const [selectedPresetId, setSelectedPresetId] = useState(STUDIO_PRESETS[0]?.id ?? "");
  const [domainPrompt, setDomainPrompt] = useState("");
  const [domainRawJson, setDomainRawJson] = useState("");
  const [domain, setDomain] = useState<Domain | null>(null);
  const [domainValidationErrors, setDomainValidationErrors] = useState<string[]>([]);
  const [domainError, setDomainError] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<GenerateMode>("full");
  const [loading, setLoading] = useState(false);
  const [pseudocode, setPseudocode] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [patch, setPatch] = useState<Patch | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("pseudocode");
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [showOpenAiApiKey, setShowOpenAiApiKey] = useState(false);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>("openai");
  const [llmModelsByProvider, setLlmModelsByProvider] = useState<Record<LlmProvider, string>>(
    DEFAULT_LLM_MODEL_BY_PROVIDER,
  );
  const [openRouterModelOptions, setOpenRouterModelOptions] = useState<LlmModelOption[]>([]);
  const [openRouterModelsLoading, setOpenRouterModelsLoading] = useState(false);
  const [openRouterModelsError, setOpenRouterModelsError] = useState("");
  const [openRouterModelsRefreshToken, setOpenRouterModelsRefreshToken] = useState(0);
  const [llmModelSourceByProvider, setLlmModelSourceByProvider] = useState<
    Record<LlmProvider, LlmModelSource>
  >(DEFAULT_LLM_MODEL_SOURCE);
  const importInputRef = useRef<HTMLInputElement>(null);
  const llmModelSourceRef = useRef(llmModelSourceByProvider);
  const llmModel = llmModelsByProvider[llmProvider];
  const llmModelSource = llmModelSourceByProvider[llmProvider];
  const modelOptions =
    llmProvider === "openrouter" ? openRouterModelOptions : OPENAI_MODEL_OPTIONS;
  const modelsLoading = llmProvider === "openrouter" && openRouterModelsLoading;
  const modelsError = llmProvider === "openrouter" ? openRouterModelsError : "";
  const lastCommittedDomainJson = useRef<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOMAIN_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const validation = validateDomain(parsed);
      if (validation.ok) {
        setDomain(validation.domain);
        setDomainRawJson(JSON.stringify(validation.domain, null, 2));
        lastCommittedDomainJson.current = JSON.stringify(validation.domain);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_OPENAI_KEY);
    if (raw) setOpenAiApiKey(raw);
    const storedProvider = parseLlmProvider(localStorage.getItem(LOCAL_STORAGE_LLM_PROVIDER_KEY));
    if (storedProvider) setLlmProvider(storedProvider);
    const storedModels = parseStoredLlmModels(localStorage.getItem(LOCAL_STORAGE_LLM_MODELS_KEY));
    if (Object.keys(storedModels).length > 0) {
      setLlmModelsByProvider((prev) => ({ ...prev, ...storedModels }));
    }
    const storedSources = parseStoredLlmModelSources(
      localStorage.getItem(LOCAL_STORAGE_LLM_MODEL_SOURCE_KEY),
    );
    if (Object.keys(storedSources).length > 0) {
      setLlmModelSourceByProvider((prev) => ({ ...prev, ...storedSources }));
    }
  }, []);

  useEffect(() => {
    llmModelSourceRef.current = llmModelSourceByProvider;
  }, [llmModelSourceByProvider]);

  useEffect(() => {
    if (openAiApiKey) localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, openAiApiKey);
    else localStorage.removeItem(LOCAL_STORAGE_OPENAI_KEY);
  }, [openAiApiKey]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_LLM_PROVIDER_KEY, llmProvider);
  }, [llmProvider]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_LLM_MODELS_KEY, JSON.stringify(llmModelsByProvider));
  }, [llmModelsByProvider]);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_LLM_MODEL_SOURCE_KEY,
      JSON.stringify(llmModelSourceByProvider),
    );
  }, [llmModelSourceByProvider]);

  useEffect(() => {
    if (llmProvider !== "openrouter") return;

    let cancelled = false;

    async function loadOpenRouterModels() {
      setOpenRouterModelsLoading(true);
      setOpenRouterModelsError("");
      try {
        const res = await fetch("/api/openrouter/models");
        const data = (await res.json()) as OpenRouterModelsResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load models");
        }
        if (cancelled) return;

        setOpenRouterModelOptions(data.models);
        if (llmModelSourceRef.current.openrouter === "custom") return;

        setLlmModelsByProvider((prev) => {
          const current = prev.openrouter;
          if (data.models.some((model) => model.id === current)) return prev;
          const fallback =
            data.models.find((model) => model.id === "openrouter/free")?.id ?? data.models[0]?.id;
          if (!fallback) return prev;
          return { ...prev, openrouter: fallback };
        });
      } catch (error) {
        if (!cancelled) setOpenRouterModelsError((error as Error).message);
      } finally {
        if (!cancelled) setOpenRouterModelsLoading(false);
      }
    }

    void loadOpenRouterModels();

    return () => {
      cancelled = true;
    };
  }, [llmProvider, openRouterModelsRefreshToken]);

  function setLlmModel(model: string) {
    setLlmModelsByProvider((prev) => ({ ...prev, [llmProvider]: model }));
  }

  function setLlmModelSource(source: LlmModelSource) {
    setLlmModelSourceByProvider((prev) => ({ ...prev, [llmProvider]: source }));
  }

  function refreshOpenRouterModels() {
    setOpenRouterModelsRefreshToken((token) => token + 1);
  }

  function resetOutput() {
    setPseudocode("");
    setRawJson("");
    setPatch(null);
    setValidationErrors([]);
    setServerError("");
  }

  function persistDomain(nextDomain: Domain) {
    localStorage.setItem(LOCAL_STORAGE_DOMAIN_KEY, JSON.stringify(nextDomain));
  }

  function setDomainState(nextDomain: Domain, raw?: string) {
    setDomain(nextDomain);
    setDomainValidationErrors([]);
    setDomainError("");
    setDomainRawJson(raw ?? JSON.stringify(nextDomain, null, 2));
    persistDomain(nextDomain);
    resetOutput();
    lastCommittedDomainJson.current = JSON.stringify(nextDomain);
  }

  async function bootstrapDomain() {
    if (!domainPrompt.trim()) return;
    setDomainLoading(true);
    setDomainError("");
    setDomainValidationErrors([]);

    const body: DomainBootstrapRequest = {
      description: domainPrompt,
      openAiApiKey: openAiApiKey.trim() || undefined,
      llmProvider,
      llmModel: llmModel.trim() || undefined,
    };

    try {
      const res = await fetch("/api/domain/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: DomainBootstrapResponse = await res.json();
      if (data.error) setDomainError(data.error);
      if (data.rawJson) setDomainRawJson(data.rawJson);
      if (data.validation && !data.validation.ok) {
        setDomainValidationErrors(data.validation.errors);
      }
      if (data.domain) {
        setDomainState(data.domain, data.rawJson);
      }
    } catch (error) {
      setDomainError((error as Error).message);
    } finally {
      setDomainLoading(false);
    }
  }

  function clearDomain() {
    setDomain(null);
    setDomainRawJson("");
    setDomainPrompt("");
    setDomainValidationErrors([]);
    setDomainError("");
    localStorage.removeItem(LOCAL_STORAGE_DOMAIN_KEY);
    resetOutput();
    lastCommittedDomainJson.current = null;
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      const raw = domainRawJson.trim();
      if (!raw) {
        setDomainValidationErrors(domain ? ["Domain JSON cannot be empty"] : []);
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setDomainValidationErrors(["Domain JSON is not valid"]);
        return;
      }

      const validation = validateDomain(parsed);
      if (!validation.ok) {
        setDomainValidationErrors(validation.errors);
        return;
      }

      const next = validation.domain;
      const snapshot = JSON.stringify(next);
      if (snapshot === lastCommittedDomainJson.current) {
        setDomainValidationErrors([]);
        return;
      }

      lastCommittedDomainJson.current = snapshot;
      setDomain(next);
      setDomainValidationErrors([]);
      setDomainError("");
      persistDomain(next);
      resetOutput();
    }, 400);

    return () => window.clearTimeout(id);
  }, [domainRawJson, domain]);

  function applyPresetDomain(nextDomain: Domain) {
    setDomain(nextDomain);
    setDomainValidationErrors([]);
    setDomainError("");
    const raw = JSON.stringify(nextDomain, null, 2);
    setDomainRawJson(raw);
    persistDomain(nextDomain);
    lastCommittedDomainJson.current = JSON.stringify(nextDomain);
  }

  function selectPreset(presetId: string) {
    const preset = getStudioPresetById(presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setDomainPrompt(`Preset: ${preset.name}`);
    applyPresetDomain(preset.domain);
    setPrompt(preset.prompt);
    setMode(preset.mode);
    setValidationErrors([]);
    setServerError("");
    if (preset.demo) {
      setPseudocode(preset.demo.pseudocode);
      setRawJson(JSON.stringify(preset.demo.patch, null, 2));
      setPatch(preset.demo.patch);
      setActiveTab("graph");
    } else {
      setPseudocode("");
      setRawJson("");
      setPatch(null);
      setActiveTab("pseudocode");
    }
  }

  async function importDomainFromFile(file: File) {
    const fileContent = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      setDomainValidationErrors(["The selected file does not contain valid JSON"]);
      return;
    }

    const validation = validateDomain(parsed);
    if (!validation.ok) {
      setDomainValidationErrors(validation.errors);
      return;
    }

    setDomainState(validation.domain, JSON.stringify(validation.domain, null, 2));
  }

  async function handleDomainFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importDomainFromFile(file);
    event.target.value = "";
  }

  function triggerImportDomain() {
    importInputRef.current?.click();
  }

  function exportDomainToFile() {
    if (!domain) return;
    const blob = new Blob([JSON.stringify(domain, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${domain.id}.domain.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function generate(overrideMode?: GenerateMode) {
    if (!domain || !prompt.trim()) return;
    const effectiveMode = overrideMode ?? mode;
    setLoading(true);
    setServerError("");
    if (effectiveMode === "json") {
      setRawJson("");
      setPatch(null);
      setValidationErrors([]);
    } else {
      resetOutput();
    }

    const body: GenerateRequest = {
      prompt,
      mode: effectiveMode,
      pseudocode: effectiveMode === "json" ? pseudocode : undefined,
      domain,
      openAiApiKey: openAiApiKey.trim() || undefined,
      llmProvider,
      llmModel: llmModel.trim() || undefined,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: GenerateResponse = await res.json();

      if (data.error) setServerError(data.error);
      if (data.pseudocode) {
        setPseudocode(data.pseudocode);
        setActiveTab("pseudocode");
      }
      if (data.rawJson) {
        setRawJson(data.rawJson);
        setActiveTab("json");
      }
      if (data.validation && !data.validation.ok) {
        setValidationErrors(data.validation.errors);
      }
      if (data.patch) {
        setPatch(data.patch as Patch);
        setActiveTab("graph");
      }
    } catch (error) {
      setServerError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadExample(index: number) {
    if (!domain || domain.id !== "midi-poc") return;
    const example = EXAMPLES[index];
    setPrompt(example.prompt);
    setPseudocode(example.pseudocode);
    setRawJson(JSON.stringify(example.patch, null, 2));
    setPatch(example.patch);
    setValidationErrors([]);
    setServerError("");
    setActiveTab("graph");
  }

  return {
    state: {
      selectedPresetId,
      domainPrompt,
      domainRawJson,
      domain,
      domainValidationErrors,
      domainError,
      domainLoading,
      prompt,
      mode,
      loading,
      pseudocode,
      rawJson,
      patch,
      validationErrors,
      serverError,
      activeTab,
      openAiApiKey,
      showOpenAiApiKey,
      llmProvider,
      llmModel,
      llmModelSource,
      modelOptions,
      modelsLoading,
      modelsError,
      hasOutput: Boolean(pseudocode || rawJson || patch || serverError),
      canCompose: Boolean(domain),
      showMidiExamples: domain?.id === "midi-poc",
    },
    actions: {
      setDomainPrompt,
      setDomainRawJson,
      bootstrapDomain,
      clearDomain,
      selectPreset,
      triggerImportDomain,
      handleDomainFileInputChange,
      exportDomainToFile,
      setPrompt,
      setMode,
      generate,
      loadExample,
      setActiveTab,
      setPseudocode,
      setOpenAiApiKey,
      setLlmProvider,
      setLlmModel,
      setLlmModelSource,
      refreshOpenRouterModels,
      toggleOpenAiApiKeyVisibility: () => setShowOpenAiApiKey((value) => !value),
      clearOpenAiApiKey: () => setOpenAiApiKey(""),
    },
    refs: {
      importInputRef,
    },
  };
}
