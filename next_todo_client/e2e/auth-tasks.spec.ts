import { test, expect } from '@playwright/test';

test.describe('TaskFlow Full E2E Auth and CRUD Workflow', () => {
  const randomSuffix = String(Date.now()).slice(-5);
  const testUser = {
    username: `e2e_usr_${randomSuffix}`,
    email: `e2e_${randomSuffix}@example.com`,
    password: 'Password123!',
  };

  test('user can register, login, manage tasks, and logout', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('TaskFlow');

    // 2. Toggle to Sign Up
    await page.click('button:has-text("Sign Up")');

    // Fill Sign Up form
    await page.fill('input[placeholder="e.g. johndoe"]', testUser.username);
    await page.fill('input[placeholder="e.g. john@example.com"]', testUser.email);
    await page.fill('input[placeholder="••••••••"]', testUser.password);

    // Submit registration
    await page.click('button[type="submit"]');

    // Verify success banner and redirection switch back to Sign In
    await expect(page.locator('text=Account created successfully')).toBeVisible();

    // 3. Log In
    await page.fill('input[placeholder="e.g. johndoe"]', testUser.username);
    await page.fill('input[placeholder="••••••••"]', testUser.password);
    await page.click('button[type="submit"]');

    // Verify redirection to Dashboard
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h2')).toContainText('Your Workspace');

    // 4. Create Task
    await page.click('button:has-text("Create Task")');

    // Fill task creation form
    await page.fill('input[placeholder="e.g. Design app components"]', 'My Playwright E2E Task');
    await page.fill('textarea[placeholder="Write details about this objective..."]', 'E2E Description content');

    // Save task
    await page.click('button:has-text("Save Task")');

    // Verify task card appears
    await expect(page.locator('text=My Playwright E2E Task')).toBeVisible();

    // 5. Update Task Status
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('IN_PROGRESS');

    // Verify status indicator pill changes
    await expect(page.locator('text=In Progress').first()).toBeVisible();

    // 6. Delete Task
    // Listen for dialog box confirm and accept it
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('delete this task');
      await dialog.accept();
    });

    // Hover task card to make delete button visible
    await page.hover('text=My Playwright E2E Task');
    await page.click('button[title="Delete task"]');

    // Verify task is removed
    await expect(page.locator('text=My Playwright E2E Task')).not.toBeVisible();

    // 7. Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/');
    await expect(page).toHaveURL(/.*\//);
    await expect(page.locator('h1')).toContainText('TaskFlow');
  });
});
