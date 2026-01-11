/**
 * Accessibility Utilities Tests
 * Phase 7.1: Testing accessibility helpers
 */

import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAG_AA,
  getProgressLabel,
  formatNumberForScreenReader,
  formatDurationForScreenReader,
  getIconButtonLabel,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('getContrastRatio', () => {
    it('calculates contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0); // Perfect contrast
    });

    it('calculates contrast ratio for similar colors', () => {
      const ratio = getContrastRatio('#333333', '#444444');
      expect(ratio).toBeLessThan(2); // Low contrast
    });

    it('returns same ratio regardless of order', () => {
      const ratio1 = getContrastRatio('#000000', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('meetsWCAG_AA', () => {
    it('passes for high contrast combinations', () => {
      expect(meetsWCAG_AA('#000000', '#ffffff')).toBe(true);
      expect(meetsWCAG_AA('#ffffff', '#000000')).toBe(true);
    });

    it('fails for low contrast combinations', () => {
      expect(meetsWCAG_AA('#888888', '#999999')).toBe(false);
    });

    it('has lower threshold for large text', () => {
      // Use #949494 which has contrast ratio ~3.5 with white
      // Fails 4.5:1 for normal text, passes 3:1 for large text
      const fg = '#949494';
      const bg = '#ffffff';

      expect(meetsWCAG_AA(fg, bg, false)).toBe(false); // Fails for normal text (needs 4.5)
      expect(meetsWCAG_AA(fg, bg, true)).toBe(true); // Passes for large text (needs 3.0)
    });
  });

  describe('getProgressLabel', () => {
    it('returns appropriate labels for different percentages', () => {
      expect(getProgressLabel(0)).toBe('Not started');
      expect(getProgressLabel(15)).toBe('Just begun');
      expect(getProgressLabel(25)).toBe('Getting started');
      expect(getProgressLabel(50)).toBe('Halfway there');
      expect(getProgressLabel(75)).toBe('Almost complete');
      expect(getProgressLabel(100)).toBe('Complete');
    });

    it('handles edge cases', () => {
      expect(getProgressLabel(1)).toBe('Just begun');
      expect(getProgressLabel(99)).toBe('Almost complete');
    });
  });

  describe('formatNumberForScreenReader', () => {
    it('returns small numbers as-is', () => {
      expect(formatNumberForScreenReader(5)).toBe('5');
      expect(formatNumberForScreenReader(999)).toBe('999');
    });

    it('formats thousands correctly', () => {
      expect(formatNumberForScreenReader(1000)).toBe('1 thousand');
      expect(formatNumberForScreenReader(5000)).toBe('5 thousand');
    });

    it('formats thousands with remainder', () => {
      expect(formatNumberForScreenReader(1234)).toBe('1 thousand 234');
      expect(formatNumberForScreenReader(5678)).toBe('5 thousand 678');
    });
  });

  describe('formatDurationForScreenReader', () => {
    it('formats seconds only', () => {
      expect(formatDurationForScreenReader(1)).toBe('1 second');
      expect(formatDurationForScreenReader(30)).toBe('30 seconds');
      expect(formatDurationForScreenReader(59)).toBe('59 seconds');
    });

    it('formats minutes only', () => {
      expect(formatDurationForScreenReader(60)).toBe('1 minute');
      expect(formatDurationForScreenReader(120)).toBe('2 minutes');
      expect(formatDurationForScreenReader(180)).toBe('3 minutes');
    });

    it('formats minutes and seconds', () => {
      expect(formatDurationForScreenReader(61)).toBe('1 minute and 1 second');
      expect(formatDurationForScreenReader(125)).toBe('2 minutes and 5 seconds');
      expect(formatDurationForScreenReader(183)).toBe('3 minutes and 3 seconds');
    });

    it('handles plural forms correctly', () => {
      expect(formatDurationForScreenReader(1)).toContain('second');
      expect(formatDurationForScreenReader(2)).toContain('seconds');
      expect(formatDurationForScreenReader(60)).toContain('minute');
      expect(formatDurationForScreenReader(120)).toContain('minutes');
    });
  });

  describe('getIconButtonLabel', () => {
    it('generates descriptive labels for common icons', () => {
      expect(getIconButtonLabel('play', 'video')).toBe('video Play');
      expect(getIconButtonLabel('pause', 'video')).toBe('video Pause');
      expect(getIconButtonLabel('close', 'modal')).toBe('modal Close');
    });

    it('handles unknown icons gracefully', () => {
      expect(getIconButtonLabel('custom-icon', 'something')).toBe('something custom-icon');
    });

    it('capitalizes icon names', () => {
      expect(getIconButtonLabel('menu', '')).toBe('Menu');
      expect(getIconButtonLabel('settings', '')).toBe('Settings');
    });
  });
});
