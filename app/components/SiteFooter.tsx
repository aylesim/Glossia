import Link from "next/link";
import Wordmark from "./Wordmark";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md space-y-2">
          <Wordmark />
          <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
            A research prototype by{" "}
            <a
              href="https://github.com/aylesim"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--accent)]"
            >
              Alessandro Miracapillo
            </a>
            . Typed graphs with execution traces and structural evaluation. Not a product.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
          <Link href="/studio" className="hover:text-[var(--fg)]">
            Prototype
          </Link>
          <Link href="/eval" className="hover:text-[var(--fg)]">
            Evaluation
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
