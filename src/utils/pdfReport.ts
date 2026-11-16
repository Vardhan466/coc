import { Attempt, Question, TestPaper, UserProfile } from '../types';
import { formatISTDateLabel } from './istTime';

export interface CohortPdfEntry {
  id: string;
  name: string;
  state: string;
  score: number;
  accuracy: number;
  time: number;
  rank: number;
}

export interface CustomTestPdfQuestionRow {
  questionNumber: number;
  questionId: string;
  subject: string;
  topic: string;
  prompt: string;
  options: Array<{
    letter: string;
    text: string;
    isCorrectKey: boolean;
    isUserChoice: boolean;
  }>;
  correctIndex: number;
  correctLetter: string;
  userSelectedIndex: number | null;
  userSelectedLetter: string;
  outcome: 'correct' | 'incorrect' | 'skipped';
  marksAwardedText: string;
  explanation: string;
}

export interface CustomTestPdfReportData {
  filename: string;
  generatedAtLabel: string;
  testCode: string;
  testTitle: string;
  category: string;
  candidateId: string;
  candidateName: string;
  candidateState: string;
  totalQuestions: number;
  totalAttempted: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  scoreText: string;
  accuracyPct: number;
  negativeLossText: string;
  timeSpentSeconds: number;
  avgSecondsPerQuestion: string;
  cohortRank: number;
  cohortTotal: number;
  questions: CustomTestPdfQuestionRow[];
}

/**
 * Normalizes KaTeX math strings and non-ASCII typography into crisp WinAnsi-safe text
 * so jsPDF standard Helvetica never emits broken/garbled glyphs.
 */
export function sanitizePdfText(raw: string | undefined | null): string {
  if (!raw) return '';

  let s = String(raw);

  // Strip KaTeX delimiters
  s = s.replace(/\$\$/g, '').replace(/\$/g, '');

  // Expand simple LaTeX \frac{a}{b} -> (a)/(b) iteratively
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }

  // Common LaTeX constructs
  s = s
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^{}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^{}]+)\}/g, '$1')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\times/g, ' x ')
    .replace(/\\cdot/g, ' * ')
    .replace(/\\div/g, ' / ')
    .replace(/\\pm/g, '+/-')
    .replace(/\\approx/g, '~')
    .replace(/\\neq/g, '!=')
    .replace(/\\leq|\\le/g, '<=')
    .replace(/\\geq|\\ge/g, '>=')
    .replace(/\\Rightarrow|\\implies/g, '=>')
    .replace(/\\rightarrow|\\to/g, '->')
    .replace(/\\pi/g, 'pi')
    .replace(/\\theta/g, 'theta')
    .replace(/\\alpha/g, 'alpha')
    .replace(/\\beta/g, 'beta')
    .replace(/\\gamma/g, 'gamma')
    .replace(/\\Delta/g, 'Delta ')
    .replace(/\\degree|\^\\circ|°/g, ' deg')
    .replace(/\\%/g, '%')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\:/g, ' ')
    .replace(/\{([^{}]+)\}/g, '$1');

  // Replace Unicode typography & math symbols unsupported by Helvetica WinAnsi
  s = s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00F7/g, '/')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u2260/g, '!=')
    .replace(/\u2248/g, '~')
    .replace(/\u2192|\u21D2/g, '->')
    .replace(/\u03C0/g, 'pi')
    .replace(/\u03B8/g, 'theta')
    .replace(/\u221A/g, 'sqrt')
    .replace(/[^\x20-\x7E\r\n]/g, ' ');

  return s.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

export function buildCustomTestPdfReportData(
  test: TestPaper,
  attempt: Attempt,
  user: UserProfile,
  cohort: CohortPdfEntry[] = []
): CustomTestPdfReportData {
  const questionList: Question[] = Array.isArray(test.questions) ? test.questions : [];
  const totalQuestions = questionList.length || test.totalQuestions || 30;
  const totalAttempted = attempt.correctCount + attempt.incorrectCount;
  const accuracyPct =
    totalAttempted > 0 ? Math.round((attempt.correctCount / totalAttempted) * 100) : 0;
  const negativeLossText = (attempt.incorrectCount * 0.25).toFixed(2);
  const timeSpentSeconds = Math.max(
    1,
    attempt.timeTakenSeconds ?? attempt.totalTimeSeconds ?? totalQuestions * 6
  );
  const avgSecondsPerQuestion = (timeSpentSeconds / Math.max(1, totalQuestions)).toFixed(1);

  const matchedCohort = cohort.find((c) => c.id === attempt.studentId);
  const cohortRank = matchedCohort?.rank || attempt.rank || 1;
  const cohortTotal = cohort.length || 1;

  const safeCode = (test.testCode || 'COC-TEST')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '');
  const safeStudentId = (user.studentId || attempt.studentId || 'ASPIRANT')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${safeCode}-${safeStudentId}-Review.pdf`;

  const questions: CustomTestPdfQuestionRow[] = questionList.map((q, idx) => {
    const ans = attempt.answers?.find(
      (a) => a.questionId === q.id || a.questionIndex === idx
    );
    const rawChoice = ans?.selectedOptionIndex ?? ans?.selectedOption ?? null;
    const hasChoice =
      typeof rawChoice === 'number' &&
      rawChoice >= 0 &&
      rawChoice < (q.options?.length || 4);

    const userSelectedIndex = hasChoice ? rawChoice : null;
    const isCorrect = hasChoice && rawChoice === q.correctIndex;
    const outcome: CustomTestPdfQuestionRow['outcome'] = !hasChoice
      ? 'skipped'
      : isCorrect
      ? 'correct'
      : 'incorrect';

    const marksAwardedText =
      outcome === 'correct'
        ? '+1.00'
        : outcome === 'incorrect'
        ? '-0.25'
        : '0.00 (Skipped)';

    const correctLetter = String.fromCharCode(65 + Math.max(0, q.correctIndex));
    const userSelectedLetter =
      userSelectedIndex !== null ? String.fromCharCode(65 + userSelectedIndex) : '--';

    const options = (q.options || []).map((optText, optIdx) => ({
      letter: String.fromCharCode(65 + optIdx),
      text: sanitizePdfText(optText),
      isCorrectKey: optIdx === q.correctIndex,
      isUserChoice: userSelectedIndex === optIdx,
    }));

    return {
      questionNumber: idx + 1,
      questionId: q.id,
      subject: sanitizePdfText(q.subject),
      topic: sanitizePdfText(q.topic),
      prompt: sanitizePdfText(q.text),
      options,
      correctIndex: q.correctIndex,
      correctLetter,
      userSelectedIndex,
      userSelectedLetter,
      outcome,
      marksAwardedText,
      explanation: sanitizePdfText(
        q.explanation || 'Refer to standard conceptual derivation for this item.'
      ),
    };
  });

  return {
    filename,
    generatedAtLabel: formatISTDateLabel(),
    testCode: sanitizePdfText(test.testCode || 'CUSTOM-TEST'),
    testTitle: sanitizePdfText(test.title),
    category: sanitizePdfText(test.category || 'Scheduled Assessment'),
    candidateId: sanitizePdfText(user.studentId || attempt.studentId),
    candidateName: sanitizePdfText(user.fullName || attempt.studentName),
    candidateState: sanitizePdfText(user.address?.state || attempt.studentState || 'India'),
    totalQuestions,
    totalAttempted,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    unattemptedCount: attempt.unattemptedCount,
    scoreText: `${attempt.score.toFixed(2)} / ${totalQuestions}.00`,
    accuracyPct,
    negativeLossText,
    timeSpentSeconds,
    avgSecondsPerQuestion,
    cohortRank,
    cohortTotal,
    questions,
  };
}

/**
 * Generates and downloads a formatted multi-page A4 PDF containing the student's
 * full exam scorecard, quick-reference answer key matrix, chosen responses,
 * and step-by-step explanations for offline revision.
 */
export async function downloadCustomTestAttemptPdf(
  test: TestPaper,
  attempt: Attempt,
  user: UserProfile,
  cohort: CohortPdfEntry[] = []
): Promise<CustomTestPdfReportData> {
  const report = buildCustomTestPdfReportData(test, attempt, user, cohort);
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~595pt
  const pageHeight = doc.internal.pageSize.getHeight(); // ~842pt
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  const footerReserved = 42;
  let y = 0;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - footerReserved) {
      doc.addPage();
      y = 44;
    }
  };

  // --- PAGE 1 HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setFillColor(16, 185, 129); // Emerald-500 accent bar
  doc.rect(0, 78, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CLUB OF COMPETITION', marginX, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFLINE ATTEMPT SCORECARD & VERIFIED ANSWER KEY', marginX, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36);
  doc.text(`${report.testCode}  |  ${report.generatedAtLabel} IST`, pageWidth - marginX, 32, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Student ID: ${report.candidateId}`, pageWidth - marginX, 50, { align: 'right' });

  y = 104;

  // --- TEST & CANDIDATE METADATA CARD ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  const titleLines = doc.splitTextToSize(report.testTitle, contentWidth);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 16 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Candidate: ${report.candidateName} (${report.candidateState})   |   Category: ${report.category}`,
    marginX,
    y
  );
  y += 14;
  doc.text(
    `Timing: ${report.timeSpentSeconds}s total (${report.avgSecondsPerQuestion}s/Q avg under 10s rule)   |   Questions: ${report.totalQuestions}`,
    marginX,
    y
  );
  y += 18;

  // --- 4 KPI SUMMARY BOXES ---
  const boxGap = 8;
  const boxWidth = (contentWidth - boxGap * 3) / 4;
  const boxHeight = 52;
  const kpis = [
    { label: 'FINAL SCORE', value: report.scoreText, sub: `${report.correctCount} right / ${report.incorrectCount} wrong` },
    { label: 'COHORT RANK', value: `#${report.cohortRank} of ${report.cohortTotal}`, sub: 'Isolated test ranking' },
    { label: 'ACCURACY', value: `${report.accuracyPct}%`, sub: `${report.totalAttempted}/${report.totalQuestions} attempted` },
    { label: 'NEGATIVE PENALTY', value: `-${report.negativeLossText}`, sub: `${report.unattemptedCount} skipped` },
  ];

  kpis.forEach((kpi, i) => {
    const bx = marginX + i * (boxWidth + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, y, boxWidth, boxHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, bx + 8, y + 15);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, bx + 8, y + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, bx + 8, y + 44);
  });
  y += boxHeight + 20;

  // --- ANSWER KEY QUICK-REFERENCE SUMMARY ---
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('ANSWER KEY QUICK-REFERENCE SHEET', marginX, y);
  y += 14;

  const cols = 3;
  const cellWidth = contentWidth / cols;
  const cellHeight = 20;

  report.questions.forEach((row, idx) => {
    const col = idx % cols;
    if (col === 0) {
      ensureSpace(cellHeight + 4);
    }
    const cx = marginX + col * cellWidth;

    if (row.outcome === 'correct') {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
    } else if (row.outcome === 'incorrect') {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
    }
    doc.rect(cx, y, cellWidth - 4, cellHeight - 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(`Q${row.questionNumber}`, cx + 6, y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const statusTag =
      row.outcome === 'correct'
        ? '+1.00'
        : row.outcome === 'incorrect'
        ? '-0.25'
        : 'Skip';
    doc.text(
      `Key: ${row.correctLetter}  |  You: ${row.userSelectedLetter}  (${statusTag})`,
      cx + 30,
      y + 11.5
    );

    if (col === cols - 1 || idx === report.questions.length - 1) {
      y += cellHeight;
    }
  });

  y += 18;

  // --- DETAILED QUESTION-BY-QUESTION REVIEW & EXPLANATIONS ---
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DETAILED QUESTION PAPER, RESPONSES & OFFICIAL EXPLANATIONS', marginX, y);
  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  report.questions.forEach((row) => {
    const promptLines = doc.splitTextToSize(row.prompt, contentWidth - 16);
    const expLines = doc.splitTextToSize(
      `Explanation: ${row.explanation}`,
      contentWidth - 20
    );
    const optionEstimatedHeight = row.options.reduce((sum, opt) => {
      const marker = opt.isCorrectKey
        ? ' [CORRECT KEY]'
        : opt.isUserChoice
        ? ' [YOUR CHOICE]'
        : '';
      const lines = doc.splitTextToSize(
        `${opt.letter}. ${opt.text}${marker}`,
        contentWidth - 28
      );
      return sum + lines.length * 12 + 4;
    }, 0);

    const estimatedBlockHeight =
      36 + promptLines.length * 13 + optionEstimatedHeight + expLines.length * 12 + 24;

    ensureSpace(Math.min(estimatedBlockHeight, 260));

    // Question header bar
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, y, contentWidth, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Question ${row.questionNumber}  -  ${row.subject} (${row.topic})`,
      marginX + 8,
      y + 13
    );

    if (row.outcome === 'correct') {
      doc.setTextColor(5, 150, 105);
    } else if (row.outcome === 'incorrect') {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(
      `${row.marksAwardedText}  |  Key: ${row.correctLetter}  |  Yours: ${row.userSelectedLetter}`,
      pageWidth - marginX - 8,
      y + 13,
      { align: 'right' }
    );
    y += 28;

    // Prompt
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    promptLines.forEach((line: string) => {
      ensureSpace(16);
      doc.text(line, marginX + 6, y);
      y += 13;
    });
    y += 4;

    // Options A-D
    row.options.forEach((opt) => {
      const tags: string[] = [];
      if (opt.isCorrectKey) tags.push('CORRECT KEY');
      if (opt.isUserChoice && !opt.isCorrectKey) tags.push('YOUR CHOICE');
      if (opt.isUserChoice && opt.isCorrectKey) tags.push('YOUR CHOICE');
      const suffix = tags.length > 0 ? `  [${tags.join(' / ')}]` : '';

      const optLines = doc.splitTextToSize(
        `${opt.letter}. ${opt.text}${suffix}`,
        contentWidth - 24
      );
      ensureSpace(optLines.length * 12 + 4);

      if (opt.isCorrectKey) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 120, 85);
      } else if (opt.isUserChoice) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(190, 18, 60);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      doc.setFontSize(8.8);
      optLines.forEach((line: string) => {
        doc.text(line, marginX + 14, y);
        y += 12;
      });
      y += 2;
    });

    y += 3;

    // Official Explanation box
    const expHeight = expLines.length * 11.5 + 12;
    ensureSpace(expHeight + 10);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX + 6, y, contentWidth - 12, expHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    let expY = y + 12;
    expLines.forEach((line: string) => {
      doc.text(line, marginX + 12, expY);
      expY += 11.5;
    });

    y += expHeight + 14;
  });

  // --- PAGE NUMBERS & FOOTERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 30, pageWidth - marginX, pageHeight - 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Club Of Competition - Offline Revision Copy (${report.testCode})`,
      marginX,
      pageHeight - 16
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 16, {
      align: 'right',
    });
  }

  doc.save(report.filename);
  return report;
}
