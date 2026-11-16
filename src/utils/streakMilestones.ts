/**
 * Indian Competitive Exam Milestone Badges & Streaks
 * Designed for UPSC, SSC CGL, Banking, and State PSC aspirants.
 */

export interface StreakMilestone {
  tier: 'aspirant' | 'abhyaasi' | 'warrior' | 'selection' | 'ranker';
  title: string;
  hindiTitle: string;
  badgeEmoji: string;
  minStreak: number;
  nextMilestoneStreak: number;
  description: string;
  colorClass: string;
  badgeBg: string;
}

export function getStreakMilestone(streak: number): StreakMilestone {
  if (streak >= 30) {
    return {
      tier: 'ranker',
      title: 'Ranker Elite',
      hindiTitle: 'रैंकर एलीट (Top 0.1%)',
      badgeEmoji: '🏆',
      minStreak: 30,
      nextMilestoneStreak: 60,
      description: '30+ Days of non-negotiable 7 PM exam discipline. Selection guarantee mindset.',
      colorClass: 'text-amber-500 border-amber-400 bg-amber-50 dark:bg-amber-950/40',
      badgeBg: '#F59E0B',
    };
  }
  if (streak >= 14) {
    return {
      tier: 'selection',
      title: 'Selection Material',
      hindiTitle: 'सिलेक्शन मटेरियल (Top 1%)',
      badgeEmoji: '⚡',
      minStreak: 14,
      nextMilestoneStreak: 30,
      description: '14+ Days of relentless consistency across all sections.',
      colorClass: 'text-emerald-500 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      badgeBg: '#10B981',
    };
  }
  if (streak >= 7) {
    return {
      tier: 'warrior',
      title: 'Library Warrior',
      hindiTitle: 'लाइब्रेरी वॉरियर',
      badgeEmoji: '⚔️',
      minStreak: 7,
      nextMilestoneStreak: 14,
      description: '7 consecutive days of 7 PM attendance. Library discipline.',
      colorClass: 'text-indigo-500 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
      badgeBg: '#6366F1',
    };
  }
  if (streak >= 3) {
    return {
      tier: 'abhyaasi',
      title: 'Abhyaasi',
      hindiTitle: 'अभ्यासी (Serious Aspirant)',
      badgeEmoji: '🔥',
      minStreak: 3,
      nextMilestoneStreak: 7,
      description: '3 consecutive 7 PM exams completed. Daily habit forming.',
      colorClass: 'text-orange-500 border-orange-400 bg-orange-50 dark:bg-orange-950/40',
      badgeBg: '#F97316',
    };
  }
  return {
    tier: 'aspirant',
    title: 'Aspirant',
    hindiTitle: 'एस्पिरेंट (Starting Out)',
    badgeEmoji: '🎯',
    minStreak: 0,
    nextMilestoneStreak: 3,
    description: 'Begin your streak today at 7:00 PM.',
    colorClass: 'text-slate-500 border-slate-300 bg-slate-50 dark:bg-slate-800',
    badgeBg: '#64748B',
  };
}
