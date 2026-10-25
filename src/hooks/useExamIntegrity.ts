import { useState, useEffect, useRef } from 'react';

export interface IntegrityEvent {
  timestamp: string;
  type: 'tab_switch' | 'window_blur' | 'screen_off';
  questionIndex: number;
  details: string;
}

interface UseExamIntegrityProps {
  isActive: boolean;
  currentQuestionIndex: number;
  onFirstViolation?: (event: IntegrityEvent) => void;
  onDisqualify?: (events: IntegrityEvent[]) => void;
  onLogAudit?: (action: string, details: string) => void;
}

export function useExamIntegrity({
  isActive,
  currentQuestionIndex,
  onFirstViolation,
  onDisqualify,
  onLogAudit,
}: UseExamIntegrityProps) {
  const [violationCount, setViolationCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [integrityLogs, setIntegrityLogs] = useState<IntegrityEvent[]>([]);

  const violationCountRef = useRef(0);
  const isDisqualifiedRef = useRef(false);
  const currentQRef = useRef(currentQuestionIndex);

  currentQRef.current = currentQuestionIndex;

  useEffect(() => {
    if (!isActive || isDisqualifiedRef.current) return;

    const recordViolation = (type: 'tab_switch' | 'window_blur' | 'screen_off', details: string) => {
      if (isDisqualifiedRef.current) return;

      const event: IntegrityEvent = {
        timestamp: new Date().toISOString(),
        type,
        questionIndex: currentQRef.current,
        details,
      };

      violationCountRef.current += 1;
      const count = violationCountRef.current;
      setViolationCount(count);
      setIntegrityLogs((prev) => [...prev, event]);

      if (onLogAudit) {
        onLogAudit(
          'INTEGRITY_VIOLATION_RECORDED',
          `Violation #${count} (${type}) detected on Question ${currentQRef.current + 1}: ${details}`
        );
      }

      if (count === 1) {
        // 1st Attempt: Gentle warning displayed to student
        setShowWarningModal(true);
        if (onFirstViolation) onFirstViolation(event);
      } else if (count >= 2) {
        // 2nd Attempt: Strict anti-cheat automatic termination
        isDisqualifiedRef.current = true;
        setIsDisqualified(true);
        setShowWarningModal(false);
        if (onDisqualify) onDisqualify([...integrityLogs, event]);
      }
    };

    const handleVisibilityChange = (e?: Event) => {
      if (document.hidden || !e?.isTrusted) {
        recordViolation('tab_switch', 'User switched tabs or minimized the active exam browser window.');
      }
    };

    const handleWindowBlur = () => {
      // Ignore blur if a warning modal is already showing
      if (!showWarningModal) {
        recordViolation('window_blur', 'Window focus lost (possible multi-window split or screen interaction).');
      }
    };

    const handlePageHide = () => {
      recordViolation('screen_off', 'Page hide / screen off or mobile device lock triggered.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isActive, onFirstViolation, onDisqualify, onLogAudit, showWarningModal]);

  const dismissWarning = () => {
    setShowWarningModal(false);
  };

  return {
    violationCount,
    showWarningModal,
    isDisqualified,
    integrityLogs,
    dismissWarning,
  };
}
