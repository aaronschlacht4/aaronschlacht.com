/**
 * The books on the demo's shelf: The Modern Salon's own catalogue, in the
 * order the app's signed-out library shows it (alphabetical by title), each
 * wearing its own cover file (public/salon/covers/, downsized to 600px tall).
 *
 * Every cover is one image of the jacket laid out flat — back cover, spine,
 * front cover, left to right. Only two were built to the app's cover spec
 * (921px covers, a 203px × thickness spine, against a 1200px height); those
 * are `calibrated` and get the spine-remap shader. The rest are stretched
 * over the jacket the way the app's shelf stretches them. The Prince has no
 * cover file in the app, so it stands in hashed cloth, as it does there.
 */
export type ShelfBook = {
  id: string;
  /** the app's own row id — the seed for a coverless book's cloth colour */
  uuid: string;
  title: string;
  author: string;
  pages: number;
  /** cover file, back–spine–front; null for a book with no artwork */
  cover: string | null;
  /** built to the app's cover spec */
  calibrated: boolean;
};

export { spineThickness as thickness } from './shelfLayout';

export const SHELF: ShelfBook[] = [
  {
    id: 'beyond-good-and-evil',
    uuid: '25e11eda-2443-49f0-8416-11f14b37c4fe',
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    pages: 116,
    cover: '/salon/covers/beyond-good-and-evil.jpg',
    calibrated: false,
  },
  {
    id: 'crime-and-punishment',
    uuid: '8fa4fc85-115e-41b3-9f5b-da7af1c81f30',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    pages: 767,
    cover: '/salon/covers/crime-and-punishment.jpg',
    calibrated: false,
  },
  {
    id: 'frankenstein',
    uuid: 'c9c812fb-aca5-4824-a825-99b771bc2de2',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    pages: 180,
    cover: '/salon/covers/frankenstein.jpg',
    calibrated: false,
  },
  {
    id: 'mans-search-for-meaning',
    uuid: '58823441-7d7e-42a0-8eb2-67050471471f',
    title: 'Man’s Search for Meaning',
    author: 'Viktor E. Frankl',
    pages: 69,
    cover: '/salon/covers/mans-search-for-meaning.jpg',
    calibrated: true,
  },
  {
    id: 'meditations',
    uuid: '6daa8db4-345e-4c2e-ac08-34ca2c6418ed',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    pages: 128,
    cover: '/salon/covers/meditations.jpg',
    calibrated: false,
  },
  {
    id: 'moby-dick',
    uuid: 'aee306d6-d1bc-4987-8ed2-7a78ff0f85b1',
    title: 'Moby Dick',
    author: 'Herman Melville',
    pages: 468,
    cover: '/salon/covers/moby-dick.jpg',
    calibrated: false,
  },
  {
    id: 'notes-from-underground',
    uuid: '1075129d-5def-40cd-9e4a-6f7870aa8d82',
    title: 'Notes from Underground',
    author: 'Fyodor Dostoevsky',
    pages: 187,
    cover: '/salon/covers/notes-from-underground.jpg',
    calibrated: true,
  },
  {
    id: 'pride-and-prejudice',
    uuid: '76c0a0c0-8c90-4f36-a351-c84540263557',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    pages: 423,
    cover: '/salon/covers/pride-and-prejudice.jpg',
    calibrated: false,
  },
  {
    id: 'the-prince',
    uuid: 'cf672386-976a-4910-89bd-0f98222bea44',
    title: 'The Prince',
    author: 'Niccolo Machiavelli',
    pages: 239,
    cover: null,
    calibrated: false,
  },
];
