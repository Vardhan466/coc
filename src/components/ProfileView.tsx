import React, { useState } from 'react';
import { UserProfile, ExamTarget, LanguageCode } from '../types';
import { INDIAN_STATES_AND_DISTRICTS } from '../utils/scoring';
import {
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  Globe,
  Settings,
} from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenSettings?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateProfile,
  onOpenSettings,
}) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [localAddress, setLocalAddress] = useState(user.address.local);
  const [state, setState] = useState(user.address.state);
  const [district, setDistrict] = useState(user.address.district);
  const [examTarget, setExamTarget] = useState<ExamTarget>(user.examTarget);
  const [dpdpConsent, setDpdpConsent] = useState(user.dpdpConsent);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const availableDistricts = INDIAN_STATES_AND_DISTRICTS[state] || [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    const newDistricts = INDIAN_STATES_AND_DISTRICTS[newState] || [];
    setDistrict(newDistricts[0] || '');
  };

  const isFormValid = Boolean(
    fullName.trim().length > 2 && phone.trim().length >= 10 && district.trim() && state.trim()
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onUpdateProfile({
      fullName,
      phone,
      address: {
        local: localAddress,
        district,
        state,
        country: 'India',
      },
      examTarget,
      dpdpConsent,
      profileComplete: Boolean(isFormValid && dpdpConsent),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      {/* Official Student Digital ID Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-400/20 via-cyan-400/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
              COC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  CLUB OF COMPETITION
                </span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                  OFFICIAL ID
                </span>
              </div>
              <p className="text-[11px] text-slate-400">National Competitive Exam Board Aspirant Identity</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Permanent Student ID</div>
            <div className="text-lg sm:text-xl font-mono font-black text-amber-400 tracking-wider">
              {user.studentId}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Full Name</div>
            <div className="text-sm font-bold text-white mt-0.5">{user.fullName}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Jurisdiction & State</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {user.address.district}, {user.address.state}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Target Examination</div>
            <div className="text-sm font-bold text-amber-300 mt-0.5">{user.examTarget}</div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">
              {user.subscription.isActive ? 'Pro Daily Pass • Active' : 'Free Tier'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-sans text-xs underline cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Language & App Settings</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Immutable Server ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Edit Aspirant Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accurate state and district data are mandatory for normalized All-India & State leaderboards.
            </p>
          </div>

          {user.profileComplete ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified & Test Ready</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incomplete</span>
            </span>
          )}
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile and geographical jurisdiction saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student ID (System Generated • Immutable)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={user.studentId}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verified Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Ravi Kumar Reddy"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number (OTP verification) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+91 98480 12345"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State (Jurisdiction) <span className="text-rose-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                District <span className="text-rose-500">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Village / Town / Locality
              </label>
              <input
                type="text"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="e.g. Near Bus Stand, Maddur"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Target Exam
              </label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value as ExamTarget)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="SSC CGL / CHSL">SSC CGL / CHSL</option>
                <option value="Banking (IBPS / SBI PO & Clerk)">Banking (IBPS / SBI PO & Clerk)</option>
                <option value="Railways (RRB NTPC / Group D)">Railways (RRB NTPC / Group D)</option>
                <option value="State PSC (APPSC / TSPSC / UPPSC)">State PSC (APPSC / TSPSC / UPPSC)</option>
                <option value="UPSC Civil Services">UPSC Civil Services</option>
                <option value="Police SI & Constable">Police SI & Constable</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">
                  DPDP Act 2023 Privacy Notice & Consent
                </span>
                I consent to the collection of my phone number and district location solely for official exam authentication, certificate verification, and regional score normalization. My phone and exact address are kept strictly private from public leaderboards.
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || !dpdpConsent}
            className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile & Enable Official Exam Entry</span>
          </button>
        </form>
      </div>
    </div>
  );
};
