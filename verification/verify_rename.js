import { chromium, expect } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/win98-web/');

  // Wait for desktop
  await expect(page.locator('.desktop')).toBeVisible({ timeout: 15000 });

  // Create new folder on desktop
  await page.locator('.desktop').click({ button: 'right', position: { x: 400, y: 400 } });
  await page.locator('.menu-item:has-text("New")').first().hover();
  await page.locator('.menu-item:has-text("Folder")').first().click();

  // Wait for rename input
  const renameInput = page.locator('.desktop .explorer-icon textarea.icon-label-input');
  await expect(renameInput).toBeVisible({ timeout: 10000 });

  // Type something
  await renameInput.fill('Verification Folder');

  // Take screenshot
  await page.screenshot({ path: 'verification/verification.png' });

  await browser.close();
})();
