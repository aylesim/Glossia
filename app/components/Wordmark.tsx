import Link from "next/link";

export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-2" aria-label="Glossia home">
      <span className="relative inline-flex h-[18px] w-[18px] translate-y-[1px] items-center justify-center">
        <span className="absolute inset-0 rounded-[6px] border border-[var(--accent)]" />
        <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)] transition-transform group-hover:scale-125" />
      </span>
      <span className="font-mono text-[15px] font-semibold tracking-[-0.02em] text-[var(--fg)]">glossia</span>
      <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] sm:inline">
        workflow compiler
      </span>
    </Link>
  );
}
