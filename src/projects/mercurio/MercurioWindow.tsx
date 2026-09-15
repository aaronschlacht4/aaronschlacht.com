import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SphereDef } from '../../data/spheres';
import WindowFrame from '../shared/WindowFrame';
import { Toggle } from '../shared/Dial';
import { prefersReducedMotion } from '../../lib/env';

/**
 * A demo of what Mercurio does, played on a loop: a dispatcher posts a job
 * in a WhatsApp group, the message is parsed by the model, checked against
 * the calendar and the driver's rate floor, and — if it clears — a reply
 * goes out to claim the trip, in the driver's own voice. The auto-reply
 * switch is real: turn it off and Mercurio drafts but doesn't send, which
 * is the product's default.
 */

type Parsed = { pickup: string; dropoff: string; when: string; pax: string; pay: string; perHour: string };

type Scenario = {
  from: string;
  text: string;
  time: string;
  /** null when the message isn't a job at all */
  parsed: Parsed | null;
  calendar: { ok: boolean; note: string };
  rate: { ok: boolean; note: string };
  reply: string;
  replyTime: string;
};

const SCENARIOS: Scenario[] = [
  {
    from: 'Dispatch · Sal',
    text: 'AVAILABLE — Tomorrow 7:30 AM. JFK T4 (arrival DL215) → The Plaza Hotel, 5th Ave. 2 pax, 3 bags. Black SUV. $185 flat. Who’s on it?',
    time: '9:41 PM',
    parsed: {
      pickup: 'JFK Terminal 4, DL215',
      dropoff: 'The Plaza Hotel',
      when: 'Tomorrow, 7:30 AM',
      pax: '2 pax, 3 bags, SUV',
      pay: '$185 flat',
      perHour: '≈ $185 / hr',
    },
    calendar: { ok: true, note: 'Free until 11:00 AM' },
    rate: { ok: true, note: '$185/hr clears your $60 floor' },
    reply: 'On it. JFK T4 7:30 AM, DL215, 2 pax. Black SUV. 👍',
    replyTime: '9:41 PM',
  },
  {
    from: 'Marco',
    text: 'anyone know if the BQE is still closed by the navy yard tonight?',
    time: '9:43 PM',
    parsed: null,
    calendar: { ok: true, note: '' },
    rate: { ok: true, note: '' },
    reply: '',
    replyTime: '',
  },
  {
    from: 'Dispatch · Sal',
    text: 'Sat 8:00 PM. The Standard High Line → Brooklyn wedding venue. 4 pax, formal. SUV. $140 flat, 1 hr standby after. Available?',
    time: '9:47 PM',
    parsed: {
      pickup: 'The Standard, High Line',
      dropoff: 'Wedding venue, Brooklyn',
      when: 'Saturday, 8:00 PM',
      pax: '4 pax, formal, SUV',
      pay: '$140 flat + 1 hr standby',
      perHour: '≈ $70 / hr',
    },
    calendar: { ok: false, note: 'Conflict: LGA pickup, Sat 7:15–8:45 PM' },
    rate: { ok: true, note: '$70/hr clears your $60 floor' },
    reply: '',
    replyTime: '',
  },
  {
    from: 'Dispatch · Priya',
    text: 'Wed 11:00 AM. Soho Grand Hotel → Teterboro private terminal. 1 VIP pax. Black car, suit & tie. $160. Who can take?',
    time: '9:52 PM',
    parsed: {
      pickup: 'Soho Grand Hotel',
      dropoff: 'Teterboro, private terminal',
      when: 'Wednesday, 11:00 AM',
      pax: '1 VIP, black car, suit & tie',
      pay: '$160',
      perHour: '≈ $160 / hr',
    },
    calendar: { ok: true, note: 'Free all Wednesday morning' },
    rate: { ok: true, note: '$160/hr clears your $60 floor' },
    reply: 'Can take it — Wed 11:00, Soho Grand to TEB. Suit & tie, no problem.',
    replyTime: '9:52 PM',
  },
];

// Stages: 0 message lands · 1 received · 2 parsed · 3 calendar · 4 rate · 5 outcome
const STAGE_MS = [0, 700, 900, 1000, 800, 900];
const HOLD_MS = 3200;
const CHATTER_HOLD_MS = 1800;

type Bubble = { id: number; from?: string; text: string; time: string; mine?: boolean; draft?: boolean };

export default function MercurioWindow({ def }: { def: SphereDef }) {
  const [auto, setAuto] = useState(true);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reduced] = useState(prefersReducedMotion);

  const s = SCENARIOS[i];
  const isJob = s.parsed !== null;
  const cleared = isJob && s.calendar.ok && s.rate.ok;

  // One scenario: land the message, walk the stages, hold, move on.
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };
    const sc = SCENARIOS[i];
    const job = sc.parsed !== null;
    const ok = job && sc.calendar.ok && sc.rate.ok;

    setStage(0);
    // Idempotent: React may run this effect twice for one scenario (StrictMode
    // in dev), and the same message must not land twice.
    setBubbles((b) => {
      const last = b[b.length - 1];
      if (last && !last.mine && last.text === sc.text) return b;
      return [...b.slice(-5), { id: ++idRef.current, from: sc.from, text: sc.text, time: sc.time }];
    });

    if (reduced) {
      setStage(5);
      if (ok && autoRef.current) {
        setBubbles((b) => [...b, { id: ++idRef.current, text: sc.reply, time: sc.replyTime, mine: true }]);
      }
      at(HOLD_MS * 2, () => setI((k) => (k + 1) % SCENARIOS.length));
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
      };
    }

    let t = 0;
    const last = job ? 5 : 2; // chatter is classified at the parse step and dropped
    for (let st = 1; st <= last; st++) {
      t += STAGE_MS[st];
      const stg = st;
      at(t, () => setStage(stg));
    }
    if (ok) {
      // The reply: a typing pause, then the bubble — sent, or held as a draft.
      at(t + 200, () => setTyping(true));
      at(t + 1300, () => {
        setTyping(false);
        const send = autoRef.current;
        setBubbles((b) => [
          ...b,
          { id: ++idRef.current, text: sc.reply, time: sc.replyTime, mine: true, draft: !send },
        ]);
      });
      t += 1300;
    }
    at(t + (job ? HOLD_MS : CHATTER_HOLD_MS), () => setI((k) => (k + 1) % SCENARIOS.length));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setTyping(false);
    };
  }, [i, reduced]);

  // Keep the newest bubble in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [bubbles, typing, reduced]);

  const tone = def.tone;

  return (
    <WindowFrame tone={tone} label="Demo" site="mercurio.host" href="https://mercurio.host">
      <div className="grid max-h-[68vh] min-h-[420px] w-full bg-[#f3f1ec] md:aspect-[16/9] md:grid-cols-[5fr_4fr]">
        {/* ── The group chat ────────────────────────────────────────────── */}
        <div className="flex min-h-[360px] flex-col border-b border-[#e3dfd6] md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-2.5 text-white">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-[12px] font-semibold">
              NY
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium">NYC Black Car Dispatch</div>
              <div className="truncate text-[11px] text-white/70">
                {typing ? 'you are typing…' : 'Sal, Priya, Marco, you, +44'}
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-[#e9e2d8] px-4 py-4"
            style={{
              backgroundImage:
                'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          >
            <div className="flex min-h-full flex-col justify-end gap-2">
              <AnimatePresence initial={false}>
                {bubbles.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={reduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex ${b.mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[86%] rounded-lg px-3 py-2 text-[13.5px] leading-snug shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
                        b.mine ? 'bg-[#d9fdd3] text-[#111b21]' : 'bg-white text-[#111b21]'
                      } ${b.draft ? 'border border-dashed border-[#8a9a7f] bg-[#eef7ea]' : ''}`}
                    >
                      {b.from && (
                        <div className="mb-0.5 text-[12px] font-semibold" style={{ color: tone }}>
                          {b.from}
                        </div>
                      )}
                      <div>{b.text}</div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-[#667781]">
                        {b.mine && (b.draft ? 'draft · not sent' : 'sent by Mercurio')}
                        <span>{b.time}</span>
                        {b.mine && !b.draft && <span className="text-[#53bdeb]">✓✓</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-end"
                  >
                    <div className="flex items-center gap-1 rounded-lg bg-[#d9fdd3] px-3 py-2.5">
                      {[0, 1, 2].map((k) => (
                        <span
                          key={k}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#667781]"
                          style={{ animationDelay: `${k * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── The pipeline ──────────────────────────────────────────────── */}
        <div className="flex flex-col bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#eceae4] px-4 py-2.5">
            <div className="text-[14px] font-medium text-[#15171c]">Mercurio</div>
            <Toggle label="Auto-reply" on={auto} onChange={setAuto} tone={tone} />
          </div>

          <ol className="flex-1 space-y-0 px-4 py-4">
            <Step n={1} stage={stage} tone={tone} title="Message received" detail={`From ${s.from}`} />
            <Step
              n={2}
              stage={stage}
              tone={tone}
              title="Parsed by Claude"
              detail={isJob ? 'It’s a job. Fields pulled out:' : 'Not a job — filtered out as chatter.'}
              bad={!isJob}
            >
              {isJob && stage >= 2 && s.parsed && (
                <motion.dl
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md border border-[#eceae4] bg-[#faf9f6] px-3 py-2 text-[12px]"
                >
                  {(
                    [
                      ['Pickup', s.parsed.pickup],
                      ['Drop-off', s.parsed.dropoff],
                      ['When', s.parsed.when],
                      ['Who', s.parsed.pax],
                      ['Pay', `${s.parsed.pay} · ${s.parsed.perHour}`],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#9a9ea8]">{k}</dt>
                      <dd className="text-[#15171c]">{v}</dd>
                    </div>
                  ))}
                </motion.dl>
              )}
            </Step>
            {isJob && (
              <>
                <Step n={3} stage={stage} tone={tone} title="Google Calendar" detail={s.calendar.note} bad={!s.calendar.ok} />
                <Step n={4} stage={stage} tone={tone} title="Rate floor" detail={s.rate.note} bad={!s.rate.ok} />
                <Step
                  n={5}
                  stage={stage}
                  tone={tone}
                  title={cleared ? (auto ? 'Reply sent' : 'Reply drafted') : 'Left in your inbox'}
                  detail={
                    cleared
                      ? auto
                        ? 'Claimed the trip, in your voice.'
                        : 'Auto-reply is off — waiting for you to send it.'
                      : 'Conflicts don’t get claimed. It’s there if you want it.'
                  }
                  bad={!cleared}
                  last
                />
              </>
            )}
            {!isJob && <Step n={3} stage={stage} tone={tone} title="Dropped" detail="Nothing to do." last dim />}
          </ol>

          <div className="border-t border-[#eceae4] px-4 py-2 text-[11px] text-[#9a9ea8]">
            Demo on a loop · job {i + 1} of {SCENARIOS.length}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function Step({
  n,
  stage,
  tone,
  title,
  detail,
  bad = false,
  last = false,
  dim = false,
  children,
}: {
  n: number;
  stage: number;
  tone: string;
  title: string;
  detail: string;
  bad?: boolean;
  last?: boolean;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  const reached = stage >= n;
  const active = stage === n;
  const color = !reached ? '#cfcbc2' : bad ? '#b3543a' : tone;
  return (
    <li className="relative pl-6 pb-4">
      {!last && (
        <span
          className="absolute left-[5px] top-4 h-full w-px"
          style={{ background: stage > n ? color : '#e6e3db' }}
        />
      )}
      <span
        className="absolute left-0 top-[5px] h-[11px] w-[11px] rounded-full border-2 bg-white transition-colors"
        style={{ borderColor: color, background: reached ? color : '#fff' }}
      />
      {active && !dim && (
        <span
          className="absolute left-0 top-[5px] h-[11px] w-[11px] animate-ping rounded-full opacity-40"
          style={{ background: color, animationDuration: '1.4s' }}
        />
      )}
      <div
        className="text-[13.5px] font-medium transition-colors"
        style={{ color: reached ? (bad ? '#b3543a' : '#15171c') : '#b4b7bf' }}
      >
        {title}
      </div>
      <AnimatePresence initial={false}>
        {reached && detail && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-0.5 text-[12.5px] text-[#6b6f78]"
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </li>
  );
}
