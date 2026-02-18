import { test, expect } from '@playwright/test';

test('ported games start fullscreen and exit on dialog', async ({ page }) => {
  await page.goto("http://localhost:5173/");

  // Bypass boot screen
  await page.waitForSelector("#boot-screen");
  await page.keyboard.press("Enter");

  // Wait for System
  await page.waitForFunction(() => window.System && window.System.launchApp);

  // Launch Doom
  await page.evaluate(() => window.System.launchApp('doom'));

  // Wait for it to enter fullscreen
  // Since we can't easily check actual OS fullscreen in headless Playwright without flags,
  // we check the document.fullscreenElement
  await page.waitForFunction(() => !!document.fullscreenElement);

  const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
  expect(isFullscreen).toBe(true);

  // Open a dialog
  await page.evaluate(() => window.ShowDialogWindow({ title: 'Test', text: 'Exit' }));

  // Fullscreen should exit
  await page.waitForFunction(() => !document.fullscreenElement);
  const isFullscreenAfter = await page.evaluate(() => !!document.fullscreenElement);
  expect(isFullscreenAfter).toBe(false);
});
