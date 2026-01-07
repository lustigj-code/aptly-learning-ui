import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')

    // Should be redirected to login
    await expect(page).toHaveURL(/login/)
  })

  test('should redirect unauthenticated users from learn to login', async ({ page }) => {
    await page.goto('/learn')

    await expect(page).toHaveURL(/login/)
  })

  test('should allow access to public pages', async ({ page }) => {
    // Login page
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)

    // Signup page
    await page.goto('/signup')
    await expect(page).toHaveURL(/signup/)

    // Privacy page
    await page.goto('/privacy')
    await expect(page).toHaveURL(/privacy/)

    // Help page
    await page.goto('/help')
    await expect(page).toHaveURL(/help/)
  })

  test('root page should show splash or redirect', async ({ page }) => {
    await page.goto('/')

    // Should either show splash content or redirect to login
    const url = page.url()
    const hasRedirected = url.includes('login') || url.includes('dashboard')
    const hasSplashContent = await page.getByText(/aptly|learning|get started/i).isVisible().catch(() => false)

    expect(hasRedirected || hasSplashContent).toBe(true)
  })
})

test.describe('Page Content', () => {
  test('login page has proper title', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/aptly|login|sign in/i)
  })

  test('privacy page displays policy content', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByText(/privacy/i)).toBeVisible()
  })

  test('help page displays help content', async ({ page }) => {
    await page.goto('/help')

    await expect(page.getByText(/help|support|faq/i)).toBeVisible()
  })
})
