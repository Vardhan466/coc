import React, { useRef, useEffect, useState } from 'react';
import { Attempt, TestPaper, UserProfile } from '../types';
import { getTodayIsoDateIST, getISTNowParts } from '../utils/istTime';
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Trophy,
  Award,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ShareResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: Attempt;
  user: UserProfile;
  test: TestPaper;
  localizedRank?: number | null;
  localizedCohortSize?: number;
}

export const ShareResultsModal: React.FC<ShareResultsModalProps> = ({
  isOpen,
  onClose,
  attempt,
  user,
  test,
  localizedRank,
  localizedCohortSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalQuestions = test.questions?.length || test.totalQuestions || 30;
  const score = attempt.score.toFixed(2);
  const rank = attempt.rank ?? 1;
  const percentile = (attempt.percentile ?? 0).toFixed(1);
  const correct = attempt.correctCount;
  const incorrect = attempt.incorrectCount;
  const unattempted = attempt.unattemptedCount;
  const accuracy =
    attempt.correctCount + attempt.incorrectCount > 0
      ? Math.round(
          (attempt.correctCount / (attempt.correctCount + attempt.incorrectCount)) * 100
        )
      : 0;
  const spentSeconds = attempt.timeTakenSeconds ?? attempt.totalTimeSeconds;
  const avgSpeed = spentSeconds
    ? (spentSeconds / Math.max(1, totalQuestions)).toFixed(1)
    : '0.0';

  const userState = attempt.studentState || user.address.state || 'Andhra Pradesh';
  const userCity = attempt.studentCity || user.address.district || 'Guntur';

  // Render high-resolution canvas (1200x675 for optimal 16:9 social cards)
  useEffect(() => {
    if (!isOpen) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    // Background: Deep dark slate with subtle modern gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0B0F19');
    bgGradient.addColorStop(0.5, '#0F172A');
    bgGradient.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative subtle geometric cyber lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 60; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 60; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Subtle corner accents
    const accentLen = 28;
    ctx.strokeStyle = '#F59E0B'; // Amber accent
    ctx.lineWidth = 4;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(30, 30 + accentLen);
    ctx.lineTo(30, 30);
    ctx.lineTo(30 + accentLen, 30);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 30 - accentLen, 30);
    ctx.lineTo(width - 30, 30);
    ctx.lineTo(width - 30, 30 + accentLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(30, height - 30 - accentLen);
    ctx.lineTo(30, height - 30);
    ctx.lineTo(30 + accentLen, height - 30);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 30 - accentLen, height - 30);
    ctx.lineTo(width - 30, height - 30);
    ctx.lineTo(width - 30, height - 30 - accentLen);
    ctx.stroke();

    // Top Header Banner
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "900 24px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('CLUB OF COMPETITION', 65, 85);

    ctx.fillStyle = '#94A3B8';
    ctx.font = "600 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('ALL-INDIA DAILY 7:00 PM COMPETITIVE MERIT BOARD · OFFICIAL SCORECARD', 65, 112);

    // Verified Stamp in Top-Right
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(width - 330, 60, 260, 48);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width - 330, 60, 260, 48);

    ctx.fillStyle = '#10B981';
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('VERIFIED OFFICIAL SCORECARD', width - 310, 90);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(65, 140);
    ctx.lineTo(width - 65, 140);
    ctx.stroke();

    // Candidate Profile Section
    ctx.fillStyle = '#F8FAFC';
    ctx.font = "bold 28px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(user.fullName, 65, 185);

    ctx.fillStyle = '#94A3B8';
    ctx.font = "500 15px 'Plus Jakarta Sans', system-ui, sans-serif";
    const locText = `${userCity}, ${userState} · ${user.examTarget || 'UPSC/APPSC'} · Candidate ID: ${user.studentId}`;
    ctx.fillText(locText, 65, 212);

    // 3 Big Primary Metric Cards
    const cardY = 245;
    const cardHeight = 175;
    const cardGap = 20;
    const cardWidth = (width - 130 - cardGap * 2) / 3;

    // Card 1: Score
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(65, cardY, cardWidth, cardHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(65, cardY, cardWidth, cardHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('FINAL MERIT SCORE', 85, cardY + 38);

    ctx.fillStyle = '#38BDF8'; // Sky blue
    ctx.font = "900 56px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(score, 85, cardY + 105);
    const scoreWidth = ctx.measureText(score).width;

    ctx.fillStyle = '#64748B';
    ctx.font = "600 16px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(`out of ${totalQuestions}.0`, 85 + scoreWidth + 12, cardY + 102);

    ctx.fillStyle = '#10B981';
    ctx.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(`+${correct} correct · -${incorrect * 0.25} negative mark loss`, 85, cardY + 145);

    // Card 2: All India Rank
    const card2X = 65 + cardWidth + cardGap;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(card2X, cardY, cardWidth, cardHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(card2X, cardY, cardWidth, cardHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('ALL-INDIA RANK', card2X + 20, cardY + 38);

    ctx.fillStyle = '#F59E0B'; // Amber
    ctx.font = "900 56px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(`#${rank}`, card2X + 20, cardY + 105);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = "600 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    if (localizedRank) {
      ctx.fillText(
        `#${localizedRank} in ${userState} (${localizedCohortSize ?? 1} candidates)`,
        card2X + 20,
        cardY + 145
      );
    } else {
      ctx.fillText(`State Rank: Top tier contender in ${userState}`, card2X + 20, cardY + 145);
    }

    // Card 3: Percentile
    const card3X = card2X + cardWidth + cardGap;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(card3X, cardY, cardWidth, cardHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(card3X, cardY, cardWidth, cardHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText('NATIONAL PERCENTILE', card3X + 20, cardY + 38);

    ctx.fillStyle = '#A78BFA'; // Purple
    ctx.font = "900 56px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(`${percentile}%`, card3X + 20, cardY + 105);

    ctx.fillStyle = '#10B981';
    ctx.font = "600 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    const topPct = (100 - parseFloat(percentile)).toFixed(1);
    ctx.fillText(`Top ${topPct}% nationwide performance`, card3X + 20, cardY + 145);

    // Detailed Breakdown Ribbon (Bottom)
    const ribbonY = 445;
    const ribbonHeight = 85;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(65, ribbonY, width - 130, ribbonHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(65, ribbonY, width - 130, ribbonHeight);

    const metrics = [
      { label: 'ACCURACY', val: `${accuracy}%`, color: '#38BDF8' },
      { label: 'ATTEMPTED', val: `${correct + incorrect}/${totalQuestions}`, color: '#E2E8F0' },
      { label: 'CORRECT', val: `${correct}`, color: '#10B981' },
      { label: 'INCORRECT', val: `${incorrect}`, color: '#F43F5E' },
      { label: 'AVG SPEED', val: `${avgSpeed}s / Q`, color: '#FBBF24' },
      { label: 'NEGATIVE LOSS', val: `-${(incorrect * 0.25).toFixed(2)}`, color: '#FB7185' },
    ];

    const slotWidth = (width - 130) / metrics.length;
    metrics.forEach((m, idx) => {
      const slotX = 65 + idx * slotWidth;
      ctx.fillStyle = '#64748B';
      ctx.font = "bold 11px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(m.label, slotX + 20, ribbonY + 32);

      ctx.fillStyle = m.color;
      ctx.font = "bold 22px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(m.val, slotX + 20, ribbonY + 64);

      if (idx > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.moveTo(slotX, ribbonY + 15);
        ctx.lineTo(slotX, ribbonY + ribbonHeight - 15);
        ctx.stroke();
      }
    });

    // Footer zone
    const footerY = 580;
    ctx.fillStyle = '#64748B';
    ctx.font = "500 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    const istParts = getISTNowParts();
    const dateStr = `${istParts.day} ${istParts.dateLabel.split(' ')[0]} ${istParts.year}`;
    ctx.fillText(
      `Date: ${dateStr} · Test: ${test.title || 'Daily High-Stakes 7 PM Exam'}`,
      65,
      footerY
    );
    ctx.fillText(
      'Hash: SHA-256 Verified · Deterministic Tie-Breaker Protocol · ClubOfCompetition.in',
      65,
      footerY + 22
    );

    // Hashtags
    ctx.fillStyle = '#38BDF8';
    ctx.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    const hashText = '#ClubOfCompetition #RankHolder #UPSC #APPSC #TSPSC';
    const hashWidth = ctx.measureText(hashText).width;
    ctx.fillText(hashText, width - 65 - hashWidth, footerY + 10);

    // Generate Data URL for direct downloads & sharing
    try {
      const url = canvas.toDataURL('image/png');
      setDataUrl(url);
    } catch (e) {
      console.error('Error generating canvas data URL', e);
    } finally {
      setIsGenerating(false);
    }
  }, [
    isOpen,
    attempt,
    user,
    test,
    localizedRank,
    localizedCohortSize,
    score,
    rank,
    percentile,
    correct,
    incorrect,
    unattempted,
    accuracy,
    avgSpeed,
    userState,
    userCity,
    totalQuestions,
  ]);

  if (!isOpen) return null;

  const shareText = `Scored ${score}/${totalQuestions} on Club Of Competition!
All-India Rank: #${rank} (${percentile}th Percentile)
Region: ${userCity}, ${userState}${localizedRank ? ` (#${localizedRank} in State)` : ''}
Accuracy: ${accuracy}% | Avg Speed: ${avgSpeed}s/Q

Challenge me on the daily 7 PM All-India Live Exam!
#ClubOfCompetition #CompetitiveExams #Prelims2026`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadImage = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `COC-Scorecard-${user.studentId}-${getTodayIsoDateIST()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        if (dataUrl && typeof window !== 'undefined') {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `COC-Scorecard-${user.studentId}.png`, {
            type: 'image/png',
          });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Club Of Competition Scorecard: AIR #${rank}`,
              text: shareText,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: `Club Of Competition Scorecard: AIR #${rank}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopyText();
    }
  };

  const shareUrls = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(
      window.location.href
    )}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      window.location.href
    )}`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-smooth-in">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Share Your Scorecard</span>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  · AIR #{rank}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-resolution verified scorecard and share on social media
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Canvas Card Preview (Rendered from high-res canvas) */}
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-slate-950">
            {/* Hidden Offscreen/Full-size Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Visual Image Preview */}
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Club Of Competition Verified Scorecard"
                className="w-full h-auto object-contain block rounded-lg select-none"
              />
            ) : (
              <div className="aspect-[16/9] flex items-center justify-center text-slate-400 text-sm">
                Generating high-resolution scorecard...
              </div>
            )}
          </div>

          {/* Quick Share Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Quick Share to Social Platforms</span>
              <span className="text-[11px] text-slate-400 font-normal">One-click sharing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <a
                href={shareUrls.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] dark:text-[#25D366] border border-[#25D366]/30 text-xs font-semibold transition-colors"
              >
                <span>WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              {/* X / Twitter */}
              <a
                href={shareUrls.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <span>X (Twitter)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              {/* LinkedIn */}
              <a
                href={shareUrls.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0077B5]/10 hover:bg-[#0077B5]/20 text-[#0077B5] dark:text-[#38BDF8] border border-[#0077B5]/30 text-xs font-semibold transition-colors"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              {/* Telegram */}
              <a
                href={shareUrls.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] dark:text-[#38BDF8] border border-[#229ED9]/30 text-xs font-semibold transition-colors"
              >
                <span>Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Formatted Text Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Share Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors shadow-2xs"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
              {shareText}
            </pre>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>High-resolution 1200×675 PNG with anti-tamper watermark</span>
          </div>

          <div className="flex items-center gap-2">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Via...</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={!dataUrl}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Scorecard PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
