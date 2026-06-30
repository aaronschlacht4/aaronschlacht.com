export type Book = {
  title: string;
  author: string;
  rating: number; // 1–5
  spineColor: string;
  take: string; // one-line take
  status: 'read' | 'reading';
};

/** All placeholder — swap for real books. // TODO */
export const BOOKS: Book[] = [
  {
    title: 'Superforecasting',
    author: 'Tetlock & Gardner',
    rating: 5,
    spineColor: '#2e6f7e',
    take: 'The case that good judgment is a trainable skill.',
    status: 'read',
  },
  {
    title: 'Thinking in Bets',
    author: 'Annie Duke',
    rating: 4,
    spineColor: '#7e5a2e',
    take: 'Decisions are bets; separate them from outcomes.',
    status: 'read',
  },
  {
    title: 'The Signal and the Noise',
    author: 'Nate Silver',
    rating: 4,
    spineColor: '#3a3a55',
    take: 'A tour of why most predictions fail.',
    status: 'read',
  },
  {
    title: 'Against the Gods',
    author: 'Peter Bernstein',
    rating: 5,
    spineColor: '#6b2e3a',
    take: 'The remarkable story of risk.',
    status: 'read',
  },
  {
    title: 'Fortune’s Formula',
    author: 'William Poundstone',
    rating: 4,
    spineColor: '#2e5a3a',
    take: 'Kelly, Shannon, and the math of edge.',
    status: 'read',
  },
  {
    title: 'How to Measure Anything',
    author: 'Douglas Hubbard',
    rating: 4,
    spineColor: '#4a4a2e',
    take: 'You can quantify more than you think.',
    status: 'read',
  },
  {
    title: 'Reading now',
    author: 'TODO Author',
    rating: 0,
    spineColor: '#5fb2ff',
    take: 'Currently on the nightstand.',
    status: 'reading',
  },
];
