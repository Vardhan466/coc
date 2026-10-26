import React, { useState } from 'react';
import {
  AuditLogEntry,
  DailyAggregate,
  Question,
  QuestionAnalytic,
  TestPaper,
  UserRole,
} from '../types';
import {
  calculateDiscriminationIndex,
  checkQuestionDefect,
  validateTestPaper,
} from '../utils/scoring';
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
} from 'lucide-react';

interface AdminDashboardProps {
  currentRole: UserRole;
  testPapers: TestPaper[];
  analytics: QuestionAnalytic[];
  dailyAggregate: DailyAggregate;
  auditLogs: AuditLogEntry[];
  onTriggerReevaluation: (questionId: string, correctedIndex: number) => void;
  onPreviewStudentExam: (test: TestPaper) => void;
  onAddAuditLog: (action: string, details: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentRole,
  testPapers,
  analytics,
  dailyAggregate,
  auditLogs,
  onTriggerReevaluation,
  onPreviewStudentExam,
  onAddAuditLog,
  onLogout,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'testManager' | 'questionBank' | 'questionAnalytics' | 'userAnalytics' | 'studentLookup' | 'auditLogs'
  >(() => {
    try {
      const saved = localStorage.getItem('coc_active_admin_tab');
      if (
        saved &&
        ['testManager', 'questionBank', 'questionAnalytics', 'userAnalytics', 'studentLookup', 'auditLogs'].includes(
          saved
        )
      ) {
        return saved as any;
      }
    } catch {}
    return 'testManager';
  });

  const handleAdminTabChange = (
    tab: 'testManager' | 'questionBank' | 'questionAnalytics' | 'userAnalytics' | 'studentLookup' | 'auditLogs'
  ) => {
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

  const handleBulkImport = () => {
    if (!importText.trim()) {
      setImportErrors(['No CSV or JSON data provided.']);
      return;
    }
    // Simulate parsing and validation
    setImportSuccess(true);
    setImportErrors([]);
    onAddAuditLog(
      'CSV_QUESTION_IMPORT',
      'Imported 40 verified questions into question repository. Tag validation: 100% complete.'
    );
    setTimeout(() => {
      setImportSuccess(false);
      setIsImportModalOpen(false);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Admin Header with Role Badge */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                COC Operations & Administration
              </h1>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200 uppercase">
                {currentRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Exam Scheduling · Question Vault · Discrimination Analytics · Integrity Audit Trail
            </p>
          </div>
        </div>

        {/* Right Header: 30-min Pre-Lock Status & Sign Out */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">6:30 PM Pre-Lock</div>
              <div className="font-mono font-bold text-slate-900">
                {activeTest.lockedForEditing ? 'LOCKED (Immutable)' : 'UNLOCKED'}
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              title="Sign Out of Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'testManager', label: 'Test Manager & Workflow', icon: Layers },
          { id: 'questionBank', label: 'Question Bank & Import', icon: Database },
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
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
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
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daily Test Lifecycle & Validation Gate
                </h2>
                <p className="text-xs text-slate-500">
                  Enforces strict State Machine: Draft → Validated → Scheduled → Live → Closed → Results Published.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidateTest}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Run 30-Q Validator</span>
                </button>

                <button
                  onClick={() => onPreviewStudentExam(activeTest)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Student View Preview</span>
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
                { state: 'Results', desc: '8:15 PM Key release' },
              ].map((step, idx) => {
                const isCurrent = idx === 3; // Live
                const isPast = idx < 3;
                return (
                  <div
                    key={step.state}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
                        : isPast
                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                        : 'border-slate-100 bg-slate-50/50 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{step.state}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{step.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Validation Output Banner if run */}
            {validationResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  validationResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Paper Validated: Exactly 30 Questions, 4 Options Each, 100% Tagged!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Paper Failed Validation ({validationResult.errors.length} Issues)</span>
                    </>
                  )}
                </div>
                {validationResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-700">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Test Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">Pre-Computation & Cloud Rules</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Edit Lock Time:</span>
                  <span className="font-semibold text-slate-800">6:30 PM IST (Enforced)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cloud Function Pre-Warm:</span>
                  <span className="font-semibold text-emerald-700">6:55 PM (minInstances = 20)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Window Closes:</span>
                  <span className="font-semibold text-slate-800">7:15 PM IST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Answer Key Release:</span>
                  <span className="font-semibold text-purple-700 font-mono">20:15 IST Vault Trigger</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">Scale & Concurrency Defenses</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Write Architecture:</span>
                  <span className="font-semibold text-slate-800">Single attempt doc / 8s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shared Counters during Exam:</span>
                  <span className="font-semibold text-emerald-700">STRICT ZERO contention</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ranking Job:</span>
                  <span className="font-semibold text-slate-800">Post-window batch at 7:20:19 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Idempotency Key:</span>
                  <span className="font-mono text-amber-700 text-[11px]">attemptId + questionIndex</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE 2: QUESTION BANK & IMPORT --- */}
      {activeAdminTab === 'questionBank' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Question Repository & Schema Import
                </h2>
                <p className="text-xs text-slate-500">
                  Upload tests days ahead via CSV or JSON with row-level validation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Bulk CSV / JSON Import</span>
                </button>
              </div>
            </div>

            {/* Questions Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Subject & Topic</th>
                    <th className="py-2.5 px-3">Question Text</th>
                    <th className="py-2.5 px-3 text-center">Correct Key</th>
                    <th className="py-2.5 px-3 text-center">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTest.questions.slice(0, 15).map((q, i) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">Q{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{q.subject}</div>
                        <div className="text-[10px] text-slate-400">{q.topic}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-700">{q.text}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-emerald-700">
                        Option {String.fromCharCode(65 + q.correctIndex)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.difficulty === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-slate-500 text-center">
              Showing 15 of 40 verified items. All questions have verified single keys and bilingual fallbacks.
            </div>
          </div>
        </div>
      )}

      {/* --- MODULE 3: QUESTION ANALYTICS & DEFECT DETECTION --- */}
      {activeAdminTab === 'questionAnalytics' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Post-Exam Question Analytics & Defect Detection
                </h2>
                <p className="text-xs text-slate-500">
                  Calculates Pass Rate, Skip Rate, Discrimination Index (D = P_top - P_bottom), and flags defective questions.
                </p>
              </div>

              {reevalStatus && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {reevalStatus}
                </div>
              )}
            </div>

            {/* Defective Question Alert Callout */}
            {analytics.some((a) => a.isDefective) && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-sm text-rose-900">
                      Defective Question Alert: Q19 (Divisibility Problem)
                    </div>
                    <p className="text-rose-800 mt-0.5">
                      Discrimination Index is <strong className="font-mono text-rose-950">-0.18</strong> (Negative Discrimination). The top-scoring cohort got this wrong more often than lower scorers due to Option D distractor confusion.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setReevalQuestionId('q19');
                    setReevalNewKey(0); // Option A
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs shrink-0 transition-colors shadow-xs"
                >
                  Trigger Re-evaluation
                </button>
              </div>
            )}

            {/* Analytics Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100">
                  {analytics.map((qa) => {
                    const isDef = qa.isDefective;
                    return (
                      <tr
                        key={qa.questionId}
                        className={`hover:bg-slate-50 ${isDef ? 'bg-rose-50/70' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold">Q{qa.questionIndex + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{qa.subject}</div>
                          <div className="text-[10px] text-slate-400">{qa.topic}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                          {qa.correctRate}%
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{qa.skipRate}%</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                          {qa.avgTimeSec}s
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          <span className={qa.discriminationIndex < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                            {qa.discriminationIndex}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDef ? (
                            <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded uppercase">
                              Defective
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                              Sound
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setReevalQuestionId(qa.questionId);
                              setReevalNewKey(0);
                            }}
                            className="text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md"
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
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Total Subscribed</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {dailyAggregate.totalSubscribers.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Active Pro Accounts</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Daily Participants</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {dailyAggregate.participants.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                {dailyAggregate.participationRate}% Turnout
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Average Score</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {dailyAggregate.averageScore}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Highest: {dailyAggregate.highestScore}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">At-Risk Students</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {dailyAggregate.atRiskStudentsCount}
              </div>
              <div className="text-[10px] text-rose-700 font-semibold mt-0.5">Missed 3+ consecutive days</div>
            </div>
          </div>

          {/* Score Distribution Histogram */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              All-India Score Distribution Histogram (4,120 Candidates)
            </h3>
            <div className="space-y-3">
              {dailyAggregate.scoreHistogram.map((bin) => (
                <div key={bin.range} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{bin.range} Marks</span>
                    <span className="text-slate-500 font-mono">
                      {bin.count} students ({bin.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-md overflow-hidden">
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
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              State-wise Participation & Regional Average Benchmark
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {dailyAggregate.stateBreakdown.map((st) => (
                <div key={st.state} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">{st.state}</div>
                    <div className="text-[10px] text-slate-500">{st.count} participants</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 font-mono text-sm">{st.avgScore}</div>
                    <div className="text-[10px] text-slate-400">avg score</div>
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
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Student Profile & Integrity Diagnostic Lookup
            </h2>
            <p className="text-xs text-slate-500">
              Lookup by unique Student ID (`COC-2026-000123`), phone, or email to inspect exam attempts and cheating flags.
            </p>

            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter Student ID (e.g. COC-2026-000123)"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
              />
              <button
                onClick={handleSearchStudent}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lookup</span>
              </button>
            </div>

            {/* Found Student Inspector Card */}
            {foundStudent && (
              <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="font-bold text-slate-900 text-base">{foundStudent.fullName}</div>
                    <div className="font-mono text-amber-700 font-semibold">{foundStudent.studentId}</div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded text-[10px]">
                    {foundStudent.subscription}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Phone:</span>
                    <span className="font-semibold text-slate-800">{foundStudent.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location:</span>
                    <span className="font-semibold text-slate-800">{foundStudent.district}, {foundStudent.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tests Taken:</span>
                    <span className="font-bold text-slate-800">{foundStudent.testsTaken}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Average Score:</span>
                    <span className="font-bold text-slate-900 font-mono">{foundStudent.avgScore}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Integrity Flags Recorded:</span>
                    <span className={`font-semibold ${foundStudent.integrityFlags.tabSwitches > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {foundStudent.integrityFlags.tabSwitches} tab switches
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">DPDP Act Privacy Compliant</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODULE 6: AUDIT LOGS --- */}
      {activeAdminTab === 'auditLogs' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Immutable System Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Every administrative action, test schedule lock, and score re-evaluation is permanently recorded.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">{log.adminName}</span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">{log.details}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-evaluation Modal Dialog */}
      {reevalQuestionId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">
                Confirm Score Re-evaluation
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are re-scoring all 4,120 attempts for question <strong>{reevalQuestionId}</strong>. This batch update recalculates marks (+1/-0.25), updates student ranks, and creates an audit record.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Corrected Option Key:
              </label>
              <select
                value={reevalNewKey}
                onChange={(e) => setReevalNewKey(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReevalQuestionId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRunReevaluation(reevalQuestionId)}
                className="bg-rose-700 hover:bg-rose-800 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-xs transition-colors"
              >
                Run Batch Re-score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal Dialog */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <span>Bulk Question Importer</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Paste standard CSV rows (format: <code>subject, topic, question_text, optA, optB, optC, optD, correctIndex(0-3), difficulty, explanation</code>).
            </p>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Quantitative Aptitude,Percentages,If price increases by 25%...,20%,25%,16.67%,15%,0,easy,Reduction formula..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            {importSuccess && (
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-2.5 rounded-lg text-xs font-semibold">
                ✓ 40 questions parsed, verified, and uploaded successfully!
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() =>
                  setImportText(
                    `Quantitative Aptitude,Speed Math,15 * 18 = ?,270,280,260,250,0,easy,15*18=270\nGeneral Awareness,Polity,Article for Finance Commission?,Art 280,Art 324,Art 352,Art 360,0,medium,Article 280 of Constitution`
                  )
                }
                className="text-amber-700 text-xs font-semibold hover:underline"
              >
                Load Sample Template
              </button>

              <button
                onClick={handleBulkImport}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-xs transition-colors"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
