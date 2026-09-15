import type { ReactNode } from 'react';

/**
 * The chrome around a live window: a hairline title bar (status dot, what
 * you're looking at, where it comes from), the picture, and an optional
 * console strip underneath for the controls. One frame for every project so
 * the page reads as a set of instruments rather than a pile of embeds.
 */
export default function WindowFrame({
  color,
  label,
  site,
  href,
  console: consoleSlot,
  children,
  className = '',
}: {
  color: string;
  /** what's live in the frame, e.g. "Live render" */
  label: string;
  /** where it comes from, e.g. "physica.fyi"; omitted for local scenes */
  site?: string | null;
  href?: string;
  console?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const external = href ? /^https?:\/\//i.test(href) : false;
  return (
    <figure
      className={`relative m-0 overflow-hidden rounded-2xl border border-white/10 bg-[#04060c] ${className}`}
      style={{
        boxShadow: `0 40px 120px -40px rgba(0,0,0,0.95), 0 30px 90px -50px ${color}66`,
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: color, animationDuration: '2.4s' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
          </span>
          <span className="truncate text-ink/85">{label}</span>
        </span>
        {site && href ? (
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="group flex shrink-0 items-center gap-1.5 transition hover:text-ink"
          >
            {site}
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              style={{ color }}
            >
              ↗
            </span>
          </a>
        ) : (
          site && <span className="shrink-0">{site}</span>
        )}
      </div>

      {children}

      {consoleSlot && (
        <div className="border-t border-white/[0.07] bg-white/[0.015] px-5 py-4">
          {consoleSlot}
        </div>
      )}
    </figure>
  );
}
