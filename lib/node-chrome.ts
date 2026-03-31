import type { DomainNode } from "@/lib/domain";

export function nodeHue(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

export function getNodeTypeChromeColors(typeId: string): { accent: string; tint: string } {
  const hue = nodeHue(typeId);
  return {
    accent: `hsl(${hue} 72% 48%)`,
    tint: `color-mix(in srgb, hsl(${hue} 60% 50%) 16%, var(--surface-raised))`,
  };
}

export type DomainNodeParam = DomainNode["params"][number];

export function formatParamLine(p: DomainNodeParam): string {
  let s = `${p.key}: ${p.valueType}`;
  if (p.default !== undefined) s += ` = ${String(p.default)}`;
  if (p.required) s += " *";
  return s;
}

export function formatParamLineForPatch(
  p: DomainNodeParam,
  instanceParams: Record<string, string | number | boolean> | undefined,
): string {
  const v = instanceParams?.[p.key];
  if (v !== undefined) return `${p.key}: ${String(v)}`;
  return formatParamLine(p);
}

export function buildDomainNodeTooltip(node: DomainNode): string {
  const lines = [node.description];
  if (node.params.length > 0) {
    lines.push(
      "",
      "Parameters:",
      ...node.params.map((p) => {
        const bits = [`${p.key}: ${p.valueType}`];
        if (p.required) bits.push("(required)");
        if (p.default !== undefined) bits.push(`= ${String(p.default)}`);
        return bits.join(" ");
      }),
    );
  } else {
    lines.push("", "No parameters");
  }
  return lines.join("\n");
}
