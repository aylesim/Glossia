import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import EvalClient from "./EvalClient";

export const metadata: Metadata = {
  title: "Evaluation · Glossia",
  description:
    "Structural evaluation for LLM workflow compilation: validity, node recall, edge F1, repair attempts, latency and cost.",
};

export default function EvalPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main>
        <EvalClient />
      </main>
      <SiteFooter />
    </div>
  );
}
