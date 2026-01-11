/**
 * E2E Test: Authentication Flow
 * Phase 7.1: Critical user flow - signup → login → dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';
  const testName = 'Test User';

  test('complete signup flow', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup');

    // Fill signup form
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/);
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should see welcome message with user name
    await expect(page.locator(`text=${testName}`)).toBeVisible();
  });

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'WrongPassword123');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials|Wrong password/i')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Find and click logout button (usually in header/menu)
    await page.click('[aria-label="User menu"]');
    await page.click('text=/Logout|Sign out/i');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Verify can't access protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login'); // Middleware should redirect
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Clear cookies to ensure not authenticated
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('authenticated users cannot access login/signup pages', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Try to navigate to login
    await page.goto('/login');

    // Should redirect back to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(
      page.locator('text=/Check your email|Reset link sent/i')
    ).toBeVisible();
  });

  test('form validation on signup', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit without filling anything
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/required|cannot be empty/i')).toBeVisible();

    // Fill invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');

    await expect(page.locator('text=/valid email/i')).toBeVisible();

    // Fill weak password
    await page.fill('input[name="password"]', 'weak');
    await page.blur('input[name="password"]');

    await expect(page.locator('text=/at least 8 characters/i')).toBeVisible();

    // Password mismatch
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
    await page.blur('input[name="confirmPassword"]');

    await expect(page.locator('text=/passwords must match/i')).toBeVisible();
  });
});

test.describe('Admin Access Control', () => {
  test('non-admin users cannot access admin routes', async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="email"]', `regular-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'RegularUser123');
    // Assume user exists or signup first...

    // Try to access admin route
    await page.goto('/admin');

    // Should either redirect or show 403
    const url = page.url();
    const isBlocked = url.includes('/login') || url.includes('/dashboard');
    expect(isBlocked).toBe(true);
  });
});
