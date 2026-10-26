import React, { useState } from 'react';
import { UserProfile, ExamTarget } from '../types';
import { INDIAN_STATES_AND_DISTRICTS } from '../utils/scoring';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Lock,
  Save,
  Settings,
  ShieldCheck,
  Award,
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Official Student Digital ID Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              COC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  Club Of Competition
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  · Aspirant Identity
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                National Daily Competitive Exam Board
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Student ID</div>
            <div className="text-base font-mono font-bold text-slate-900">
              {user.studentId}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Name</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{user.fullName}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Jurisdiction</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {user.address.district}, {user.address.state}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target Examination</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{user.examTarget}</div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">
              {user.subscription.isActive ? 'Pro Daily Pass · Active' : 'Standard Aspirant Tier'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-xs"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>App Settings</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Lock className="w-3 h-3" />
              <span>Immutable ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Candidate Information & Regional Placement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              State and district data are required for normalized All-India and state leaderboards.
            </p>
          </div>

          {user.profileComplete ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incomplete</span>
            </span>
          )}
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold p-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile and jurisdiction saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 cursor-not-allowed"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Locked to verified identity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number (OTP Verified) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Target Exam
              </label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value as ExamTarget)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
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

          {/* Regional Jurisdiction Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District <span className="text-rose-500">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {availableDistricts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Town / Locality Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="Village, town or residential sector"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* DPDP Act 2023 Consent Checkbox */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-slate-900 rounded"
              />
              <div className="text-xs text-slate-600 leading-tight">
                <span className="font-semibold text-slate-900">DPDP Act 2023 Consent: </span>
                I consent to the collection and processing of my phone and geographical location strictly for state and district percentile ranking normalization.
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || !dpdpConsent}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
