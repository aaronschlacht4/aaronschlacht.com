/** Shared header for overlay panels: eyebrow + title + optional Hebrew. */
export default function PanelHeader({
  eyebrow,
  title,
  hebrew,
}: {
  eyebrow: string;
  title: string;
  hebrew?: string;
}) {
  return (
    <header className="mb-6 border-b border-white/10 pb-4">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
        {hebrew && (
          <span
            className="ml-3 align-middle text-xl text-ink-dim"
            lang="he"
            dir="rtl"
          >
            {hebrew}
          </span>
        )}
      </h2>
    </header>
  );
}
