import { expect, test, type Page } from '@playwright/test';

import { installSpeechSynthesisMock } from './support/browserMocks';

interface SpeechState {
  cancelCount: number;
  spoken: Array<{ text: string; voice: string | null }>;
}

const readSpeechState = async (page: Page): Promise<SpeechState> =>
  page.evaluate(
    () =>
      (
        window as typeof window & {
          __speechTestState?: SpeechState;
        }
      ).__speechTestState ?? {
        cancelCount: 0,
        spoken: [],
      },
  );

test.describe('Motion speech coach', () => {
  test('speaks count updates in order and prefers Microsoft Korean voice', async ({ page }) => {
    await installSpeechSynthesisMock(page);

    await page.goto('/#/support/motion-speech');

    await expect(page.getByTestId('speech-supported')).toContainText('true');
    await expect(page.getByTestId('speech-enabled')).toContainText('true');
    await expect(page.getByTestId('voice-label')).toContainText('Microsoft');

    await page.getByRole('button', { name: 'Start Detection' }).click();
    await page.getByRole('button', { name: 'Count Up' }).click();
    await page.getByRole('button', { name: 'Count Up' }).click();
    await page.getByRole('button', { name: 'Feedback Knee' }).click();
    await page.getByRole('button', { name: 'Feedback Knee' }).click();

    await expect.poll(async () => (await readSpeechState(page)).spoken.length).toBe(3);

    const spoken = (await readSpeechState(page)).spoken;
    expect(spoken[0].text).toContain('1');
    expect(spoken[1].text).toContain('2');
    expect(spoken[2].text).not.toEqual(spoken[1].text);
    expect(spoken[0].voice).toContain('Microsoft');
  });

  test('cancels delayed feedback when detection stops before speech starts', async ({ page }) => {
    await installSpeechSynthesisMock(page);

    await page.goto('/#/support/motion-speech');

    const initialCancelCount = (await readSpeechState(page)).cancelCount;

    await page.getByRole('button', { name: 'Start Detection' }).click();
    await page.getByRole('button', { name: 'Feedback Back' }).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: 'Stop Detection' }).click();

    await page.waitForTimeout(900);

    const state = await readSpeechState(page);
    expect(state.spoken).toEqual([]);
    expect(state.cancelCount).toBeGreaterThan(initialCancelCount);
  });

  test('resets count announcement when exercise type changes', async ({ page }) => {
    await installSpeechSynthesisMock(page);

    await page.goto('/#/support/motion-speech');

    await page.getByRole('button', { name: 'Start Detection' }).click();
    await page.getByRole('button', { name: 'Count Up' }).click();

    await expect.poll(async () => (await readSpeechState(page)).spoken.length).toBe(1);

    await page.getByRole('button', { name: 'Switch To Lunge' }).click();
    await expect(page.getByTestId('exercise-type')).toContainText('lunge');
    await page.getByRole('button', { name: 'Count Up' }).click();

    await expect.poll(async () => (await readSpeechState(page)).spoken.length).toBe(2);

    const spoken = (await readSpeechState(page)).spoken;
    expect(spoken[1].text).toContain('1');
    expect(spoken[1].text).not.toEqual(spoken[0].text);
  });

  test('does not announce a stale count immediately after exercise type changes', async ({ page }) => {
    await installSpeechSynthesisMock(page);

    await page.goto('/#/support/motion-speech');

    await page.getByRole('button', { name: 'Start Detection' }).click();
    await page.getByRole('button', { name: 'Count Up' }).click();
    await page.getByRole('button', { name: 'Count Up' }).click();

    await expect.poll(async () => (await readSpeechState(page)).spoken.length).toBe(2);
    const beforeSwitch = (await readSpeechState(page)).spoken.map((item) => item.text);

    await page.getByRole('button', { name: 'Switch Type Only' }).click();
    await expect(page.getByTestId('exercise-type')).toContainText('lunge');
    await page.waitForTimeout(250);

    await expect.poll(async () => (await readSpeechState(page)).spoken.length).toBe(2);
    expect((await readSpeechState(page)).spoken.map((item) => item.text)).toEqual(beforeSwitch);
  });
});
