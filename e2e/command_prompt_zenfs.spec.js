import { test, expect } from '@playwright/test';

test('Command Prompt ZenFS integration', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Close any startup windows
    const tipWindow = page.locator('.window:has-text("Welcome")');
    if (await tipWindow.isVisible()) {
        await tipWindow.locator('button:has-text("Close")').click();
    }

    // Open Command Prompt
    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.click('text=MS-DOS Prompt');

    const cmdWin = page.locator('.window:has-text("MS-DOS Prompt")');
    await expect(cmdWin).toBeVisible();

    const terminal = cmdWin.locator('.xterm-helper-textarea');
    await terminal.focus();

    // Verify initial prompt
    await expect(cmdWin).toContainText('C:\\WINDOWS>');

    // Go to root for easier testing of original logic
    await page.keyboard.type('CD \\');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\>');

    // Test DIR
    await page.keyboard.type('DIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // We expect to see some files from C: drive.
    await expect(cmdWin).toContainText('WINDOWS');

    // Test MKDIR
    await page.keyboard.type('MD TESTDIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.keyboard.type('DIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('TESTDIR');

    // Test CD
    await page.keyboard.type('CD TESTDIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\TESTDIR>');

    // Test TYPE (create a file first via another app or just assume we can't easily create one via keyboard in cmd yet without a 'copy con' or similar which I didn't implement)
    // Wait, I implemented COPY.

    // Let's try to create a file using another method or just test DIR again.

    await page.screenshot({ path: 'command_prompt_test.png' });
});
