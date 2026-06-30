import PanelHeader from './PanelHeader';
import { MOVIES } from '../data/movies';

/** 2D fallback for the movie wall (used on mobile / low-power). */
export default function MovieList() {
  return (
    <div>
      <PanelHeader eyebrow="On the wall" title="Movies" hebrew="סרטים" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOVIES.map((m) => (
          <div
            key={m.title}
            className="overflow-hidden rounded-xl border border-white/10"
          >
            <div
              className="flex aspect-[2/3] items-end p-3"
              style={{
                background: m.poster
                  ? `center/cover url(${m.poster})`
                  : `linear-gradient(160deg, ${m.tint}, #05070d)`,
              }}
            >
              <div>
                <p className="text-sm font-semibold leading-tight">{m.title}</p>
                <p className="text-xs text-ink-dim">
                  {m.year} · {'★'.repeat(m.rating)}
                </p>
              </div>
            </div>
            <p className="px-3 py-2 text-xs text-ink/75">{m.take}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
