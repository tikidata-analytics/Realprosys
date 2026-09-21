import { test, expect } from '@playwright/test'

test.describe('login page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="username"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })
})
