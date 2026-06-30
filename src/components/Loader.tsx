/**
 * Minimal, on-brand loading indicator used as the <Suspense> fallback for lazy
 * 3D scenes and the initial canvas. A quiet orbiting dot — no spinner cliché.
 */
export default function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-ink-dim">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border border-white/10" />
        <span className="absolute inset-0 animate-spin rounded-full border-t border-[var(--color-accent)]" />
      </div>
      <span className="text-xs uppercase tracking-[0.3em] opacity-70">
        {label}
      </span>
    </div>
  );
}
