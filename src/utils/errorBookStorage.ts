import { Attempt, Question, SubjectTag } from '../types';
import { getTodayIsoDateIST } from './istTime';

export interface ErrorBookEntry {
  id: string; // unique entry id
  questionId: string;
  question: Question;
  userSelectedOptionIndex: number | null;
  correctOptionIndex: number;
  testId: string;
  testTitle: string;
  dateAdded: string;
  subject: SubjectTag;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastered: boolean;
  retryAttempts: number;
  lastRetriedAt?: string;
  notes?: string;
}

const STORAGE_KEY_PREFIX = 'coc_error_book';

function getErrorBookStorageKey(userId?: string): string {
  return userId && userId.trim().length > 0
    ? `${STORAGE_KEY_PREFIX}_${userId.trim()}`
    : STORAGE_KEY_PREFIX;
}

function isDemoAccount(userId?: string): boolean {
  return userId === 'demo_user_001';
}

// Default starter mistakes strictly reserved for demo walkthrough account
export const INITIAL_ERROR_BOOK_ENTRIES: ErrorBookEntry[] = [
  {
    id: 'err_starter_1',
    questionId: 'q_quant_train_01',
    question: {
      id: 'q_quant_train_01',
      qIndex: 4,
      text: 'Two trains running in opposite directions cross a man standing on the platform in 27 seconds and 17 seconds respectively and they cross each other in 23 seconds. The ratio of their speeds is:',
      textTe: 'వ్యతిరేక దిశల్లో ప్రయాణిస్తున్న రెండు రైళ్లు ప్లాట్‌ఫారమ్‌పై నిలబడి ఉన్న వ్యక్తిని వరుసగా 27 సెకన్లు మరియు 17 సెకన్లలో దాటుతాయి మరియు అవి ఒకదానికొకటి 23 సెకన్లలో దాటుతాయి. వాటి వేగాల నిష్పత్తి ఎంత?',
      textHi: 'विपरीत दिशाओं में चल रही दो रेलगाड़ियां प्लेटफॉर्म पर खड़े एक व्यक्ति को क्रमशः 27 सेकंड और 17 सेकंड में पार करती हैं तथा वे एक-दूसरे को 23 सेकंड में पार करती हैं। उनकी गतियों का अनुपात क्या है?',
      options: ['1 : 3', '3 : 2', '3 : 4', '2 : 3'],
      optionsTe: ['1 : 3', '3 : 2', '3 : 4', '2 : 3'],
      optionsHi: ['1 : 3', '3 : 2', '3 : 4', '2 : 3'],
      correctIndex: 1, // '3 : 2'
      subject: 'Quantitative Aptitude',
      topic: 'Time, Speed & Distance',
      difficulty: 'medium',
      explanation: 'Let speeds be x and y. Lengths are 27x and 17y. When crossing each other: (27x + 17y) / (x + y) = 23 => 27x + 17y = 23x + 23y => 4x = 6y => x/y = 3/2.',
      explanationTe: 'వేగాలు x మరియు y అనుకుందాం. పొడవులు 27x మరియు 17y. ఒకదానికొకటి దాటినప్పుడు: (27x + 17y)/(x + y) = 23 => 4x = 6y => x/y = 3/2.',
      explanationHi: 'माना गतियाँ x और y हैं। दूरियाँ 27x और 17y हैं। एक-दूसरे को पार करने पर: (27x + 17y)/(x + y) = 23 => 4x = 6y => x/y = 3/2.',
    },
    userSelectedOptionIndex: 3, // picked 2:3 mistakenly
    correctOptionIndex: 1,
    testId: 'daily_official_298',
    testTitle: 'All-India Mock #298',
    dateAdded: '2026-10-24',
    subject: 'Quantitative Aptitude',
    topic: 'Time, Speed & Distance',
    difficulty: 'medium',
    mastered: false,
    retryAttempts: 1,
  },
  {
    id: 'err_starter_2',
    questionId: 'q_polity_art32_02',
    question: {
      id: 'q_polity_art32_02',
      qIndex: 12,
      text: 'Which of the following writs can be issued by the Supreme Court under Article 32 to secure the release of a person unlawfully detained?',
      textTe: 'చట్టవిరుద్ధంగా నిర్బంధించబడిన వ్యక్తిని విడుదల చేయడానికి అధికరణ 32 కింద సుప్రీంకోర్టు ఏ రిట్‌ను జారీ చేయవచ్చు?',
      textHi: 'अवैध रूप से हिरासत में लिए गए व्यक्ति को रिहा करने के लिए अनुच्छेद 32 के तहत सर्वोच्च न्यायालय द्वारा कौन सा रिट जारी किया जा सकता है?',
      options: ['Mandamus', 'Quo-Warranto', 'Habeas Corpus', 'Certiorari'],
      optionsTe: ['మాండమస్', 'కో-వారంటో', 'హేబియస్ కార్పస్', 'సెర్టియోరారి'],
      optionsHi: ['परमादेश (Mandamus)', 'अधिकार पृच्छा (Quo-Warranto)', 'बंदी प्रत्यक्षीकरण (Habeas Corpus)', 'उत्प्रेषण (Certiorari)'],
      correctIndex: 2, // Habeas Corpus
      subject: 'General Awareness',
      topic: 'Indian Polity & Constitution',
      difficulty: 'easy',
      explanation: 'Habeas Corpus literally means "to have the body of". It is issued to produce a person who has been detained, whether in prison or in private custody, before a court.',
      explanationTe: 'హేబియస్ కార్పస్ అంటే "శరీరాన్ని హాజరుపరచుట". చట్టవిరుద్ధంగా నిర్బంధించిన వ్యక్తిని కోర్టు ముందు ప్రవేశపెట్టడానికి ఇది జారీ చేయబడుతుంది.',
      explanationHi: 'बंदी प्रत्यक्षीकरण (Habeas Corpus) का शाब्दिक अर्थ है "शरीर को प्रस्तुत किया जाए"। यह अवैध रूप से हिरासत में लिए गए व्यक्ति के लिए जारी किया जाता है।',
    },
    userSelectedOptionIndex: 0, // mistakenly picked Mandamus
    correctOptionIndex: 2,
    testId: 'daily_official_298',
    testTitle: 'All-India Mock #298',
    dateAdded: '2026-10-24',
    subject: 'General Awareness',
    topic: 'Indian Polity & Constitution',
    difficulty: 'easy',
    mastered: false,
    retryAttempts: 0,
  },
  {
    id: 'err_starter_3',
    questionId: 'q_reasoning_syllogism_03',
    question: {
      id: 'q_reasoning_syllogism_03',
      qIndex: 19,
      text: 'Statements: All pens are books. Some books are pencils. Conclusions: I. Some pens are pencils. II. No pen is pencil.',
      textTe: 'ప్రకటనలు: అన్ని పెన్నులు పుస్తకాలు. కొన్ని పుస్తకాలు పెన్సిళ్లు. ముగింపులు: I. కొన్ని పెన్నులు పెన్సిళ్లు. II. ఏ పెన్ను పెన్సిల్ కాదు.',
      textHi: 'कथन: सभी कलम पुस्तकें हैं। कुछ पुस्तकें पेंसिल हैं। निष्कर्ष: I. कुछ कलम पेंसिल हैं। II. कोई कलम पेंसिल नहीं है।',
      options: ['Only I follows', 'Only II follows', 'Either I or II follows', 'Neither I nor II follows'],
      optionsTe: ['I మాత్రమే అనుసరిస్తుంది', 'II మాత్రమే అనుసరిస్తుంది', 'I లేదా II ఏదో ఒకటి అనుసరిస్తుంది', 'రెండూ అనుసరించవు'],
      optionsHi: ['केवल I अनुसरण करता है', 'केवल II अनुसरण करता है', 'या तो I या II अनुसरण करता है (Either/Or)', 'ना तो I ना II अनुसरण करता है'],
      correctIndex: 2, // Either I or II follows (Complementary pair)
      subject: 'Reasoning & Intelligence',
      topic: 'Syllogism (Complementary Pairs)',
      difficulty: 'hard',
      explanation: 'Both subject (pens) and predicate (pencils) are same. One statement is affirmative (Some) and the other is negative (No), forming a valid complementary Either-Or pair.',
      explanationTe: 'రెండు ముగింపులలో సబ్జెక్ట్ మరియు ప్రిడికేట్ ఒకటే. ఒకటి పాజిటివ్ మరియు మరొకటి నెగటివ్, కాబట్టి ఇది Either-Or జంట అవుతుంది.',
      explanationHi: 'दोनों निष्कर्षों में पद समान हैं। एक सकारात्मक (कुछ) और एक नकारात्मक (कोई नहीं) है, जो Either-Or की पूरक जोड़ी बनाते हैं।',
    },
    userSelectedOptionIndex: 3, // mistakenly selected Neither
    correctOptionIndex: 2,
    testId: 'daily_official_297',
    testTitle: 'All-India Mock #297',
    dateAdded: '2026-10-23',
    subject: 'Reasoning & Intelligence',
    topic: 'Syllogism (Complementary Pairs)',
    difficulty: 'hard',
    mastered: false,
    retryAttempts: 2,
  },
];

export function getErrorBookEntries(userId?: string): ErrorBookEntry[] {
  const demoSeed = isDemoAccount(userId);
  if (typeof window === 'undefined') {
    return demoSeed ? INITIAL_ERROR_BOOK_ENTRIES : [];
  }
  const key = getErrorBookStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (demoSeed) {
        localStorage.setItem(key, JSON.stringify(INITIAL_ERROR_BOOK_ENTRIES));
        return INITIAL_ERROR_BOOK_ENTRIES;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return demoSeed ? INITIAL_ERROR_BOOK_ENTRIES : [];
  }
}

export function saveErrorBookEntries(entries: ErrorBookEntry[], userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getErrorBookStorageKey(userId), JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save error book entries', err);
  }
}

export function addMistakesFromAttempt(
  attempt: Attempt,
  questions: Question[],
  testTitle = '7:00 PM All-India Daily Test',
  userId?: string
): number {
  const effectiveUserId = userId || attempt.studentId;
  const currentEntries = getErrorBookEntries(effectiveUserId);
  const existingQIds = new Set(currentEntries.map((e) => e.questionId));
  const newEntries: ErrorBookEntry[] = [];
  const todayIst = getTodayIsoDateIST();

  (attempt.answers || []).forEach((ans) => {
    const pickedIdx = ans.selectedOptionIndex ?? ans.selectedOption;
    if (pickedIdx === undefined || pickedIdx === null) return;

    const q = questions.find(
      (item) => item.id === ans.questionId || item.qIndex === ans.questionIndex
    );
    if (!q || existingQIds.has(q.id)) return;

    const isIncorrect =
      ans.isCorrect === false || (typeof pickedIdx === 'number' && pickedIdx !== q.correctIndex);

    if (isIncorrect) {
      existingQIds.add(q.id);
      newEntries.push({
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        questionId: q.id,
        question: q,
        userSelectedOptionIndex: pickedIdx,
        correctOptionIndex: q.correctIndex,
        testId: attempt.testId,
        testTitle: attempt.customTestTitle || testTitle,
        dateAdded: todayIst,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        mastered: false,
        retryAttempts: 0,
      });
    }
  });

  if (newEntries.length > 0) {
    const combined = [...newEntries, ...currentEntries];
    saveErrorBookEntries(combined, effectiveUserId);
  }

  return newEntries.length;
}

export function markQuestionMastered(entryId: string, userId?: string): void {
  const entries = getErrorBookEntries(userId);
  const updated = entries.map((e) => (e.id === entryId ? { ...e, mastered: true } : e));
  saveErrorBookEntries(updated, userId);
}

export function recordRetryResult(entryId: string, isCorrect: boolean, userId?: string): void {
  const entries = getErrorBookEntries(userId);
  const updated = entries.map((e) => {
    if (e.id === entryId) {
      return {
        ...e,
        mastered: isCorrect,
        retryAttempts: (e.retryAttempts || 0) + 1,
        lastRetriedAt: new Date().toISOString(),
      };
    }
    return e;
  });
  saveErrorBookEntries(updated, userId);
}

export function removeErrorBookEntry(entryId: string, userId?: string): void {
  const entries = getErrorBookEntries(userId);
  const updated = entries.filter((e) => e.id !== entryId);
  saveErrorBookEntries(updated, userId);
}
