import ThemeToggle from "@/app/components/theme-toggle";

export default function HomeHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)] px-5 py-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-mono text-lg font-semibold tracking-tight text-[var(--fg)]">glossia</h1>
            <span className="font-mono text-[10px] text-[var(--fg-subtle)]">schema-grounded graph generation</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href="https://github.com/aylesim/Glossia"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Glossia on GitHub"
              className="font-mono text-[10px] uppercase tracking-wide text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              github
            </a>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
