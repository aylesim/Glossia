import { getDomain } from "./domains";

export type ProposalConfidence = "high" | "low" | "unsupported";

export type DomainProposal = {
  domainId: string | null;
  name: string;
  reason: string;
  confidence: ProposalConfidence;
  closestDomainId?: string;
};

type Scoreboard = {
  id: string;
  score: number;
  reason: string;
};

const MIN_HIGH_SCORE = 3;
const MIN_LEAD = 2;

function proposalFor(id: string, reason: string, confidence: ProposalConfidence): DomainProposal {
  const domain = getDomain(id);
  return {
    domainId: id,
    name: domain?.name ?? id,
    reason,
    confidence,
  };
}

function isMediaEditIntent(text: string): boolean {
  const hasMedia = /\b(photo|picture|image|pic|selfie|screenshot|jpeg|png|portrait)\b/.test(text);
  const hasEdit =
    /\b(edit|retouch|enhance|upscale|polish|professional|filter|color grade|remove background)\b/.test(
      text,
    );
  const hasTool = /\b(photoshop|lightroom|midjourney|dall-?e|stable diffusion|figma)\b/.test(text);
  return (hasMedia && hasEdit) || hasTool;
}

function isNarrativeIntent(text: string): boolean {
  if (/\b(company|brand|investor|origin|customer) story\b/.test(text)) return false;
  if (
    /\b(fairytale|fairy tale|fable|folktale|narrat|protagonist|dialogue|chapter|plot|wolf|dragon|princess|lighthouse keeper)\b/.test(
      text,
    )
  ) {
    return true;
  }
  if (/\b(write (a |the )?story|short story|story scene|tell a story|scene draft)\b/.test(text)) {
    return true;
  }
  if (/\b(write (it )?as|third[- ]person|first[- ]person|dramatic scene)\b/.test(text)) {
    return true;
  }
  if (/\b(fiaba|racconto|scena narrativa|raccontare una storia)\b/.test(text)) {
    return true;
  }
  if (/\bstory\b/.test(text) && /\b(scene|character|once upon|chapter|narrator)\b/.test(text)) {
    return true;
  }
  return false;
}

export function proposeDomainFromIntent(intent: string): DomainProposal {
  const text = intent.trim().toLowerCase();
  if (text.length < 3) {
    return {
      domainId: "research-brief",
      name: getDomain("research-brief")?.name ?? "Research brief",
      reason: "Add a few more words so Glossia can read the intent.",
      confidence: "low",
    };
  }

  if (isMediaEditIntent(text)) {
    return {
      domainId: null,
      name: "No matching pipeline",
      reason:
        "Image or media editing is not in the built-in catalog yet. Use story, research, MIDI, quick answer, or import a custom domain.",
      confidence: "unsupported",
      closestDomainId: "quick-answer",
    };
  }

  const scores: Scoreboard[] = [
    { id: "story-scene", score: 0, reason: "Narrative or scene-shaped intent" },
    { id: "midi-remix", score: 0, reason: "Note pipeline or MIDI transforms" },
    { id: "research-brief", score: 0, reason: "Evidence-backed brief or research workflow" },
    { id: "quick-answer", score: 0, reason: "Short direct answer" },
  ];

  const bump = (id: string, points: number) => {
    const entry = scores.find((item) => item.id === id);
    if (entry) entry.score += points;
  };

  if (isNarrativeIntent(text)) bump("story-scene", 4);

  if (
    /\b(midi|transpose|semitone|quantize|quantise|pitch|velocity|dynamics|c\d|g\d|tempo)\b/.test(text) &&
    /\b(note|notes|phrase)\b/.test(text)
  ) {
    bump("midi-remix", 5);
  } else if (/\b(midi|transpose|semitone|quantize|quantise)\b/.test(text)) {
    bump("midi-remix", 4);
  }

  if (
    /\b(brief|cited|citation|evidence|corpus|retriev|claim|outline|verif|observability|eval|injection)\b/.test(
      text,
    )
  ) {
    bump("research-brief", 2);
  }
  if (/\b(how should|build a cited|covering|research question|ship .* production|llm workflow)\b/.test(text)) {
    bump("research-brief", 4);
  }
  if (/\b(professional|polish|improve)\b/.test(text) && /\b(workflow|process|system|team)\b/.test(text)) {
    bump("research-brief", 1);
  }

  const words = text.split(/\s+/).length;
  if (words <= 22 && text.endsWith("?") && !isNarrativeIntent(text)) {
    bump("quick-answer", 3);
  }
  if (words <= 14 && !isNarrativeIntent(text) && scores.every((item) => item.score === 0)) {
    bump("quick-answer", 2);
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const runner = scores[1];
  if (!top || top.score === 0) {
    return proposalFor(
      "quick-answer",
      "No specialized pipeline matched; quick answer is the closest built-in fit.",
      "low",
    );
  }

  const lead = top.score - (runner?.score ?? 0);
  const confidence: ProposalConfidence =
    top.score >= MIN_HIGH_SCORE && lead >= MIN_LEAD ? "high" : "low";

  return proposalFor(top.id, top.reason, confidence);
}
