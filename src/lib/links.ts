/**
 * Small helpers for showing project links as text. Project hrefs are either
 * absolute URLs (a live site) or a bare '#' placeholder while it isn't up.
 */

/** True for http(s) links — these open in a new tab. */
export const isExternal = (href: string): boolean => /^https?:\/\//i.test(href);

/** `https://physica.fyi/` → `physica.fyi`; `https://x.dev/notes` → `x.dev/notes`.
 *  Null for anything that isn't an absolute URL. */
export function siteLabel(href: string): string | null {
  try {
    const u = new URL(href);
    return u.host + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
  } catch {
    return null;
  }
}
