/**
 * Content filter — blocks profanity, slurs, romantic/sexual language,
 * and offensive content in English and Hindi/Hinglish.
 *
 * Strategy: Two-stage matching:
 * 1. EXACT_TERMS: full phrase matching (for multi-word phrases)
 * 2. STEM_TERMS:  prefix/stem matching (catches all variations like
 *    chutiya/chutiye/chutiyapan/chutiyagiri automatically)
 *
 * Returns { blocked: boolean, reason: string }.
 */

// ---------------------------------------------------------------------------
// Stage 1: Exact / phrase terms (matched as substrings after normalisation)
// ---------------------------------------------------------------------------
const EXACT_TERMS = [
  // ── English profanity ────────────────────────────────────────────────────
  'fuck', 'fuk', 'fck', 'f.u.c.k',
  'shit', 'bullshit',
  'bitch', 'btch',
  'asshole', 'arsehole',
  'bastard',
  'cunt',
  'dickhead', 'dickwad', 'dickweed',
  'cocksucker',
  'motherfucker', 'mofo',
  'son of a bitch', 'sonofabitch',
  'kill yourself', 'kys',
  'go to hell', 'go fuck',
  'dumbass', 'dumbfuck', 'dumbshit',
  'shithead', 'shitface', 'shitbag', 'shitbrain',
  'fuckwit', 'fuckhead', 'fuckface', 'fuckwad',
  'jackass', 'assclown', 'assface', 'asswipe',
  'scumbag',
  'wanker', 'tosser', 'twat', 'prick',

  // ── Sexual / porn terms ──────────────────────────────────────────────────
  'porn', 'porno', 'pornography',
  'nude', 'nudes', 'nudity',
  'naked',
  'sex', 'sexting', 'sext',
  'blowjob', 'blow job', 'handjob', 'hand job',
  'penis', 'vagina', 'boobs', 'boob',
  'anal', 'oral sex',
  'cum', 'cumshot',
  'masturbat',
  'dildo', 'vibrator',
  'xxx', 'onlyfans',
  'horny',

  // ── Romantic / solicitation ──────────────────────────────────────────────
  'i love you', 'i luv u', 'i luv you', 'love u', 'luv u',
  'i miss you', 'miss u', 'missing you',
  'marry me', 'shaadi karogi', 'shadi karoge',
  'my love', 'my darling', 'my sweetheart', 'my baby', 'my babe',
  'you are so hot', 'you are sexy', 'so hot', 'so sexy',
  'i want you', 'i need you',
  'kiss me', 'hug me', 'kisses', 'hugs and kisses',
  'send nudes', 'send pics', 'send photo',
  'apna number do', 'number share', 'number do',
  'personal number', 'whatsapp number', 'instagram id',
  'will you be my girlfriend', 'will you be my boyfriend',
  'be my gf', 'be my bf',
  'date me', 'date with me', 'lets meet',
  'crush on you', 'i have crush', 'you are my crush',
  'pyaar', 'mohabbat', 'ishq',
  'jaan', 'jaanu', 'baby', 'babe', 'sweety', 'cutie',

  // ── Hindi/Hinglish — multi-word phrases ──────────────────────────────────
  'tere maa ki', 'teri maa', 'teri ma',
  'teri behen', 'teri behan', 'teri bhen',
  'teri gaand', 'gaand mara', 'gaand maar',
  'gand mara', 'gand maar',
  'maa chuda', 'maa ko', 'maa ki',
  'bhen ke lode',
  'randi ki aulaad', 'randi ki aulad',
  'haram ki aulaad', 'haram ki aulad', 'haram ki paidaish',
  'ullu ka pattha', 'ullu ki aulaad',
  'kutte ka baccha', 'kutti ki aulaad',
  'suar ka baccha', 'suar ki aulaad',
  'maar dunga', 'tod dunga',
  'i will kill', 'i will hurt', 'i will find you',
  'you will die', 'go die',
  'machhar ki jhat',
  'nunu sad jaye',
  'bhad mein jao', 'bhad me jao',
  'sharam se doob mar',
  'hawas ka pujari',
];

// ---------------------------------------------------------------------------
// Stage 2: Stem terms — any word STARTING with these is blocked
// This catches: chutiya, chutiye, chutiyapan, chutiyagiri, chutiyapanti etc.
// ---------------------------------------------------------------------------
const STEM_TERMS = [
  // ── Core Hindi gaaliyan (stems) ──────────────────────────────────────────
  'chutiy', 'chut',        // chutiya, chutiye, chutiyapan, chutiyagiri, chut
  'madarchod', 'maderchod', 'madharchod', 'madar', 'madhar',
  'behenchod', 'bhenchod', 'behnchod', 'bhen',
  'gaandu', 'gandu', 'gaand', 'gand',
  'bhosdik', 'bhosdic', 'bhosdiw', 'bhosdib', 'bhosdi', 'bhosad', 'bhosd',
  'randi', 'randw', 'randv', 'rand',
  'harami', 'haramz', 'haramkh', 'haram',
  'lavd', 'laud', 'lod', 'lawd', 'lawad',
  'lund',
  'jhat',
  'jhaat',
  'tattu', 'tatt',
  'fuddi', 'phuddi',
  'bkl', 'bsdk', 'bkc', 'mkl', 'mkc',
  'mc ', ' mc', '^mc$',   // standalone mc
  ' bc', 'bc ', '^bc$',   // standalone bc
  'bakchod',
  'bakchoda',
  'baklol',
  'bhadw', 'bhadv',
  'burchood', 'burchod',
  'betichood', 'betichod',
  'bokachod', 'boka chod',
  'sisterfuck', 'sister fuck',
  'chod',
  'maa chud',
  'kamina', 'kamine', 'kameena', 'kameene', 'kamini',
  'kutte', 'kutta', 'kutti', 'kutiy',
  'suar', 'suwar',
  'gadha', 'gadhi', 'gadhe',
  'ullu',
  'jhatu',
  'saala', 'saali', 'saale', 'sala',
  'nalayak', 'naalayak',
  'nikamma', 'nikammi', 'nikamme',
  'ghatiya',
  'gawar', 'gawaar', 'ganwar', 'ganvaar',
  'jaahil', 'jahil',
  'anpadh', 'anpad',
  'besharam',
  'tharki',
  'lafanga', 'lafange', 'lafangi',
  'awara', 'awaara',
  'badmaash', 'badmash', 'badmosh',
  'gunda', 'goonda', 'gunde', 'goonde',
  'mawali', 'mawaali',
  'tapori',
  'chapri', 'chhapri',
  'chomu',
  'dhakkan',
  'pagal', 'paagal',
  'bewakoof', 'bewkuf', 'bevakoof',
  'dhokebaaz', 'dhokhebaz', 'dagabaaz',
  'namakharam',
  'matlabi',
  'kanjoos', 'kanjus',
];

// ---------------------------------------------------------------------------
// Build regexes
// ---------------------------------------------------------------------------

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Exact terms regex — whole-word / phrase match
const exactParts = [...EXACT_TERMS]
  .sort((a, b) => b.length - a.length)
  .map(term => {
    const escaped = escape(term).replace(/ +/g, '[\\s_\\-]*');
    return term.includes(' ') ? escaped : `\\b${escaped}`;
  });
const EXACT_REGEX = new RegExp(exactParts.join('|'), 'i');

// Stem terms regex — word starts-with match (prefix)
const stemParts = [...STEM_TERMS]
  .sort((a, b) => b.length - a.length)
  .map(term => {
    // Handle standalone terms with ^ and $
    if (term.startsWith('^') || term.includes('$')) return term;
    const escaped = escape(term);
    return `\\b${escaped}`;   // matches at start of word
  });
const STEM_REGEX = new RegExp(stemParts.join('|'), 'i');

// ---------------------------------------------------------------------------
// Normalise helper — collapses leet-speak substitutions
// ---------------------------------------------------------------------------
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    .replace(/\*/g, '')
    .replace(/\.+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a message contains blocked content.
 * @param {string} message
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function checkContent(message) {
  if (!message || typeof message !== 'string') return { blocked: false };

  const normalised = normalise(message);

  if (EXACT_REGEX.test(normalised) || STEM_REGEX.test(normalised)) {
    return {
      blocked: true,
      reason: 'Your message contains inappropriate content and was not sent.',
    };
  }

  return { blocked: false };
}
