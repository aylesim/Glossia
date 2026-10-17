import type { VerificationReport } from "@/lib/ir/types";

export type CorpusSource = {
  id: string;
  title: string;
  url: string;
  published: string;
  excerpt: string;
  text: string;
};

export type SourceDocument = {
  id: string;
  title: string;
  url: string;
  text: string;
};

export type Chunk = {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  text: string;
  index: number;
};

export type Evidence = {
  id: string;
  chunkId: string;
  sourceId: string;
  title: string;
  url: string;
  text: string;
  score: number;
};

export type Claim = {
  id: string;
  text: string;
  sourceId: string;
  quote: string;
  confidence: number;
};

export type OutlineSection = {
  id: string;
  title: string;
  claimIds: string[];
};

export type Outline = {
  title: string;
  sections: OutlineSection[];
};

export type DraftResult = {
  draft: string;
  critique?: string;
  revised?: boolean;
};

export type VerificationResult = {
  verified: string;
  report: VerificationReport;
};
