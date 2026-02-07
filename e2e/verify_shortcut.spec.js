import { test, expect } from '@playwright/test';

test('verify shortcut icon highlight', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Wait for boot screen to disappear and System to be ready
  await page.waitForSelector('#boot-screen', { state: 'hidden', timeout: 30000 });
  await page.waitForFunction(() => window.System && window.System.launchApp);

  // Find Winamp shortcut on desktop
  const winampIcon = page.locator('.desktop .explorer-icon[data-name="Winamp.lnk.json"]');
  await winampIcon.waitFor({ state: 'visible' });

  // Click to select
  await winampIcon.click();

  // Ensure it has the selected class
  await expect(winampIcon).toHaveClass(/selected/);

  // Take screenshot
  await winampIcon.screenshot({ path: 'test-results/winamp-highlight.png' });
  console.log('Screenshot saved to test-results/winamp-highlight.png');
});
