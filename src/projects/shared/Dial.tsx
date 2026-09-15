import { useId } from 'react';

/**
 * A gauge, not a pill: the track is a hairline and the handle a single mark
 * standing on it (styling in index.css under `.gauge`). The travelled part
 * of the track is coloured via --t, since a native range gives no other way.
 */
export default function Dial({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  color,
  ends,
  compact = false,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  color: string;
  /** captions for the two ends of the travel */
  ends?: [string, string];
  compact?: boolean;
}) {
  const id = useId();
  const t = ((value - min) / (max - min)) * 100;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={`truncate ${compact ? 'text-[12px]' : 'text-[13px]'} text-ink/85`}
        >
          {label}
          {hint && !compact && (
            <span className="ml-2 text-[11px] text-ink-dim/70">{hint}</span>
          )}
        </label>
        <output
          htmlFor={id}
          className="shrink-0 font-mono text-[12px] text-ink"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="gauge mt-1 block w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ['--gauge' as string]: color, ['--t' as string]: `${t}%` }}
      />
      {ends && (
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim/50">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

/** A labelled on/off switch in the same instrument language. */
export function Toggle({
  label,
  on,
  onChange,
  color,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  color: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-[12px] transition"
      style={{
        borderColor: on ? `${color}80` : 'rgba(255,255,255,0.12)',
        color: on ? '#f2f6fc' : 'rgba(154,167,184,0.9)',
        background: on ? `${color}14` : 'transparent',
      }}
    >
      <span
        className="relative h-3 w-5 rounded-full transition-colors"
        style={{ background: on ? color : 'rgba(255,255,255,0.14)' }}
      >
        <span
          className="absolute top-[2px] h-2 w-2 rounded-full bg-[#04060c] transition-transform"
          style={{ transform: on ? 'translateX(10px)' : 'translateX(2px)' }}
        />
      </span>
      {label}
    </button>
  );
}
