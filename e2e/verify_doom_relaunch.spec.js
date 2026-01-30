
import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Doom launches, closes, and relaunches', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.desktop');

  // Launch Doom
  console.log('Launching Doom...');
  await page.dblclick('text=Games');
  await page.dblclick('text=Doom');

  // Wait for canvas to appear
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);

  const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.window-title')).map(t => t.innerText));
  console.log('Titles:', titles);

  // Close Doom
  console.log('Closing Doom...');
  await page.evaluate(() => {
    const windows = Array.from(document.querySelectorAll('.os-window'));
    const doomWin = windows.find(w => w.querySelector('.window-title')?.innerText?.trim() === 'Doom');
    if (doomWin) {
      const closeBtn = doomWin.querySelector('.window-close-button');
      if (closeBtn) closeBtn.click();
    }
  });

  await page.waitForTimeout(5000);
  await expect(page.locator('canvas')).not.toBeVisible();

  // Relaunch Doom
  console.log('Relaunching Doom...');
  await page.locator('.os-window', { hasText: 'Games' }).locator('text=Doom').dblclick({ force: true });

  // Wait for canvas again
  console.log('Waiting for canvas to reappear...');
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'doom_launched_2_unique_id.png' });

  console.log('Success!');
});
