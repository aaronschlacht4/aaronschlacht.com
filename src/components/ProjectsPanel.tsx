import PanelHeader from './PanelHeader';
import { SPHERES } from '../data/spheres';
import { isExternal, siteLabel } from '../lib/links';

/**
 * Projects, for the 2D fallback: the same spheres the orbital hub shows, as
 * a flat list — name, the line on it, the link, and the tools. Same data as
 * the 3D project page (src/data/spheres.ts).
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
              <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{p.blurb}</p>
              {live ? (
                <a
                  href={p.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: p.color }}
                >
                  {site ?? p.link.label}
                  <span aria-hidden>↗</span>
                </a>
              ) : (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink-dim">
                  Not online yet
                </p>
              )}
              <p className="mt-3 text-xs text-ink-dim">
                {p.tools.map((t) => t.name).join(' · ')}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
