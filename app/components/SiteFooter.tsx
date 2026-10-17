import Link from "next/link";
import Wordmark from "./Wordmark";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md space-y-3">
          <Wordmark />
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            A proof of concept by{" "}
            <a
              href="https://github.com/aylesim"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--accent)]"
            >
              Alessandro Miracapillo
            </a>
            . Built to show what happens after the prompt: typed graphs, real execution, traces and evals.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
          <Link href="/studio" className="hover:text-[var(--fg)]">
            Studio
          </Link>
          <Link href="/eval" className="hover:text-[var(--fg)]">
            Evals
          </Link>
          <a href="/api/health" className="hover:text-[var(--fg)]">
            Health
          </a>
          <a
            href="https://github.com/aylesim/Glossia"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--fg)]"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
