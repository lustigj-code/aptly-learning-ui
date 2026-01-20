import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots of key views and compare them against baseline images.
 * On first run, baseline screenshots are generated in e2e/visual-regression.spec.ts-snapshots/
 *
 * To update baselines after intentional UI changes:
 *   npx playwright test visual-regression --update-snapshots
 *
 * Configuration (in playwright.config.ts):
 *   - maxDiffPixels: 100 (allows small anti-aliasing differences)
 *   - threshold: 0.2 (20% color difference tolerance per pixel)
 */

test.describe('Visual Regression - Public Pages', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Wait for any animations to settle
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('login.png', { maxDiffPixels: 100 })
  })

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('signup.png', { maxDiffPixels: 100 })
  })

  test('privacy page renders correctly', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('privacy.png', { maxDiffPixels: 100 })
  })

  test('help page renders correctly', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('help.png', { maxDiffPixels: 100 })
  })
})

test.describe('Visual Regression - Authenticated Pages', () => {
  const testEmail = `visual-test-${Date.now()}@example.com`
  const testPassword = 'VisualTest123'

  test.beforeEach(async ({ page }) => {
    // Create account and login
    await page.goto('/signup')
    await page.fill('input[name="name"]', 'Visual Test User')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.click('button[type="submit"]')

    // Complete onboarding if it appears
    const url = page.url()
    if (url.includes('/onboarding')) {
      await page.click('button:has-text("Get Started")').catch(() => {
        // Onboarding button might not exist
      })
    }

    // Wait for auth to settle
    await page.waitForLoadState('networkidle')
  })

  test('dashboard renders correctly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixels: 100 })
  })

  test('learning view renders correctly', async ({ page }) => {
    await page.goto('/learn')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('learn.png', { maxDiffPixels: 100 })
  })

  test('mastery page renders correctly', async ({ page }) => {
    await page.goto('/mastery')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('mastery.png', { maxDiffPixels: 100 })
  })

  test('progress page renders correctly', async ({ page }) => {
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('progress.png', { maxDiffPixels: 100 })
  })

  test('settings page renders correctly', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('settings.png', { maxDiffPixels: 100 })
  })

  test('review page renders correctly', async ({ page }) => {
    await page.goto('/review')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('review.png', { maxDiffPixels: 100 })
  })
})

test.describe('Visual Regression - Responsive', () => {
  test('login page renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('login-mobile.png', { maxDiffPixels: 100 })
  })

  test('login page renders correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('login-tablet.png', { maxDiffPixels: 100 })
  })
})
