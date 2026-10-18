import Link from "next/link";

export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2" aria-label="Glossia home">
      <span className="relative flex h-[18px] w-[18px] items-end justify-center gap-[2px] overflow-hidden rounded-[4px] bg-[var(--inverse)] px-[3px] pb-[3px]">
        <span className="h-[7px] w-[2px] rounded-[1px] bg-[var(--accent)]" />
        <span className="h-[11px] w-[2px] rounded-[1px] bg-[var(--accent)]" />
        <span className="h-[5px] w-[2px] rounded-[1px] bg-[var(--accent)]" />
      </span>
      <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--fg)]">glossia</span>
    </Link>
  );
}
