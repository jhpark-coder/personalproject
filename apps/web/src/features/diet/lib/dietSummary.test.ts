import { describe, expect, it } from 'vitest';

import { goalPercent, groupEntriesByMeal, sumEntries, toLocalDateInputValue } from './dietSummary';
import type { DietEntry } from '../api/diet';

const entry = (id: number, mealType: DietEntry['mealType'], calories: number): DietEntry => ({
  id,
  foodName: `food-${id}`,
  mealType,
  mealLabel: mealType,
  eatenAt: '2026-05-09T12:00:00',
  servingMultiplier: 1,
  servingGrams: 100,
  calories,
  protein: 10.25,
  carbs: 20.25,
  fat: 3.25,
});

describe('dietSummary helpers', () => {
  it('formats local dates without timezone drift', () => {
    expect(toLocalDateInputValue(new Date(2026, 4, 9, 23, 30))).toBe('2026-05-09');
  });

  it('clamps invalid goal percentages to zero', () => {
    expect(goalPercent(500, 2000)).toBe(25);
    expect(goalPercent(500, 0)).toBe(0);
    expect(goalPercent(Number.NaN, 2000)).toBe(0);
  });

  it('groups entries by meal order and sums nutrition totals', () => {
    const entries = [entry(1, 'DINNER', 500), entry(2, 'BREAKFAST', 300)];

    expect(groupEntriesByMeal(entries).map((meal) => meal.mealType)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'DINNER',
      'SNACK',
    ]);
    expect(groupEntriesByMeal(entries)[0].entries).toHaveLength(1);
    expect(sumEntries(entries)).toMatchObject({
      calories: 800,
      protein: 20.5,
      carbs: 40.5,
      fat: 6.5,
    });
  });
});
