import { expect, test, type Route } from '@playwright/test';

import { installAuthenticatedSession } from './support/session';

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

test.describe('Diet tracking flow', () => {
  test('adds a catalog food entry and updates nutrition goals', async ({ page }) => {
    const foods = [
      {
        id: 10,
        name: '닭가슴살',
        servingSizeGram: 100,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        category: 'protein',
        source: 'seed',
      },
      {
        id: 11,
        name: '현미밥',
        servingSizeGram: 210,
        calories: 321,
        protein: 6,
        carbs: 68,
        fat: 2.2,
        category: 'grain',
        source: 'seed',
      },
    ];

    let nextEntryId = 1;
    let entries: Array<{
      id: number;
      foodItemId: number;
      foodName: string;
      mealType: string;
      mealLabel: string;
      eatenAt: string;
      servingMultiplier: number;
      servingGrams: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      memo: string | null;
    }> = [];
    let goal = {
      id: 1,
      dailyCalories: 2200,
      protein: 120,
      carbs: 250,
      fat: 60,
      estimated: false,
    };

    const totals = () =>
      entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: Math.round((acc.protein + entry.protein) * 10) / 10,
          carbs: Math.round((acc.carbs + entry.carbs) * 10) / 10,
          fat: Math.round((acc.fat + entry.fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

    const percent = (current: number, target: number) => Math.round((current / target) * 100);
    const buildSummary = (date = '2026-05-09') => {
      const total = totals();
      const meals = [
        ['BREAKFAST', '아침'],
        ['LUNCH', '점심'],
        ['DINNER', '저녁'],
        ['SNACK', '간식'],
      ].map(([mealType, label]) => {
        const mealEntries = entries.filter((entry) => entry.mealType === mealType);
        const mealTotals = mealEntries.reduce(
          (acc, entry) => ({
            calories: acc.calories + entry.calories,
            protein: Math.round((acc.protein + entry.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + entry.carbs) * 10) / 10,
            fat: Math.round((acc.fat + entry.fat) * 10) / 10,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );
        return { mealType, label, totals: mealTotals, entries: mealEntries };
      });

      return {
        date,
        totals: total,
        targets: {
          dailyCalories: goal.dailyCalories,
          protein: goal.protein,
          carbs: goal.carbs,
          fat: goal.fat,
          caloriePercent: percent(total.calories, goal.dailyCalories),
          proteinPercent: percent(total.protein, goal.protein),
          carbsPercent: percent(total.carbs, goal.carbs),
          fatPercent: percent(total.fat, goal.fat),
        },
        meals,
        entries,
        recommendations: entries.length
          ? []
          : [
              {
                type: 'protein-gap',
                title: '단백질 보충이 필요합니다',
                message: '오늘 단백질 섭취가 목표보다 부족합니다.',
                actionLabel: '단백질 추가',
                priority: 15,
                foodName: '닭가슴살',
              },
            ],
      };
    };

    await installAuthenticatedSession(page);

    await page.route('**/api/notifications/user/1/unread-count', async (route) => {
      await fulfillJson(route, { unreadCount: 0 });
    });

    await page.route('**/api/diet/foods**', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query') ?? '';
      await fulfillJson(
        route,
        foods.filter((food) => food.name.includes(query)),
      );
    });

    await page.route('**/api/diet/users/1/summary**', async (route) => {
      const url = new URL(route.request().url());
      await fulfillJson(route, buildSummary(url.searchParams.get('date') ?? '2026-05-09'));
    });

    await page.route('**/api/diet/users/1/goal', async (route) => {
      if (route.request().method() === 'PUT') {
        const payload = JSON.parse(route.request().postData() ?? '{}') as Partial<typeof goal>;
        goal = { ...goal, ...payload };
      }
      await fulfillJson(route, goal);
    });

    await page.route('**/api/diet/users/1/photo-analysis', async (route) => {
      await fulfillJson(route, {
        analysisId: 'photo-analysis-1',
        analyzer: 'local-color-portion-v1',
        imageWidth: 32,
        imageHeight: 32,
        confidence: 0.78,
        totals: {
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        },
        candidates: [
          {
            foodItemId: 10,
            foodName: foods[0].name,
            confidence: 0.78,
            estimatedServingGrams: 100,
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            reason: 'mock photo candidate',
          },
        ],
        suggestedEntry: {
          foodItemId: 10,
          foodName: foods[0].name,
          mealType: 'LUNCH',
          eatenAt: '2026-05-09T12:00:00',
          servingGrams: 100,
          memo: 'photo-analysis',
        },
      });
    });

    await page.route('**/api/diet/users/1/entries', async (route) => {
      const payload = JSON.parse(route.request().postData() ?? '{}') as {
        foodItemId: number;
        mealType: string;
        eatenAt: string;
        servingGrams?: number;
        servingMultiplier?: number;
      };
      const food = foods.find((item) => item.id === payload.foodItemId) ?? foods[0];
      const servingMultiplier = payload.servingGrams
        ? payload.servingGrams / food.servingSizeGram
        : payload.servingMultiplier ?? 1;
      const entry = {
        id: nextEntryId++,
        foodItemId: food.id,
        foodName: food.name,
        mealType: payload.mealType,
        mealLabel: payload.mealType === 'LUNCH' ? '점심' : payload.mealType,
        eatenAt: payload.eatenAt,
        servingMultiplier,
        servingGrams: payload.servingGrams ?? food.servingSizeGram,
        calories: Math.round(food.calories * servingMultiplier),
        protein: Math.round(food.protein * servingMultiplier * 10) / 10,
        carbs: Math.round(food.carbs * servingMultiplier * 10) / 10,
        fat: Math.round(food.fat * servingMultiplier * 10) / 10,
        memo: null,
      };
      entries = [...entries, entry];
      await fulfillJson(route, entry, 201);
    });

    await page.goto('/#/diet');

    await expect(page.getByRole('heading', { name: '식단 관리' })).toBeVisible();
    await expect(page.getByText('단백질 보충이 필요합니다')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'meal.png',
      mimeType: 'image/png',
      buffer: Buffer.from('mock image'),
    });
    await page.getByRole('button', { name: '사진 분석하기' }).click();
    await expect(page.getByText('AI 추정')).toBeVisible();
    await expect(page.getByText('165 kcal').first()).toBeVisible();
    await page.getByRole('button', { name: '분석 결과로 기록 추가' }).click();
    await expect(page.getByText(/사진 분석/).first()).toBeVisible();

    await page.getByLabel('음식 검색').fill('닭');
    await page.getByRole('button', { name: /닭가슴살.*100g/ }).click();
    await page.getByLabel(/섭취량\(g\)/).fill('150');
    await page.getByRole('button', { name: '기록 추가' }).click();

    await expect(page.getByText('248 kcal').first()).toBeVisible();
    await expect(page.getByText(/단백질 46.5g/).first()).toBeVisible();

    await page.getByLabel('목표 칼로리').fill('2100');
    await page.getByRole('button', { name: '목표 저장' }).click();

    await expect(page.getByText('목표 2,100 kcal')).toBeVisible();
  });
});
