import React, { useState, useEffect } from 'react';
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
  Award,
  Copy,
  Check,
  Snowflake,
  Share2,
} from 'lucide-react';
import { StudentProgressStats } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  progress?: StudentProgressStats;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenSettings?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  progress,
  onUpdateProfile,
  onOpenSettings,
}) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [localAddress, setLocalAddress] = useState(user.address.local);
  const [state, setState] = useState(user.address.state || 'Andhra Pradesh');
  const [district, setDistrict] = useState(user.address.district || 'Visakhapatnam');
  const [examTarget, setExamTarget] = useState<ExamTarget>(user.examTarget);
  const [dpdpConsent, setDpdpConsent] = useState(user.dpdpConsent);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setPhone(user.phone);
    setLocalAddress(user.address?.local || '');
    setState(user.address?.state || 'Andhra Pradesh');
    setDistrict(user.address?.district || 'Visakhapatnam');
    setExamTarget(user.examTarget);
    setDpdpConsent(user.dpdpConsent);
  }, [user]);

  const referralUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(user.referralCode || user.studentId)}`
      : `https://clubofcompetition.in/?ref=${encodeURIComponent(user.referralCode || user.studentId)}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch {}
  };

  const availableDistricts = INDIAN_STATES_AND_DISTRICTS[state] || [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = INDIAN_STATES_AND_DISTRICTS[newState] || [];
    setDistrict(districts[0] || '');
  };

  const trimmedPhone = phone.trim();
  const isPhoneValid = trimmedPhone.length === 0 || trimmedPhone.length >= 10;
  const isFormValid = Boolean(
    fullName.trim().length >= 2 && isPhoneValid && state && district
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onUpdateProfile({
      fullName: fullName.trim(),
      phone: trimmedPhone,
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Official Student Digital ID Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-slate-900 dark:text-slate-100 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              COC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  Club Of Competition
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  · Aspirant Identity
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                National Daily Competitive Exam Board
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Student ID</div>
            <div className="text-base font-mono font-bold text-slate-900 dark:text-amber-400">
              {user.studentId}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate Name</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{user.fullName}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jurisdiction</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {user.address.district}, {user.address.state}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Examination</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{user.examTarget}</div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{progress?.skillTier || user.skillTier || 'Bronze'} Tier</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1 font-medium text-sky-700 dark:text-sky-400">
              <Snowflake className="w-3.5 h-3.5" />
              <span>{progress?.streakFreezesAvailable ?? 1} Streak Freeze(s)</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>App Settings</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <Lock className="w-3 h-3" />
              <span>Immutable ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Engine & Earned Badges Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Challenge a Friend &amp; Unlock Streak Freezes</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share your unique invite link. Every friend who completes the diagnostic earns both of you the Challenger badge and +1 Streak Freeze.
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
            {progress?.referralsCount ?? 0} Referrals Completed
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            aria-label="Personal Referral Challenge Link"
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyReferral}
            className="px-4 py-2 min-h-[38px] rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedReferral ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Challenge Link</span>
              </>
            )}
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Join me on Club Of Competition for tonight's 7:00 PM All-India 10s speed test! Claim a free Streak Freeze via my link: ${referralUrl}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 min-h-[38px] rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-800 dark:text-emerald-300 border border-[#25D366]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp Invite</span>
          </a>
        </div>

        {(progress?.badges?.length || user.badges?.length) ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unlocked Badges:
            </span>
            {(progress?.badges || user.badges || []).map((badge) => (
              <span
                key={badge}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-md"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>


      {/* Profile Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Candidate Information &amp; Regional Placement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              State and district data are required for normalized All-India and state leaderboards.
            </p>
          </div>

          {user.profileComplete ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
              <span>Incomplete</span>
            </span>
          )}
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold p-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Profile and jurisdiction saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Locked to verified identity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number <span className="text-[10px] font-normal text-slate-400">(Optional for Google sign-in)</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              {!isPhoneValid && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  Enter at least 10 digits or leave blank.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Target Exam
              </label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value as ExamTarget)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              >
                <option value="SSC CGL / CHSL" className="dark:bg-slate-900">SSC CGL / CHSL</option>
                <option value="Banking (IBPS / SBI PO &amp; Clerk)" className="dark:bg-slate-900">Banking (IBPS / SBI PO &amp; Clerk)</option>
                <option value="Railways (RRB NTPC / Group D)" className="dark:bg-slate-900">Railways (RRB NTPC / Group D)</option>
                <option value="State PSC (APPSC / TSPSC / UPPSC)" className="dark:bg-slate-900">State PSC (APPSC / TSPSC / UPPSC)</option>
                <option value="UPSC Civil Services" className="dark:bg-slate-900">UPSC Civil Services</option>
                <option value="Police SI &amp; Constable" className="dark:bg-slate-900">Police SI &amp; Constable</option>
              </select>
            </div>
          </div>

          {/* Regional Jurisdiction Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              >
                {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                  <option key={st} value={st} className="dark:bg-slate-900">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                District <span className="text-rose-500">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              >
                {availableDistricts.map((dist) => (
                  <option key={dist} value={dist} className="dark:bg-slate-900">
                    {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Town / Locality Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="Village, town or residential sector"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* DPDP Act 2023 Consent Checkbox */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-slate-900 dark:text-emerald-500 rounded"
              />
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                <span className="font-semibold text-slate-900 dark:text-white">DPDP Act 2023 Consent: </span>
                I consent to the collection and processing of my phone and geographical location strictly for state and district percentile ranking normalization.
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || !dpdpConsent}
              className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
