/**
 * A tiny, deterministic MIDI phrase model.
 *
 * The point is not audio fidelity: it is a second domain where every step is
 * pure, the analyzer still types the graph, and the artifact comes with checks
 * that run after the node, not inside a model.
 */

export type MidiNote = {
  pitch: number;
  velocity: number;
  /** Onset in beats (quarter note = 1). */
  start: number;
};

export type MidiTransforms = {
  transpose?: number;
  minPitch?: number;
  maxPitch?: number;
  grid?: string;
  factor?: number;
  floor?: number;
  removed?: number;
};

export type MidiSignal = {
  notes: MidiNote[];
  source: string;
  transforms: MidiTransforms;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const GRID_BEATS: Record<string, number> = {
  "1/4": 1,
  "1/8": 0.5,
  "1/16": 0.25,
  "1/32": 0.125,
};

const PITCH_PATTERN = /^([A-Ga-g])([#b]?)(-?\d+)$/;

export function noteName(pitch: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(pitch)));
  return `${NOTE_NAMES[clamped % 12]}${Math.floor(clamped / 12) - 1}`;
}

export function parsePitch(value: string): number | null {
  const match = PITCH_PATTERN.exec(value.trim());
  if (!match) return null;
  const offset = NOTE_OFFSETS[`${match[1].toUpperCase()}${match[2]}`];
  if (offset === undefined) return null;
  const octave = Number(match[3]);
  const pitch = (octave + 1) * 12 + offset;
  return pitch >= 0 && pitch <= 127 ? pitch : null;
}

function roundBeat(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Parse `C4:96@0` tokens. A token without `@start` follows the previous one. */
export function parsePhrase(phrase: string): MidiSignal {
  const notes: MidiNote[] = [];
  let nextStart = 0;
  for (const token of phrase.split(/[\s,]+/).filter(Boolean)) {
    if (token === "|" || token === "-") continue;
    const [head, startRaw] = token.split("@");
    const [pitchRaw, velocityRaw] = (head ?? "").split(":");
    const pitch = parsePitch(pitchRaw ?? "");
    if (pitch === null) continue;
    const velocity = velocityRaw === undefined ? 90 : Number(velocityRaw);
    const start = startRaw === undefined ? nextStart : Number(startRaw);
    if (!Number.isFinite(velocity) || !Number.isFinite(start)) continue;
    notes.push({
      pitch,
      velocity: Math.max(1, Math.min(127, Math.round(velocity))),
      start: roundBeat(Math.max(0, start)),
    });
    nextStart = roundBeat(Math.max(0, start) + 0.25);
  }
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  return { notes, source: phrase.trim(), transforms: {} };
}

export function transposeSignal(signal: MidiSignal, semitones: number): MidiSignal {
  return {
    ...signal,
    notes: signal.notes.map((note) => ({
      ...note,
      pitch: Math.max(0, Math.min(127, note.pitch + semitones)),
    })),
    transforms: { ...signal.transforms, transpose: semitones },
  };
}

export function filterByPitch(signal: MidiSignal, minPitch: number, maxPitch: number): MidiSignal {
  const low = Math.min(minPitch, maxPitch);
  const high = Math.max(minPitch, maxPitch);
  const notes = signal.notes.filter((note) => note.pitch >= low && note.pitch <= high);
  return {
    ...signal,
    notes,
    transforms: {
      ...signal.transforms,
      minPitch: low,
      maxPitch: high,
      removed: (signal.transforms.removed ?? 0) + (signal.notes.length - notes.length),
    },
  };
}

export function gridBeats(grid: string): number {
  return GRID_BEATS[grid] ?? 0.25;
}

export function quantizeSignal(signal: MidiSignal, grid: string): MidiSignal {
  const step = gridBeats(grid);
  return {
    ...signal,
    notes: signal.notes.map((note) => ({
      ...note,
      start: roundBeat(Math.round(note.start / step) * step),
    })),
    transforms: { ...signal.transforms, grid },
  };
}

export function shapeVelocity(signal: MidiSignal, factor: number, floor: number): MidiSignal {
  const low = Math.max(1, Math.min(127, floor));
  return {
    ...signal,
    notes: signal.notes.map((note) => ({
      ...note,
      velocity: Math.max(low, Math.min(127, Math.round(note.velocity * factor))),
    })),
    transforms: { ...signal.transforms, factor, floor: low },
  };
}

export type MidiCheck = {
  label: string;
  detail: string;
  passed: boolean;
};

function isOnGrid(start: number, step: number): boolean {
  const ratio = start / step;
  return Math.abs(ratio - Math.round(ratio)) < 0.0001;
}

export function checkSignal(signal: MidiSignal): MidiCheck[] {
  const { notes, transforms } = signal;
  const checks: MidiCheck[] = [
    {
      label: "notes present",
      detail: `${notes.length} note${notes.length === 1 ? "" : "s"} after the chain`,
      passed: notes.length > 0,
    },
  ];

  if (transforms.minPitch !== undefined && transforms.maxPitch !== undefined) {
    const outside = notes.filter(
      (note) => note.pitch < transforms.minPitch! || note.pitch > transforms.maxPitch!,
    ).length;
    checks.push({
      label: "pitch range",
      detail: `${noteName(transforms.minPitch)}–${noteName(transforms.maxPitch)} · ${outside} outside`,
      passed: outside === 0,
    });
  }

  if (transforms.grid) {
    const step = gridBeats(transforms.grid);
    const off = notes.filter((note) => !isOnGrid(note.start, step)).length;
    checks.push({
      label: "grid alignment",
      detail: `1/${Math.round(1 / step * 4)} grid · ${off} off-grid`,
      passed: off === 0,
    });
  }

  if (transforms.floor !== undefined) {
    const below = notes.filter((note) => note.velocity < transforms.floor!).length;
    checks.push({
      label: "velocity floor",
      detail: `minimum ${transforms.floor} · ${below} below`,
      passed: below === 0,
    });
  }

  const ordered = notes.every((note, index) => index === 0 || note.start >= notes[index - 1]!.start);
  checks.push({
    label: "ordering",
    detail: ordered ? "onsets are monotonic" : "onsets jump backwards",
    passed: ordered,
  });

  return checks;
}

export function signalToMarkdown(signal: MidiSignal, title: string): string {
  const { notes, transforms } = signal;
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Source phrase:** \`${signal.source || "(empty)"}\``);
  lines.push("");
  const changes: string[] = [];
  if (transforms.transpose) changes.push(`transpose ${transforms.transpose > 0 ? "+" : ""}${transforms.transpose} st`);
  if (transforms.minPitch !== undefined && transforms.maxPitch !== undefined) {
    changes.push(`keep ${noteName(transforms.minPitch)}–${noteName(transforms.maxPitch)}`);
  }
  if (transforms.grid) changes.push(`quantize ${transforms.grid}`);
  if (transforms.factor !== undefined) changes.push(`velocity ×${transforms.factor}`);
  lines.push(`**Chain:** ${changes.length > 0 ? changes.join(" → ") : "pass-through"}`);
  lines.push("");
  lines.push("```text");
  lines.push("#   note   midi   velocity   start");
  notes.forEach((note, index) => {
    lines.push(
      `${String(index + 1).padStart(2)}  ${noteName(note.pitch).padEnd(4)}  ${String(note.pitch).padStart(4)}  ${String(note.velocity).padStart(8)}  ${String(note.start).padStart(5)}`,
    );
  });
  if (notes.length === 0) lines.push("—   —         —          —       —");
  lines.push("```");
  lines.push("");
  lines.push(
    `> ${notes.length} notes, ${transforms.removed ?? 0} removed by the pitch filter. Every transform is deterministic.`,
  );
  return lines.join("\n");
}
