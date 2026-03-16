import { test, expect } from '@playwright/test';

test.describe('Webamp App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/win98-web/');
    // Wait for boot screen to disappear
    await page.waitForSelector('#boot-screen', { state: 'hidden', timeout: 60000 });
  });

  test('should launch Webamp from Desktop', async ({ page }) => {
    // Find and double click Winamp icon on desktop
    const winampIcon = page.locator('.desktop .explorer-icon:has-text("Winamp")');
    await winampIcon.dblclick();

    // Webamp renders to #webamp-container
    await page.waitForSelector('#webamp-container', { timeout: 20000 });

    // Check if webamp canvas/element exists
    const webamp = page.locator('#webamp');
    await expect(webamp).toBeVisible();
  });
});
