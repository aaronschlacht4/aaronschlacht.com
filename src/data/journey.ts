/**
 * Aaron's life journey, in order. The scroll on the globe scrubs through these
 * stops; arrows draw between consecutive ones. Ages are from Aaron; exact
 * calendar years are TODO (captions use ages, not years, to stay accurate).
 *
 * Coordinates are real so the globe rotates to the true place each time.
 */
export type JourneyStop = {
  id: string;
  place: string;
  region: string;
  /** short caption shown under the place name */
  when: string;
  lat: number;
  lng: number;
  /** one-line note — editable */
  note?: string;
};

export const JOURNEY: JourneyStop[] = [
  {
    id: 'nyc',
    place: 'New York',
    region: 'New York City',
    when: 'Born',
    lat: 40.7128,
    lng: -74.006,
    note: 'Where it started.',
  },
  {
    id: 'la',
    place: 'Los Angeles',
    region: 'California',
    when: 'Grew up',
    lat: 34.0522,
    lng: -118.2437,
    note: 'Grew up here.',
  },
  {
    id: 'israel',
    place: 'Israel',
    region: 'Tel Aviv',
    when: 'Two years',
    lat: 32.0853,
    lng: 34.7818,
    note: 'Two years abroad.',
  },
  {
    id: 'columbia',
    place: 'Columbia University',
    region: 'New York',
    when: 'Now',
    lat: 40.8075,
    lng: -73.9626,
    note: 'Where I am now.',
  },
];
