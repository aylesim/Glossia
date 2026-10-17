import type { Domain, NodeType, Port } from "./types";

/** Pure lookups safe to import from client components (no Zod, no Node APIs). */
export function getNodeType(domain: Domain, typeId: string): NodeType | undefined {
  return domain.nodeTypes.find((node) => node.id === typeId);
}

export function portOf(ports: Port[], name: string): Port | undefined {
  return ports.find((port) => port.name === name);
}
