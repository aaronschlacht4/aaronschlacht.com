/**
 * What the demo plays, one book at a time. The page text is the app's own
 * extracted text for that page (data/books/*.json in the forum repo), and the
 * VIP notes are the real, verbatim excerpts the app has ingested for those
 * pages — same speaker, same words, same source. The readers, their replies
 * and the AI's answer are written for the demo.
 */

export type Reply = {
  id: string;
  name: string;
  text: string;
  /** final score; the demo counts up to it */
  votes: number;
  /** replies to this reply */
  replies?: Reply[];
};

export type VipNote = {
  speaker: string;
  text: string;
  source: { title: string; where: string; kind: 'video' | 'essay'; url: string };
};

export type Scenario = {
  bookId: string;
  title: string;
  author: string;
  /** the PDF page the passage is on */
  page: number;
  /** what's set on the left and right pages of the open spread */
  left: string[];
  right: string[];
  /** the highlighted passage: an exact substring of `right` */
  passage: string;
  /** the reader who highlighted it, and what they wrote */
  by: string;
  comment: string;
  replies: Reply[];
  /** null when no VIP follows this book yet */
  vip: VipNote | null;
  ask: string;
  answer: string;
};

export const SCENARIOS: Scenario[] = [
  {
    bookId: 'mans-search-for-meaning',
    title: 'Man’s Search for Meaning',
    author: 'Viktor E. Frankl',
    page: 33,
    left: [
      'pattern.) But what about human liberty? Is there no spiritual freedom in regard to behaviour and reaction to any given surroundings? Is that theory true which would have us believe that man is no more than a product of many conditional and environmental factors—be they of a biological, psychological or sociological nature? Is man but an accidental product of these? Most important, do the prisoners’ reactions to the singular world of the concentration camp prove that man cannot escape the influences of his surroundings? Does man have no choice of action in the face of such circumstances?',
      'We can answer these questions from experience as well as on principle. The experiences of camp life show that man does have a choice of action. There were enough examples, often of a heroic nature, which proved that apathy could be overcome, irritability suppressed. Man can preserve a vestige of spiritual freedom, of independence of mind, even in such terrible conditions of psychic and physical stress.',
    ],
    right: [
      'We who lived in concentration camps can remember the men who walked through the huts comforting others, giving away their last piece of bread. They may have been few in number, but they offer sufficient proof that everything can be taken from a man but one thing: the last of the human freedoms—to choose one’s attitude in any given set of circumstances, to choose one’s own way.',
      'And there were always choices to make. Every day, every hour, offered the opportunity to make a decision, a decision which determined whether you would or would not submit to those powers which threatened to rob you of your very self, your inner freedom; which determined whether or not you would become the plaything of circumstance, renouncing freedom and dignity to become moulded into the form of the typical inmate.',
    ],
    passage:
      'everything can be taken from a man but one thing: the last of the human freedoms—to choose one’s attitude in any given set of circumstances, to choose one’s own way.',
    by: 'noa.k',
    comment: 'The whole book in one sentence. He isn’t saying suffering is fine — he’s saying the response is still yours.',
    replies: [
      {
        id: 'm1',
        name: 'theo',
        text: 'The line before it is what makes it land. “Giving away their last piece of bread” — it’s not a theory, it’s what he watched people do.',
        votes: 14,
      },
      {
        id: 'm2',
        name: 'ines_reads',
        text: 'I struggle with this. “Choose your attitude” can turn into blaming the people who couldn’t.',
        votes: 9,
        replies: [
          {
            id: 'm3',
            name: 'noa.k',
            text: 'I read it the other way — it’s what’s left when everything else is taken, not a test you pass or fail.',
            votes: 6,
          },
        ],
      },
    ],
    vip: {
      speaker: 'Andrew Huberman',
      text: 'One of the great challenges in assigning a good — you know, giving a good answer to the question of, like, what’s the meaning of life — is, um, I think illustrated best by the Viktor Frankl example, although there are other examples too: which is that our sense of meaning is very elastic in time and space.',
      source: {
        title: 'Man’s Search for Meaning | Andrew Huberman and Lex Fridman',
        where: 'Lex Clips · 0:39',
        kind: 'video',
        url: 'https://www.youtube.com/watch?v=3tHjaJK5EXU&t=39s',
      },
    },
    ask: 'Is he saying suffering doesn’t matter?',
    answer:
      'No — close to the opposite. The proof he offers is men who were starving and gave their bread away anyway. His claim is narrower: circumstances can take almost everything, but not the stance you take toward them. A few lines on he calls it “the last inner freedom,” and argues that it’s what lets suffering mean something rather than merely be endured.',
  },
  {
    bookId: 'notes-from-underground',
    title: 'Notes from Underground',
    author: 'Fyodor Dostoevsky',
    page: 51,
    left: [
      'Anyway, man has always been afraid of this mathematical certainty, and I am afraid of it now. Granted that man does nothing but seek that mathematical certainty, he traverses oceans, sacrifices his life in the quest, but to succeed, really to find it, dreads, I assure you. He feels that when he has found it there will be nothing for him to look for.',
      'In fact, man is a comical creature; there seems to be a kind of jest in it all. But yet mathematical certainty is after all, something insufferable. Twice two makes four seems to me simply a piece of insolence. Twice two makes four is a pert coxcomb who stands with arms akimbo barring your path and spitting. I admit that twice two makes four is an',
    ],
    right: [
      'excellent thing, but if we are to give everything its due, twice two makes five is sometimes a very charming thing too.',
      'And why are you so firmly, so triumphantly, convinced that only the normal and the positive—in other words, only what is conducive to welfare—is for the advantage of man? Is not reason in error as regards advantage? Does not man, perhaps, love something besides well-being? Perhaps he is just as fond of suffering? Perhaps suffering is just as great a benefit to him as well-being? Man is sometimes extraordinarily, passionately, in love with suffering, and that is a fact.',
    ],
    passage: 'twice two makes five is sometimes a very charming thing too.',
    by: 'margaux',
    comment: 'He knows 2 × 2 = 4. The point is he refuses to be a piano key someone else plays.',
    replies: [
      {
        id: 'n1',
        name: 'dmitri_p',
        text: 'Read this next to the Crystal Palace pages. He’s arguing with a whole political program, not with arithmetic.',
        votes: 11,
      },
      {
        id: 'n2',
        name: 'sam',
        text: 'Funniest line in the book, and it’s holding up the whole argument.',
        votes: 7,
      },
    ],
    vip: {
      speaker: 'Stephen West',
      text: 'Not only does he reject the idea that rationality is ever going to be able to fully explain the internal experience of an individual, but also that we will ever be able to use rationality to arrive at some perfect political system.',
      source: {
        title: 'Dostoevsky - Notes From Underground - A Philosophical Guide',
        where: 'Philosophize This!',
        kind: 'essay',
        url: 'https://philosophizethis.substack.com/p/dostoevsky-notes-from-underground',
      },
    },
    ask: 'Why would anyone defend 2 × 2 = 5?',
    answer:
      'He isn’t claiming the sum is wrong. He’s attacking the idea that people will always act on calculated self-interest, as if reason could write out a table of what we want. Choosing against the formula — even absurdly — is his proof that he’s free. It sets up the next pages, where he says a man might love suffering, chaos and caprice simply because they’re his.',
  },
  {
    bookId: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    page: 65,
    left: [
      '“Abhorred monster! fiend that thou art! the tortures of hell are too mild a vengeance for thy crimes. Wretched devil! you reproach me with your creation; come on then, that I may extinguish the spark which I so negligently bestowed.”',
      'My rage was without bounds; I sprang on him, impelled by all the feelings which can arm one being against the existence of another.',
      'He easily eluded me, and said, “Be calm! I entreat you to hear me, before you give vent to your hatred on my devoted head. Have I not suffered enough, that you seek to increase my misery? Life, although it may only be an accumulation of anguish, is dear to me, and I will defend it.',
    ],
    right: [
      'I am thy creature, and I will be even mild and docile to my natural lord and king, if thou wilt also perform thy part, the which thou owest me. Oh, Frankenstein, be not equitable to every other, and trample upon me alone, to whom thy justice, and even thy clemency and affection, is most due. Remember that I am thy creature: I ought to be thy Adam; but I am rather the fallen angel, whom thou drivest from joy for no misdeed. Every where I see bliss, from which I alone am irrevocably excluded. I was benevolent and good; misery made me a fiend. Make me happy, and I shall again be virtuous.”',
      '“Begone! I will not hear you. There can be no community between you and me; we are enemies. Begone, or let us try our strength in a fight, in which one must fall.”',
    ],
    passage: 'I ought to be thy Adam; but I am rather the fallen angel, whom thou drivest from joy for no misdeed.',
    by: 'jun',
    comment: 'He’s been reading Paradise Lost (it comes up later), and he casts himself as both Adam and Satan in one breath.',
    replies: [
      {
        id: 'f1',
        name: 'clara.b',
        text: '“Misery made me a fiend” two lines down is the thesis of the whole novel.',
        votes: 12,
      },
      {
        id: 'f2',
        name: 'owen',
        text: 'Victor never answers him once in this scene. He just shouts.',
        votes: 5,
      },
    ],
    vip: null,
    ask: 'Why Adam and the fallen angel?',
    answer:
      'Both are Milton’s — the creature learns to read on Paradise Lost. Adam is the creation his maker loved and cared for; Satan is the one cast out. He’s saying he was made to be the first and has been treated as the second, “for no misdeed.” The blame lands on Victor: the fall came from the creator’s rejection, not the creature’s nature.',
  },
];
