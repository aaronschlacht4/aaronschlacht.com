import PanelHeader from './PanelHeader';
import { SPHERES } from '../data/spheres';
import { isExternal, siteLabel, whereLabel } from '../lib/links';

const external = { target: '_blank', rel: 'noreferrer' } as const;

/**
 * Projects, for the 2D fallback: the same spheres the orbital hub shows, as a
 * flat list. Each carries its title, the project's link, and the three pages
 * into it — one card per project, same data as the 3D section page
 * (src/data/spheres.ts).
 */
export default function ProjectsPanel() {
  return (
    <div>
      <PanelHeader eyebrow="Selected work" title="Projects" hebrew="פרויקטים" />

      <div className="space-y-4">
        {SPHERES.map((p) => {
          const live = isExternal(p.link.href);
          const site = siteLabel(p.link.href);
          return (
            <article
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.25em]"
                style={{ color: p.color }}
              >
                {p.tagline}
              </p>
              <h3
                className="mt-1.5 text-xl font-semibold tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {p.label}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/80">
                {p.blurb}
              </p>

              <a
                href={p.link.href}
                {...(live ? external : {})}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: p.color }}
              >
                {site ?? p.link.label}
                <span aria-hidden>{live ? '↗' : '→'}</span>
              </a>

              <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
                {p.pages.map((pg, i) => {
                  const pageLive = isExternal(pg.href);
                  const where = whereLabel(pg.href);
                  return (
                    <li key={pg.title}>
                      <a
                        href={pg.href}
                        {...(pageLive ? external : {})}
                        className="flex items-start gap-3 py-3 active:bg-white/[0.04]"
                      >
                        <span
                          className="pt-0.5 font-mono text-[11px]"
                          style={{
                            color: p.color,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {pg.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-dim">
                            {pg.blurb}
                          </span>
                          {where && (
                            <span className="mt-1 block truncate font-mono text-[10px] tracking-[0.15em] text-ink-dim/60">
                              {where}
                            </span>
                          )}
                        </span>
                        <span
                          aria-hidden
                          className="pt-0.5 text-sm"
                          style={{ color: p.color }}
                        >
                          {pageLive ? '↗' : '→'}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
