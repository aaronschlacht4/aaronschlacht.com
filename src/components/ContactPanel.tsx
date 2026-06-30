import PanelHeader from './PanelHeader';

type Link = { label: string; value: string; href: string };

// TODO: confirm real handles / addresses.
const LINKS: Link[] = [
  { label: 'Email', value: 'aschlacht4@gmail.com', href: 'mailto:aschlacht4@gmail.com' },
  { label: 'GitHub', value: 'github.com/aaronschlacht4', href: 'https://github.com/aaronschlacht4' },
  { label: 'LinkedIn', value: 'in/aaron-schlacht', href: 'https://www.linkedin.com/in/aaron-schlacht' },
];

export default function ContactPanel() {
  return (
    <div>
      <PanelHeader eyebrow="Say hello" title="Contact" hebrew="צור קשר" />

      <ul className="space-y-3">
        {LINKS.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-[var(--color-accent)]/50"
            >
              <span className="text-xs uppercase tracking-[0.25em] text-ink-dim">
                {l.label}
              </span>
              <span className="font-medium text-ink group-hover:text-[var(--color-accent)]">
                {l.value}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-ink-dim">
        Prefer something async? Email is best — I read everything.
      </p>
    </div>
  );
}
