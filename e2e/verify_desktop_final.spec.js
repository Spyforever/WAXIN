import { test, expect } from '@playwright/test';

test('verify desktop highlight', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Wait for boot screen to disappear and System to be ready
  await page.waitForSelector('#boot-screen', { state: 'hidden', timeout: 30000 });
  await page.waitForFunction(() => window.System && window.System.launchApp);

  // Find My Computer on desktop
  const computerIcon = page.locator('.desktop .explorer-icon[data-name="My Computer"]');
  await computerIcon.waitFor({ state: 'visible' });

  // Click to select
  await computerIcon.click();

  // Take screenshot
  await computerIcon.screenshot({ path: 'test-results/desktop-highlight-final.png' });
  console.log('Screenshot saved to test-results/desktop-highlight-final.png');
});
