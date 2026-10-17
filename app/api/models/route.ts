import { DOMAINS, EXECUTABLE_DOMAIN_IDS } from "@/lib/ir/domains";
import { MODELS } from "@/lib/llm/registry";
import type { ModelsResponse } from "@/lib/api-types";

export const dynamic = "force-static";

export function GET() {
  const response: ModelsResponse = {
    domains: DOMAINS.map((domain) => ({
      id: domain.id,
      version: domain.version,
      name: domain.name,
      description: domain.description,
      nodeCount: domain.nodeTypes.length,
      executable: EXECUTABLE_DOMAIN_IDS.has(domain.id),
    })),
    models: MODELS,
    defaultQuestion:
      "How should a team ship an LLM workflow to production without losing control? Build a cited brief covering evaluation, observability, human review and prompt injection.",
    demo: true,
  };
  return Response.json(response);
}
