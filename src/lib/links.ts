/**
 * Small helpers for showing project links as text. Project hrefs are either
 * absolute URLs (a live site, possibly with an anchor or a text fragment
 * into one section) or a bare '#' placeholder while the site isn't up yet.
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

/**
 * Where inside the site a page link lands, as a short mono caption:
 *   `https://a.b/#how`                          → `#how`
 *   `https://a.b/#how:~:text=Running%20it`      → `#how · Running it`
 *   `https://a.b/notes/`                        → `/notes/`
 *   `#`                                         → null (not live yet)
 */
export function whereLabel(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const [frag, directive] = u.hash.split(':~:');
  const text = directive?.match(/text=(?:[^,&]*-,)?([^,&]+)/)?.[1];
  const tail = frag || (u.pathname !== '/' ? u.pathname : u.host);
  return text ? `${tail} · ${decodeURIComponent(text)}` : tail;
}
