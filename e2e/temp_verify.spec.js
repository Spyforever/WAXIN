import { test, expect } from '@playwright/test';

test('verify downloader with thumbnails', async ({ page }) => {
  console.log("Navigating to app...");
  await page.goto("http://localhost:5173/win98-web/");

  console.log("Bypassing boot screen...");
  await page.keyboard.press("Enter");

  console.log("Waiting for desktop...");
  await page.waitForSelector(".start-button", { timeout: 60000 });

  // Wait for System object
  await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function');

  console.log("Launching DOS Games Downloader...");
  await page.evaluate(() => window.System.launchApp('dos-games-downloader'));

  console.log("Waiting for app window...");
  await page.waitForSelector(".window:has-text('DOS Games Downloader')");

  console.log("Searching for Abuse...");
  await page.fill(".search-input", "abuse");
  await page.click(".search-button");

  console.log("Waiting for results...");
  await page.waitForSelector(".game-card", { timeout: 30000 });

  // Wait for at least one thumbnail to load
  await page.waitForSelector(".game-thumb");

  console.log("Taking screenshot...");
  await page.screenshot({ path: "/home/jules/verification/downloader_thumbnails.png" });
});
