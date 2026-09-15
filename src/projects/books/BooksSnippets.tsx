import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SphereDef } from '../../data/spheres';
import { BOOKS, type Book } from '../../data/books';
import SnippetCard from '../shared/SnippetCard';

/**
 * Three small interactive pieces cut from the shelf's data: the book on the
 * nightstand (flip it for the take), the ratings as a bar you can hover, and
 * a button that pulls a book at random.
 */

function Spine({ book, big = false }: { book: Book; big?: boolean }) {
  return (
    <div
      className={`flex items-end justify-center rounded-sm ${big ? 'h-40 w-12' : 'h-24 w-7'}`}
      style={{
        background: `linear-gradient(90deg, ${book.spineColor} 0%, ${book.spineColor} 70%, rgba(0,0,0,0.35) 100%)`,
        boxShadow: '0 12px 30px -12px rgba(0,0,0,0.9), inset 1px 0 0 rgba(255,255,255,0.12)',
      }}
    >
      <span
        className={`mb-3 font-semibold text-[#f3ead8] ${big ? 'text-[11px]' : 'text-[8px]'}`}
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.04em' }}
      >
        {book.title}
      </span>
    </div>
  );
}

function NightstandSnippet({ def }: { def: SphereDef }) {
  const book = BOOKS.find((b) => b.status === 'reading') ?? BOOKS[0];
  const [flipped, setFlipped] = useState(false);
  return (
    <SnippetCard
      index={1}
      color={def.color}
      title="On the nightstand"
      caption="Whatever's open right now sits pulled out on the shelf. Tap it for the note so far."
    >
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative flex aspect-[4/3] w-full items-center justify-center gap-6 bg-[radial-gradient(70%_80%_at_50%_100%,#141a26,#070b12)] px-6 text-left"
        aria-pressed={flipped}
      >
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ transformStyle: 'preserve-3d' }}>
          <Spine book={book} big />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: def.color }}>
            Currently reading
          </p>
          <AnimatePresence mode="wait" initial={false}>
            {flipped ? (
              <motion.p key="take" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-2 text-[13px] leading-relaxed text-ink/80">
                {book.take}
              </motion.p>
            ) : (
              <motion.div key="title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <p className="mt-2 text-[17px] font-semibold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {book.title}
                </p>
                <p className="mt-1 text-[12px] text-ink-dim">{book.author}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </SnippetCard>
  );
}

function RatingsSnippet({ def }: { def: SphereDef }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = useMemo(
    () => [5, 4, 3, 2, 1].map((stars) => ({ stars, books: BOOKS.filter((b) => b.rating === stars) })),
    [],
  );
  const max = Math.max(1, ...rows.map((r) => r.books.length));
  const shown = hover === null ? null : rows.find((r) => r.stars === hover);
  return (
    <SnippetCard
      index={2}
      color={def.color}
      title="By rating"
      caption="Every finished book gets a mark out of five. Hover a row to see who earned it."
    >
      <div className="relative flex aspect-[4/3] w-full flex-col justify-center gap-2 bg-[#070b12] px-6">
        {rows.map((r) => (
          <div
            key={r.stars}
            onMouseEnter={() => setHover(r.stars)}
            onMouseLeave={() => setHover(null)}
            className="flex cursor-default items-center gap-3"
          >
            <span className="w-9 shrink-0 font-mono text-[10px] text-ink-dim/70" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.stars}★
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-sm bg-white/[0.04]">
              <motion.div
                className="h-full"
                initial={{ width: 0 }}
                whileInView={{ width: `${(r.books.length / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: (5 - r.stars) * 0.06 }}
                style={{
                  background: hover === r.stars ? def.color : `${def.color}80`,
                  boxShadow: hover === r.stars ? `0 0 16px ${def.color}80` : 'none',
                }}
              />
            </div>
            <span className="w-4 shrink-0 text-right font-mono text-[10px] text-ink-dim" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.books.length}
            </span>
          </div>
        ))}
        <AnimatePresence>
          {shown && shown.books.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="pointer-events-none absolute inset-x-6 bottom-4 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ink/80"
            >
              {shown.books.map((b) => b.title).join(' · ')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SnippetCard>
  );
}

function PullOneSnippet({ def }: { def: SphereDef }) {
  const read = useMemo(() => BOOKS.filter((b) => b.status === 'read'), []);
  const [i, setI] = useState(0);
  const book = read[i % read.length];
  const next = () => setI((cur) => (cur + 1 + Math.floor(Math.random() * (read.length - 1))) % read.length);
  return (
    <SnippetCard
      index={3}
      color={def.color}
      title="Pull one off the shelf"
      caption="No algorithm, just a hand reaching for a spine. Each pull is a book I'd actually press on you."
      control={
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] text-ink transition hover:bg-white/[0.06]"
          style={{ borderColor: `${def.color}80` }}
        >
          Another <span style={{ color: def.color }}>↻</span>
        </button>
      }
    >
      <div className="relative flex aspect-[4/3] w-full items-center gap-5 overflow-hidden bg-[radial-gradient(70%_80%_at_50%_100%,#141a26,#070b12)] px-6">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={book.title}
            initial={{ y: 40, opacity: 0, rotate: -6 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -40, opacity: 0, rotate: 6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0"
          >
            <Spine book={book} big />
          </motion.div>
        </AnimatePresence>
        <div className="min-w-0 flex-1">
          <p className="text-[#f0c46b]" style={{ fontSize: 13 }}>
            {'★'.repeat(book.rating)}
            <span className="text-[#3a4252]">{'★'.repeat(5 - book.rating)}</span>
          </p>
          <p className="mt-1.5 text-[16px] font-semibold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {book.title}
          </p>
          <p className="text-[12px] text-ink-dim">{book.author}</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink/75">{book.take}</p>
        </div>
      </div>
    </SnippetCard>
  );
}

export default function BooksSnippets({ def }: { def: SphereDef }) {
  return (
    <>
      <NightstandSnippet def={def} />
      <RatingsSnippet def={def} />
      <PullOneSnippet def={def} />
    </>
  );
}
