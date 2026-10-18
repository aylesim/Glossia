import type { Artifact } from "./types";

export type ArtifactOutcome = {
  kind: "verification" | "checks";
  label: string;
  passed: number;
  total: number;
  rate: number;
};

/**
 * One summary for every artifact shape.
 *
 * Research artifacts carry citation verification; the MIDI and story domains
 * carry their own deterministic checks. The studio and the run page read the
 * same number from here.
 */
export function artifactOutcome(artifact: Artifact | null | undefined): ArtifactOutcome | null {
  if (!artifact) return null;
  if (artifact.verification) {
    const { supportedClaims, totalClaims, supportRate } = artifact.verification;
    return {
      kind: "verification",
      label: "verified",
      passed: supportedClaims,
      total: totalClaims,
      rate: supportRate,
    };
  }
  const checks = artifact.checks ?? [];
  if (checks.length === 0) return null;
  const passed = checks.filter((check) => check.passed).length;
  return {
    kind: "checks",
    label: "checks",
    passed,
    total: checks.length,
    rate: passed / checks.length,
  };
}

export function artifactCheckLine(artifact: Artifact | null | undefined): string {
  const outcome = artifactOutcome(artifact);
  if (!outcome) return "n/a";
  return `${Math.round(outcome.rate * 100)}%`;
}
