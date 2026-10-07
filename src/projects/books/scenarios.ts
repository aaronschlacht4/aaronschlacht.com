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
  /** the app's extracted text for the page before, this page, and the page after */
  left: string[];
  right: string[];
  after: string[];
  /** the highlighted passage: an exact substring of `right` */
  passage: string;
  /** the chapter the reader's bar shows for this page */
  chapter: string;
  /** the source page's width / height, which sets the sheets' shape */
  aspect: number;
  /** average characters per source page, which sets the type size */
  charsPerPage: number;
  /** pages in the book */
  total: number;
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
    after: [
      'deeper meaning to his life. It may remain brave, dignified and unselfish. Or in the bitter fight for selfpreservation he may forget his human dignity and become no more than an animal. Here lies the chance for a man either to make use of or to forgo the opportunities of attaining the moral values that a difficult situation may afford him. And this decides whether he is worthy of his sufferings or not.',
      'Do not think that these considerations are unworldly and too far removed from real life. It is true that only a few people are capable of reaching such high moral standards. Of the prisoners only a few kept their full inner liberty and obtained those values which their suffering afforded, but even one such example is sufficient proof that man\'s inner strength may raise him above his outward fate. Such men are not only in concentration camps. Everywhere man is confronted with fate, with the chance of achieving something through his own suffering.',
      'Take the fate of the sick—especially those who are incurable. I once read a letter written by a young invalid, in which he told a friend that he had just found out he would not live for long, that even an operation would be of no help. He wrote further that he remembered a film he had seen in which a man was portrayed who waited for death in a courageous and dignified way. The boy had thought it a great accomplishment to meet death so well. Now—he wrote—fate was offering him a similar chance.',
    ],
    passage:
      'everything can be taken from a man but one thing: the last of the human freedoms—to choose one’s attitude in any given set of circumstances, to choose one’s own way.',
    chapter: 'Part One',
    aspect: 595 / 842,
    charsPerPage: 3793,
    total: 69,
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
    after: [
      'I know man prizes it and would not give it up for any satisfaction. Consciousness, for instance, is infinitely superior to twice two makes four. Once you have mathematical certainty there is nothing left to do or to understand. There will be nothing left but to bottle up your five senses and plunge into contemplation. While if you stick to consciousness, even though the same result is attained, you can at least flog yourself at times, and that will, at any rate, liven you up. Reactionary as it is, corporal punishment is better than nothing.',
    ],
    passage: 'twice two makes five is sometimes a very charming thing too.',
    chapter: 'Part I',
    aspect: 396 / 612,
    charsPerPage: 1277,
    total: 187,
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
    after: [
      'favourable eye upon thy creature, who implores thy goodness and compassion. Believe me, Frankenstein: I was benevolent; my soul glowed with love and humanity: but am I not alone, miserably alone? You, my creator, abhor me; what hope can I gather from your fellow-creatures, who owe me nothing? they spurn and hate me. The desert mountains and dreary glaciers are my refuge. I have wandered here many days; the caves of ice, which I only do not fear, are a dwelling to me, and the only one which man does not grudge. These bleak skies I hail, for they are kinder to me than your fellow-beings. If the multitude of mankind knew of my existence, they would do as you do, and arm themselves for my destruction. Shall I not then hate them who abhor me? I will keep no terms with my enemies. I am miserable, and they shall share my wretchedness. Yet it is in your power to recompense me, and deliver them from an evil which it only remains for you to make so great, that not only you and your family, but thousands of others, shall be swallowed up in the whirlwinds of its rage. Let your compassion be moved, and do not disdain me. Listen to my tale: when you have heard that, abandon or commiserate me, as you shall judge that I deserve. But hear me.',
      '“Thus I relieve thee, my creator,” he said, and placed his hated hands before my eyes, which I flung from me with violence; “thus I take from thee a sight which you abhor. Still thou canst listen to me, and grant me thy compassion. By the virtues that I once possessed, I demand this from you. Hear my tale; it is long and strange, and the temperature of this place is not fitting to your fine sensations; come to the hut upon the mountain.',
    ],
    passage: 'I ought to be thy Adam; but I am rather the fallen angel, whom thou drivest from joy for no misdeed.',
    chapter: 'Chapter VII',
    aspect: 595 / 792,
    charsPerPage: 2660,
    total: 180,
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
