/**
 * Single source of truth for navigation. Pins on the globe are generated from
 * this array. Coordinates are aesthetic placements EXCEPT the About/Now pin,
 * which uses real NYC coordinates (home / Columbia).
 *
 * All copy here is placeholder — search for `// TODO` to fill in real content.
 */

export type SectionType = 'overlay' | 'scene3d';

export type Section = {
  id: string;
  label: string;
  /** optional Hebrew subtitle shown under the pin label */
  hebrewLabel?: string;
  lat: number;
  lng: number;
  type: SectionType;
  /** pin + accent color (hex) */
  color: string;
  /** one-line description used in the 2D fallback menu */
  blurb: string;
};

export const SECTIONS: Section[] = [
  {
    id: 'about',
    label: 'About / Now',
    hebrewLabel: 'עכשיו', // "now"
    lat: 40.7128, // real — New York City (home / Columbia)
    lng: -74.006,
    type: 'overlay',
    color: '#5fb2ff',
    blurb: 'Who I am and what I am working on right now.',
  },
  {
    id: 'projects',
    label: 'Projects',
    hebrewLabel: 'פרויקטים',
    lat: 51.5074, // London-ish, aesthetic
    lng: -0.1278,
    type: 'overlay',
    color: '#7ef0c8',
    blurb: 'Prediction markets, forecasting, and signal analysis.',
  },
  {
    id: 'bookshelf',
    label: 'Bookshelf',
    hebrewLabel: 'ספרים',
    lat: 35.0, // aesthetic, near the Atlantic
    lng: -40.0,
    type: 'scene3d',
    color: '#f0c46b',
    blurb: 'What I am reading and what I thought of it.',
  },
  {
    id: 'movies',
    label: 'Movies',
    hebrewLabel: 'סרטים',
    lat: 8.0, // aesthetic, equatorial Pacific feel
    lng: -120.0,
    type: 'scene3d',
    color: '#f06b9b',
    blurb: 'A wall of films worth your time.',
  },
  {
    id: 'contact',
    label: 'Contact',
    hebrewLabel: 'צור קשר',
    lat: -23.0, // aesthetic, southern hemisphere
    lng: 25.0,
    type: 'overlay',
    color: '#b89bff',
    blurb: 'Email, GitHub, LinkedIn.',
  },
];

export function getSection(id: string | null): Section | undefined {
  if (!id) return undefined;
  return SECTIONS.find((s) => s.id === id);
}

// TODO: confirm the site tagline.
export const SITE_TITLE = 'Aaron Schlacht · Big A';
export const SITE_TAGLINE = 'Forecasting, markets, and the occasional good book.'; // TODO
