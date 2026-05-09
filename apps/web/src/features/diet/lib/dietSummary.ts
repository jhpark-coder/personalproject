import type { DietEntry, MealType, NutritionTotals } from '../api/diet';

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: '아침',
  LUNCH: '점심',
  DINNER: '저녁',
  SNACK: '간식',
};

export const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export const toLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const goalPercent = (current: number, target: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.round((current / target) * 100));
};

export const formatMacro = (value: number) => `${Math.round(value * 10) / 10}g`;

export const formatCalories = (value: number) => `${Math.round(value).toLocaleString('ko-KR')} kcal`;

export const emptyTotals = (): NutritionTotals => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});

export const sumEntries = (entries: DietEntry[]): NutritionTotals =>
  {
    const totals = entries.reduce<NutritionTotals>(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
    }),
    emptyTotals(),
  );

    return {
      calories: totals.calories,
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    };
  };

export const groupEntriesByMeal = (entries: DietEntry[]) =>
  MEAL_ORDER.map((mealType) => ({
    mealType,
    label: MEAL_LABELS[mealType],
    entries: entries.filter((entry) => entry.mealType === mealType),
  }));
