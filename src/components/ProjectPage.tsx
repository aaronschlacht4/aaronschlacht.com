import { Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { SphereDef } from '../data/spheres';
import { projectUI } from '../projects/registry';
import { isExternal, siteLabel } from '../lib/links';
import { useScene } from '../state/useScene';

/**
 * A project's page. A plain document on off-white: the name, a line on it,
 * the live window into its 3D scene, then three sections — how it works,
 * the tools, why it exists. One column; headings sit in the margin.
 */
export default function ProjectPage({ def }: { def: SphereDef }) {
  const openSection = useScene((s) => s.openSection);
  const { Window } = projectUI(def.id);
  const live = isExternal(def.link.href);
  const site = siteLabel(def.link.href);

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[1120px] px-6 pb-28 pt-7 sm:px-10"
    >
      <button
        type="button"
        onClick={() => openSection(null)}
        className="group inline-flex items-center gap-1.5 text-[14px] text-[#7a7e88] transition hover:text-[#15171c]"
      >
        <span className="transition-transform group-hover:-translate-x-0.5">←</span>
        Back to orbit
      </button>

      <header className="mt-14 sm:mt-20">
        <p className="text-[15px] font-medium" style={{ color: def.tone }}>
          {def.tagline}
        </p>
        <h1 className="mt-2 text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#15171c]">
          {def.label}
        </h1>
        <p className="mt-6 max-w-[42rem] text-[19px] leading-[1.6] text-[#4a4e58]">
          {def.blurb}
        </p>
        {live ? (
          <a
            href={def.link.href}
            target="_blank"
            rel="noreferrer"
            className="group mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-[#15171c] underline decoration-[#c9c5bb] decoration-1 underline-offset-4 transition hover:decoration-[#15171c]"
          >
            {site ?? def.link.label}
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              style={{ color: def.tone }}
            >
              ↗
            </span>
          </a>
        ) : (
          <p className="mt-5 text-[15px] text-[#9a9ea8]">Not online yet</p>
        )}
      </header>

      <div className="mt-12 sm:mt-16">
        <Suspense
          fallback={
            <div className="grid aspect-[16/9] max-h-[68vh] w-full place-items-center rounded-xl border border-[#dcd8cf] bg-[#0a0c12] text-[14px] text-[#7a7e88]">
              Loading {def.label}…
            </div>
          }
        >
          <Window def={def} />
        </Suspense>
      </div>

      <Section title="How it works">
        {def.how.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Section>

      <Section title="Tools used">
        <ul className="divide-y divide-[#e6e3db] border-y border-[#e6e3db]">
          {def.tools.map((t) => (
            <li key={t.name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3">
              <span className="min-w-[12rem] font-medium text-[#15171c]">{t.name}</span>
              {t.note && <span className="text-[#6b6f78]">{t.note}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Why I created it">
        {def.why.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Section>
    </motion.main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-20 grid gap-6 border-t border-[#e6e3db] pt-8 md:grid-cols-12 md:gap-10">
      <h2 className="text-[15px] font-medium text-[#7a7e88] md:col-span-4">{title}</h2>
      <div className="space-y-5 text-[17px] leading-[1.7] text-[#2b2e36] md:col-span-8 md:max-w-[40rem]">
        {children}
      </div>
    </section>
  );
}
