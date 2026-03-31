import { Patch } from "./schema";

export type Example = {
  label: string;
  prompt: string;
  pseudocode: string;
  patch: Patch;
};

export const EXAMPLES: Example[] = [
  {
    label: "Pipeline filtro → quantize → dinamica",
    prompt:
      "Voglio prendere solo le note nel range do3–sol5, quantizzarle a sedicesimi e abbassare un po' la dinamica",
    pseudocode: `1. midi.in — ingresso del flusso
2. filter.channel (channel=1) — accetto solo canale 1
3. filter.pitch (minPitch=48, maxPitch=79) — range do3–sol5
4. time.quantize (grid="1/16") — griglia a sedicesimi
5. velocity.scale (factor=0.75) — attenuazione dinamica
6. midi.out — uscita`,
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
    label: "Trasposizione + rimappatura CC",
    prompt:
      "Trasponi tutto un'ottava su e rimappa il sustain (CC 64) al volume (CC 7)",
    pseudocode: `1. midi.in — ingresso del flusso
2. transform.transpose (semitones=12) — ottava superiore
3. cc.map (fromCc=64, toCc=7) — sustain → volume
4. midi.out — uscita`,
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
    label: "Solo note acute + quantize a quarti",
    prompt: "Filtra solo le note acute sopra il la4 e quantizza a quarti",
    pseudocode: `1. midi.in — ingresso del flusso
2. filter.pitch (minPitch=69, maxPitch=127) — solo note sopra la4
3. time.quantize (grid="1/4") — griglia a quarti
4. midi.out — uscita`,
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
