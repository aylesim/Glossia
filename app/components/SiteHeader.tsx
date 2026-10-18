import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import Wordmark from "./Wordmark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-[1240px] items-center gap-5 px-4 sm:px-6">
        <Wordmark />
        <span className="hidden h-4 w-px bg-[var(--border)] md:block" />
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          <Link
            href="/studio"
            className="rounded-md px-2.5 py-1.5 text-[12px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            Prototype
          </Link>
          <Link
            href="/eval"
            className="rounded-md px-2.5 py-1.5 text-[12px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            Evaluation
          </Link>
          <a
            href="https://github.com/aylesim/Glossia"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2.5 py-1.5 text-[12px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            GitHub <span aria-hidden>↗</span>
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
