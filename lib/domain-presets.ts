import { Domain, MIDI_DOMAIN_EXAMPLE } from "./domain";

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

export const DOMAIN_PRESETS: Domain[] = [
  MIDI_DOMAIN_EXAMPLE,
  IMAGE_PROCESSING_PRESET,
  TEXT_NLP_PRESET,
  MODULAR_SYNTH_PRESET,
];

export function getDomainPresetById(id: string): Domain | undefined {
  return DOMAIN_PRESETS.find((preset) => preset.id === id);
}
