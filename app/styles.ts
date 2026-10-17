export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-fg)] transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--fg)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

export const btnGhost = `inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

export const btnSmall = `inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

export const field = `w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors placeholder:text-[var(--fg-subtle)] focus-visible:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30`;

export const fieldMono = `${field} font-mono text-xs leading-relaxed`;

export const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]";

export const monoLabel = "font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]";

export const divider = "h-px w-full bg-[var(--border)]";

export const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-muted)]";
