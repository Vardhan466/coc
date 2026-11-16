import { PreviousYearPaper, Question } from '../types';
import { SAMPLE_40_QUESTIONS } from '../data/mockExamData';
import { isAfterISTTime, parseHHMMToSeconds } from './istTime';

const KEY_SHEET_STORAGE_KEY = 'coc_master_key_sheet';
const PQP_STORAGE_KEY = 'coc_uploaded_pqps';

export function getMasterKeySheetQuestions(): Question[] {
  if (typeof window === 'undefined') return SAMPLE_40_QUESTIONS.slice(0, 30);
  try {
    const stored = localStorage.getItem(KEY_SHEET_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load master key sheet from storage', err);
  }
  return SAMPLE_40_QUESTIONS.slice(0, 30);
}

export function saveMasterKeySheetQuestions(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_SHEET_STORAGE_KEY, JSON.stringify(questions));
  } catch (err) {
    console.error('Failed to save master key sheet to storage', err);
  }
}

export function getUploadedPQPs(): PreviousYearPaper[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PQP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to read uploaded PQPs from storage', err);
  }
  return [];
}

export function saveUploadedPQPs(papers: PreviousYearPaper[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PQP_STORAGE_KEY, JSON.stringify(papers));
  } catch (err) {
    console.error('Failed to save PQPs to storage', err);
  }
}

/**
 * Strictly checks whether live IST time (or explicitly supplied HH:MM string for unit testing)
 * has reached 20:00 (8:00 PM IST). Defaults to real wall-clock IST.
 */
export function isAfter8PM(overrideHHMM?: string, nowMs: number = Date.now()): boolean {
  if (typeof overrideHHMM === 'string' && overrideHHMM.trim().length > 0) {
    return parseHHMMToSeconds(overrideHHMM) >= 20 * 3600;
  }
  return isAfterISTTime('20:00', nowMs);
}
