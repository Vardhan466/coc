import React, { useState, useEffect, useRef } from 'react';
import type {
  AdminAIChatMessage,
  DailyExamScheduleConfig,
} from '../types/aiSystem';
import type { TestPaper } from '../types';
import { auth } from '../firebase';
import { sendAdminAIChatCommand } from '../utils/aiApiClient';
import {
  Bot,
  User,
  Send,
  Loader2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  HelpCircle,
  Eye,
  Shield,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  ListChecks,
} from 'lucide-react';

interface AdminAIChatProps {
  scheduleConfig?: DailyExamScheduleConfig;
  onTestScheduled?: (test: TestPaper) => void;
  onTestDeleted?: (testId: string) => void;
  onScheduleUpdated?: (cfg: DailyExamScheduleConfig) => void;
  onPreviewExam?: (test: TestPaper) => void;
}

const SUGGESTED_COMMANDS = [
  {
    label: 'Run Daily AI Exam Now',
    cmd: 'Run daily test now',
    icon: Sparkles,
  },
  {
    label: "Edit Today's Topic",
    cmd: "Edit today's topic to Time, Speed & Distance",
    icon: RefreshCw,
  },
  {
    label: 'Show All Commands',
    cmd: 'Commands',
    icon: ListChecks,
  },
  {
    label: 'Schedule Time & Work Exam',
    cmd: 'Schedule a test on Time & Work tonight at 20:30 with 15 questions',
    icon: Calendar,
  },
  {
    label: 'Generate 20 Algebra MCQs',
    cmd: 'Generate 20 questions on Algebra & Polynomials for SSC CGL',
    icon: Sparkles,
  },
  {
    label: 'Reschedule Daily Exam to 8 PM',
    cmd: 'Reschedule daily test start time to 20:00',
    icon: Clock,
  },
  {
    label: 'Set Standing AI Rule',
    cmd: 'Rule: Always emphasize previous-year exam trap options in detailed explanations',
    icon: Shield,
  },
  {
    label: 'Explain Negative Marking Rules',
    cmd: 'Explain the 0.25 negative marking and tie-breaker protocol for All-India Leaderboards',
    icon: HelpCircle,
  },
];

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/80 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function renderFormattedMessage(content: string): React.ReactNode {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
              <span className="min-w-0 flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

const WELCOME_MESSAGE = `Greetings, Administrator. Autonomous Daily AI Mode is active — daily MCQs and exams run automatically at scheduled IST timings **without waiting for admin approval**.

Type any command anytime if you want to trigger immediately or make optional edits:
- **Run / regenerate today's daily exam now**: *"Run daily test now"* or *"Generate today's MCQs"*
- **Edit today's topic**: *"Edit today's topic to Time, Speed & Distance"* or *"Pick random topic for today"*
- **Reschedule daily timings**: *"Reschedule daily test to 20:00"*
- **Schedule custom exams**: *"Schedule a test on Time & Work tonight at 20:30 with 15 questions"*
- **Generate syllabus MCQs**: *"Generate 20 questions on Algebra"*
- **Standing rules**: *"Rule: Always include shortcut elimination tips"*, *"Show rules"*, *"Commands"*`;

export const AdminAIChat: React.FC<AdminAIChatProps> = ({
  onTestScheduled,
  onTestDeleted,
  onScheduleUpdated,
  onPreviewExam,
}) => {
  const isFirebaseAdmin = Boolean(auth.currentUser && auth.currentUser.emailVerified);

  const [messages, setMessages] = useState<AdminAIChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('coc_admin_ai_chat_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('coc_admin_ai_chat_history', JSON.stringify(messages.slice(-30)));
    } catch {}
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isSending) return;

    setInput('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: AdminAIChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowTime,
    };

    if (!isFirebaseAdmin) {
      const lowerText = text.toLowerCase();
      const isHelpLookup =
        lowerText.includes('command') ||
        lowerText.includes('help') ||
        lowerText.includes('how to work') ||
        lowerText.includes('how does this work');
      const guardMsg: AdminAIChatMessage = {
        id: `msg_guard_${Date.now() + 1}`,
        role: 'assistant',
        content: isHelpLookup
          ? [
              'Autonomous Daily AI Mode runs automatically (18:00 IST topic selection & 30-MCQ generation, 19:00–19:15 IST live test, 20:00 IST key release) with no admin approval needed.',
              '',
              'Available Admin AI Commands (sign in via verified Google Admin to execute live mutations):',
              '• Run daily test now / Generate today\'s MCQs',
              '• Edit today\'s topic to <Topic Name>',
              '• Pick random topic for today (or tomorrow)',
              '• Enable auto daily test / Pause auto daily test',
              '• Reschedule daily test to <HH:MM> (e.g. 20:00)',
              '• Schedule a test on <Topic> at <HH:MM> with <N> questions',
              '• Generate <N> questions on <Topic>',
              '• Rule: <standing AI rule> / Show rules',
            ].join('\n')
          : 'You are currently in local Demo Admin preview mode. Sign in with your verified Google Admin account (ssuspect542@gmail.com) to execute live AI commands, schedule tests on the server, or update standing AI rules.',
        timestamp: nowTime,
      };
      setMessages((prev) => [...prev, userMsg, guardMsg]);
      return;
    }

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAdminAIChatCommand(text, historyPayload);

      const aiMsg: AdminAIChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: res.action,
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (res.action) {
        if (res.action.type === 'schedule_test' && res.action.scheduledTest) {
          onTestScheduled?.(res.action.scheduledTest);
        } else if (res.action.type === 'delete_scheduled_test' && res.action.deletedId) {
          onTestDeleted?.(res.action.deletedId);
        } else if (res.action.type === 'update_schedule' && res.action.updatedSchedule) {
          onScheduleUpdated?.(res.action.updatedSchedule);
        }
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const cleanMsg = rawMsg.replace(/\.+$/, '');
      const errMsg: AdminAIChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Unable to execute command: ${cleanMsg}. Please verify your session and try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    const welcome: AdminAIChatMessage = {
      id: `msg_w_${Date.now()}`,
      role: 'assistant',
      content: 'Chat session reset. Standing by for administrative commands and standing AI rules.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcome]);
    try {
      localStorage.removeItem('coc_admin_ai_chat_history');
    } catch {}
  };

  return (
    <div className="space-y-4">
      {!isFirebaseAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Live AI Command Execution Requires Verified Google Admin Auth</div>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
              You are previewing in local Demo Admin mode. Sign in with your verified Google Admin account (ssuspect542@gmail.com) to send live commands, generate AI MCQs, reschedule tests, and enforce standing AI rules.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[calc(100vh-240px)] min-h-[480px] max-h-[680px] transition-colors">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Admin AI Command Controller
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded">
                  Authoritative AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Natural language command execution, rule enforcement &amp; operational orchestration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Reset conversation"
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Suggested Command Chips */}
        <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Quick Orders:
          </span>
          {SUGGESTED_COMMANDS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={isSending}
                onClick={() => handleSendMessage(item.cmd)}
                className="text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Scroll Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div
                    className={`flex items-center gap-2 text-[10px] text-slate-400 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isUser ? 'You (Administrator)' : 'AI Operations Commander'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl break-words ${
                      isUser
                        ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
                    }`}
                  >
                    {renderFormattedMessage(msg.content)}
                  </div>

                  {/* Render Triggered Action Card if present */}
                  {msg.action && (
                    <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Action Executed: {msg.action.title}</span>
                        </div>
                        <span className="font-mono text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {msg.action.type}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {msg.action.summary}
                      </p>

                      {msg.action.scheduledTest && (
                        <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-indigo-950 dark:text-indigo-200">
                              {msg.action.scheduledTest.title} ({msg.action.scheduledTest.testCode})
                            </div>
                            <div className="text-[10px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                              Window: {msg.action.scheduledTest.date} @{' '}
                              {msg.action.scheduledTest.scheduledStartTime ||
                                msg.action.scheduledTest.windowStart}{' '}
                              IST · {msg.action.scheduledTest.totalQuestions} Questions
                            </div>
                          </div>

                          {onPreviewExam && (
                            <button
                              type="button"
                              onClick={() => onPreviewExam(msg.action!.scheduledTest!)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview Paper</span>
                            </button>
                          )}
                        </div>
                      )}

                      {msg.action.generatedQuestions && (
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>
                            {msg.action.generatedQuestions.length} questions appended to review queue
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Ready for Review
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-xs flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Analyzing command and executing system action...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Box Area */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Admin AI command input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              placeholder="Type command (e.g., 'Run daily test now', 'Edit today\\'s topic to ...', 'Commands')..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Execute</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Commands directly manipulate live database test schedules, question pools, and AI rules.</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {isFirebaseAdmin ? 'Verified Google Admin' : 'Demo Admin Preview'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
