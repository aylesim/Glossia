import type { Metadata } from "next";
import StudioClient from "./StudioClient";

export const metadata: Metadata = {
  title: "Studio — Glossia",
  description:
    "Compile an intent into a typed graph, run it with traces and cost, inspect the artifact and its deterministic verification.",
};

export default function StudioPage() {
  return <StudioClient />;
}
