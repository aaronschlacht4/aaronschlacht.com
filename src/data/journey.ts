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
    id: 'riverdale',
    place: 'Riverdale',
    region: 'New York',
    when: 'Birth – age 4',
    lat: 40.8908,
    lng: -73.912,
    note: 'Where it started.', // TODO
  },
  {
    id: 'beverlywood',
    place: 'Beverlywood',
    region: 'Los Angeles, CA',
    when: 'Age 4 – 18',
    lat: 34.0469,
    lng: -118.392,
    note: 'Grew up here.', // TODO
  },
  {
    id: 'ramat-gan',
    place: 'Ramat Gan',
    region: 'Israel',
    when: 'Age 18 – 19',
    lat: 32.0684,
    lng: 34.8248,
    note: 'First year in Israel.', // TODO
  },
  {
    id: 'jerusalem',
    place: 'Jerusalem',
    region: 'Israel',
    when: 'Age 19 – 20',
    lat: 31.7683,
    lng: 35.2137,
    note: 'The holy city.', // TODO
  },
  {
    id: 'la',
    place: 'Los Angeles',
    region: 'California',
    when: 'A year, age 20 – 21',
    lat: 34.0522,
    lng: -118.2437,
    note: 'Back west for a year.', // TODO
  },
  {
    id: 'columbia',
    place: 'Columbia University',
    region: 'New York',
    when: 'Now',
    lat: 40.8075,
    lng: -73.9626,
    note: 'Where I am now.', // TODO
  },
];
