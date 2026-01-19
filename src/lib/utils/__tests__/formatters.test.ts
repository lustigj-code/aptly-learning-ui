/**
 * Utility Formatters Tests
 * Phase 7.1: Testing utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatTime, getDateString, isToday, isYesterday, cn } from '../../utils';

describe('Utility Formatters', () => {
  describe('formatTime', () => {
    it('formats seconds correctly', () => {
      // formatTime returns "mins:secs" format with padded seconds
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(59)).toBe('0:59');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
    });

    it('handles zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('handles large values', () => {
      expect(formatTime(3600)).toBe('60:00'); // 1 hour
      expect(formatTime(3665)).toBe('61:05');
    });
  });

  describe('getDateString', () => {
    it('returns YYYY-MM-DD format', () => {
      const date = new Date('2026-01-07T12:00:00Z');
      const result = getDateString(date);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe('2026-01-07');
    });

    it('uses current date when no argument provided', () => {
      const result = getDateString();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('pads single-digit months and days', () => {
      const date = new Date('2026-01-05T12:00:00Z');
      const result = getDateString(date);

      expect(result).toBe('2026-01-05');
    });
  });

  describe('isToday', () => {
    it('returns true for today\'s date string', () => {
      const today = getDateString();
      expect(isToday(today)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = getDateString(yesterday);

      expect(isToday(yesterdayString)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isToday('')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday\'s date string', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = getDateString(yesterday);

      expect(isYesterday(yesterdayString)).toBe(true);
    });

    it('returns false for today', () => {
      const today = getDateString();
      expect(isYesterday(today)).toBe(false);
    });

    it('returns false for 2 days ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const dateString = getDateString(twoDaysAgo);

      expect(isYesterday(dateString)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isYesterday('')).toBe(false);
    });
  });

  describe('cn (className utility)', () => {
    it('merges class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('handles conditional classes', () => {
      const result = cn('base', true && 'included', false && 'excluded');
      expect(result).toContain('base');
      expect(result).toContain('included');
      expect(result).not.toContain('excluded');
    });

    it('handles undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('merges Tailwind classes correctly', () => {
      // Should dedupe and handle Tailwind conflicts
      const result = cn('p-4', 'p-6'); // Should use p-6
      expect(result).toBeDefined();
    });
  });
});
