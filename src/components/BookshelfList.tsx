import PanelHeader from './PanelHeader';
import { BOOKS } from '../data/books';

/** 2D fallback for the bookshelf (used on mobile / low-power). */
export default function BookshelfList() {
  const reading = BOOKS.filter((b) => b.status === 'reading');
  const read = BOOKS.filter((b) => b.status === 'read');

  return (
    <div>
      <PanelHeader eyebrow="On the shelf" title="Bookshelf" hebrew="ספרים" />

      {reading.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">
            Currently reading
          </p>
          {reading.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-[var(--color-accent)]/40 bg-white/[0.04] p-4"
            >
              <p className="font-semibold">{b.title}</p>
              <p className="text-sm text-ink-dim">{b.author}</p>
              <p className="mt-1 text-sm text-ink/80">{b.take}</p>
            </div>
          ))}
        </div>
      )}

      <ul className="divide-y divide-white/5">
        {read.map((b) => (
          <li key={b.title} className="flex items-start gap-3 py-3">
            <span
              className="mt-1 h-8 w-1.5 shrink-0 rounded-full"
              style={{ background: b.spineColor }}
              aria-hidden
            />
            <div className="flex-1">
              <p className="font-medium">
                {b.title}{' '}
                <span className="text-sm font-normal text-ink-dim">
                  · {b.author}
                </span>
              </p>
              <p className="text-sm text-ink/75">{b.take}</p>
            </div>
            <span className="shrink-0 text-sm text-[var(--color-accent)]">
              {'★'.repeat(b.rating)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
