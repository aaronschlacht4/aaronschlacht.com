import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import AboutPanel from './AboutPanel';
import ProjectsPanel from './ProjectsPanel';
import ContactPanel from './ContactPanel';
import Loader from './Loader';

const BookshelfScene = lazy(() => import('../scenes/BookshelfScene'));
const MovieWallScene = lazy(() => import('../scenes/MovieWallScene'));

/**
 * Mounts children only while near the viewport (IntersectionObserver). Heavy 3D
 * canvases mount on approach and unmount when far away, so their GPU resources
 * are disposed — never paying for a scene you can't see.
 */
function InView({
  children,
  rootMargin = '300px',
  className,
}: {
  children: ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : null}
    </div>
  );
}

/** A standard immersive section: reveal-on-scroll, generous spacing. */
function SectionFrame({
  id,
  children,
  tinted = false,
}: {
  id: string;
  children: ReactNode;
  tinted?: boolean;
}) {
  return (
    <section
      id={id}
      className="relative flex min-h-screen items-center justify-center px-5 py-24 sm:px-8"
      style={{
        // Translucent so the fixed starfield carries through the whole page.
        background: tinted
          ? 'radial-gradient(120% 90% at 50% 0%, rgba(10,20,36,0.82) 0%, rgba(5,7,13,0.9) 65%)'
          : 'rgba(2,3,10,0.82)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl"
      >
        {children}
      </motion.div>
    </section>
  );
}

/** Full-bleed section that hosts a 3D scene with a heading overlay. */
function SceneSection({
  id,
  title,
  hebrew,
  children,
}: {
  id: string;
  title: string;
  hebrew?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative h-screen w-full bg-[#070b12]">
      <InView className="absolute inset-0" rootMargin="400px">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <Loader label={title} />
            </div>
          }
        >
          {children}
        </Suspense>
      </InView>

      <div className="pointer-events-none absolute left-0 top-0 p-6 sm:p-10">
        <h2
          className="text-3xl font-bold tracking-tight sm:text-5xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
          {hebrew && (
            <span className="ml-3 align-middle text-xl text-ink-dim" lang="he" dir="rtl">
              {hebrew}
            </span>
          )}
        </h2>
        <p className="mt-2 text-sm text-ink-dim">hover to explore</p>
      </div>
    </section>
  );
}

/**
 * Everything below the globe: a soft handoff line, then each section. Projects /
 * About / Contact are immersive 2D; Bookshelf and Movies are their own 3D scenes
 * that mount only when scrolled near.
 */
export default function Sections() {
  return (
    <>
      {/* Handoff cue from the globe into the page */}
      <div className="relative flex flex-col items-center bg-gradient-to-b from-transparent to-[var(--color-space-deep)] pb-10 pt-2 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-ink-dim">
          and now — the rest
        </p>
      </div>

      <SectionFrame id="projects" tinted>
        <ProjectsPanel />
      </SectionFrame>

      <SceneSection id="bookshelf" title="Bookshelf" hebrew="ספרים">
        <BookshelfScene />
      </SceneSection>

      <SceneSection id="movies" title="Movies" hebrew="סרטים">
        <MovieWallScene />
      </SceneSection>

      <SectionFrame id="about" tinted>
        <AboutPanel />
      </SectionFrame>

      <SectionFrame id="contact">
        <ContactPanel />
      </SectionFrame>

      <footer className="border-t border-white/5 py-10 text-center text-xs text-ink-dim">
        <p>Built with three.js · NASA Blue Marble textures (public domain)</p>
        <p className="mt-1 opacity-60">© Aaron Schlacht</p>
      </footer>
    </>
  );
}
