import { getDomain } from "./domains";

export type ProposalConfidence = "high" | "low" | "unsupported";

export type DomainProposal = {
  domainId: string | null;
  name: string;
  reason: string;
  confidence: ProposalConfidence;
  closestDomainId?: string;
};

export function proposeDomainFromIntent(_intent: string): DomainProposal {
  const domain = getDomain("open-intent");
  return {
    domainId: "open-intent",
    name: domain?.name ?? "Open intent",
    reason: "Glossia compiles a custom graph for your intent, then runs it.",
    confidence: "high",
  };
}
