import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * One interactive snippet: a picture on top (a live mini-scene, or anything
 * else), a control strip, then a numbered title and a caption. The card is
 * a small instrument — the accent hairline along its top edge is the same
 * mark the windows carry.
 */
export default function SnippetCard({
  index,
  color,
  title,
  caption,
  control,
  children,
}: {
  index: number;
  color: string;
  title: string;
  caption: string;
  control?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (index - 1) * 0.08 }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#04060c]"
      style={{ boxShadow: `0 30px 80px -40px rgba(0,0,0,0.9)` }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 z-10 h-px w-10"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
      />
      {children}
      {control && (
        <div className="border-t border-white/[0.07] bg-white/[0.015] px-4 py-3">
          {control}
        </div>
      )}
      <div className="flex flex-1 flex-col border-t border-white/[0.07] px-4 pb-5 pt-4">
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-[10px]"
            style={{ color, fontVariantNumeric: 'tabular-nums' }}
          >
            {String(index).padStart(2, '0')}
          </span>
          <h3
            className="text-[17px] font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h3>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/70">{caption}</p>
      </div>
    </motion.article>
  );
}
