import type { SubjectTag } from '../types/index.ts';
import {
  EXAM_CATEGORIES,
  type ExamCategory,
  type StudyPlanDay,
  type StudyPlanOverride,
} from '../types/aiSystem.ts';
import { getTodayIsoDateIST } from './istTime.ts';

export const TOTAL_SYLLABUS_WEEKS = 100;
export const DAYS_PER_SYLLABUS_WEEK = 5;
export const TOTAL_SYLLABUS_TOPICS = TOTAL_SYLLABUS_WEEKS * DAYS_PER_SYLLABUS_WEEK;

/**
 * Exact 100-Week / 500-Topic Master Plan:
 * - Phase 1: Quantitative Aptitude (Weeks 1–35, 175 topics)
 * - Phase 2: Reasoning & Logic (Weeks 36–60, 125 topics)
 * - Phase 3: English Language (Weeks 61–73, 65 topics)
 * - Phase 4: General Awareness (Weeks 74–100, 135 topics)
 */
const WEEKLY_500_TOPICS: ReadonlyArray<readonly [string, string, string, string, string]> = [
  // Phase 1: Quantitative Aptitude (W001–W035)
  ['Types of Numbers', 'Divisibility Rules', 'HCF & LCM', 'Unit Digit & Cyclicity', 'Number Properties'], // W001
  ['Fraction Operations', 'Decimal Operations', 'Recurring Decimals', 'Surds & Indices', 'Simplification'], // W002
  ['Percentage Calculation', 'Percentage Change', 'Population Growth', 'Depreciation', 'Successive Percentage'], // W003
  ['Ratio Basics', 'Partnership', 'Mean Proportional', 'Mixture Problems', 'Advanced Ratio'], // W004
  ['Simple Average', 'Weighted Average', 'Average Speed', 'Alligation Rule', 'Mixture Problems'], // W005
  ['Cost Price, Selling Price', 'Profit/Loss Percentage', 'Discount & MP', 'Successive Discount', 'Faulty Weights'], // W006
  ['SI Formula', 'Finding Rate/Time/Principal', 'Equal Interest Problems', 'Installments in SI', 'Multiple Loan Schemes'], // W007
  ['Annual Compounding', 'Half-yearly Compounding', 'Difference SI & CI', 'Finding Rate in CI', 'Finding Time in CI'], // W008
  ['Basic Work Formula', 'Work Efficiency', 'Wages Distribution', 'Alternate Day Work', 'Work with Leaving/Joining'], // W009
  ['Inlet Pipes', 'Outlet Pipes', 'Leakage Problems', 'Alternate Opening', 'Multiple Pipe Systems'], // W010
  ['Basic TSD Formula', 'Average Speed', 'Relative Speed Same Direction', 'Relative Speed Opposite Direction', 'Train Problems (Pole/Man)'], // W011
  ['Train Problems (Platform)', 'Trains Crossing Each Other', 'Boat & Stream Downstream', 'Boat & Stream Upstream', 'Speed of Boat/Stream Finding'], // W012
  ['Algebraic Identities', 'Linear Equations One Variable', 'Linear Equations Two Variables', 'Quadratic Equations Factorization', 'Quadratic Equations Formula'], // W013
  ['Sum & Product of Roots', 'Nature of Roots', 'Sequence & Series Basics', 'Arithmetic Progression', 'Geometric Progression'], // W014
  ['Lines & Angles', 'Triangle Types & Properties', 'Triangle Congruence', 'Triangle Similarity', 'Pythagoras Theorem'], // W015
  ['Triangle Centers', 'Quadrilateral Properties', 'Circle Theorems Chord', 'Circle Theorems Tangent', 'Cyclic Quadrilaterals'], // W016
  ['Distance Formula', 'Section Formula', 'Slope of Line', 'Area of Triangle Coordinates', 'Straight Line Equations'], // W017
  ['Square Area & Perimeter', 'Rectangle Area & Perimeter', 'Triangle Area & Perimeter', 'Circle Area & Circumference', 'Complex 2D Shapes'], // W018
  ['Cube Volume & Surface Area', 'Cuboid Volume & Surface Area', 'Cylinder Volume & Surface Area', 'Cone Volume & Surface Area', 'Sphere Volume & Surface Area'], // W019
  ['Trigonometric Ratios', 'Trigonometric Identities', 'Complementary Angles', 'Specific Angle Values', 'Height & Distance'], // W020
  ['Permutation Basics', 'Combination Basics', 'Probability Dice', 'Probability Coins', 'Probability Cards'], // W021
  ['Probability Balls in Bag', 'Conditional Probability', 'Set Theory Basics', 'Statistics Mean, Median, Mode', 'Range & Frequency'], // W022
  ['Table DI Simple', 'Table DI Percentage', 'Pie Chart Single', 'Pie Chart Multiple', 'Bar Graph Vertical'], // W023
  ['Bar Graph Horizontal', 'Bar Graph Stacked', 'Line Graph Single', 'Line Graph Multiple', 'Mixed Graphs'], // W024
  ['Caselets', 'Data Sufficiency', 'Radar DI', 'Advanced Table DI', 'Complex Pie Charts'], // W025
  ['Number Series Advanced', 'Mathematical Operations', 'Calendar Calculations', 'Clock Problems', 'Mathematical Puzzles'], // W026
  ['SI Applications', 'CI Applications', 'Profit/Loss in Business', 'Percentage in Finance', 'Growth Rate Calculations'], // W027
  ['Age Problems Advanced', 'Number Problems Advanced', 'Business Mathematics', 'Stock & Shares', 'Measurement Systems'], // W028
  ['Real-world Applications', 'Advanced Calculations', 'Approximation Techniques', 'Quick Maths Methods', 'Problem Solving Strategies'], // W029
  ['Basic QC', 'Variable QC', 'Algebraic QC', 'Geometric QC', 'DI based QC'], // W030
  ['Mean Applications', 'Median Applications', 'Mode Applications', 'Standard Deviation', 'Data Analysis Techniques'], // W031
  ['Equations with Modulus', 'Algebraic Inequalities', 'Maximum/Minimum Values', 'Functions Basics', 'Advanced Sequences'], // W032
  ['Similar Triangle Applications', 'Advanced Circle Theorems', '3D Geometry Basics', 'Coordinate Geometry Advanced', 'Complex Shape Analysis'], // W033
  ['Permutation Restrictions', 'Combination Groups', 'Probability Combined Events', 'Set Theory Applications', 'Advanced Statistics'], // W034
  ['Complex Word Problems', 'Multi-concept Problems', 'Time-bound Solving', 'Accuracy Techniques', 'Advanced Problem Solving'], // W035

  // Phase 2: Reasoning & Logic (W036–W060)
  ['Alphabet Series Single', 'Alphabet Series Double', 'Number Series Addition/Subtraction', 'Number Series Multiplication/Division', 'Number Series Square/Cube'], // W036
  ['Number Series Prime/Composite', 'Mixed Series Patterns', 'Alphanumeric Series', 'Symbol Series', 'Complex Series Patterns'], // W037
  ['Word Analogies Synonyms', 'Word Analogies Antonyms', 'Word Analogies Worker-Tool', 'Word Analogies Part-Whole', 'Word Analogies Cause-Effect'], // W038
  ['Number Analogies Simple', 'Number Analogies Logic-based', 'Mixed Analogies', 'Complex Relationships', 'Analogy Applications'], // W039
  ['Word Classification Meaning', 'Word Classification Odd-one-out', 'Number Classification', 'Letter Classification', 'Mixed Classification'], // W040
  ['Letter Coding Forward/Backward', 'Number Coding Position-based', 'Mixed Letter-Number Coding', 'Symbol Coding', 'Conditional Coding'], // W041
  ['Matrix Coding', 'Message Word Codes', 'Coding by Analogy', 'Binary Coding', 'Clock-based Coding'], // W042
  ['Simple Family Relations', 'Coded Relations', 'Family Tree Problems', 'Complex Relations', 'Multiple Family Problems'], // W043
  ['Basic Direction Concepts', 'Complex Direction Paths', 'Direction with Distance', 'Shadow-based Directions', 'Direction Puzzles'], // W044
  ['Rank from Left/Right', 'Rank in Queue', 'Height/Weight Ordering', 'Age-based Ordering', 'Multiple Parameter Ordering'], // W045
  ['Single Row Arrangements', 'Double Row Arrangements', 'North-South Facing', 'Complex Linear Sets', 'Linear with Multiple Parameters'], // W046
  ['Facing Centre', 'Facing Outward', 'Mixed Facing', 'Circular with Gaps', 'Complex Circular'], // W047
  ['Square Arrangements', 'Rectangular Facing', 'Mixed Shape Arrangements', 'Complex Seating', 'Multi-table Arrangements'], // W048
  ['Single Parameter Floors', 'Double Parameter Floors', 'Multiple Parameters', 'Complex Floor Systems', 'Building-based Puzzles'], // W049
  ['Days of Week', 'Months/Dates', 'Time-based Scheduling', 'Multiple Events', 'Complex Scheduling'], // W050
  ['2-Statement Syllogism', '3-Statement Syllogism', 'Either-or Cases', 'Coded Syllogism', 'Complex Syllogism'], // W051
  ['Statement-Conclusion Definite', 'Statement-Conclusion Possibility', 'Statement-Assumption Necessary', 'Statement-Assumption Possible', 'Statement-Argument Strong/Weak'], // W052
  ['Cause & Effect', 'Course of Action', 'Inference Drawing', 'Logical Consistency', 'Paradox Resolution'], // W053
  ['Group Formation', 'Selection Problems', 'Distribution Problems', 'Comparison Puzzles', 'Logical Sequence'], // W054
  ['Condition-based Decisions', 'Data-based Decisions', 'Ethical Decision Making', 'Administrative Decisions', 'Complex Scenario Analysis'], // W055
  ['Figure Series Completion', 'Missing Figure Series', 'Figure Analogy', 'Figure Classification', 'Pattern Completion'], // W056
  ['Mirror Images Vertical', 'Mirror Images Horizontal', 'Water Images', 'Paper Folding', 'Paper Cutting'], // W057
  ['Cube Faces Counting', 'Cube Painting', 'Dice Standard Problems', 'Dice Unfolded Nets', 'Cube Assembly'], // W058
  ['Venn Diagrams 2-circle', 'Venn Diagrams 3-circle', 'Counting Figures Triangles', 'Counting Figures Squares', 'Counting Figures Rectangles'], // W059
  ['Embedded Figures Simple', 'Embedded Figures Complex', 'Figure Completion', 'Dot Situation', 'Shape Rotation'], // W060

  // Phase 3: English Language (W061–W073)
  ['Nouns & Types', 'Pronouns & Usage', 'Verbs & Tenses', 'Adjectives & Degrees', 'Adverbs & Types'], // W061
  ['Prepositions & Usage', 'Conjunctions & Types', 'Interjections', 'Articles & Determiners', 'Subject-Verb Agreement'], // W062
  ['Present Tenses', 'Past Tenses', 'Future Tenses', 'Perfect Tenses', 'Continuous Tenses'], // W063
  ['Active-Passive Voice', 'Direct-Indirect Speech', 'Question Tags', 'Modals & Auxiliaries', 'Conditionals'], // W064
  ['Sentence Types', 'Clause Analysis', 'Phrase Usage', 'Parallelism', 'Sentence Variety'], // W065
  ['Tense Errors', 'Subject-Verb Errors', 'Pronoun Errors', 'Preposition Errors', 'Article Errors'], // W066
  ['Conjunction Errors', 'Modifier Errors', 'Parallelism Errors', 'Redundancy Errors', 'Ambiguity Errors'], // W067
  ['Phrase Replacement', 'Error Correction', 'Sentence Rearrangement', 'Para Jumbles', 'Sentence Completion'], // W068
  ['Synonyms', 'Antonyms', 'One Word Substitution', 'Homophones/Homonyms', 'Confusables'], // W069
  ['Idioms & Phrases', 'Phrasal Verbs', 'Foreign Words', 'Word Analogies', 'Contextual Vocabulary'], // W070
  ['Fact-based RC', 'Inference-based RC', 'Vocabulary-in-context', 'Tone & Purpose', 'Main Idea & Theme'], // W071
  ['Complex Passage Analysis', 'Critical Reading', 'Comparative Reading', 'Technical Passage', 'Literary Passage'], // W072
  ['Cloze Test', 'Para Completion', 'Sentence Connectors', 'Word Usage', 'Spelling & Punctuation'], // W073

  // Phase 4: General Awareness (W074–W100)
  ['Indus Valley Civilization', 'Vedic Period', 'Mahajanapadas', 'Mauryan Empire', 'Gupta Empire'], // W074
  ['Delhi Sultanate', 'Mughal Empire', 'Bhakti Movement', 'Sufi Movement', 'Maratha Empire'], // W075
  ['Advent of Europeans', 'British East India Company', 'Revolt of 1857', 'Social Reform Movements', 'Indian National Congress'], // W076
  ['Gandhian Era', 'Revolutionary Movements', 'Constitutional Development', 'Independence & Partition', 'Governor Generals & Viceroys'], // W077
  ['Architecture & Monuments', 'Dance Forms', 'Music Traditions', 'Painting Styles', 'Literature & Languages'], // W078
  ['Earth & Universe', 'Landforms & Rocks', 'Climate & Weather', 'Natural Vegetation', 'Soil Types'], // W079
  ['Physical Features India', 'River Systems India', 'Climate & Monsoon', 'Natural Resources', 'Agriculture Patterns'], // W080
  ['Continents & Oceans', 'Major Landforms', 'Climate Zones', 'Economic Geography', 'Environmental Geography'], // W081
  ['Ecosystem Types', 'Biodiversity', 'Conservation Efforts', 'Environmental Pollution', 'Climate Change'], // W082
  ['Natural Disasters', 'Man-made Disasters', 'Disaster Preparedness', 'Mitigation Strategies', 'Government Initiatives'], // W083
  ['Constitution Features', 'Preamble', 'Fundamental Rights', 'Directive Principles', 'Fundamental Duties'], // W084
  ['Union Executive', 'Parliament', 'Judiciary', 'State Government', 'Local Government'], // W085
  ['Election Process', 'Political Parties', 'Federal Structure', 'Center-State Relations', 'Important Laws'], // W086
  ['Economic Concepts', 'National Income', 'Planning in India', 'Economic Reforms', 'Poverty & Unemployment'], // W087
  ['Agriculture Sector', 'Industry Sector', 'Service Sector', 'Banking System', 'Public Finance'], // W088
  ['Education System', 'Health & Family Welfare', 'Poverty Alleviation', 'Rural Development', 'Urban Development'], // W089
  ['Microeconomics Concepts', 'Macroeconomics Concepts', 'Inflation & Deflation', 'Monetary Policy', 'International Trade'], // W090
  ['Physics Fundamentals', 'Chemistry Fundamentals', 'Biology Fundamentals', 'Scientific Laws', 'Inventions & Discoveries'], // W091
  ['Information Technology', 'Communication Technology', 'Space Technology', 'Defense Technology', 'Biotechnology'], // W092
  ['Computer Basics', 'Hardware Components', 'Software Types', 'Operating Systems', 'Memory & Storage'], // W093
  ['Computer Networks', 'Internet & Web', 'Database Management', 'Programming Basics', 'Cyber Security'], // W094
  ['Banking History', 'Types of Banks', 'Banking Products', 'Digital Banking', 'RBI & its Functions'], // W095
  ['Capital Markets', 'Money Markets', 'Stock Exchanges', 'Mutual Funds', 'Insurance Sector'], // W096
  ['Financial Regulators', 'Monetary Policy', 'Fiscal Policy', 'Economic Survey', 'Union Budget'], // W097
  ['International Organizations', 'World Politics', 'Indian Foreign Policy', 'Bilateral Relations', 'Global Issues'], // W098
  ['National Awards', 'International Awards', 'Sports Tournaments', 'Player Achievements', 'Sports Governance'], // W099
  ['Government Schemes', 'Important Days', 'Books & Authors', 'Cultural Events', 'Famous Personalities'], // W100
];

export function formatDayKey(weekNumber: number, dayNumber: number): string {
  return `W${String(weekNumber).padStart(3, '0')}_D${dayNumber}`;
}

export function getSubjectForWeek(weekNumber: number): SubjectTag {
  if (weekNumber <= 35) return 'Quantitative Aptitude';
  if (weekNumber <= 60) return 'Reasoning & Intelligence';
  if (weekNumber <= 73) return 'English Comprehension';
  return 'General Awareness';
}

export function getDifficultyDistributionForWeek(weekNumber: number): {
  easy: number;
  medium: number;
  hard: number;
} {
  if (weekNumber <= 25) {
    return { easy: 60, medium: 30, hard: 10 };
  }
  if (weekNumber <= 60) {
    return { easy: 30, medium: 50, hard: 20 };
  }
  if (weekNumber <= 85) {
    return { easy: 15, medium: 45, hard: 40 };
  }
  return { easy: 10, medium: 40, hard: 50 };
}

export function getPhaseLabelForWeek(weekNumber: number): string {
  if (weekNumber <= 35) return 'Phase 1: Quantitative Aptitude (W1–W35)';
  if (weekNumber <= 60) return 'Phase 2: Reasoning & Logic (W36–W60)';
  if (weekNumber <= 73) return 'Phase 3: English Language (W61–W73)';
  return 'Phase 4: General Awareness (W74–W100)';
}

function getRecommendedCategoriesForSubject(subject: SubjectTag): ExamCategory[] {
  if (subject === 'Quantitative Aptitude') {
    return ['SSC', 'Banking', 'RRB NTPC', 'SI', 'APPSC', 'TSPSC'];
  }
  if (subject === 'Reasoning & Intelligence') {
    return ['SSC', 'Banking', 'RRB NTPC', 'Police Constable', 'SI'];
  }
  if (subject === 'English Comprehension') {
    return ['SSC', 'Banking', 'UPSC', 'SI', 'General Competitive Examinations'];
  }
  return ['UPSC', 'SSC', 'APPSC', 'TSPSC', 'RRB NTPC', 'Banking'];
}

function buildTopicDescriptionAndObjectives(
  topic: string,
  subject: SubjectTag,
  phaseLabel: string,
  weekNumber: number,
  dayNumber: number
): { description: string; objectives: string[] } {
  const slotTag = `Week ${weekNumber} · Day ${dayNumber}`;
  if (subject === 'Quantitative Aptitude') {
    return {
      description: `${phaseLabel} (${slotTag}) — Corporate & government CBT speed mastery of ${topic} with rapid formula shortcuts and elimination traps.`,
      objectives: [
        `Master the core ${topic} formulas and ratio shortcuts used in Tier-1 & Bank exams`,
        `Solve standard and tricky ${topic} variations cleanly inside the 10-second pacing window`,
        `Avoid high-frequency calculation traps and negative-marking errors on ${topic}`,
      ],
    };
  }
  if (subject === 'Reasoning & Intelligence') {
    return {
      description: `${phaseLabel} (${slotTag}) — Pattern recognition and deductive accuracy drills on ${topic} for speed-critical CBT sections.`,
      objectives: [
        `Identify the governing rule or spatial relationship in ${topic} within 5 seconds`,
        `Eliminate distractor traps cleanly without backtracking`,
        `Apply systematic notation and quick verification checks for ${topic}`,
      ],
    };
  }
  if (subject === 'English Comprehension') {
    return {
      description: `${phaseLabel} (${slotTag}) — Grammar precision, contextual nuance, and error-spotting drills focused on ${topic}.`,
      objectives: [
        `Spot rule-based exam traps tested repeatedly under ${topic}`,
        `Apply structural connectors and root-word clues for instant option elimination`,
        `Balance speed and zero-negative accuracy across ${topic} questions`,
      ],
    };
  }
  return {
    description: `${phaseLabel} (${slotTag}) — High-yield static & current competitive coverage on ${topic} tailored for daily merit exams.`,
    objectives: [
      `Retain high-frequency facts, dates, articles, and classifications for ${topic}`,
      `Connect core concepts of ${topic} to multi-statement & assertion exam items`,
      `Build factual confidence across SSC, UPSC, Banking, and State PSC patterns`,
    ],
  };
}

let cachedBaseSyllabus: StudyPlanDay[] | null = null;

export function buildBase100WeekSyllabus(): StudyPlanDay[] {
  if (cachedBaseSyllabus) return cachedBaseSyllabus;

  const days: StudyPlanDay[] = [];

  for (let weekIndex = 0; weekIndex < WEEKLY_500_TOPICS.length; weekIndex++) {
    const weekNumber = weekIndex + 1;
    const weekTopics = WEEKLY_500_TOPICS[weekIndex];
    const subject = getSubjectForWeek(weekNumber);
    const phaseLabel = getPhaseLabelForWeek(weekNumber);
    const diffDist = getDifficultyDistributionForWeek(weekNumber);
    const categories = getRecommendedCategoriesForSubject(subject);

    for (let dayIndex = 0; dayIndex < DAYS_PER_SYLLABUS_WEEK; dayIndex++) {
      const dayNumber = dayIndex + 1;
      const globalDayIndex = weekIndex * DAYS_PER_SYLLABUS_WEEK + dayNumber;
      const dayKey = formatDayKey(weekNumber, dayNumber);
      const topic = weekTopics[dayIndex];
      const { description, objectives } = buildTopicDescriptionAndObjectives(
        topic,
        subject,
        phaseLabel,
        weekNumber,
        dayNumber
      );

      days.push({
        dayKey,
        weekNumber,
        dayNumber,
        globalDayIndex,
        dayType: 'study',
        subject,
        topic,
        topicDescription: description,
        learningObjectives: objectives,
        difficultyDistribution: diffDist,
        recommendedExamCategories: categories.length > 0 ? categories : [...EXAM_CATEGORIES.slice(0, 4)],
        approvalStatus: 'approved',
      });
    }
  }

  cachedBaseSyllabus = days;
  return days;
}

export function generate100WeekSyllabus(
  overrides: Record<string, StudyPlanOverride> = {}
): StudyPlanDay[] {
  const base = buildBase100WeekSyllabus();
  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  return base.map((day) => {
    const ov = overrides[day.dayKey];
    if (!ov) return day;
    return {
      ...day,
      ...(ov.subject ? { subject: ov.subject } : {}),
      ...(ov.topic ? { topic: ov.topic } : {}),
      ...(ov.topicDescription ? { topicDescription: ov.topicDescription } : {}),
      ...(ov.learningObjectives && ov.learningObjectives.length > 0
        ? { learningObjectives: ov.learningObjectives }
        : {}),
      ...(ov.approvalStatus ? { approvalStatus: ov.approvalStatus } : {}),
      ...(ov.scheduledDateOverride ? { scheduledDateOverride: ov.scheduledDateOverride } : {}),
      ...(ov.dailyMcqIds ? { dailyMcqIds: ov.dailyMcqIds } : {}),
      updatedAt: ov.updatedAt,
    };
  });
}

export function getStudyPlanWeek(
  weekNumber: number,
  overrides: Record<string, StudyPlanOverride> = {}
): StudyPlanDay[] {
  const safeWeek = Math.max(1, Math.min(TOTAL_SYLLABUS_WEEKS, Math.floor(weekNumber)));
  const startIdx = (safeWeek - 1) * DAYS_PER_SYLLABUS_WEEK;
  const base = buildBase100WeekSyllabus().slice(startIdx, startIdx + DAYS_PER_SYLLABUS_WEEK);
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return base.map((day) => {
    const ov = overrides[day.dayKey];
    return ov ? { ...day, ...ov } : day;
  });
}

export function findStudyPlanDayByKey(
  dayKey: string,
  overrides: Record<string, StudyPlanOverride> = {}
): StudyPlanDay | null {
  const full = generate100WeekSyllabus(overrides);
  return full.find((d) => d.dayKey === dayKey) || null;
}

function parseIsoDateParts(isoDate: string): { year: number; month: number; day: number } | null {
  const parts = isoDate.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function isoDateToEpochDays(isoDate: string): number {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return 0;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

/**
 * Shifts an ISO date string (YYYY-MM-DD) by `deltaDays` calendar days cleanly in UTC.
 */
export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return isoDate;
  const ms = Date.UTC(parts.year, parts.month - 1, parts.day) + deltaDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Deterministic fallback mapping from IST date relative to cohortStartDate to Day 1..500
 * when persistent random-pool assignment is not yet stored.
 */
export function resolveCurrentStudyDay(
  cohortStartDate: string,
  nowMs: number = Date.now(),
  overrides: Record<string, StudyPlanOverride> = {},
  targetIsoDate?: string
): StudyPlanDay {
  const targetIst = targetIsoDate || getTodayIsoDateIST(nowMs);
  const fullPlan = generate100WeekSyllabus(overrides);

  const scheduledMatch = fullPlan.find((d) => d.scheduledDateOverride === targetIst);
  if (scheduledMatch) {
    return scheduledMatch;
  }

  const startDays = isoDateToEpochDays(cohortStartDate);
  const targetDays = isoDateToEpochDays(targetIst);
  const deltaDays = Math.max(0, targetDays - startDays);
  const index = deltaDays % fullPlan.length;

  return fullPlan[index];
}
