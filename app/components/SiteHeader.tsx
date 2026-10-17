import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import Wordmark from "./Wordmark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link
            href="/studio"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            Studio
          </Link>
          <Link
            href="/eval"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            Evals
          </Link>
          <a
            href="https://github.com/aylesim/Glossia"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
          >
            GitHub ↗
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/studio"
            className="hidden items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 sm:inline-flex"
          >
            Open studio
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
