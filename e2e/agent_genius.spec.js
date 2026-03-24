import { test, expect } from '@playwright/test';

test('launch agent and switch to Genius', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for boot
  await page.waitForSelector('.desktop', { timeout: 30000 });

  // Launch Agent from Start Menu
  await page.click('.start-button');
  await page.click('.menu-item:has-text("Programs")');
  await page.click('.menu-item:has-text("Accessories")');
  await page.click('.menu-item:has-text("Agent")');

  // Wait for agent to appear (it should speak its intro)
  // We can't easily wait for the agent itself since it's in shadow dom and dynamic,
  // but we can look for the busy state or the container.
  await page.waitForSelector('#ms-agent-container', { timeout: 10000 });

  // Right click the tray icon to switch agent
  // The tray icon for agent has the title "Agent"
  const trayIcon = page.locator('.tray-icon[title="Agent"]');
  await trayIcon.click({ button: 'right' });

  // Switch to Genius
  await page.click('.menu-item:has-text("Agent")');
  await page.click('.menu-item:has-text("Genius")');

  // Give it some time to load
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'agent_genius.png' });
});
