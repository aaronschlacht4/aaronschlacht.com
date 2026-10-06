import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SphereDef } from '../../data/spheres';
import WindowFrame from '../shared/WindowFrame';
import { Toggle } from '../shared/Dial';
import { prefersReducedMotion } from '../../lib/env';
import { ClaudeMark } from '../mercurio/icons';
import { CrownGlyph, HighlighterGlyph, OpenBookGlyph, ShelfGlyph, ThreadGlyph } from './icons';
import { SCENARIOS, type Reply } from './scenarios';
import { SHELF } from './shelf';

const SalonStage = lazy(() => import('./SalonStage'));

/**
 * A demo of The Modern Salon's core loop, played on a loop: a book comes
 * off the 3D shelf and opens, a reader highlights a passage, the discussion
 * pinned to that passage fills in and its votes tick up, a VIP's note
 * appears in the margin, and Claude answers a question about the passage.
 *
 * The left half is a real three.js scene — the app's own covers on built
 * books; drag to turn the shelf, click a book that has a story to open it.
 * The VIP switch is real too: readers can follow a book with or without a
 * thinker in the margin, and turning it off takes the note and its crown off
 * the page.
 */

// Stages: 0 shelf · 1 taken down · 2 opened · 3 highlighted · 4 discussion ·
// 5 VIP · 6 asked Claude · 7 closing
const AT = { take: 900, open: 1800, highlight: 4300, discuss: 6000 };
const REPLY_MS = 750;
const VIP_PAUSE = 1500;
const ASK_PAUSE = 1700;
const WORD_MS = 42;
const HOLD_MS = 3800;
const CLOSE_MS = 2900;

const STEP_TITLES = [
  'On your shelf',
  'Taken off the shelf',
  'Opened in the reader',
  'Passage highlighted',
  'Discussion pinned to it',
  'VIP in the margin',
  'Asked Claude about it',
  'Back on the shelf',
];

const flatten = (rs: Reply[], depth = 0): { r: Reply; depth: number }[] =>
  rs.flatMap((r) => [{ r, depth }, ...flatten(r.replies ?? [], depth + 1)]);

const PICKABLE = SCENARIOS.map((s) => s.bookId);

export default function BooksWindow({ def }: { def: SphereDef }) {
  const [vip, setVip] = useState(true);
  const [i, setI] = useState(0);
  // Bumped by a pick, so choosing the book that's already open replays it.
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(0);
  const [shown, setShown] = useState(0); // replies revealed
  const [words, setWords] = useState(0); // answer words streamed
  const [reduced] = useState(prefersReducedMotion);
  const scrollRef = useRef<HTMLDivElement>(null);

  const s = SCENARIOS[i];
  const thread = flatten(s.replies);
  const answerWords = s.answer.split(' ');
  const book = SHELF.find((b) => b.id === s.bookId)!;

  // One book: take it down, open it, walk the stages, hold, put it back.
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };
    const sc = SCENARIOS[i];
    const n = flatten(sc.replies).length;
    const total = sc.answer.split(' ').length;
    const next = () => setI((k) => (k + 1) % SCENARIOS.length);

    setStage(0);
    setShown(0);
    setWords(0);

    if (reduced) {
      // Everything at once; the scene snaps instead of travelling.
      setStage(6);
      setShown(n);
      setWords(total);
      at(HOLD_MS * 3, next);
    } else {
      at(AT.take, () => setStage(1));
      at(AT.open, () => setStage(2));
      at(AT.highlight, () => setStage(3));
      at(AT.discuss, () => setStage(4));
      let t = AT.discuss + 500;
      for (let k = 1; k <= n; k++) {
        at(t, () => setShown(k));
        t += REPLY_MS;
      }
      t += VIP_PAUSE - REPLY_MS;
      at(t, () => setStage(5));
      t += ASK_PAUSE;
      at(t, () => setStage(6));
      t += 700;
      for (let w = 1; w <= total; w++) at(t + w * WORD_MS, () => setWords(w));
      t += total * WORD_MS + HOLD_MS;
      at(t, () => setStage(7));
      at(t + CLOSE_MS, next);
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [i, run, reduced]);

  // Keep the newest step in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [stage, shown, reduced, vip, Math.floor(words / 12)]);

  const pick = (bookId: string) => {
    const k = SCENARIOS.findIndex((x) => x.bookId === bookId);
    if (k < 0) return;
    setI(k);
    setRun((r) => r + 1);
  };

  const tone = def.tone;
  const shownStage = Math.min(stage, 6);

  return (
    <WindowFrame tone={tone} label="Demo" site="myforum.space" href="https://myforum.space">
      <div className="grid w-full bg-[#f6f1e7] md:aspect-[16/9] md:max-h-[68vh] md:min-h-[460px] md:grid-cols-[11fr_9fr]">
        {/* ── The shelf and the open book ───────────────────────────────── */}
        <div className="relative h-[min(64vw,380px)] overflow-hidden bg-[#140d04] md:h-auto">
          <Suspense fallback={null}>
            <SalonStage
              scenario={s}
              stage={stage}
              vip={vip}
              reduced={reduced}
              pickable={PICKABLE}
              onPick={pick}
            />
          </Suspense>

          <div className="pointer-events-none absolute left-4 top-3.5 right-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage}
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                className="inline-flex items-baseline gap-2 rounded-full bg-[#140d04]/70 px-3 py-1.5 text-[12.5px] text-[#f3dcae] backdrop-blur-sm"
              >
                <span className="text-[#f3dcae]/55" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {stage === 0 || stage === 7 ? '·' : `${stage}/6`}
                </span>
                {STEP_TITLES[stage]}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-4 right-4">
            <span className="inline-block rounded-full bg-[#140d04]/65 px-3 py-1 text-[12px] text-[#f3dcae]/70 backdrop-blur-sm">
              Drag to turn the shelf · click a book to open it
            </span>
          </div>
        </div>

        {/* ── The margin ─────────────────────────────────────────────────── */}
        <div className="flex min-h-[420px] min-w-0 flex-col border-t border-[#e6dfd0] bg-[#fbf8f1] md:min-h-0 md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-3 border-b border-[#ece5d6] px-4 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-[#241703]">{s.title}</div>
              <div className="truncate text-[11.5px] text-[#9a8f7c]">
                {s.author} · p. {s.page}
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap">
              <Toggle label="VIP commentary" on={vip} onChange={setVip} tone={tone} />
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <ol>
              <Step n={1} stage={shownStage} tone={tone} icon={<ShelfGlyph color={tone} />} title="Taken off your shelf"
                detail={`${book.pages} pages, so a ${book.pages < 150 ? 'thin' : book.pages > 400 ? 'thick' : 'medium'} spine — sized from the page count.`} />
              <Step n={2} stage={shownStage} tone={tone} icon={<OpenBookGlyph color={tone} />} title="Opened in the reader"
                detail="The PDF, page by page, with the text selectable." />
              <Step n={3} stage={shownStage} tone={tone} icon={<HighlighterGlyph color={tone} />} title={`Highlighted by ${s.by}`}>
                {shownStage >= 3 && (
                  <motion.blockquote
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 rounded-md border border-[#ece5d6] bg-white px-3 py-2 font-serif text-[13px] italic leading-snug text-[#5c4a33]"
                  >
                    <span className="bg-[#ffcd50]/45 [box-decoration-break:clone]">“{s.passage}”</span>
                  </motion.blockquote>
                )}
              </Step>
              <Step n={4} stage={shownStage} tone={tone} icon={<ThreadGlyph color={tone} />} title="Discussion pinned to the passage"
                detail="Comments live on the exact sheet the quote is on.">
                {shownStage >= 4 && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-1.5"
                  >
                    <Comment name={s.by} text={s.comment} tone={tone} />
                    <AnimatePresence initial={false}>
                      {thread.slice(0, shown).map(({ r, depth }) => (
                        <motion.div
                          key={`${i}-${r.id}`}
                          initial={reduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          style={{ marginLeft: 14 + depth * 14 }}
                        >
                          <Comment name={r.name} text={r.text} tone={tone} votes={r.votes} reduced={reduced} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </Step>
              <Step n={5} stage={shownStage} tone={tone} icon={<CrownGlyph />}
                title={s.vip && vip ? `${s.vip.speaker}, in the margin` : 'VIP in the margin'}
                detail={!s.vip ? `No VIP follows ${s.title} yet — readers only.` : !vip ? 'VIP commentary is off — readers only.' : ''}
                dim={!s.vip || !vip}>
                {shownStage >= 5 && s.vip && vip && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 rounded-md border border-[#ecd9a8] bg-[#fffaf0] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <CrownGlyph size={18} />
                      <span className="text-[12.5px] font-semibold text-[#241703]">{s.vip.speaker}</span>
                      <span className="rounded-full bg-[#c99a2e]/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-[#9a7420]">
                        VIP
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-[#3d3121]">{s.vip.text}</p>
                    <a
                      href={s.vip.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block truncate text-[11px] text-[#9a8f7c] underline decoration-[#d9cfbb] underline-offset-2 hover:text-[#241703]"
                    >
                      {s.vip.source.kind === 'video' ? '▶ ' : ''}
                      {s.vip.source.where} — “{s.vip.source.title}” ↗
                    </a>
                  </motion.div>
                )}
              </Step>
              <Step n={6} stage={shownStage} tone={tone} icon={<ClaudeMark size={15} />} title="Asked Claude about it" last>
                {shownStage >= 6 && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-1.5"
                  >
                    <div className="ml-auto w-fit max-w-[88%] rounded-lg rounded-br-sm bg-[#241703] px-3 py-1.5 text-[12.5px] text-[#ffe8c0]">
                      {s.ask}
                    </div>
                    <div className="max-w-[94%] rounded-lg rounded-bl-sm border border-[#ece5d6] bg-white px-3 py-2 text-[12.5px] leading-snug text-[#2b2e36]">
                      {words === 0 ? (
                        <span className="inline-flex gap-1 py-1">
                          {[0, 1, 2].map((k) => (
                            <span
                              key={k}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4b9a4]"
                              style={{ animationDelay: `${k * 0.15}s` }}
                            />
                          ))}
                        </span>
                      ) : (
                        answerWords.slice(0, words).join(' ')
                      )}
                    </div>
                  </motion.div>
                )}
              </Step>
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[#ece5d6] px-4 py-2 text-[11px] text-[#9a8f7c]">
            <span>Demo on a loop · book {i + 1} of {SCENARIOS.length}</span>
            <span className="flex gap-1">
              {SCENARIOS.map((x, k) => (
                <button
                  key={x.bookId}
                  type="button"
                  onClick={() => pick(x.bookId)}
                  aria-pressed={k === i}
                  className="rounded-full border px-2 py-0.5 transition"
                  style={{
                    borderColor: k === i ? tone : '#e0d8c7',
                    color: k === i ? '#241703' : '#9a8f7c',
                    background: k === i ? `${tone}14` : 'transparent',
                  }}
                >
                  {x.title.replace(/’s Search for Meaning/, '’s Search').replace('Notes from Underground', 'Notes')}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

/** A reader's comment or reply, with the app's up/down vote control. */
function Comment({
  name,
  text,
  tone,
  votes,
  reduced = false,
}: {
  name: string;
  text: string;
  tone: string;
  votes?: number;
  reduced?: boolean;
}) {
  return (
    <div className="flex gap-2 rounded-lg border border-[#efe8da] bg-white px-2.5 py-2">
      <div
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${tone}, #241703)` }}
      >
        {name[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#241703]">{name}</span>
          {votes !== undefined && <Votes to={votes} reduced={reduced} tone={tone} />}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[#3d3121]">{text}</p>
      </div>
    </div>
  );
}

/** Up · score · down, the score counting up as readers vote. */
function Votes({ to, reduced, tone }: { to: number; reduced: boolean; tone: string }) {
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) {
      setN(to);
      return;
    }
    let k = 0;
    const id = window.setInterval(() => {
      k += 1;
      setN(k);
      if (k >= to) clearInterval(id);
    }, Math.max(45, 1300 / to));
    return () => clearInterval(id);
  }, [to, reduced]);
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px]" aria-label={`${n} points`}>
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 4L3 15h6v5h6v-5h6z" fill={n > 0 ? tone : 'none'} stroke={n > 0 ? tone : '#b4aa98'} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="min-w-[1.25rem] text-center font-semibold" style={{ color: n > 0 ? tone : '#b4aa98', fontVariantNumeric: 'tabular-nums' }}>
        {n}
      </span>
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 20L3 9h6V4h6v5h6z" fill="none" stroke="#b4aa98" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** One stage of the loop, in Mercurio's step language: a ringed badge, a title, its detail. */
function Step({
  n,
  stage,
  tone,
  icon,
  title,
  detail,
  last = false,
  dim = false,
  children,
}: {
  n: number;
  stage: number;
  tone: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  detail?: string;
  last?: boolean;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  const reached = stage >= n;
  const active = stage === n;
  const ring = !reached ? '#e6dfd0' : dim ? '#cfc6b4' : tone;
  return (
    <li className="relative pb-4 pl-10">
      {!last && (
        <span
          className="absolute left-[13px] top-8 h-[calc(100%-1.5rem)] w-px transition-colors"
          style={{ background: stage > n ? ring : '#e6dfd0' }}
        />
      )}
      <span
        className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full border bg-white transition-all duration-300"
        style={{
          borderColor: ring,
          opacity: reached ? 1 : 0.45,
          filter: reached ? 'none' : 'grayscale(1)',
          boxShadow: active && !dim ? `0 0 0 4px ${ring}26` : 'none',
        }}
      >
        {icon}
      </span>
      <div
        className="flex min-h-7 items-center text-[13.5px] font-medium transition-colors"
        style={{ color: reached ? (dim ? '#8d8473' : '#241703') : '#bdb5a5' }}
      >
        <span>{title}</span>
      </div>
      <AnimatePresence initial={false}>
        {reached && detail && (
          <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 text-[12.5px] text-[#7d7362]">
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </li>
  );
}

