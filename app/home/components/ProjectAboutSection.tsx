export default function ProjectAboutSection() {
  return (
    <section
      className="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-[var(--fg-muted)]"
      aria-labelledby="project-about-heading"
    >
      <h2 id="project-about-heading" className="sr-only">
        About Glossia
      </h2>
      <p>
        <span className="text-[var(--fg)]">Glossia</span> — plain-text domain + flow in, validated patch graph out.
        Domain JSON constrains node vocabulary; generation runs pseudocode then JSON; Zod validates before render.
      </p>
    </section>
  );
}
