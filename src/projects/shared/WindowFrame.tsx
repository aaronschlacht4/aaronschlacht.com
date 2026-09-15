import type { ReactNode } from 'react';

/**
 * The frame around a live window: a hairline title bar (status dot, what
 * you're looking at, where it comes from), the picture, and an optional
 * console strip underneath for the controls. Light chrome on the off-white
 * page; the picture inside is whatever the scene paints.
 */
export default function WindowFrame({
  tone,
  label,
  site,
  href,
  console: consoleSlot,
  children,
}: {
  /** accent for the status dot and the link arrow */
  tone: string;
  /** what's live in the frame, e.g. "Live render" */
  label: string;
  /** where it comes from, e.g. "physica.fyi"; omitted for local scenes */
  site?: string | null;
  href?: string;
  console?: ReactNode;
  children: ReactNode;
}) {
  const external = href ? /^https?:\/\//i.test(href) : false;
  return (
    <figure className="m-0 overflow-hidden rounded-xl border border-[#dcd8cf] bg-white shadow-[0_24px_60px_-32px_rgba(20,22,30,0.35)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#eceae4] px-4 py-2.5 text-[13px] text-[#7a7e88]">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: tone, boxShadow: `0 0 0 3px ${tone}22` }}
          />
          <span className="truncate text-[#3d4049]">{label}</span>
        </span>
        {site &&
          (href ? (
            <a
              href={href}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="group flex shrink-0 items-center gap-1.5 transition hover:text-[#15171c]"
            >
              {site}
              <span
                aria-hidden
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ color: tone }}
              >
                ↗
              </span>
            </a>
          ) : (
            <span className="shrink-0">{site}</span>
          ))}
      </div>

      {children}

      {consoleSlot && (
        <div className="border-t border-[#eceae4] bg-[#faf9f6] px-5 py-4">{consoleSlot}</div>
      )}
    </figure>
  );
}
