
import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('Doom Simple Verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.desktop');

  // Launch Doom
  await page.dblclick('text=Games');
  await page.dblclick('text=Doom');
  await page.waitForSelector('#canvas', { timeout: 30000 });
  await page.waitForTimeout(10000);

  await page.screenshot({ path: '/home/jules/verification/doom_final_2.png' });
  console.log('Done');
});
