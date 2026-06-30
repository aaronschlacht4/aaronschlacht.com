import { useEffect, useState } from 'react';

/**
 * Live UTC clock — the visible proof that the globe's lighting is "live with the
 * time." Ticks every second. UTC because that's the frame the sub-solar point is
 * computed in, so the readout and the terminator always agree.
 */
export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-GB', {
    hour12: false,
    timeZone: 'UTC',
  });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-ink-dim">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
      </span>
      <span className="tracking-wider text-ink">{time}</span>
      <span className="uppercase tracking-[0.2em]">UTC</span>
      <span className="hidden text-ink-dim/70 sm:inline">· {date}</span>
    </div>
  );
}
