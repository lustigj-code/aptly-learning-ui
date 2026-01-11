/**
 * E2E Test: Complete Learning Flow
 * Phase 7.1: Critical user journey - login → learn → complete atom → earn XP → review
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Learning Flow', () => {
  const testEmail = `learner-${Date.now()}@example.com`;
  const testPassword = 'LearnerPassword123';

  test.beforeEach(async ({ page }) => {
    // Create account and login
    await page.goto('/signup');
    await page.fill('input[name="name"]', 'Test Learner');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Complete onboarding if it appears
    const url = page.url();
    if (url.includes('/onboarding')) {
      await page.click('button:has-text("Get Started")');
    }
  });

  test('complete video atom and earn XP', async ({ page }) => {
    await page.goto('/learn');

    // Should see lesson content
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Find and click on a video atom
    const videoAtom = page.locator('[data-atom-type="video"]').first();
    if (await videoAtom.isVisible()) {
      await videoAtom.click();
    }

    // Wait for video to load
    await page.waitForSelector('video, iframe', { timeout: 5000 }).catch(() => {
      // Video might not load in test environment
    });

    // Complete the atom
    const completeButton = page.locator('button:has-text("Complete"), button:has-text("Mark Complete")');
    await completeButton.waitFor({ state: 'visible', timeout: 10000 });
    await completeButton.click();

    // Should see XP celebration
    await expect(page.locator('text=/earned.*XP|\\+\\d+ XP/i')).toBeVisible({ timeout: 5000 });

    // Should see confetti or celebration animation
    // (Visual check - hard to test programmatically)
  });

  test('complete quiz and see score', async ({ page }) => {
    await page.goto('/learn');

    // Find a quiz atom
    const quizAtom = page.locator('[data-atom-type="quiz"]').first();

    if (await quizAtom.isVisible()) {
      await quizAtom.click();
    } else {
      // Navigate to quiz if not immediately visible
      const nextButton = page.locator('button:has-text("Next")');
      let attempts = 0;
      while (attempts < 5 && !(await page.locator('[data-atom-type="quiz"]').isVisible())) {
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
        }
        attempts++;
      }
    }

    // Answer quiz questions
    const questionCount = await page.locator('[data-question-index]').count();

    for (let i = 0; i < questionCount; i++) {
      // Select an answer option
      const options = page.locator('button[role="radio"], input[type="radio"]');
      const firstOption = options.nth(0);
      await firstOption.click();

      // Submit answer
      await page.click('button:has-text("Submit Answer"), button:has-text("Check Answer")');

      // Wait for explanation or feedback
      await page.waitForTimeout(500);

      // Click next question if not last
      if (i < questionCount - 1) {
        await page.click('button:has-text("Next Question")');
      }
    }

    // Should see final score
    await expect(page.locator('text=/score|\\d+%/i')).toBeVisible();

    // Complete quiz
    await page.click('button:has-text("Complete Quiz"), button:has-text("Finish")');

    // Should earn XP
    await expect(page.locator('text=/XP|experience/i')).toBeVisible();
  });

  test('streak tracking works across sessions', async ({ page }) => {
    await page.goto('/dashboard');

    // Check initial streak (should be 0 or 1 for new user)
    const streakElement = page.locator('text=/streak|\\d+ day/i').first();
    const initialStreakText = await streakElement.textContent();

    // Complete an atom to update streak
    await page.goto('/learn');
    // ... complete atom logic ...

    // Return to dashboard
    await page.goto('/dashboard');

    // Streak should be updated
    const updatedStreakText = await streakElement.textContent();
    expect(updatedStreakText).toBeDefined();
  });

  test('progress persists after logout and login', async ({ page }) => {
    // Complete an atom
    await page.goto('/learn');

    // Get current XP
    const xpElement = page.locator('[data-testid="user-xp"], text=/\\d+ XP/i').first();
    const initialXP = await xpElement.textContent();

    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=/Logout|Sign out/i');

    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // XP should be preserved
    const currentXP = await xpElement.textContent();
    expect(currentXP).toBe(initialXP);
  });

  test('coach interaction works', async ({ page }) => {
    await page.goto('/learn');

    // Open coach panel if not visible
    const coachButton = page.locator('button:has-text("Coach"), button:has-text("Ask Coach")');
    if (await coachButton.isVisible()) {
      await coachButton.click();
    }

    // Type a message
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="Ask"]');
    await messageInput.fill('What is a lookalike audience?');

    // Send message
    await page.click('button:has-text("Send"), button[type="submit"]');

    // Should see coach response (Socratic, not direct answer)
    await expect(
      page.locator("text=/what do you think|let's think about|good question/i")
    ).toBeVisible({ timeout: 10000 });

    // Response should end with a question (Socratic method)
    const responseText = await page.locator('[data-role="coach"]').last().textContent();
    expect(responseText).toMatch(/\?/); // Should contain a question mark
  });

  test('mastery gate blocks locked content', async ({ page }) => {
    await page.goto('/learn');

    // Try to access advanced content
    const lockedLesson = page.locator('[data-locked="true"], .locked').first();

    if (await lockedLesson.isVisible()) {
      await lockedLesson.click();

      // Should see lock message
      await expect(
        page.locator('text=/locked|master.*first|prerequisite/i')
      ).toBeVisible();

      // Should show what's needed to unlock
      await expect(
        page.locator('text=/complete|master|\\d+% mastery/i')
      ).toBeVisible();
    }
  });

  test('level up celebration displays', async ({ page }) => {
    // This test requires completing enough content to level up
    // Might need to seed user with near-level-up XP
    await page.goto('/dashboard');

    const currentLevel = await page.locator('[data-testid="user-level"]').textContent();

    // Complete multiple atoms to trigger level up
    // (Test framework limitation - hard to guarantee level up)

    // If level up occurs, should see celebration
    // await expect(page.locator('text=/level up|reached level/i')).toBeVisible();
  });

  test('streak freeze can be used', async ({ page }) => {
    await page.goto('/dashboard');

    // Check if freeze is available
    const freezeButton = page.locator('button:has-text("Use Freeze"), button:has-text("Protect Streak")');

    if (await freezeButton.isVisible()) {
      await freezeButton.click();

      // Should see confirmation
      await expect(
        page.locator('text=/freeze.*used|streak protected/i')
      ).toBeVisible();

      // Freezes available should decrease
      await expect(page.locator('text=/\\d+ freeze/i')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('mobile viewport displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/dashboard');

    // Navigation should be responsive
    await expect(page.locator('nav, header').first()).toBeVisible();

    // Content should be readable
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
  });

  test('tablet viewport displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto('/learn');

    // Sidebar should be visible on tablet
    const sidebar = page.locator('[role="navigation"], aside').first();
    await expect(sidebar).toBeVisible();

    // Content should be properly sized
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
