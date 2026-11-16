import { Attempt, SmartTriggerNotification, StudentProgressStats, UserProfile } from '../types';

export interface GenerateSmartTriggersInput {
  progress: StudentProgressStats;
  leaderboardAttempts: Attempt[];
  userAttempt?: Attempt;
  user: UserProfile;
  todayIsoDate: string;
}

/**
 * Pure event-driven notification generator implementing behavioral Smart Triggers:
 * 1. Rank Shift Alert (e.g., dropped from #3 -> #4 or close gap to podium)
 * 2. Streak-at-Risk Alert before daily 7 PM cutoff
 * 3. Streak Freeze Saved Notification
 * 4. Negative Mark Recovery Trigger
 * 5. Referral Reward / Challenger Badge Unlocked Trigger
 */
export function generateSmartTriggers({
  progress,
  leaderboardAttempts,
  userAttempt,
  user,
  todayIsoDate,
}: GenerateSmartTriggersInput): SmartTriggerNotification[] {
  const triggers: SmartTriggerNotification[] = [];
  const nowIso = new Date().toISOString();

  // 1. Rank drop / close podium trigger
  const myAttempt = userAttempt || leaderboardAttempts.find((a) => a.studentId === user.studentId);
  const currentRank = myAttempt?.rank;
  if (currentRank && currentRank > 1) {
    const spotAbove = currentRank - 1;
    const rival = leaderboardAttempts.find((a) => a.rank === spotAbove);
    const pointGap = rival && myAttempt ? Number(Math.max(0.25, rival.score - myAttempt.score).toFixed(2)) : 1.25;
    if (currentRank === 4) {
      triggers.push({
        id: 'trig_rank_drop_3_to_4',
        type: 'rank_drop',
        title: 'You just dropped to 4th place!',
        message: `You are ${pointGap} marks behind #3 (${rival?.studentName || 'Cohort Rival'}). Complete a 3-min Micro-Challenge to reclaim your podium spot.`,
        actionLabel: 'Reclaim #3 Spot',
        targetTab: 'practice',
        createdAt: nowIso,
        read: false,
      });
    } else {
      triggers.push({
        id: `trig_rank_climb_${currentRank}`,
        type: 'rank_drop',
        title: `Rank #${currentRank} in your Skill Tier — #${spotAbove} is within reach`,
        message: `Close the ${pointGap}-mark gap to overtake #${spotAbove} on today's leaderboard.`,
        actionLabel: 'Open Speed Practice',
        targetTab: 'practice',
        createdAt: nowIso,
        read: false,
      });
    }
  } else if (!myAttempt) {
    triggers.push({
      id: 'trig_entry_waiting',
      type: 'rank_drop',
      title: 'Daily All-India Leaderboard is open for contenders',
      message: 'Take a 3-min Micro-Challenge or enter tonight’s 7:00 PM Live Mega-Quiz to claim your rank bracket.',
      actionLabel: 'Go to Daily Test',
      targetTab: 'tests',
      createdAt: nowIso,
      read: false,
    });
  }

  // 2. Streak Freeze consumed alert
  if (progress.lastFreezeConsumedDate === todayIsoDate) {
    triggers.push({
      id: `trig_freeze_used_${todayIsoDate}`,
      type: 'streak_freeze',
      title: 'Streak Freeze saved your streak!',
      message: `Your ${progress.currentStreak}-day streak stayed intact after missing yesterday. ${progress.streakFreezesAvailable ?? 0} freeze(s) remaining.`,
      actionLabel: 'View Streak Shield',
      targetTab: 'progress',
      createdAt: nowIso,
      read: false,
    });
  } else if (progress.currentStreak > 0 && progress.lastActivityDate !== todayIsoDate) {
    triggers.push({
      id: `trig_streak_risk_${todayIsoDate}`,
      type: 'streak_risk',
      title: `Protect your ${progress.currentStreak}-day streak today`,
      message: `Complete one Micro-Challenge or the 7:00 PM quiz today (${progress.streakFreezesAvailable ?? 1} Streak Freeze available as backup).`,
      actionLabel: 'Start 3-Min Drill',
      targetTab: 'practice',
      createdAt: nowIso,
      read: false,
    });
  }

  // 3. Negative marking leak trigger
  if (progress.marksLostToNegatives >= 1.0) {
    triggers.push({
      id: 'trig_mistake_leak',
      type: 'mistake_leak',
      title: `${progress.marksLostToNegatives.toFixed(2)} marks lost to negative guesses`,
      message: 'Review your unmastered Error Book items to convert -0.25 penalties into +1.0 gains.',
      actionLabel: 'Open Error Book',
      targetTab: 'practice',
      createdAt: nowIso,
      read: false,
    });
  }

  // 4. Referral reward unlock
  if ((progress.referralsCount ?? 0) > 0 || user.referredBy) {
    triggers.push({
      id: 'trig_referral_challenger',
      type: 'referral_unlock',
      title: 'Challenger Badge & Pro Analytics Active',
      message: `Referral reward unlocked (+1 Streak Freeze & Pro 30-day rolling diagnostics). Keep challenging peers!`,
      actionLabel: 'View Profile & Link',
      targetTab: 'profile',
      createdAt: nowIso,
      read: true,
    });
  }

  return triggers;
}
