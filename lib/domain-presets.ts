import type { GenerateMode } from "./api-types";
import { Domain, MIDI_DOMAIN_EXAMPLE } from "./domain";
import { EXAMPLES } from "./examples";
import type { Patch } from "./schema";

const IMAGE_PROCESSING_PRESET: Domain = {
  version: "1",
  id: "image-pipeline",
  name: "Image Processing Pipeline",
  description: "Pipeline for image processing with filters, transforms, and output.",
  semantics:
    "Nodes model an image-processing chain semantically. They do not execute real operations in this PoC runtime.",
  nodes: [
    {
      id: "image.in",
      name: "Image Input",
      description: "Initial image source.",
      inputs: [],
      outputs: [{ name: "image", description: "Image frame" }],
      params: [{ key: "source", valueType: "string", description: "Source identifier", required: false }],
    },
    {
      id: "image.filter",
      name: "Image Filter",
      description: "Applies a filter to the image.",
      inputs: [{ name: "image", description: "Input image frame" }],
      outputs: [{ name: "image", description: "Filtered frame" }],
      params: [
        { key: "kind", valueType: "string", description: "Filter type", required: true, default: "gaussian" },
        { key: "strength", valueType: "number", description: "Filter strength", required: false, default: 0.5 },
      ],
    },
    {
      id: "image.resize",
      name: "Resize",
      description: "Resizes the image.",
      inputs: [{ name: "image", description: "Input frame" }],
      outputs: [{ name: "image", description: "Resized frame" }],
      params: [
        { key: "width", valueType: "number", description: "Target width", required: true },
        { key: "height", valueType: "number", description: "Target height", required: true },
      ],
    },
    {
      id: "image.out",
      name: "Image Output",
      description: "Image pipeline output.",
      inputs: [{ name: "image", description: "Final frame" }],
      outputs: [],
      params: [],
    },
  ],
};

const TEXT_NLP_PRESET: Domain = {
  version: "1",
  id: "text-nlp",
  name: "Text NLP Chain",
  description: "NLP chain for text normalization, extraction, and classification.",
  semantics:
    "Nodes represent common NLP steps; the pipeline remains an abstract model in this PoC.",
  nodes: [
    {
      id: "text.in",
      name: "Text Input",
      description: "Input text document.",
      inputs: [],
      outputs: [{ name: "text", description: "Document" }],
      params: [],
    },
    {
      id: "text.normalize",
      name: "Normalize",
      description: "Normalizes text.",
      inputs: [{ name: "text", description: "Input document" }],
      outputs: [{ name: "text", description: "Normalized document" }],
      params: [
        { key: "lowercase", valueType: "boolean", description: "Convert to lowercase", required: false, default: true },
        { key: "removePunctuation", valueType: "boolean", description: "Remove punctuation", required: false, default: true },
      ],
    },
    {
      id: "text.embed",
      name: "Embedding",
      description: "Computes text vector embeddings.",
      inputs: [{ name: "text", description: "Input document" }],
      outputs: [{ name: "vector", description: "Vector embedding" }],
      params: [{ key: "model", valueType: "string", description: "Embedding model", required: true, default: "small" }],
    },
    {
      id: "text.classify",
      name: "Classifier",
      description: "Classifies the document.",
      inputs: [{ name: "vector", description: "Input embedding" }],
      outputs: [{ name: "label", description: "Class label" }],
      params: [{ key: "labels", valueType: "string", description: "Comma-separated labels list", required: true }],
    },
    {
      id: "text.out",
      name: "Text Output",
      description: "NLP chain output.",
      inputs: [{ name: "label", description: "Final classification" }],
      outputs: [],
      params: [],
    },
  ],
};

const MODULAR_SYNTH_PRESET: Domain = {
  version: "1",
  id: "modular-synth",
  name: "Modular Synth",
  description: "Modular synthesizer domain with oscillators, filters, and audio output.",
  semantics:
    "Nodes represent virtual modules and CV/audio connections; no real synthesis happens in this PoC.",
  nodes: [
    {
      id: "synth.osc",
      name: "Oscillator",
      description: "Periodic waveform generator.",
      inputs: [{ name: "pitch_cv", description: "Pitch control voltage" }],
      outputs: [{ name: "audio", description: "Oscillator audio signal" }],
      params: [
        { key: "waveform", valueType: "string", description: "Waveform type", required: true, default: "saw" },
        { key: "detune", valueType: "number", description: "Detune in semitones", required: false, default: 0 },
      ],
    },
    {
      id: "synth.filter",
      name: "Filter",
      description: "Low-pass/high-pass audio filter.",
      inputs: [
        { name: "audio", description: "Input audio" },
        { name: "cutoff_cv", description: "Cutoff control" },
      ],
      outputs: [{ name: "audio", description: "Filtered audio" }],
      params: [
        { key: "mode", valueType: "string", description: "lowpass/highpass/bandpass", required: true, default: "lowpass" },
        { key: "resonance", valueType: "number", description: "Filter resonance", required: false, default: 0.4 },
      ],
    },
    {
      id: "synth.env",
      name: "Envelope",
      description: "ADSR envelope generator.",
      inputs: [{ name: "gate", description: "Input gate signal" }],
      outputs: [{ name: "cv", description: "Control voltage ADSR" }],
      params: [
        { key: "attack", valueType: "number", description: "Attack time", required: true, default: 0.01 },
        { key: "decay", valueType: "number", description: "Decay time", required: true, default: 0.2 },
        { key: "sustain", valueType: "number", description: "Sustain level", required: true, default: 0.7 },
        { key: "release", valueType: "number", description: "Release time", required: true, default: 0.3 },
      ],
    },
    {
      id: "synth.out",
      name: "Audio Output",
      description: "Final audio output.",
      inputs: [{ name: "audio", description: "Final audio" }],
      outputs: [],
      params: [],
    },
  ],
};

export type StudioPreset = {
  id: string;
  name: string;
  domain: Domain;
  prompt: string;
  mode: GenerateMode;
  demo: {
    pseudocode: string;
    patch: Patch;
  };
};

const midiExample0 = EXAMPLES[0]!;

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: MIDI_DOMAIN_EXAMPLE.id,
    name: MIDI_DOMAIN_EXAMPLE.name,
    domain: MIDI_DOMAIN_EXAMPLE,
    prompt: midiExample0.prompt,
    mode: "full",
    demo: {
      pseudocode: midiExample0.pseudocode,
      patch: midiExample0.patch,
    },
  },
  {
    id: IMAGE_PROCESSING_PRESET.id,
    name: IMAGE_PROCESSING_PRESET.name,
    domain: IMAGE_PROCESSING_PRESET,
    prompt:
      "Load an image from source camera, apply a gaussian filter with strength 0.45, resize to 1280 by 720, then write to the image output.",
    mode: "full",
    demo: {
      pseudocode: `1. image.in (source=camera) - image input
2. image.filter (kind=gaussian, strength=0.45) - gaussian blur
3. image.resize (width=1280, height=720) - HD resize
4. image.out - image output`,
      patch: {
        version: "1",
        nodes: [
          { id: "in1", type: "image.in", params: { source: "camera" } },
          { id: "flt1", type: "image.filter", params: { kind: "gaussian", strength: 0.45 } },
          { id: "rsz1", type: "image.resize", params: { width: 1280, height: 720 } },
          { id: "out1", type: "image.out", params: {} },
        ],
        edges: [
          { from: "in1", to: "flt1" },
          { from: "flt1", to: "rsz1" },
          { from: "rsz1", to: "out1" },
        ],
      },
    },
  },
  {
    id: TEXT_NLP_PRESET.id,
    name: TEXT_NLP_PRESET.name,
    domain: TEXT_NLP_PRESET,
    prompt:
      "Normalize text with lowercase and punctuation removal, compute embeddings with model small, then classify with labels urgent,routine,spam.",
    mode: "full",
    demo: {
      pseudocode: `1. text.in - document input
2. text.normalize (lowercase=true, removePunctuation=true) - text cleanup
3. text.embed (model=small) - vector embedding
4. text.classify (labels=urgent,routine,spam) - label assignment
5. text.out - classification output`,
      patch: {
        version: "1",
        nodes: [
          { id: "in1", type: "text.in", params: {} },
          {
            id: "norm1",
            type: "text.normalize",
            params: { lowercase: true, removePunctuation: true },
          },
          { id: "emb1", type: "text.embed", params: { model: "small" } },
          { id: "cls1", type: "text.classify", params: { labels: "urgent,routine,spam" } },
          { id: "out1", type: "text.out", params: {} },
        ],
        edges: [
          { from: "in1", to: "norm1" },
          { from: "norm1", to: "emb1" },
          { from: "emb1", to: "cls1" },
          { from: "cls1", to: "out1" },
        ],
      },
    },
  },
  {
    id: MODULAR_SYNTH_PRESET.id,
    name: MODULAR_SYNTH_PRESET.name,
    domain: MODULAR_SYNTH_PRESET,
    prompt:
      "Patch saw oscillator through lowpass filter with cutoff CV and resonance 0.45, shape with ADSR envelope on gate, into the audio output.",
    mode: "full",
    demo: {
      pseudocode: `1. synth.osc (waveform=saw) - saw oscillator
2. synth.env (attack=0.01, decay=0.2, sustain=0.7, release=0.3) - ADSR envelope
3. synth.filter (mode=lowpass, resonance=0.45) - lowpass with cutoff CV
4. synth.out - audio output`,
      patch: {
        version: "1",
        nodes: [
          { id: "osc1", type: "synth.osc", params: { waveform: "saw", detune: 0 } },
          {
            id: "env1",
            type: "synth.env",
            params: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
          },
          { id: "flt1", type: "synth.filter", params: { mode: "lowpass", resonance: 0.45 } },
          { id: "out1", type: "synth.out", params: {} },
        ],
        edges: [
          { from: "osc1", to: "flt1", toPort: "audio" },
          { from: "env1", to: "flt1", fromPort: "cv", toPort: "cutoff_cv" },
          { from: "flt1", to: "out1" },
        ],
      },
    },
  },
];

export const DOMAIN_PRESETS: Domain[] = STUDIO_PRESETS.map((preset) => preset.domain);

export function getStudioPresetById(id: string): StudioPreset | undefined {
  return STUDIO_PRESETS.find((preset) => preset.id === id);
}

export function getDomainPresetById(id: string): Domain | undefined {
  return getStudioPresetById(id)?.domain;
}
