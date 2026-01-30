
import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Doom Final Verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.desktop');

  // 1. Launch Doom
  console.log('Launching Doom...');
  await page.dblclick('text=Games');
  await page.dblclick('text=Doom');
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // 2. Open Folder to verify mount
  console.log('Opening Doom folder...');
  await page.dblclick('text=My Computer');
  // Use address bar if possible, or just navigate
  // I'll try to find C: then Program Files then Doom with force click
  await page.locator('.os-window').filter({ hasText: 'My Computer' }).locator('.explorer-icon', { hasText: '(C:)' }).dblclick({ force: true });
  await page.waitForTimeout(1000);
  await page.locator('.os-window').filter({ hasText: '(C:)' }).locator('.explorer-icon', { hasText: 'Program Files' }).dblclick({ force: true });
  await page.waitForTimeout(1000);
  await page.locator('.os-window').filter({ hasText: 'Program Files' }).locator('.explorer-icon', { hasText: 'Doom' }).dblclick({ force: true });
  await page.waitForTimeout(2000);

  // Take screenshot of both windows
  await page.screenshot({ path: '/home/jules/verification/doom_final_verify.png' });

  // 3. Verify files
  await expect(page.locator('text=doom1.wad').first()).toBeVisible();

  console.log('Verification successful!');
});
