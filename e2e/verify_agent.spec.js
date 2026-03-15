import { test, expect } from '@playwright/test';

test('launch agent and verify introduction', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for boot and desktop
  await page.waitForSelector('.desktop', { timeout: 60000 });

  // Launch Agent from Start Menu
  await page.click('.start-button');
  await page.click('.menu-item:has-text("Programs")');
  await page.click('.menu-item:has-text("Accessories")');
  await page.click('.menu-item:has-text("Agent")');

  // Wait for the agent container to be created
  await page.waitForSelector('#ms-agent-container', { timeout: 15000 });

  // Wait a bit for the agent to load and speak
  await page.waitForTimeout(5000);

  // Take a screenshot of the agent on the desktop
  await page.screenshot({ path: 'verification/agent_launched.png' });

  // Click the agent to trigger the balloon (Ask Agent)
  // Since it's in a shadow dom, we might need to click the container or use a specific coordinate
  // But usually clicking the container works if it's set up to propagate or if we target the canvas
  const container = page.locator('#ms-agent-container');
  const box = await container.boundingBox();
  if (box) {
    // Click near the bottom right where clippy usually appears
    await page.mouse.click(box.width - 100, box.height - 100);
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/agent_clicked.png' });
});
