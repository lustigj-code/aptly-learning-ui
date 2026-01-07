/**
 * Badge API Client
 * Handles all badge-related API endpoints
 */

import { post, get, buildQueryString, type ApiResponse } from './client';
import type { BadgeType, BadgeRarity, BadgeCriteriaType } from '@/types';

// ============================================
// REQUEST TYPES
// ============================================

export type CheckBadgeCriteriaRequest = {
  userId: string;
};

export type GetBadgeProgressParams = {
  userId: string;
  badgeId?: string;
};

// ============================================
// RESPONSE TYPES
// ============================================

export type EarnedBadge = {
  id: string;
  title: string;
  earnedAt: string;
};

export type CheckBadgeCriteriaResponse = {
  success: boolean;
  newBadges: EarnedBadge[];
};

export type BadgeProgress = {
  current: number;
  target: number;
  label: string;
};

export type BadgeProgressItem = {
  badgeId: string;
  title: string;
  earned: boolean;
  earnedAt?: string;
  progress?: BadgeProgress;
};

export type GetBadgeProgressResponse = {
  success: boolean;
  badges: BadgeProgressItem[];
};

export type BadgeCriteria = {
  type: BadgeCriteriaType;
  threshold?: number;
  relatedEntityId?: string;
};

export type BadgeDefinition = {
  id: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
};

export type GetAllBadgesResponse = {
  success: boolean;
  badges: BadgeDefinition[];
};

export type UserBadgeData = {
  id: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  earnedAt: string;
};

export type GetUserBadgesResponse = {
  success: boolean;
  badges: UserBadgeData[];
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Evaluate all badge criteria for a user and award badges if criteria are met
 * This is typically called after progress updates (completing atoms, lessons, etc.)
 *
 * @param data - User ID to check criteria for
 * @returns List of newly earned badges
 */
export async function checkBadgeCriteria(
  data: CheckBadgeCriteriaRequest
): Promise<ApiResponse<CheckBadgeCriteriaResponse>> {
  return post<CheckBadgeCriteriaResponse>('/api/badges/check-criteria', data);
}

/**
 * Get badge progress for a user
 * If badgeId is provided, returns progress for specific badge
 * If not provided, returns progress for all badges
 *
 * @param params - User ID and optional badge ID
 * @returns Badge progress data
 */
export async function getBadgeProgress(
  params: GetBadgeProgressParams
): Promise<ApiResponse<GetBadgeProgressResponse>> {
  const queryString = buildQueryString(params);
  return get<GetBadgeProgressResponse>(`/api/badges/progress${queryString}`);
}

/**
 * Get all available badge definitions
 *
 * @returns All badge definitions
 */
export async function getAllBadges(): Promise<ApiResponse<GetAllBadgesResponse>> {
  return get<GetAllBadgesResponse>('/api/badges');
}

/**
 * Get all badges earned by a specific user
 *
 * @param userId - User ID
 * @returns User's earned badges
 */
export async function getUserBadges(
  userId: string
): Promise<ApiResponse<GetUserBadgesResponse>> {
  const queryString = buildQueryString({ userId });
  return get<GetUserBadgesResponse>(`/api/badges/user${queryString}`);
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Check badge criteria for current user (after completing an action)
 * Returns only if new badges were earned
 */
export async function checkAndGetNewBadges(
  userId: string
): Promise<EarnedBadge[]> {
  const response = await checkBadgeCriteria({ userId });

  if (response.success && response.data.newBadges.length > 0) {
    return response.data.newBadges;
  }

  return [];
}

/**
 * Get progress for a specific badge
 */
export async function getSingleBadgeProgress(
  userId: string,
  badgeId: string
): Promise<BadgeProgressItem | null> {
  const response = await getBadgeProgress({ userId, badgeId });

  if (response.success && response.data.badges.length > 0) {
    return response.data.badges[0];
  }

  return null;
}

/**
 * Get all badges with their progress for a user
 */
export async function getAllBadgesWithProgress(
  userId: string
): Promise<BadgeProgressItem[]> {
  const response = await getBadgeProgress({ userId });

  if (response.success) {
    return response.data.badges;
  }

  return [];
}

/**
 * Get only earned badges for a user
 */
export async function getEarnedBadges(
  userId: string
): Promise<BadgeProgressItem[]> {
  const allBadges = await getAllBadgesWithProgress(userId);
  return allBadges.filter((badge) => badge.earned);
}

/**
 * Get only unearned badges for a user (with progress)
 */
export async function getUnearnedBadges(
  userId: string
): Promise<BadgeProgressItem[]> {
  const allBadges = await getAllBadgesWithProgress(userId);
  return allBadges.filter((badge) => !badge.earned);
}

/**
 * Get badges close to being earned (progress >= 75%)
 */
export async function getBadgesNearCompletion(
  userId: string,
  threshold: number = 0.75
): Promise<BadgeProgressItem[]> {
  const unearnedBadges = await getUnearnedBadges(userId);

  return unearnedBadges.filter((badge) => {
    if (!badge.progress) return false;
    const progressPercent = badge.progress.current / badge.progress.target;
    return progressPercent >= threshold;
  });
}

/**
 * Count total badges earned by user
 */
export async function countEarnedBadges(userId: string): Promise<number> {
  const earnedBadges = await getEarnedBadges(userId);
  return earnedBadges.length;
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const badgeProgress = await getSingleBadgeProgress(userId, badgeId);
  return badgeProgress?.earned === true;
}

/**
 * Get badge progress as percentage
 */
export async function getBadgeProgressPercent(
  userId: string,
  badgeId: string
): Promise<number> {
  const badgeProgress = await getSingleBadgeProgress(userId, badgeId);

  if (!badgeProgress) return 0;
  if (badgeProgress.earned) return 100;
  if (!badgeProgress.progress) return 0;

  const { current, target } = badgeProgress.progress;
  return Math.round((current / target) * 100);
}

// ============================================
// BADGE NOTIFICATION HELPERS
// ============================================

export type BadgeNotification = {
  badgeId: string;
  title: string;
  earnedAt: string;
  isNew: boolean;
};

/**
 * Process badge check result for notification display
 */
export function createBadgeNotifications(
  newBadges: EarnedBadge[]
): BadgeNotification[] {
  return newBadges.map((badge) => ({
    badgeId: badge.id,
    title: badge.title,
    earnedAt: badge.earnedAt,
    isNew: true,
  }));
}

/**
 * Format badge earned message for display
 */
export function formatBadgeEarnedMessage(badge: EarnedBadge): string {
  return `Congratulations! You earned the "${badge.title}" badge!`;
}

/**
 * Get badge rarity color class
 */
export function getBadgeRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-500';
    case 'uncommon':
      return 'text-green-500';
    case 'rare':
      return 'text-blue-500';
    case 'legendary':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get badge rarity background color class
 */
export function getBadgeRarityBgColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common':
      return 'bg-gray-100';
    case 'uncommon':
      return 'bg-green-100';
    case 'rare':
      return 'bg-blue-100';
    case 'legendary':
      return 'bg-purple-100';
    default:
      return 'bg-gray-100';
  }
}
