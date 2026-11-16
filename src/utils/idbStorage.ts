import { ExamSessionState } from '../types/exam';

const DB_NAME = 'COC_ExamDB';
const DB_VERSION = 1;
const STORE_NAME = 'exam_sessions';
const LS_FALLBACK_PREFIX = 'coc_exam_session_';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'examId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save exam session to IndexedDB with automatic localStorage synchronous mirror.
 */
export async function saveExamSession(session: ExamSessionState): Promise<void> {
  const sessionWithTimestamp = {
    ...session,
    lastSavedAt: Date.now(),
  };

  // 1. LocalStorage mirror for immediate reliability & beforeunload sync
  try {
    localStorage.setItem(
      `${LS_FALLBACK_PREFIX}${session.examId}`,
      JSON.stringify(sessionWithTimestamp)
    );
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }

  // 2. IndexedDB primary store
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sessionWithTimestamp);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // If IDB fails, fallback already happened in LocalStorage
    console.warn('IndexedDB write failed, fallback maintained:', err);
  }
}

/**
 * Synchronous save for window.onbeforeunload and page freeze events.
 */
export function saveExamSessionSync(session: ExamSessionState): void {
  try {
    const payload = JSON.stringify({
      ...session,
      lastSavedAt: Date.now(),
    });
    localStorage.setItem(`${LS_FALLBACK_PREFIX}${session.examId}`, payload);
  } catch (err) {
    console.error('Failed synchronous save on beforeunload:', err);
  }
}

/**
 * Load saved exam session from IndexedDB or LocalStorage.
 */
export async function loadExamSession(examId: string): Promise<ExamSessionState | null> {
  // 1. Try IndexedDB first
  try {
    const db = await openDB();
    const idbResult = await new Promise<ExamSessionState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(examId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (idbResult) {
      return idbResult;
    }
  } catch (err) {
    console.warn('IndexedDB read failed, checking LocalStorage fallback:', err);
  }

  // 2. Try LocalStorage fallback
  try {
    const raw = localStorage.getItem(`${LS_FALLBACK_PREFIX}${examId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('LocalStorage read failed:', err);
  }

  return null;
}

/**
 * Clear session upon final submission or cancellation.
 */
export async function clearExamSession(examId: string): Promise<void> {
  try {
    localStorage.removeItem(`${LS_FALLBACK_PREFIX}${examId}`);
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(examId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}
