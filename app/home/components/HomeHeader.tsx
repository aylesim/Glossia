import ThemeToggle from "@/app/components/theme-toggle";

export default function HomeHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)] px-5 py-3 sm:px-10">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
            Glossia
            <span className="font-normal text-[var(--fg-muted)]"> demo</span>
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-snug text-[var(--fg-muted)]">
            Natural language → domain JSON → flow → validated patch graph.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--fg-muted)]">
            <span className="font-serif text-xs font-medium tracking-[0.2em] text-[var(--fg)]">
              <a
                href="https://github.com/aylesim"
                target="_blank"
                rel="noopener noreferrer"
              >
                Aylesim
              </a>
            </span>
            <a
              href="https://github.com/aylesim/Glossia"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Glossia on GitHub"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-[var(--fg)]"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden={true}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
