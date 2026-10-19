import { getDomain } from "./domains";

export type DomainProposal = {
  domainId: string;
  name: string;
  reason: string;
};

type Scoreboard = {
  id: string;
  score: number;
  reason: string;
};

function researchDefault(reason: string): DomainProposal {
  const domain = getDomain("research-brief");
  return {
    domainId: "research-brief",
    name: domain?.name ?? "Research brief",
    reason,
  };
}

export function proposeDomainFromIntent(intent: string): DomainProposal {
  const text = intent.trim().toLowerCase();
  if (text.length < 3) {
    return researchDefault("Default until the intent is a bit longer.");
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

  if (
    /\b(fairytale|fairy tale|fable|folktale|story|scene|narrat|premise|protagonist|dialogue|chapter|plot|wolf|dragon|princess|lighthouse|keeper)\b/.test(
      text,
    )
  ) {
    bump("story-scene", 3);
  }
  if (/\b(write (it )?as|third[- ]person|first[- ]person|tense|dramati)\b/.test(text)) {
    bump("story-scene", 2);
  }
  if (/\b(fiaba|racconto|scena|narrare)\b/.test(text)) {
    bump("story-scene", 3);
  }

  if (
    /\b(midi|transpose|semitone|quantize|quantise|pitch|velocity|dynamics|note|notes|c\d|g\d|phrase|tempo)\b/.test(
      text,
    )
  ) {
    bump("midi-remix", 4);
  }

  if (
    /\b(brief|cited|citation|evidence|corpus|retriev|claim|outline|verif|observability|eval|injection|production|workflow|ship)\b/.test(
      text,
    )
  ) {
    bump("research-brief", 2);
  }
  if (/\b(how should|build a cited|covering|research question)\b/.test(text)) {
    bump("research-brief", 3);
  }

  const words = text.split(/\s+/).length;
  if (words <= 18 && text.endsWith("?") && !/\b(story|fairytale|midi|brief|cited)\b/.test(text)) {
    bump("quick-answer", 2);
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top || top.score === 0) {
    return researchDefault("No strong signal — research brief is the default pipeline.");
  }

  const domain = getDomain(top.id);
  return {
    domainId: top.id,
    name: domain?.name ?? top.id,
    reason: top.reason,
  };
}
