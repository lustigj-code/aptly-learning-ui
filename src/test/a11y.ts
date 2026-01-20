import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Accessibility testing configuration and utilities using axe-core.
 *
 * Usage in E2E tests:
 * ```typescript
 * import { checkA11y } from '@/test/a11y'
 *
 * test('page is accessible', async ({ page }) => {
 *   await page.goto('/dashboard')
 *   await checkA11y(page)
 * })
 * ```
 */

/**
 * Common WCAG tags for different conformance levels
 */
export const WCAG_TAGS = {
  /** WCAG 2.0 Level A (minimum) */
  A: ['wcag2a'] as string[],
  /** WCAG 2.0 Level AA (recommended) */
  AA: ['wcag2a', 'wcag2aa'] as string[],
  /** WCAG 2.0 Level AAA (enhanced) */
  AAA: ['wcag2a', 'wcag2aa', 'wcag2aaa'] as string[],
  /** WCAG 2.1 Level A */
  '2.1-A': ['wcag21a'] as string[],
  /** WCAG 2.1 Level AA */
  '2.1-AA': ['wcag21a', 'wcag21aa'] as string[],
}

/**
 * Common accessibility rules to disable in specific scenarios
 */
export const RULES = {
  /** Color contrast - useful to disable during prototyping */
  COLOR_CONTRAST: 'color-contrast',
  /** Landmark regions - may need adjustment for complex layouts */
  REGION: 'region',
  /** Duplicate IDs - sometimes needed for dynamic content */
  DUPLICATE_ID: 'duplicate-id',
} as const

/**
 * Configuration options for accessibility checks
 */
export interface A11yCheckOptions {
  /** WCAG tags to test against (default: AA) */
  tags?: string[]
  /** Specific rules to disable */
  disableRules?: string[]
  /** CSS selector to include (only test this element) */
  include?: string
  /** CSS selector to exclude (skip this element) */
  exclude?: string
  /** Whether to wait for network idle before testing (default: true) */
  waitForIdle?: boolean
}

/**
 * Run accessibility check on a page using axe-core.
 * Throws an assertion error if violations are found.
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 *
 * @example
 * // Basic usage - check entire page against WCAG AA
 * await checkA11y(page)
 *
 * @example
 * // Check specific element
 * await checkA11y(page, { include: 'main' })
 *
 * @example
 * // Disable specific rules during prototyping
 * await checkA11y(page, {
 *   disableRules: [RULES.COLOR_CONTRAST]
 * })
 */
export async function checkA11y(
  page: Page,
  options: A11yCheckOptions = {}
): Promise<void> {
  const {
    tags = WCAG_TAGS.AA,
    disableRules = [],
    include,
    exclude,
    waitForIdle = true,
  } = options

  // Wait for page to stabilize
  if (waitForIdle) {
    await page.waitForLoadState('networkidle')
  }

  // Build axe check
  let builder = new AxeBuilder({ page }).withTags(tags)

  // Apply rule exclusions
  if (disableRules.length > 0) {
    builder = builder.disableRules(disableRules)
  }

  // Apply element filters
  if (include) {
    builder = builder.include(include)
  }
  if (exclude) {
    builder = builder.exclude(exclude)
  }

  // Run analysis
  const results = await builder.analyze()

  // Assert no violations
  expect(results.violations).toEqual([])
}

/**
 * Run accessibility check and return violations instead of throwing.
 * Useful for custom handling or reporting.
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 * @returns axe-core results object
 *
 * @example
 * const results = await getA11yViolations(page)
 * if (results.violations.length > 0) {
 *   console.log('Found violations:', results.violations)
 * }
 */
export async function getA11yViolations(
  page: Page,
  options: A11yCheckOptions = {}
) {
  const {
    tags = WCAG_TAGS.AA,
    disableRules = [],
    include,
    exclude,
    waitForIdle = true,
  } = options

  if (waitForIdle) {
    await page.waitForLoadState('networkidle')
  }

  let builder = new AxeBuilder({ page }).withTags(tags)

  if (disableRules.length > 0) {
    builder = builder.disableRules(disableRules)
  }
  if (include) {
    builder = builder.include(include)
  }
  if (exclude) {
    builder = builder.exclude(exclude)
  }

  return await builder.analyze()
}
