"use client";

import { useState } from "react";
import type { Domain, Patch } from "@/lib/ir/types";
import GraphCanvas from "@/app/studio/components/GraphCanvas";
import type { StepView } from "@/app/studio/types";

export default function RunGraph({
  patch,
  domain,
  steps,
}: {
  patch: Patch;
  domain: Domain;
  steps: Record<string, StepView>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <GraphCanvas
      patch={patch}
      domain={domain}
      steps={steps}
      selectedNodeId={selected}
      onSelectNode={setSelected}
      readOnly
    />
  );
}
