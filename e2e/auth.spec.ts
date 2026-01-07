import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByRole('heading', { level: 1 })).toContainText(/sign in|log in|welcome/i)
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login')

      await page.getByRole('button', { name: /sign in|log in/i }).click()

      // Should show validation error
      await expect(page.getByText(/required|invalid|enter/i)).toBeVisible()
    })

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/email/i).fill('notanemail')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in|log in/i }).click()

      await expect(page.getByText(/invalid email/i)).toBeVisible()
    })

    test('should have link to signup page', async ({ page }) => {
      await page.goto('/login')

      const signupLink = page.getByRole('link', { name: /sign up|create account|register/i })
      await expect(signupLink).toBeVisible()
    })

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login')

      const forgotLink = page.getByRole('link', { name: /forgot|reset/i })
      await expect(forgotLink).toBeVisible()
    })
  })

  test.describe('Signup Page', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/signup')

      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/^password$/i)).toBeVisible()
      await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    })

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/signup')

      await page.getByLabel(/name/i).fill('Test User')
      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/^password$/i).fill('weak')
      await page.getByLabel(/confirm password/i).fill('weak')

      await page.getByRole('button', { name: /sign up|create|register/i }).click()

      // Should show password requirements error
      await expect(page.getByText(/8 characters|uppercase|number/i)).toBeVisible()
    })

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/signup')

      await page.getByLabel(/name/i).fill('Test User')
      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/^password$/i).fill('Password123')
      await page.getByLabel(/confirm password/i).fill('Different123')

      await page.getByRole('button', { name: /sign up|create|register/i }).click()

      await expect(page.getByText(/match|do not match/i)).toBeVisible()
    })
  })

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password')

      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /reset|send|submit/i })).toBeVisible()
    })
  })
})
