import { UserProfile, UserRole, ExamTarget } from '../types';
import { formatStudentId } from '../utils/scoring';

export interface StoredAccount {
  id: string; // User ID / Student ID
  email: string;
  password: string; // Plaintext for demo/prototype auth storage
  role: UserRole;
  userProfile: UserProfile;
}

export const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'ADMIN-COC-001',
    email: 'admin@coc.in',
    password: 'admin@password123',
    role: 'superAdmin',
    userProfile: {
      uid: 'user_super_admin_01',
      studentId: 'ADMIN-COC-001',
      fullName: 'Dr. K. Srinivas',
      email: 'admin@coc.in',
      phone: '+91 99000 11223',
      address: {
        local: 'Administrative HQ, Cyber Gateway',
        district: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
      },
      examTarget: 'UPSC Civil Services',
      language: 'en',
      profileComplete: true,
      role: 'superAdmin',
      createdAt: '2026-01-01T00:00:00Z',
      dpdpConsent: true,
      subscription: {
        isActive: true,
        plan: 'Annual Elite',
        validUntil: '2030-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    },
  },
  {
    id: 'CONTENT-COC-002',
    email: 'content@coc.in',
    password: 'content@password123',
    role: 'contentAdmin',
    userProfile: {
      uid: 'user_content_admin_02',
      studentId: 'CONTENT-COC-002',
      fullName: 'Vikram Verma',
      email: 'content@coc.in',
      phone: '+91 98111 22334',
      address: {
        local: 'Content Wing, Sector 62',
        district: 'Noida (GB Nagar)',
        state: 'Uttar Pradesh',
        country: 'India',
      },
      examTarget: 'SSC CGL / CHSL',
      language: 'en',
      profileComplete: true,
      role: 'contentAdmin',
      createdAt: '2026-02-01T00:00:00Z',
      dpdpConsent: true,
      subscription: {
        isActive: true,
        plan: 'Annual Elite',
        validUntil: '2030-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    },
  },
  {
    id: 'ANALYST-COC-003',
    email: 'analyst@coc.in',
    password: 'analyst@password123',
    role: 'analyst',
    userProfile: {
      uid: 'user_analyst_03',
      studentId: 'ANALYST-COC-003',
      fullName: 'Sneha Sen',
      email: 'analyst@coc.in',
      phone: '+91 97222 33445',
      address: {
        local: 'Data Cell, Salt Lake',
        district: 'Kolkata',
        state: 'West Bengal',
        country: 'India',
      },
      examTarget: 'Banking (IBPS / SBI PO & Clerk)',
      language: 'en',
      profileComplete: true,
      role: 'analyst',
      createdAt: '2026-02-15T00:00:00Z',
      dpdpConsent: true,
      subscription: {
        isActive: true,
        plan: 'Annual Elite',
        validUntil: '2030-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    },
  },
  {
    id: 'COC-2026-000123',
    email: 'ravi.reddy@student.coc.in',
    password: 'student@password123',
    role: 'student',
    userProfile: {
      uid: 'user_ravi_01',
      studentId: 'COC-2026-000123',
      fullName: 'Ravi Kumar Reddy',
      email: 'ravi.reddy@student.coc.in',
      phone: '+91 98480 12345',
      address: {
        local: 'Maddur, Rayalaseema',
        district: 'Kurnool',
        state: 'Andhra Pradesh',
        country: 'India',
      },
      examTarget: 'SSC CGL / CHSL',
      language: 'en',
      profileComplete: true,
      role: 'student',
      createdAt: '2026-01-15T10:00:00Z',
      dpdpConsent: true,
      subscription: {
        isActive: true,
        plan: 'Pro Daily Pass',
        validUntil: '2026-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    },
  },
];

const STORAGE_KEY = 'coc_registered_accounts';

export function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    // Ensure default accounts are present
    const combined = [...parsed];
    DEFAULT_ACCOUNTS.forEach((def) => {
      if (!combined.some((a) => a.id.toLowerCase() === def.id.toLowerCase() || a.email.toLowerCase() === def.email.toLowerCase())) {
        combined.push(def);
      }
    });
    return combined;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export function saveStoredAccount(account: StoredAccount): void {
  try {
    const accounts = getStoredAccounts();
    const updated = [account, ...accounts.filter((a) => a.id !== account.id && a.email.toLowerCase() !== account.email.toLowerCase())];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving account to localStorage', err);
  }
}

export function authenticateUser(
  identifier: string,
  pass: string
): { success: boolean; user?: UserProfile; error?: string } {
  const accounts = getStoredAccounts();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  const found = accounts.find(
    (a) => a.id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!found) {
    return {
      success: false,
      error: 'Account not found with this User ID / Email. Please check credentials or register.',
    };
  }

  if (found.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  return {
    success: true,
    user: found.userProfile,
  };
}
