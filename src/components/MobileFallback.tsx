import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SECTIONS, getSection, SITE_TITLE, SITE_TAGLINE } from '../data/sections';
import { JOURNEY } from '../data/journey';
import AboutPanel from './AboutPanel';
import ProjectsPanel from './ProjectsPanel';
import ContactPanel from './ContactPanel';
import BookshelfList from './BookshelfList';
import MovieList from './MovieList';
import Clock from './Clock';

/**
 * Lightweight, WebGL-free path for phones / low-power devices. A clean 2D menu
 * to every section — a recruiter on a phone reaches everything with a fast first
 * paint and no 3D cost. 3D sections degrade to simple scrollable lists.
 */
export default function MobileFallback() {
  const [openId, setOpenId] = useState<string | null>(null);
  const section = getSection(openId);

  return (
    <main
      id="main-content"
      className="relative min-h-dvh overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_-10%,#0b1530_0%,#05070d_60%)] px-5 py-10"
    >
      <header className="mx-auto max-w-md text-center">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {SITE_TITLE}
        </h1>
        <p className="mt-2 text-sm text-ink-dim">{SITE_TAGLINE}</p>
        <div className="mt-4 flex justify-center">
          <Clock />
        </div>
      </header>

      {/* Life journey as a vertical timeline */}
      <section className="mx-auto mt-12 max-w-md">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
          A life in six moves
        </p>
        <ol className="relative ml-3 border-l border-white/10">
          {JOURNEY.map((s) => (
            <li key={s.id} className="mb-6 ml-5">
              <span className="absolute -left-[6px] mt-1.5 h-3 w-3 rounded-full border-2 border-[var(--color-space-deep)] bg-[var(--color-accent)]" />
              <h3 className="font-semibold leading-tight">{s.place}</h3>
              <p className="text-sm text-ink-dim">{s.region}</p>
              <p className="text-xs font-medium text-[var(--color-accent)]">
                {s.when}
              </p>
              {s.note && (
                <p className="mt-1 text-sm text-ink/70">{s.note}</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <nav className="mx-auto mt-12 grid max-w-md gap-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-colors active:bg-white/[0.06]"
            style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}
          >
            <span>
              <span className="block font-semibold" style={{ color: s.color }}>
                {s.label}
              </span>
              <span className="mt-0.5 block text-sm text-ink-dim">
                {s.blurb}
              </span>
            </span>
            <span className="text-ink-dim">→</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {section && (
          <motion.div
            className="fixed inset-0 z-30 overflow-y-auto bg-[var(--color-space-deep)]/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mx-auto min-h-full max-w-2xl px-5 py-16">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="fixed left-4 top-4 z-40 rounded-full border border-white/15 bg-[rgba(8,13,22,0.8)] px-4 py-2 text-sm"
              >
                ← Back
              </button>
              {section.id === 'about' && <AboutPanel />}
              {section.id === 'projects' && <ProjectsPanel />}
              {section.id === 'contact' && <ContactPanel />}
              {section.id === 'bookshelf' && <BookshelfList />}
              {section.id === 'movies' && <MovieList />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
