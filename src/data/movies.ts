export type Movie = {
  title: string;
  year: number;
  rating: number; // 1–5
  take: string; // one-line take
  poster?: string; // path under /public/posters, optional
  tint: string; // fallback color when no poster art is present
};

/** All placeholder — swap for real picks and drop art in /public/posters. // TODO */
export const MOVIES: Movie[] = [
  { title: 'Margin Call', year: 2011, rating: 5, take: 'The night the music stopped.', tint: '#27384f' },
  { title: 'The Big Short', year: 2015, rating: 4, take: 'Comedy as a crisis explainer.', tint: '#4f3a27' },
  { title: 'Moneyball', year: 2011, rating: 5, take: 'Edge is just unloved information.', tint: '#274f3a' },
  { title: 'Arrival', year: 2016, rating: 5, take: 'Time, language, and choosing anyway.', tint: '#3a274f' },
  { title: 'Blade Runner 2049', year: 2017, rating: 4, take: 'The most beautiful sad future.', tint: '#4f2738' },
  { title: 'Whiplash', year: 2014, rating: 5, take: 'Ambition as a contact sport.', tint: '#4a3a1f' },
  { title: 'Heat', year: 1995, rating: 5, take: 'Two pros, one city, no slack.', tint: '#1f3a4a' },
  { title: 'No Country', year: 2007, rating: 4, take: 'Fate with a captive bolt pistol.', tint: '#3a3a2e' },
  { title: 'Dune', year: 2021, rating: 4, take: 'Scale you can feel in your chest.', tint: '#4a3520' },
  { title: 'The Social Network', year: 2010, rating: 5, take: 'A founding myth, beautifully sour.', tint: '#27394f' },
  { title: 'Inside Llewyn Davis', year: 2013, rating: 4, take: 'Talent is not the same as luck.', tint: '#2e2e3a' },
  { title: 'Prisoners', year: 2013, rating: 4, take: 'Dread that does not let up.', tint: '#2a2a2a' },
];
