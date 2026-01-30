
import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('Doom Clean Verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.desktop');

  // Launch Doom
  await page.dblclick('text=Games');
  await page.dblclick('text=Doom');
  await page.waitForSelector('#canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // Close Games window to see if Doom is behind it
  await page.evaluate(() => {
    const windows = Array.from(document.querySelectorAll('.os-window'));
    const gamesWin = windows.find(w => w.querySelector('.window-title')?.innerText?.trim() === 'Games');
    if (gamesWin) gamesWin.querySelector('.window-close-button').click();
  });

  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/home/jules/verification/doom_clean.png' });
  console.log('Done');
});
