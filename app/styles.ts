export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export const btnPrimary = `inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-3.5 py-2 text-[12px] font-medium text-[var(--inverse-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS}`;

export const btnSecondary = `inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[12px] font-medium text-[var(--fg)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS}`;

export const btnGhost = `inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS}`;

export const btnSmall = `inline-flex items-center justify-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS}`;

export const field = `w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--fg)] transition-colors placeholder:text-[var(--fg-subtle)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]`;

export const fieldMono = `${field} font-mono text-[11px] leading-relaxed`;

export const card = "rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]";

export const monoLabel = "font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]";

export const divider = "h-px w-full bg-[var(--border)]";

export const chip =
  "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-muted)]";
