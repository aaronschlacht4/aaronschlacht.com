export type Project = {
  title: string;
  blurb: string;
  tags: string[];
  link?: string;
  image?: string; // path under /public, e.g. /covers/foo.webp
};

/** All placeholder — replace with real work. // TODO */
export const PROJECTS: Project[] = [
  {
    title: 'Prediction-Market Pipeline',
    blurb:
      'Cross-platform ingestion and normalization of prediction-market quotes into a single comparable feed, with arbitrage and divergence detection.',
    tags: ['data', 'markets', 'python'],
    // link: 'https://github.com/...', // TODO
  },
  {
    title: 'Forecasting / Foresight Explainer',
    blurb:
      'An interactive explainer on how forecasts form, update, and move — and why calibrated uncertainty beats confident point estimates.',
    tags: ['forecasting', 'writing', 'viz'],
    // link: '', // TODO
  },
  {
    title: 'Alpha Burst-Decay Analysis',
    blurb:
      'Measuring how quickly a predictive signal decays after it fires, and where the tradable window actually closes.',
    tags: ['research', 'signals', 'stats'],
    // link: '', // TODO
  },
];
