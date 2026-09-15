import type { SphereDef } from '../../data/spheres';
import SnippetCard from './SnippetCard';

/**
 * For a project whose site isn't live yet: the three pages it will have,
 * as quiet placeholder cards. Same card, so the page keeps its rhythm; a
 * dashed frame where the picture would be, so nothing pretends to be live.
 */
export default function SoonSnippets({ def }: { def: SphereDef }) {
  return (
    <>
      {def.pages.map((pg, i) => (
        <SnippetCard key={pg.title} index={i + 1} color={def.color} title={pg.title} caption={pg.blurb}>
          <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-[#070b12] p-5">
            <div
              className="flex h-full w-full items-center justify-center rounded-xl border border-dashed font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim/60"
              style={{ borderColor: `${def.color}40` }}
            >
              in the works
            </div>
          </div>
        </SnippetCard>
      ))}
    </>
  );
}
