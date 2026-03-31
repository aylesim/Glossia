import { Patch } from "./schema";

export type Example = {
  label: string;
  prompt: string;
  pseudocode: string;
  patch: Patch;
};

export const EXAMPLES: Example[] = [
  {
    label: "Filter → quantize → dynamics pipeline",
    prompt:
      "Keep only notes in the C3-G5 range, quantize to 1/16, and reduce dynamics slightly",
    pseudocode: `1. midi.in - flow input
2. filter.channel (channel=1) - accept only channel 1
3. filter.pitch (minPitch=48, maxPitch=79) - C3-G5 range
4. time.quantize (grid="1/16") - sixteenth-note grid
5. velocity.scale (factor=0.75) - dynamics attenuation
6. midi.out - output`,
    patch: {
      version: "1",
      nodes: [
        { id: "in1", type: "midi.in", params: {} },
        { id: "ch1", type: "filter.channel", params: { channel: 1 } },
        { id: "fp1", type: "filter.pitch", params: { minPitch: 48, maxPitch: 79 } },
        { id: "q1", type: "time.quantize", params: { grid: "1/16" } },
        { id: "vs1", type: "velocity.scale", params: { factor: 0.75 } },
        { id: "out1", type: "midi.out", params: {} },
      ],
      edges: [
        { from: "in1", to: "ch1" },
        { from: "ch1", to: "fp1" },
        { from: "fp1", to: "q1" },
        { from: "q1", to: "vs1" },
        { from: "vs1", to: "out1" },
      ],
    },
  },
  {
    label: "Transpose + CC remap",
    prompt:
      "Transpose everything up one octave and remap sustain (CC 64) to volume (CC 7)",
    pseudocode: `1. midi.in - flow input
2. transform.transpose (semitones=12) - one octave up
3. cc.map (fromCc=64, toCc=7) - sustain to volume
4. midi.out - output`,
    patch: {
      version: "1",
      nodes: [
        { id: "in1", type: "midi.in", params: {} },
        { id: "tr1", type: "transform.transpose", params: { semitones: 12 } },
        { id: "cc1", type: "cc.map", params: { fromCc: 64, toCc: 7 } },
        { id: "out1", type: "midi.out", params: {} },
      ],
      edges: [
        { from: "in1", to: "tr1" },
        { from: "tr1", to: "cc1" },
        { from: "cc1", to: "out1" },
      ],
    },
  },
  {
    label: "High notes only + quarter-note quantize",
    prompt: "Keep only high notes above A4 and quantize to quarter notes",
    pseudocode: `1. midi.in - flow input
2. filter.pitch (minPitch=69, maxPitch=127) - only notes above A4
3. time.quantize (grid="1/4") - quarter-note grid
4. midi.out - output`,
    patch: {
      version: "1",
      nodes: [
        { id: "in1", type: "midi.in", params: {} },
        { id: "fp1", type: "filter.pitch", params: { minPitch: 69, maxPitch: 127 } },
        { id: "q1", type: "time.quantize", params: { grid: "1/4" } },
        { id: "out1", type: "midi.out", params: {} },
      ],
      edges: [
        { from: "in1", to: "fp1" },
        { from: "fp1", to: "q1" },
        { from: "q1", to: "out1" },
      ],
    },
  },
];
