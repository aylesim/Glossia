import React from "react";

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[S\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${index++}`;
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-[var(--fg)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-[var(--code)] px-1 py-0.5 font-mono text-[0.9em] text-[var(--fg)]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        nodes.push(
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent)] underline decoration-[color-mix(in_srgb,var(--accent)_40%,transparent)] underline-offset-2 hover:decoration-[var(--accent)]"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(
          <span
            key={key}
            className="mx-0.5 inline-flex items-center rounded border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-1 font-mono text-[0.78em] text-[var(--accent)]"
            title={`Source ${token.slice(1, -1)}`}
          >
            {token}
          </span>,
        );
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderBlocks(markdown: string): React.ReactNode[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  const isBlockStart = (line: string) =>
    /^```/.test(line) ||
    /^#{1,3}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^---+$/.test(line);

  while (index < lines.length) {
    const line = lines[index]!;
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index]!)) {
        code.push(lines[index]!);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="my-3 overflow-auto rounded-md border border-[var(--border)] bg-[var(--code)] p-3 font-mono text-[10px] leading-5 text-[var(--fg)]"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1]!.length;
      const content = inline(heading[2]!, `h-${index}`);
      if (level === 1) {
        blocks.push(
          <h1 key={`h-${index}`} className="mb-4 text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[var(--fg)]">
            {content}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h-${index}`} className="mb-2.5 mt-7 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[var(--fg)]">
            {content}
          </h2>,
        );
      } else {
        blocks.push(
          <h3 key={`h-${index}`} className="mb-2 mt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
            {content}
          </h3>,
        );
      }
      index += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className="my-6 border-[var(--border)]" />);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]!)) {
        quote.push(lines[index]!.replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-3 border-l-2 border-[var(--border-strong)] pl-3 text-[12.5px] leading-6 text-[var(--fg-muted)]"
        >
          {inline(quote.join(" "), `q-${index}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-2.5 list-disc space-y-1.5 pl-5 text-[12.5px] leading-6 text-[var(--fg-muted)] marker:text-[var(--border-strong)]">
          {items.map((item, itemIndex) => (
            <li key={`li-${index}-${itemIndex}`}>{inline(item, `li-${index}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-2.5 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-6 text-[var(--fg-muted)] marker:font-mono marker:text-[var(--fg-subtle)]">
          {items.map((item, itemIndex) => (
            <li key={`oli-${index}-${itemIndex}`}>{inline(item, `oli-${index}-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index]!.trim() && !isBlockStart(lines[index]!)) {
      paragraph.push(lines[index]!);
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="my-2.5 text-[12.5px] leading-6 text-[var(--fg-muted)]">
        {inline(paragraph.join(" "), `p-${index}`)}
      </p>,
    );
  }

  return blocks;
}

export default function Markdown({ markdown, className = "" }: { markdown: string; className?: string }) {
  return <div className={className}>{renderBlocks(markdown)}</div>;
}
