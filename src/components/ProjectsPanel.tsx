import PanelHeader from './PanelHeader';
import { PROJECTS } from '../data/projects';

/**
 * Projects gallery. Cards carry a title, blurb, tags, and optional links +
 * screenshot. Edit the list in src/data/projects.ts.
 */
export default function ProjectsPanel() {
  return (
    <div>
      <PanelHeader eyebrow="Selected work" title="Projects" hebrew="פרויקטים" />

      <div className="grid gap-4 sm:grid-cols-2">
        {PROJECTS.map((p) => (
          <article
            key={p.title}
            className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[var(--color-accent)]/40"
          >
            {p.image && (
              <div className="mb-3 aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/30">
                {/* TODO: drop screenshots in /public/covers or /public/posters */}
                <img
                  src={p.image}
                  alt={`${p.title} screenshot`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <h3 className="text-base font-semibold">{p.title}</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-ink/80">
              {p.blurb}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-ink-dim"
                >
                  {t}
                </span>
              ))}
            </div>
            {p.link && (
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                View →
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
