/**
 * Storytelling domain helpers.
 *
 * The model writes the beats and the scene. The continuity pass is
 * deterministic: word budget, point of view, beat anchors and a short cliché
 * list. Same posture as the research verifier, different artifact.
 */

export type StoryBeat = {
  id: string;
  label: string;
  /** A concrete phrase the scene is expected to contain. */
  anchor: string;
};

export type ContinuityCheck = {
  label: string;
  detail: string;
  passed: boolean;
};

export type ContinuityReport = {
  checks: ContinuityCheck[];
  passed: number;
  total: number;
  wordCount: number;
};

const BEAT_POOL: StoryBeat[] = [
  { id: "b1", label: "The ordinary world", anchor: "lamps" },
  { id: "b2", label: "The impossible door", anchor: "brass handle" },
  { id: "b3", label: "The choice", anchor: "threshold" },
  { id: "b4", label: "The return", anchor: "harbor" },
  { id: "b5", label: "The cost", anchor: "tide" },
];

const CLICHES = [
  "little did",
  "shivers down",
  "in that moment",
  "a testament to",
  "couldn't help but",
  "breath she didn't know",
  "heart pounded",
];

export function demoStoryBeats(_premise: string, count = 3): StoryBeat[] {
  return BEAT_POOL.slice(0, Math.max(2, Math.min(5, count))).map((beat) => ({ ...beat }));
}

export function demoStoryScene(
  _premise: string,
  beats: StoryBeat[],
  pov: "third" | "first" = "third",
  maxWords = 220,
): string {
  const first = pov === "first";
  const paragraphs: string[] = [];
  paragraphs.push(
    `The fog came in before dusk, and ${first ? "I" : "Mira"} counted the lamps twice because the second count disagreed with the first. ${first ? "I" : "She"} had kept this light for eleven winters, and the ritual had never failed: wick, glass, match, count.`,
  );
  paragraphs.push(
    `At the end of the pier stood a door ${first ? "I" : "she"} had never seen. It was green as a bottle, with a brass handle worn bright by hands that were not ${first ? "mine" : "hers"}. Beyond it, instead of water, there was a street of wet cobbles and a sky the color of a struck match.`,
  );
  if (beats.some((beat) => beat.id === "b3")) {
    paragraphs.push(
      `The fog pressed at ${first ? "my" : "her"} back. ${first ? "I" : "She"} thought of the lamp upstairs, still burning, and of all the ships that would not see it if ${first ? "I" : "she"} stepped across the threshold. Then ${first ? "I" : "she"} thought of the city, and the thought was not fear.`,
    );
  }
  if (beats.some((beat) => beat.id === "b4")) {
    paragraphs.push(
      `When ${first ? "I" : "she"} looked back, the harbor was gone. In its place was a second door, already open, and a voice on the other side that knew ${first ? "my" : "her"} name.`,
    );
  }
  if (beats.some((beat) => beat.id === "b5")) {
    paragraphs.push(
      `The tide came in through the doorway without wetting ${first ? "my" : "her"} boots. ${first ? "I" : "She"} understood the price then: the light would stay lit, but no one would remember who had kept it.`,
    );
  }

  const text = paragraphs.join("\n\n");
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function demoStoryRevision(scene: string): { critique: string; scene: string } {
  return {
    critique:
      "The ending states the theme twice. Cut the explanation and leave the image of the lit lamp.",
    scene: scene.trim(),
  };
}

function narration(scene: string): string {
  return scene.replace(/["“][^"”]*["”]/g, " ");
}

export function checkContinuity(
  scene: string,
  beats: StoryBeat[],
  options: { maxWords: number; pov: "third" | "first" },
): ContinuityReport {
  const words = scene.trim().split(/\s+/).filter(Boolean);
  const plain = narration(scene);
  const firstPerson = /\b(I|me|my|mine|we|us|our)\b/.test(plain);
  const thirdPerson = /\b(he|she|they|him|her|them|his|hers|their)\b/i.test(plain);

  const clean = CLICHES.filter((phrase) => plain.toLowerCase().includes(phrase));
  const missing = beats.filter((beat) => !scene.toLowerCase().includes(beat.anchor.toLowerCase()));

  const checks: ContinuityCheck[] = [
    {
      label: "word budget",
      detail: `${words.length}/${options.maxWords} words`,
      passed: words.length > 0 && words.length <= options.maxWords,
    },
    {
      label: "point of view",
      detail:
        options.pov === "first"
          ? firstPerson
            ? "first person detected"
            : "no first-person narration"
          : firstPerson
            ? "first-person pronoun in third-person narration"
            : "third person held",
      passed: options.pov === "first" ? firstPerson : !firstPerson && thirdPerson,
    },
    {
      label: "beat anchors",
      detail:
        missing.length === 0
          ? `${beats.length}/${beats.length} anchors present`
          : `missing: ${missing.map((beat) => beat.anchor).join(", ")}`,
      passed: beats.length > 0 && missing.length === 0,
    },
    {
      label: "cliché scan",
      detail: clean.length === 0 ? "none of the recorded clichés" : `found: ${clean.join(", ")}`,
      passed: clean.length === 0,
    },
  ];

  const passed = checks.filter((check) => check.passed).length;
  return { checks, passed, total: checks.length, wordCount: words.length };
}

export function sceneToMarkdown(
  scene: string,
  report: ContinuityReport,
  title: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(scene.trim());
  lines.push("");
  lines.push("## Continuity");
  lines.push("");
  for (const check of report.checks) {
    lines.push(`- ${check.passed ? "pass" : "fail"} · **${check.label}** — ${check.detail}`);
  }
  lines.push("");
  lines.push(
    `> ${report.passed}/${report.total} deterministic checks passed over ${report.wordCount} words. The check runs after the model, not inside it.`,
  );
  return lines.join("\n");
}
