import React, { useState, useRef, useEffect } from 'react';
import {
  AuditLogEntry,
  DailyAggregate,
  PreviousYearPaper,
  Question,
  QuestionAnalytic,
  TestPaper,
  UserRole,
} from '../types';
import type { DailyExamScheduleConfig } from '../types/aiSystem';
import { AdminAIPanel } from './AdminAIPanel';
import {
  calculateDiscriminationIndex,
  checkQuestionDefect,
  validateTestPaper,
} from '../utils/scoring';
import { getStoredAccounts } from '../data/authAccounts';
import { getISTNowParts, getTodayIsoDateIST } from '../utils/istTime';
import { MathRenderer } from './MathRenderer';
import {
  Shield,
  FileCheck,
  AlertOctagon,
  Users,
  Search,
  Upload,
  BarChart3,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Download,
  Flame,
  HelpCircle,
  Database,
  Calendar,
  Layers,
  ArrowRight,
  LogOut,
  FileDown,
  FileKey,
  Archive,
  Trash2,
  X,
  Sparkles,
  Bot,
} from 'lucide-react';
import { saveMasterKeySheetQuestions, getMasterKeySheetQuestions } from '../utils/keySheetStorage';
import { AdminAIChat } from './AdminAIChat';

interface AdminDashboardProps {
  currentRole: UserRole;
  testPapers: TestPaper[];
  analytics: QuestionAnalytic[];
  dailyAggregate: DailyAggregate;
  auditLogs: AuditLogEntry[];
  uploadedPQPs?: PreviousYearPaper[];
  scheduleConfig?: DailyExamScheduleConfig;
  onScheduleConfigUpdated?: (cfg: DailyExamScheduleConfig) => void;
  onTriggerReevaluation: (questionId: string, correctedIndex: number) => void;
  onPreviewStudentExam: (test: TestPaper) => void;
  onAddAuditLog: (action: string, details: string) => void;
  onUpdateTestPaper?: (updatedTest: TestPaper) => void;
  onAddTestPaper?: (newTest: TestPaper) => void;
  onDeleteTestPaper?: (testId: string) => void;
  onAddPQP?: (pqp: PreviousYearPaper) => void;
  onDeletePQP?: (pqpId: string) => void;
  onLogout?: () => void;
}

type AdminTabId =
  | 'testManager'
  | 'scheduleTest'
  | 'aiChat'
  | 'questionBank'
  | 'aiControl'
  | 'aiQueue'
  | 'syllabus100'
  | 'questionAnalytics'
  | 'userAnalytics'
  | 'studentLookup'
  | 'auditLogs';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentRole,
  testPapers,
  analytics,
  dailyAggregate,
  auditLogs,
  uploadedPQPs = [],
  scheduleConfig,
  onScheduleConfigUpdated,
  onTriggerReevaluation,
  onPreviewStudentExam,
  onAddAuditLog,
  onUpdateTestPaper,
  onAddTestPaper,
  onDeleteTestPaper,
  onAddPQP,
  onDeletePQP,
  onLogout,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>(() => {
    try {
      const saved = localStorage.getItem('coc_active_admin_tab');
      if (
        saved &&
        [
          'testManager',
          'scheduleTest',
          'aiChat',
          'questionBank',
          'aiControl',
          'aiQueue',
          'syllabus100',
          'questionAnalytics',
          'userAnalytics',
          'studentLookup',
          'auditLogs',
        ].includes(saved)
      ) {
        return saved as AdminTabId;
      }
    } catch {}
    return 'testManager';
  });

  const handleAdminTabChange = (tab: AdminTabId) => {
    setActiveAdminTab(tab);
    try {
      localStorage.setItem('coc_active_admin_tab', tab);
    } catch {}
  };

  const [activeTest, setActiveTest] = useState<TestPaper>(testPapers[0]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [selectedAnalyticQ, setSelectedAnalyticQ] = useState<QuestionAnalytic | null>(null);

  // Student Lookup state
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState<any | null>(null);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // Re-evaluation dialog state
  const [reevalQuestionId, setReevalQuestionId] = useState<string | null>(null);
  const [reevalNewKey, setReevalNewKey] = useState<number>(0);
  const [reevalStatus, setReevalStatus] = useState<string | null>(null);

  // Custom Test Scheduler Form State
  const [schedTitle, setSchedTitle] = useState('Special Evening Speed Drill');
  const [schedCategory, setSchedCategory] = useState('SSC CGL / CHSL');
  const [schedDate, setSchedDate] = useState(() => getTodayIsoDateIST());
  const [schedTime, setSchedTime] = useState('20:30');
  const [schedWindowMins, setSchedWindowMins] = useState(30);
  const [schedDurationSecs, setSchedDurationSecs] = useState(300);
  const [schedQuestionsCount, setSchedQuestionsCount] = useState(30);
  const [schedDescription, setSchedDescription] = useState(
    'Special ad-hoc timed exam scheduled by Admin. 30 questions under strict 10s auto-advance rule. Results isolated on a separate scorecard.'
  );
  const [schedSuccessMsg, setSchedSuccessMsg] = useState<string | null>(null);
  const [pendingDeleteTestId, setPendingDeleteTestId] = useState<string | null>(null);
  const [pendingDeletePqpId, setPendingDeletePqpId] = useState<string | null>(null);

  // Previous Year Question Paper (PQP) Archive Form State
  const [pqpTitle, setPqpTitle] = useState('');
  const [pqpBoard, setPqpBoard] = useState('SSC CGL');
  const [pqpYear, setPqpYear] = useState(2024);
  const [pqpShift, setPqpShift] = useState('Tier-1 Shift 1');
  const [pqpDurationMins, setPqpDurationMins] = useState(5);
  const [pqpCsvText, setPqpCsvText] = useState('');
  const [pqpError, setPqpError] = useState<string | null>(null);
  const [pqpSuccess, setPqpSuccess] = useState<string | null>(null);
  const pqpFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleScheduleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim()) return;

    // Calculate window end time
    const [h, m] = schedTime.split(':').map(Number);
    const startMins = (h || 20) * 60 + (m || 30);
    const endMins = startMins + schedWindowMins;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Select questions from activeTest
    const selectedQuestions = (activeTest.questions || []).slice(0, schedQuestionsCount);

    const newTest: TestPaper = {
      id: `sched_test_${Date.now()}`,
      testCode: `COC-SCHED-${Date.now().toString().slice(-4)}`,
      title: schedTitle,
      description: schedDescription,
      category: schedCategory,
      date: schedDate,
      windowStart: schedTime,
      windowEnd: endTimeStr,
      scheduledDate: schedDate,
      scheduledStartTime: schedTime,
      scheduledEndTime: endTimeStr,
      windowMinutes: schedWindowMins,
      answerKeyReleaseTime: endTimeStr,
      totalQuestions: selectedQuestions.length,
      totalDurationSeconds: schedDurationSecs,
      questionDurationSeconds: 10,
      status: 'scheduled',
      questions: selectedQuestions,
      lockedForEditing: false,
      totalSubscribers: 150,
      isCustomScheduled: true,
    };

    if (onAddTestPaper) {
      onAddTestPaper(newTest);
    }

    onAddAuditLog(
      'SCHEDULE_CUSTOM_TEST',
      `Admin scheduled new on-demand exam "${newTest.title}" (${newTest.testCode}) for ${schedDate} at ${schedTime} IST.`
    );

    setSchedSuccessMsg(
      `Exam "${newTest.title}" scheduled successfully for ${schedDate} at ${schedTime} IST! It is now live in the student's Special Scheduled Tests section.`
    );
    setTimeout(() => setSchedSuccessMsg(null), 6000);
  };

  const handleValidateTest = () => {
    const result = validateTestPaper(activeTest);
    setValidationResult(result);
    onAddAuditLog(
      'VALIDATE_TEST_PAPER',
      `Ran 40-question validation algorithm on ${activeTest.testCode}: ${result.valid ? 'PASSED (100% compliant)' : `FAILED with ${result.errors.length} errors`}`
    );
  };

  const handleRunReevaluation = (qId: string) => {
    onTriggerReevaluation(qId, reevalNewKey);
    setReevalStatus(`Re-evaluation complete! All 4,120 attempts re-scored. Updated in audit log.`);
    onAddAuditLog(
      'RUN_REEVALUATION',
      `SuperAdmin initiated re-evaluation on question ${qId}. Scores recalculated for all test attempts.`
    );
    setTimeout(() => {
      setReevalStatus(null);
      setReevalQuestionId(null);
    }, 3000);
  };

  const handleSearchStudent = () => {
    if (!searchStudentId.trim()) return;
    // Mock lookup response
    if (searchStudentId.toUpperCase().includes('123') || searchStudentId.toLowerCase().includes('ravi')) {
      setFoundStudent({
        studentId: 'COC-2026-000123',
        fullName: 'Ravi Kumar Reddy',
        phone: '+91 98480 12345',
        email: 'ravi.reddy@student.coc.in',
        state: 'Andhra Pradesh',
        district: 'Kurnool',
        examTarget: 'SSC CGL / CHSL',
        subscription: 'Pro Daily Pass (Active)',
        testsTaken: 28,
        avgScore: 26.75,
        integrityFlags: { tabSwitches: 1, focusLosses: 1 },
      });
    } else {
      setFoundStudent({
        studentId: searchStudentId.toUpperCase(),
        fullName: 'Deepak Tiwari',
        phone: '+91 94150 98765',
        email: 'deepak.tiwari@example.com',
        state: 'Uttar Pradesh',
        district: 'Prayagraj (Allahabad)',
        examTarget: 'Banking (IBPS PO)',
        subscription: 'Pro Daily Pass (Active)',
        testsTaken: 24,
        avgScore: 24.2,
        integrityFlags: { tabSwitches: 0, focusLosses: 0 },
      });
    }
  };

  const [regeneratedQuestions, setRegeneratedQuestions] = useState<Question[]>(() => activeTest.questions);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (testPapers[0]) {
      setActiveTest(testPapers[0]);
      setRegeneratedQuestions(testPapers[0].questions || []);
    }
  }, [testPapers]);

  const handlePqpFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setPqpCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSamplePqpCsv = () => {
    if (!pqpTitle.trim()) {
      setPqpTitle('SSC CGL Tier-1 Official Shift Paper');
    }
    setPqpCsvText(
      `Subject,Topic,Question,Option A,Option B,Option C,Option D,Correct Key,Difficulty,Explanation\nQuantitative Aptitude,Percentages,"If the price of sugar increases by 25%, by what percent must consumption be reduced to keep expenditure constant?",20%,25%,16.67%,15%,A,easy,"Required percentage reduction = (25 / 125) * 100 = 20%."\nQuantitative Aptitude,Time Speed & Distance,"A train passes a pole in 9 seconds and a 150m bridge in 15 seconds. Find its speed in km/h.",90 km/h,72 km/h,80 km/h,60 km/h,A,medium,"Let length L = 9v. Then 9v + 150 = 15v => 6v = 150 => v = 25 m/s = 90 km/h."\nGeneral Awareness,Indian Constitution,"Which article guarantees the Right to Constitutional Remedies?",Article 19,Article 21,Article 32,Article 44,C,easy,"Dr. B.R. Ambedkar described Article 32 as the heart and soul of the Constitution."\nReasoning & Intelligence,Syllogisms,"Statements: All cats are dogs. All dogs are birds. Conclusions: I. All cats are birds. II. Some birds are cats.",Only I follows,Only II follows,Both I and II follow,Neither follows,C,medium,"All cats fall within dogs which fall within birds, so both conclusions follow."\nEnglish Comprehension,Idioms,"Choose the correct meaning of: To hit the nail on the head.",To cause harm,To state or do the exact right thing,To remain silent,To exaggerate,B,easy,"To hit the nail on the head means pinpointing the exact truth or right solution."`
    );
    setPqpError(null);
  };

  const handlePqpUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPqpError(null);
    setPqpSuccess(null);

    const trimmedTitle = pqpTitle.trim();
    if (!trimmedTitle) {
      setPqpError('Please enter a paper title (e.g., SSC CGL Tier-1 Shift 1).');
      return;
    }
    if (!pqpCsvText.trim()) {
      setPqpError('Please upload a CSV file or paste question rows for this PQP.');
      return;
    }

    const { questions: parsed, errors } = parseQuestionsFromCSV(pqpCsvText);
    if (parsed.length === 0) {
      setPqpError(errors[0] || 'Could not parse valid question rows from CSV.');
      return;
    }

    const durSeconds = Math.max(60, Math.round(pqpDurationMins * 60));
    const newPqp: PreviousYearPaper = {
      id: `pqp_${Date.now()}`,
      title: trimmedTitle,
      examBoard: pqpBoard,
      year: Math.max(1990, Math.min(2100, Number(pqpYear || 2024))),
      shiftLabel: pqpShift.trim() || undefined,
      questions: parsed,
      totalQuestions: parsed.length,
      totalDurationSeconds: durSeconds,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentRole,
    };

    onAddPQP?.(newPqp);
    onAddAuditLog(
      'UPLOAD_PREVIOUS_PQP',
      `Published Previous Year Paper "${newPqp.title}" (${newPqp.examBoard} ${newPqp.year}) with ${parsed.length} questions.`
    );

    setPqpSuccess(`Uploaded "${newPqp.title}" (${parsed.length} questions). Now visible in Practice -> Previous PQP.`);
    setPqpTitle('');
    setPqpCsvText('');
    setTimeout(() => setPqpSuccess(null), 6000);
  };

  const exportStudentsToExcel = () => {
    const accounts = getStoredAccounts();
    const headers = [
      'Student ID',
      'Full Name',
      'Email',
      'Phone',
      'State',
      'District',
      'Exam Target',
      'Role',
      'Registration Date',
      'Subscription Plan',
      'Subscription Valid Until',
      'Account Status'
    ];

    const rows = accounts.map((acc) => {
      const prof = acc.userProfile;
      return [
        `"${prof.studentId}"`,
        `"${prof.fullName.replace(/"/g, '""')}"`,
        `"${prof.email}"`,
        `"${prof.phone}"`,
        `"${prof.address.state}"`,
        `"${prof.address.district}"`,
        `"${prof.examTarget}"`,
        `"${prof.role}"`,
        `"${prof.createdAt}"`,
        `"${prof.subscription.plan}"`,
        `"${prof.subscription.validUntil}"`,
        prof.subscription.isActive ? '"Active"' : '"Inactive"'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COC_Registered_Students_${getTodayIsoDateIST()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddAuditLog(
      'EXPORT_STUDENTS_EXCEL',
      `SuperAdmin exported database of ${accounts.length} student records into Excel/CSV format.`
    );
  };

  const downloadSampleCSVTemplate = () => {
    const sampleHeaders = 'Subject,Topic,Question,Option A,Option B,Option C,Option D,Correct Key,Difficulty,Explanation';
    const sampleRows = [
      'Quantitative Aptitude,Percentages,"If price of sugar increases by 25%, by what percent must consumption decrease?",20%,25%,16.67%,15%,A,easy,"Required reduction = (25 / 125) * 100 = 20%."',
      'Quantitative Aptitude,Time Speed & Distance,"A train crosses a pole in 9s and a 150m bridge in 15s. Find speed of train in km/h:",90 km/h,72 km/h,80 km/h,60 km/h,A,medium,"Length L = 9v. (L + 150) = 15v => 6v = 150 => v = 25 m/s = 25 * (18/5) = 90 km/h."',
      'General Awareness,Indian Constitution,"Which article of the Indian Constitution guarantees the Right to Constitutional Remedies?",Article 19,Article 21,Article 32,Article 44,C,easy,"Article 32 was described by Dr. B.R. Ambedkar as the heart and soul of the Constitution."',
      'Reasoning & Intelligence,Syllogisms,"Statements: All cats are dogs. All dogs are birds. Conclusions: I. All cats are birds. II. Some birds are cats.",Only I follows,Only II follows,Both I and II follow,Neither follows,C,medium,"Universal affirmative chain: Cats ⊂ Dogs ⊂ Birds, so both conclusions hold true."',
      'English Comprehension,Idioms,"Select the correct meaning of: To hit the nail on the head.",To cause an accident,To say or do something exactly right,To misunderstand completely,To complain loudly,B,easy,"Hitting the nail on the head means pinpointing the exact truth or taking the exact right action."',
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [sampleHeaders, ...sampleRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COC_Daily_Questions_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseQuestionsFromCSV = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const parsedList: Question[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      // Skip header line if present
      if (idx === 0 && (line.toLowerCase().startsWith('subject') || line.toLowerCase().startsWith('id') || line.toLowerCase().startsWith('q#'))) {
        return;
      }

      // Parse comma-separated columns
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 7) {
        errors.push(`Row ${idx + 1}: Expected at least subject, topic, question, and 4 options.`);
        return;
      }

      const subject = (parts[0] || 'General Awareness') as any;
      const topic = parts[1] || 'General Topic';
      const qText = parts[2] || '';
      const optA = parts[3] || 'Option A';
      const optB = parts[4] || 'Option B';
      const optC = parts[5] || 'Option C';
      const optD = parts[6] || 'Option D';
      const rawKey = parts[7] ? parts[7].trim().toUpperCase() : 'A';

      let correctIndex = 0;
      if (rawKey === 'B' || rawKey === '1') correctIndex = 1;
      else if (rawKey === 'C' || rawKey === '2') correctIndex = 2;
      else if (rawKey === 'D' || rawKey === '3') correctIndex = 3;

      const difficulty = (parts[8] ? parts[8].toLowerCase() : 'medium') as any;
      const explanation = parts[9] || 'Standard official explanation.';

      parsedList.push({
        id: `q_imp_${Date.now()}_${idx}`,
        qIndex: parsedList.length,
        subject,
        topic,
        text: qText,
        options: [optA, optB, optC, optD],
        correctIndex,
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        explanation,
      });
    });

    return { questions: parsedList, errors };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = () => {
    if (!importText.trim()) {
      setImportErrors(['No CSV data provided. Please paste CSV rows or upload a .csv file.']);
      return;
    }

    const { questions: parsed, errors } = parseQuestionsFromCSV(importText);
    if (errors.length > 0 && parsed.length === 0) {
      setImportErrors(errors);
      return;
    }

    if (parsed.length === 0) {
      setImportErrors(['Could not parse any valid question rows. Please check format.']);
      return;
    }

    setImportErrors([]);
    setImportSuccess(true);
    setRegeneratedQuestions(parsed);

    const updatedTestPaper: TestPaper = {
      ...activeTest,
      questions: parsed,
      totalQuestions: parsed.length,
    };

    setActiveTest(updatedTestPaper);
    if (onUpdateTestPaper) {
      onUpdateTestPaper(updatedTestPaper);
    }

    // Auto-sync into the official 8:00 PM Master Answer Key Sheet Drill
    saveMasterKeySheetQuestions(parsed);

    onAddAuditLog(
      'CSV_QUESTION_IMPORT',
      `Imported and regenerated ${parsed.length} questions with verified answers for ${activeTest.testCode}. Displayed for verification in admin and analytics.`
    );
    onAddAuditLog(
      'KEY_RESULTS_FILE_SYNCED',
      `Synced ${parsed.length} MCQs with verified keys and full explanations into the 8:00 PM Master Answer Key Sheet for candidate drill.`
    );

    setTimeout(() => {
      setImportSuccess(false);
      setIsImportModalOpen(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Admin Header with Role Badge */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                COC Operations & Administration
              </h1>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                {currentRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Exam Scheduling · Question Vault · Discrimination Analytics · Integrity Audit Trail
            </p>
          </div>
        </div>

        {/* Right Header: Autonomous Daily Mode Status & Sign Out */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-lg text-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">
                AI Daily Auto-Run
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                No Approval Needed · Edit Optional
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              title="Sign Out of Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'testManager', label: 'Test Manager & Workflow', icon: Layers },
          { id: 'scheduleTest', label: 'Schedule New Test', icon: Calendar },
          { id: 'aiChat', label: 'AI Command Chat', icon: Bot },
          { id: 'questionBank', label: 'Question Bank & Import', icon: Database },
          { id: 'aiControl', label: 'AI & Schedule', icon: Sparkles },
          { id: 'aiQueue', label: 'AI MCQ Queue', icon: FileKey },
          { id: 'syllabus100', label: '500-Topic AI Pool', icon: Calendar },
          { id: 'questionAnalytics', label: 'Question Analytics & Defect Alerts', icon: AlertOctagon },
          { id: 'userAnalytics', label: 'Student Cohort & Regional Heatmap', icon: BarChart3 },
          { id: 'studentLookup', label: 'Student Lookup & Integrity Logs', icon: Users },
          { id: 'auditLogs', label: 'System Audit Trail', icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleAdminTabChange(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- MODULE 1: TEST MANAGER --- */}
      {activeAdminTab === 'testManager' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Test Lifecycle & Validation Gate
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enforces strict State Machine: Draft → Validated → Scheduled → Live → Closed → Results Published.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidateTest}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Run 30-Q Validator</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPreviewStudentExam(activeTest)}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Student View Preview</span>
                </button>
              </div>
            </div>

            {/* Autonomous Daily AI Operation Notice + Optional Admin Edit Shortcuts */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Autonomous Daily AI Execution Active (Zero Admin Approval Required)</span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Every day at {scheduleConfig?.questionGenerationTime || '18:00'} IST, AI selects a non-repeating topic, generates &amp; auto-approves {scheduleConfig?.totalQuestions || 30} MCQs, and runs the test automatically at {scheduleConfig?.examStartTime || '19:00'}–{scheduleConfig?.examEndTime || '19:15'} IST. Use these optional controls only if you want to make manual edits:
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAdminTabChange('syllabus100')}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 cursor-pointer"
                >
                  Edit Topic (500-Pool)
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminTabChange('aiQueue')}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 cursor-pointer"
                >
                  Edit Daily Questions
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminTabChange('aiControl')}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 cursor-pointer"
                >
                  Edit Timings &amp; AI
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminTabChange('aiChat')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
                >
                  AI Command Chat
                </button>
              </div>
            </div>

            {/* State Machine Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {[
                { state: 'Draft', desc: 'Questions compiled' },
                { state: 'Validated', desc: '30Q & tags checked' },
                { state: 'Scheduled', desc: '6:30 PM Locked' },
                { state: 'Live', desc: '7:00-7:15 PM entry' },
                { state: 'Closed', desc: 'Stragglers finish' },
                { state: 'Results', desc: '8:00 PM Key release' },
              ].map((step, idx) => {
                const isCurrent = idx === 3; // Live
                const isPast = idx < 3;
                return (
                  <div
                    key={step.state}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      isCurrent
                        ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-semibold'
                        : isPast
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                        : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <div className="text-xs font-bold">{step.state}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Validation Output Banner if run */}
            {validationResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  validationResult.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Paper Validated: Exactly 30 Questions, 4 Options Each, 100% Tagged!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Paper Failed Validation ({validationResult.errors.length} Issues)</span>
                    </>
                  )}
                </div>
                {validationResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Test Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-xs">Pre-Computation & Cloud Rules</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Edit Lock Time:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">6:30 PM IST (Enforced)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cloud Function Pre-Warm:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">6:55 PM (minInstances = 20)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Window Closes:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">7:15 PM IST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Answer Key Release:</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400 font-mono">20:00 IST Vault Trigger</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-xs">Scale & Concurrency Defenses</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Write Architecture:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Single attempt doc / 8s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Shared Counters during Exam:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">STRICT ZERO contention</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ranking Job:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Post-window batch at 7:20:19 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Idempotency Key:</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400 text-[11px]">attemptId + questionIndex</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE: ON-DEMAND TEST SCHEDULER --- */}
      {activeAdminTab === 'scheduleTest' && (
        <div className="space-y-5">
          {schedSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-xs animate-smooth-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">{schedSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSchedSuccessMsg(null)}
                className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 font-bold ml-2 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-2 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>On-Demand Test Scheduler & Time Controller</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create and schedule exams at any time. Scheduled exams appear in a separate section for students, and their results are published on independent scorecards without touching the daily 7 PM All-India leaderboard.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-md">
                  Independent Scorecards Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  New Exam Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set target time, duration, and question allocation.
                </p>
              </div>

              <form onSubmit={handleScheduleTestSubmit} className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Exam Title *</label>
                  <input
                    type="text"
                    required
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                    placeholder="e.g. Special Evening Quantitative Speed Drill"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Target Category */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Target Category / Stream</label>
                  <select
                    value={schedCategory}
                    onChange={(e) => setSchedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="SSC CGL / CHSL">SSC CGL / CHSL</option>
                    <option value="Banking (IBPS / SBI PO & Clerk)">Banking (IBPS / SBI PO & Clerk)</option>
                    <option value="Railways (RRB NTPC / Group D)">Railways (RRB NTPC / Group D)</option>
                    <option value="State PSC (APPSC / TSPSC / UPPSC)">State PSC (APPSC / TSPSC / UPPSC)</option>
                    <option value="UPSC Civil Services">UPSC Civil Services</option>
                    <option value="Police SI & Constable">Police SI & Constable</option>
                    <option value="Special Practice Sprint">Special Practice Sprint</option>
                  </select>
                </div>

                {/* Schedule Date & Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Scheduled Date *</label>
                    <input
                      type="date"
                      required
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Scheduled Start Time (IST) *</label>
                    <input
                      type="time"
                      required
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Quick Time Presets */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Quick Scheduling Presets:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const parts = getISTNowParts(Date.now() + 15 * 60 * 1000);
                        setSchedTime(parts.hhmm);
                        setSchedDate(parts.isoDate);
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      +15 Minutes from Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parts = getISTNowParts(Date.now() + 60 * 60 * 1000);
                        setSchedTime(parts.hhmm);
                        setSchedDate(parts.isoDate);
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      +1 Hour from Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedTime('20:30');
                        setSchedDate(getTodayIsoDateIST());
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Tonight 8:30 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrowParts = getISTNowParts(Date.now() + 24 * 60 * 60 * 1000);
                        setSchedDate(tomorrowParts.isoDate);
                        setSchedTime('10:00');
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Tomorrow 10:00 AM
                    </button>
                  </div>
                </div>

                {/* Entry Window & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Entry Window</label>
                    <select
                      value={schedWindowMins}
                      onChange={(e) => setSchedWindowMins(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Total Duration</label>
                    <select
                      value={schedDurationSecs}
                      onChange={(e) => setSchedDurationSecs(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value={300}>300s (5 Mins)</option>
                      <option value={600}>600s (10 Mins)</option>
                      <option value={900}>900s (15 Mins)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Questions Count</label>
                    <select
                      value={schedQuestionsCount}
                      onChange={(e) => setSchedQuestionsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value={10}>10 Questions</option>
                      <option value={20}>20 Questions</option>
                      <option value={30}>30 Questions (Standard)</option>
                      <option value={40}>40 Questions</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Exam Instructions / Overview</label>
                  <textarea
                    rows={2}
                    value={schedDescription}
                    onChange={(e) => setSchedDescription(e.target.value)}
                    placeholder="Brief description and instructions for students"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Anti-Pollution Warning */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Leaderboard Isolation Guarantee:</strong> Candidate attempts on this test will produce dedicated individual scorecards and cohort rankings. The main 7:00 PM All-India Leaderboard remains completely separate and unmodified.
                  </span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Publish & Schedule Exam</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Custom Tests List Column */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Active Scheduled Exams ({testPapers.filter((t) => t.isCustomScheduled).length})
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Live in Student View</span>
              </div>

              {testPapers.filter((t) => t.isCustomScheduled).length === 0 ? (
                <div className="text-center py-10 space-y-2 text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto stroke-1" />
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">No Custom Exams Scheduled</div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Use the form on the left to schedule an ad-hoc test at any target date and time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {testPapers
                    .filter((t) => t.isCustomScheduled)
                    .map((test) => (
                      <div
                        key={test.id}
                        className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
                            {test.testCode}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {test.scheduledDate || test.date} @ {test.scheduledStartTime || test.windowStart} IST
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{test.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {test.totalQuestions} Questions · {Math.round(test.totalDurationSeconds / 60)}m · {test.category || 'Special Drill'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                          <button
                            type="button"
                            onClick={() => onPreviewStudentExam(test)}
                            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Exam</span>
                          </button>

                          {onDeleteTestPaper && (
                            pendingDeleteTestId === test.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteTestPaper(test.id);
                                    onAddAuditLog(
                                      'CANCEL_SCHEDULED_TEST',
                                      `Admin cancelled custom scheduled exam "${test.title}" (${test.testCode}).`
                                    );
                                    setPendingDeleteTestId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTestId(null)}
                                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer"
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteTestId(test.id)}
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold cursor-pointer"
                              >
                                Cancel / Delete
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE: ADMIN AI COMMAND CONTROLLER --- */}
      {activeAdminTab === 'aiChat' && (
        <AdminAIChat
          scheduleConfig={scheduleConfig}
          onTestScheduled={(test) => {
            onAddTestPaper?.(test);
            onAddAuditLog(
              'AI_SCHEDULE_TEST',
              `Admin ordered AI to schedule exam "${test.title}" (${test.testCode}) on ${test.scheduledDate || test.date} at ${test.scheduledStartTime || test.windowStart} IST.`
            );
          }}
          onTestDeleted={(testId) => {
            onDeleteTestPaper?.(testId);
            onAddAuditLog(
              'AI_DELETE_SCHEDULED_TEST',
              `Admin ordered AI to delete scheduled exam ${testId}.`
            );
          }}
          onScheduleUpdated={(cfg) => {
            onScheduleConfigUpdated?.(cfg);
            onAddAuditLog(
              'AI_UPDATE_SCHEDULE',
              `Admin ordered AI to update daily mock start time to ${cfg.examStartTime} IST.`
            );
          }}
          onPreviewExam={onPreviewStudentExam}
        />
      )}

      {/* --- MODULE 2: QUESTION BANK & IMPORT --- */}
      {activeAdminTab === 'questionBank' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Question Repository &amp; 8:00 PM Key Results Vault
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Easily upload daily exam questions with answer keys &amp; step-by-step explanations via CSV.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={downloadSampleCSVTemplate}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer"
                  title="Download standard CSV template with columns for questions, options, key, and explanations"
                >
                  <Download className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Download Sample CSV Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Upload CSV with questions, answer keys, and explanations"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Daily Questions &amp; 8 PM Key Results</span>
                </button>
              </div>
            </div>

            {/* 8 PM Sync Status Banner */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileKey className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>8:00 PM Master Key Sheet Sync:</strong> Uploaded questions with verified keys &amp; explanations automatically sync to the student interactive drill.
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded shrink-0">
                Auto-Synced on Upload
              </span>
            </div>

            {/* Questions Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Subject & Topic</th>
                    <th className="py-2.5 px-3">Question Text</th>
                    <th className="py-2.5 px-3 text-center">Correct Key</th>
                    <th className="py-2.5 px-3 text-center">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTest.questions.slice(0, 15).map((q, i) => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 dark:text-slate-400">Q{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{q.subject}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{q.topic}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 dark:text-slate-300">{q.text}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">
                        Option {String.fromCharCode(65 + q.correctIndex)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : q.difficulty === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Re-generated Questions Live Review Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Re-generated Questions Review & Key Inspector ({activeTest.questions.length} Items)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live database view for Admin and Analytics verification before 6:30 PM pre-lock.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={exportStudentsToExcel}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export Students Database (.csv / Excel)</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeTest.questions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                          Q{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{q.subject}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.2 rounded font-medium">
                          {q.topic}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : q.difficulty === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                      <MathRenderer content={q.text} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded border flex items-center justify-between text-xs ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-semibold'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <MathRenderer content={opt} inline={true} />
                            </div>
                            {isCorrect && (
                              <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded uppercase font-bold">
                                Correct Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Explanation: </span>
                        <MathRenderer content={q.explanation} inline={true} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Previous Year Question Papers (PQP) Archive Uploader & List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Previous Year Question Papers (PQP) Archive Manager
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload official shift papers via CSV. Published papers appear immediately under Speed Practice &rarr; Previous PQP for students.
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg self-start sm:self-auto shrink-0">
                {uploadedPQPs.length} PQP Published
              </span>
            </div>

            {pqpSuccess && (
              <div
                role="status"
                className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{pqpSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPqpSuccess(null)}
                  className="text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {pqpError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200 font-medium"
              >
                {pqpError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <form onSubmit={handlePqpUploadSubmit} className="lg:col-span-7 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="pqp-title" className="font-semibold text-slate-700 dark:text-slate-300">
                      Paper Title *
                    </label>
                    <input
                      id="pqp-title"
                      type="text"
                      value={pqpTitle}
                      onChange={(e) => setPqpTitle(e.target.value)}
                      placeholder="e.g., SSC CGL Tier-1 Official Shift Paper"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pqp-board" className="font-semibold text-slate-700 dark:text-slate-300">
                      Exam Category
                    </label>
                    <select
                      id="pqp-board"
                      value={pqpBoard}
                      onChange={(e) => setPqpBoard(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="SSC CGL">SSC CGL</option>
                      <option value="UPSC Prelims">UPSC Prelims</option>
                      <option value="IBPS PO">IBPS PO</option>
                      <option value="RRB NTPC">RRB NTPC</option>
                      <option value="State PSC">State PSC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="pqp-year" className="font-semibold text-slate-700 dark:text-slate-300">
                      Exam Year
                    </label>
                    <input
                      id="pqp-year"
                      type="number"
                      min={1990}
                      max={2100}
                      value={pqpYear}
                      onChange={(e) => setPqpYear(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pqp-shift" className="font-semibold text-slate-700 dark:text-slate-300">
                      Shift / Session Label
                    </label>
                    <input
                      id="pqp-shift"
                      type="text"
                      value={pqpShift}
                      onChange={(e) => setPqpShift(e.target.value)}
                      placeholder="Tier-1 Shift 1"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pqp-duration" className="font-semibold text-slate-700 dark:text-slate-300">
                      Duration (Mins)
                    </label>
                    <input
                      id="pqp-duration"
                      type="number"
                      min={1}
                      max={180}
                      value={pqpDurationMins}
                      onChange={(e) => setPqpDurationMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="pqp-csv" className="font-semibold text-slate-700 dark:text-slate-300">
                      Questions CSV *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={pqpFileInputRef}
                        accept=".csv,.txt"
                        onChange={handlePqpFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => pqpFileInputRef.current?.click()}
                        className="text-indigo-700 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        Choose .CSV File
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={handleLoadSamplePqpCsv}
                        className="text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                      >
                        Load Sample PQP CSV
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="pqp-csv"
                    rows={4}
                    value={pqpCsvText}
                    onChange={(e) => setPqpCsvText(e.target.value)}
                    placeholder="Subject, Topic, Question Text, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), Difficulty, Explanation"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Previous PQP</span>
                </button>
              </form>

              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span>Published Previous Papers</span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {uploadedPQPs.length} Total
                  </span>
                </div>

                {uploadedPQPs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <Archive className="w-7 h-7 mx-auto opacity-40" />
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      No PQPs Uploaded Yet
                    </div>
                    <p className="text-[11px]">
                      Students currently see the clean Coming Soon placeholder until you publish a paper.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {uploadedPQPs.map((pqp) => (
                      <div
                        key={pqp.id}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{pqp.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {pqp.examBoard} · {pqp.year}
                              {pqp.shiftLabel ? ` · ${pqp.shiftLabel}` : ''} · {pqp.questions.length} Qs
                            </div>
                          </div>

                          {onDeletePQP && (
                            pendingDeletePqpId === pqp.id ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeletePQP(pqp.id);
                                    onAddAuditLog(
                                      'DELETE_PREVIOUS_PQP',
                                      `Removed Previous Year Paper "${pqp.title}" (${pqp.examBoard} ${pqp.year}).`
                                    );
                                    setPendingDeletePqpId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeletePqpId(null)}
                                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeletePqpId(pqp.id)}
                                aria-label={`Delete ${pqp.title}`}
                                className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE 3: QUESTION ANALYTICS & DEFECT DETECTION --- */}
      {activeAdminTab === 'questionAnalytics' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Post-Exam Question Analytics & Defect Detection
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculates Pass Rate, Skip Rate, Discrimination Index (D = P_top - P_bottom), and flags defective questions.
                </p>
              </div>

              {reevalStatus && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {reevalStatus}
                </div>
              )}
            </div>

            {/* Defective Question Alert Callout */}
            {analytics.some((a) => a.isDefective) && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3.5 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-sm text-rose-900 dark:text-rose-100">
                      Defective Question Alert: Q19 (Divisibility Problem)
                    </div>
                    <p className="text-rose-800 dark:text-rose-300 mt-0.5">
                      Discrimination Index is <strong className="font-mono text-rose-950 dark:text-rose-100">-0.18</strong> (Negative Discrimination). The top-scoring cohort got this wrong more often than lower scorers due to Option D distractor confusion.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReevalQuestionId('q19');
                    setReevalNewKey(0); // Option A
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs shrink-0 transition-colors shadow-xs cursor-pointer"
                >
                  Trigger Re-evaluation
                </button>
              </div>
            )}

            {/* Analytics Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Q#</th>
                    <th className="py-2.5 px-3">Subject & Topic</th>
                    <th className="py-2.5 px-3 text-center">Correct %</th>
                    <th className="py-2.5 px-3 text-center">Skip %</th>
                    <th className="py-2.5 px-3 text-center">Avg Time</th>
                    <th className="py-2.5 px-3 text-center">Discrim. Index (D)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics.map((qa) => {
                    const isDef = qa.isDefective;
                    return (
                      <tr
                        key={qa.questionId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isDef ? 'bg-rose-50/70 dark:bg-rose-950/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">Q{qa.questionIndex + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{qa.subject}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{qa.topic}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                          {qa.correctRate}%
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400">{qa.skipRate}%</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">
                          {qa.avgTimeSec}s
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          <span className={qa.discriminationIndex < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                            {qa.discriminationIndex}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDef ? (
                            <span className="text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded uppercase">
                              Defective
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded uppercase">
                              Sound
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setReevalQuestionId(qa.questionId);
                              setReevalNewKey(0);
                            }}
                            className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                          >
                            Re-evaluate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE 4: USER & DAILY ANALYTICS --- */}
      {activeAdminTab === 'userAnalytics' && (
        <div className="space-y-5">
          {/* Daily Aggregate Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">Total Subscribed</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {dailyAggregate.totalSubscribers.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Active Pro Accounts</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">Daily Participants</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {dailyAggregate.participants.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                {dailyAggregate.participationRate}% Turnout
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">Average Score</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {dailyAggregate.averageScore}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Highest: {dailyAggregate.highestScore}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">At-Risk Students</div>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                {dailyAggregate.atRiskStudentsCount}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-0.5">Missed 3+ consecutive days</div>
            </div>
          </div>

          {/* Score Distribution Histogram */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              All-India Score Distribution Histogram (4,120 Candidates)
            </h3>
            <div className="space-y-3">
              {dailyAggregate.scoreHistogram.map((bin) => (
                <div key={bin.range} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{bin.range} Marks</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {bin.count} students ({bin.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md ${
                        bin.range.includes('Negative')
                          ? 'bg-rose-500'
                          : bin.range.includes('30')
                          ? 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${bin.percentage * 2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Heatmap & State Counts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              State-wise Participation & Regional Average Benchmark
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {dailyAggregate.stateBreakdown.map((st) => (
                <div key={st.state} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{st.state}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{st.count} participants</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-white font-mono text-sm">{st.avgScore}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">avg score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE 5: STUDENT LOOKUP --- */}
      {activeAdminTab === 'studentLookup' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Profile & Integrity Diagnostic Lookup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lookup by unique Student ID (`COC-2026-000123`), phone, or email to inspect exam attempts and cheating flags.
            </p>

            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter Student ID (e.g. COC-2026-000123)"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
              />
              <button
                type="button"
                onClick={handleSearchStudent}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lookup</span>
              </button>
            </div>

            {/* Found Student Inspector Card */}
            {foundStudent && (
              <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{foundStudent.fullName}</div>
                    <div className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{foundStudent.studentId}</div>
                  </div>
                  <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800">
                    {foundStudent.subscription}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Phone:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{foundStudent.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Location:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{foundStudent.district}, {foundStudent.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tests Taken:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{foundStudent.testsTaken}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Average Score:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{foundStudent.avgScore}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Integrity Flags Recorded:</span>
                    <span className={`font-semibold ${foundStudent.integrityFlags.tabSwitches > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {foundStudent.integrityFlags.tabSwitches} tab switches
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">DPDP Act Privacy Compliant</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODULE 6: AUDIT LOGS --- */}
      {activeAdminTab === 'auditLogs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Immutable System Audit Trail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every administrative action, test schedule lock, and score re-evaluation is permanently recorded.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.adminName}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{log.details}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODULES: SERVER AI CONTROL, MCQ QUEUE & 100-WEEK SYLLABUS --- */}
      {(activeAdminTab === 'aiControl' ||
        activeAdminTab === 'aiQueue' ||
        activeAdminTab === 'syllabus100') && (
        <AdminAIPanel
          mode={activeAdminTab}
          scheduleConfig={scheduleConfig}
          onScheduleConfigUpdated={onScheduleConfigUpdated}
          onAddAuditLog={onAddAuditLog}
          onNavigateAdminTab={handleAdminTabChange}
        />
      )}

      {/* Re-evaluation Modal Dialog */}
      {reevalQuestionId && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Confirm Score Re-evaluation
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are re-scoring all 4,120 attempts for question <strong>{reevalQuestionId}</strong>. This batch update recalculates marks (+1/-0.25), updates student ranks, and creates an audit record.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Corrected Option Key:
              </label>
              <select
                value={reevalNewKey}
                onChange={(e) => setReevalNewKey(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReevalQuestionId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRunReevaluation(reevalQuestionId)}
                className="bg-rose-700 hover:bg-rose-800 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                Run Batch Re-score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal Dialog */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <span>Bulk Question &amp; Answer Importer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                aria-label="Close bulk question importer"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a <code>.csv</code> file or paste rows. The system automatically parses prompts, 4 options, and correct answers, regenerating questions into the database and live preview.
            </p>

            {/* Direct File Upload Button */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Upload CSV File from Device</span>
              </button>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">or paste CSV text directly below</div>
            </div>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Subject, Topic, Question Text, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D or 0-3), Difficulty, Explanation"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            {importErrors.length > 0 && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs space-y-1">
                {importErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            {importSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Successfully parsed and regenerated {regeneratedQuestions.length} questions into the live exam vault.</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setImportText(
                      `Quantitative Aptitude,Percentages,"If price of sugar increases by 25%, by what percent must consumption decrease?",20%,25%,16.67%,15%,A,easy,"Required reduction = (25 / 125) * 100 = 20%."\nQuantitative Aptitude,Algebra,"Solve for $x$: If $x + 1/x = 4$, find $x^2 + 1/x^2$:",14,16,18,12,A,easy,"$x^2 + 1/x^2 = 4^2 - 2 = 14$."\nGeneral Awareness,Indian Polity,Which Constitutional Amendment introduced Panchayati Raj?,42nd,44th,73rd,86th,C,medium,The 73rd Constitutional Amendment Act 1992 created Part IX.\nReasoning & Intelligence,Analogy,Odometer : Mileage :: Barometer : ?,Temperature,Atmospheric Pressure,Humidity,Current,B,easy,Barometer measures atmospheric pressure.`
                    )
                  }
                  className="text-amber-700 dark:text-amber-400 text-xs font-semibold hover:underline cursor-pointer"
                >
                  Load Sample Text
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={downloadSampleCSVTemplate}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .CSV Template</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleBulkImport}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                Parse, Regenerate &amp; Sync to 8 PM Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
