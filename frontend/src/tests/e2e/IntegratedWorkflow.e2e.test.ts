/**
 * End-to-End Test for Complete Integrated Workout System Workflow
 * 
 * This test simulates the complete user journey:
 * 1. User completes onboarding
 * 2. System generates personalized workout recommendations
 * 3. User performs exercise with MotionCoach
 * 4. System collects performance data and provides feedback
 * 5. Future recommendations are enhanced based on performance history
 */

import { test, expect } from '@playwright/test';

test.describe('Integrated Workout System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'E2E Test User',
        email: 'e2e@test.com',
        goal: null, // Will be set during onboarding
        experience: null
      }));
    });
  });

  test('Complete workout workflow from onboarding to feedback', async ({ page }) => {
    // Step 1: Start onboarding process
    await page.goto('/onboarding/experience');
    
    // Select experience level
    await page.click('[data-testid="experience-intermediate"]');
    await page.click('button:has-text("다음")');
    
    // Step 2: Select workout goal
    await expect(page).toHaveURL(/.*onboarding\/goal/);
    await page.click('[data-testid="goal-fitness"]');
    await page.click('button:has-text("다음")');
    
    // Step 3: Fill basic information
    await expect(page).toHaveURL(/.*onboarding\/basic-info/);
    await page.fill('input[name="height"]', '175');
    await page.fill('input[name="weight"]', '70');
    await page.fill('input[name="age"]', '30');
    await page.click('input[value="male"]');
    await page.fill('input[name="phoneNumber"]', '010-1234-5678');
    
    // Submit onboarding
    await page.click('button:has-text("다음")');
    
    // Step 4: Verify onboarding completion
    await expect(page).toHaveURL(/.*onboarding\/complete/);
    await expect(page.locator('text=온보딩 완료')).toBeVisible();
    
    // Step 5: Navigate to integrated workout session
    await page.goto('/integrated-workout');
    
    // Step 6: Wait for AI recommendations to load
    await expect(page.locator('text=🎯 맞춤 운동 추천')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=fitness')).toBeVisible(); // Verify goal is displayed
    await expect(page.locator('text=intermediate')).toBeVisible(); // Verify experience is displayed
    
    // Step 7: Select an exercise with AI coaching
    await page.click('[data-testid="exercise-card"]:has([data-testid="ai-badge"])').first();
    
    // Step 8: Verify MotionCoach interface loads
    await expect(page.locator('text=🤖 모션 코치')).toBeVisible();
    await expect(page.locator('canvas.pose-canvas')).toBeVisible();
    
    // Step 9: Start workout session
    await page.click('button:has-text("운동 세션 시작")');
    await expect(page.locator('text=현재 세션')).toBeVisible();
    
    // Step 10: Simulate workout session (wait for some time)
    await page.waitForTimeout(5000); // Simulate 5 seconds of exercise
    
    // Step 11: End workout session
    await page.click('button:has-text("세션 종료")');
    
    // Step 12: Verify session completion
    await expect(page.locator('text=🎉 운동 세션 완료!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=총 횟수')).toBeVisible();
    await expect(page.locator('text=소요 시간')).toBeVisible();
    await expect(page.locator('text=소모 칼로리')).toBeVisible();
    
    // Step 13: Request next workout recommendation
    await page.click('button:has-text("다음 운동 추천받기")');
    
    // Step 14: Verify enhanced recommendations based on performance
    await expect(page.locator('text=🎯 맞춤 운동 추천')).toBeVisible({ timeout: 10000 });
    
    // The system should now have performance data to provide better recommendations
    // This would include analysis of the previous session's form accuracy and completion rate
  });

  test('Error handling throughout the workflow', async ({ page }) => {
    // Test network failure scenarios
    await page.route('**/api/auth/save-onboarding-profile', route => {
      route.abort('failed');
    });
    
    await page.goto('/onboarding/basic-info');
    
    // Fill form
    await page.fill('input[name="height"]', '175');
    await page.fill('input[name="weight"]', '70');
    await page.fill('input[name="age"]', '30');
    await page.click('input[value="male"]');
    await page.fill('input[name="phoneNumber"]', '010-1234-5678');
    
    // Submit should fail gracefully
    await page.click('button:has-text("다음")');
    await expect(page.locator('text=저장 실패')).toBeVisible();
  });

  test('Performance validation', async ({ page }) => {
    // Test that the integrated workflow performs well
    await page.goto('/integrated-workout');
    
    // Measure loading time for recommendations
    const startTime = Date.now();
    await expect(page.locator('text=🎯 맞춤 운동 추천')).toBeVisible({ timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    // Recommendations should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Test MotionCoach initialization performance
    await page.click('[data-testid="exercise-card"]').first();
    
    const motionCoachStartTime = Date.now();
    await expect(page.locator('canvas.pose-canvas')).toBeVisible({ timeout: 10000 });
    const motionCoachLoadTime = Date.now() - motionCoachStartTime;
    
    // MotionCoach should initialize within 5 seconds
    expect(motionCoachLoadTime).toBeLessThan(5000);
  });

  test('Data persistence and consistency', async ({ page }) => {
    // Complete onboarding with specific data
    const testData = {
      goal: 'strength',
      experience: 'advanced',
      height: '180',
      weight: '75',
      age: '28'
    };
    
    // Go through onboarding
    await page.goto('/onboarding/experience');
    await page.click(`[data-testid="experience-${testData.experience}"]`);
    await page.click('button:has-text("다음")');
    
    await page.click(`[data-testid="goal-${testData.goal}"]`);
    await page.click('button:has-text("다음")');
    
    await page.fill('input[name="height"]', testData.height);
    await page.fill('input[name="weight"]', testData.weight);
    await page.fill('input[name="age"]', testData.age);
    await page.click('input[value="male"]');
    await page.fill('input[name="phoneNumber"]', '010-9876-5432');
    await page.click('button:has-text("다음")');
    
    // Navigate to workout recommendations
    await page.goto('/integrated-workout');
    await expect(page.locator('text=🎯 맞춤 운동 추천')).toBeVisible();
    
    // Verify data consistency - the recommendations should reflect the onboarding data
    await expect(page.locator(`text=${testData.goal}`)).toBeVisible();
    await expect(page.locator(`text=${testData.experience}`)).toBeVisible();
    
    // Complete a workout session
    await page.click('[data-testid="exercise-card"]').first();
    await page.click('button:has-text("운동 세션 시작")');
    await page.waitForTimeout(3000);
    await page.click('button:has-text("세션 종료")');
    
    // Request new recommendations
    await page.click('button:has-text("다음 운동 추천받기")');
    
    // The new recommendations should still maintain the user profile consistency
    await expect(page.locator(`text=${testData.goal}`)).toBeVisible();
    await expect(page.locator(`text=${testData.experience}`)).toBeVisible();
  });

  test('Accessibility throughout workflow', async ({ page }) => {
    // Test keyboard navigation
    await page.goto('/onboarding/experience');
    
    // Navigate using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select first experience
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Click next button
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*onboarding\/goal/);
    
    // Test that critical elements have proper accessibility attributes
    await page.goto('/integrated-workout');
    await expect(page.locator('text=🎯 맞춤 운동 추천')).toBeVisible();
    
    // Check that exercise cards are keyboard accessible
    const exerciseCard = page.locator('[data-testid="exercise-card"]').first();
    await expect(exerciseCard).toHaveAttribute('tabindex', '0'); // Should be focusable
    
    // Test screen reader support
    await expect(exerciseCard).toHaveAttribute('aria-label'); // Should have descriptive label
  });
});

// Test configuration for different environments
test.describe.configure({ mode: 'parallel' });

// Custom test fixtures for the integrated workflow
export const integratedWorkflowTest = test.extend({
  // Custom fixture for authenticated user
  authenticatedPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      }));
    });
    await use(page);
  },
  
  // Custom fixture for completed onboarding
  onboardedUser: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Onboarded User',
        email: 'onboarded@example.com',
        goal: 'fitness',
        experience: 'intermediate',
        height: '175',
        weight: '70'
      }));
    });
    await use(page);
  }
});

// Performance test utilities
export const performanceUtils = {
  measureLoadTime: async (page: any, selector: string, timeout: number = 10000) => {
    const startTime = Date.now();
    await expect(page.locator(selector)).toBeVisible({ timeout });
    return Date.now() - startTime;
  },
  
  checkMemoryUsage: async (page: any) => {
    const metrics = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : null;
    });
    return metrics;
  }
};