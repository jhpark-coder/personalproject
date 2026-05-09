import { API_ENDPOINTS } from '../../../shared/config/api';
import { authFetch } from '../../../shared/lib/http';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface FoodItem {
  id: number;
  name: string;
  servingSizeGram: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category?: string;
  source?: string;
}

export interface DietEntry {
  id: number;
  foodItemId?: number | null;
  foodName: string;
  mealType: MealType;
  mealLabel: string;
  eatenAt: string;
  servingMultiplier: number;
  servingGrams?: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  memo?: string | null;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTargets {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  caloriePercent: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

export interface DietMealSummary {
  mealType: MealType;
  label: string;
  totals: NutritionTotals;
  entries: DietEntry[];
}

export interface DietRecommendation {
  type: string;
  title: string;
  message: string;
  actionLabel: string;
  priority: number;
  foodName?: string | null;
}

export interface DietDailySummary {
  date: string;
  totals: NutritionTotals;
  targets: NutritionTargets;
  meals: DietMealSummary[];
  entries: DietEntry[];
  recommendations: DietRecommendation[];
}

export interface DietGoal {
  id?: number | null;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimated: boolean;
}

export interface DietEntryPayload {
  foodItemId?: number;
  foodName?: string;
  mealType?: MealType;
  eatenAt?: string;
  servingMultiplier?: number;
  servingGrams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  memo?: string;
}

export interface DietGoalPayload {
  dailyCalories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodPhotoCandidate {
  foodItemId?: number | null;
  foodName: string;
  confidence: number;
  estimatedServingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
}

export interface FoodPhotoAnalysis {
  analysisId: string;
  analyzer: string;
  imageWidth: number;
  imageHeight: number;
  confidence: number;
  totals: NutritionTotals;
  candidates: FoodPhotoCandidate[];
  suggestedEntry: DietEntryPayload;
}

const DIET_BASE_URL = `${API_ENDPOINTS.BACKEND_URL}/api/diet`;

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Diet API failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

export const searchFoods = async (query = '', category = '') => {
  const params = new URLSearchParams();
  if (query.trim()) params.set('query', query.trim());
  if (category.trim()) params.set('category', category.trim());
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await authFetch(`${DIET_BASE_URL}/foods${suffix}`);
  return readJson<FoodItem[]>(response);
};

export const getDietSummary = async (userId: number, date: string) => {
  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/summary?date=${date}`);
  return readJson<DietDailySummary>(response);
};

export const createDietEntry = async (userId: number, payload: DietEntryPayload) => {
  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/entries`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return readJson<DietEntry>(response);
};

export const analyzeFoodPhoto = async (
  userId: number,
  file: File,
  mealType?: MealType,
  eatenAt?: string,
) => {
  const form = new FormData();
  form.set('image', file);
  if (mealType) form.set('mealType', mealType);
  if (eatenAt) form.set('eatenAt', eatenAt);

  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/photo-analysis`, {
    method: 'POST',
    body: form,
  });
  return readJson<FoodPhotoAnalysis>(response);
};

export const deleteDietEntry = async (userId: number, entryId: number) => {
  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/entries/${entryId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Diet delete failed with ${response.status}`);
  }
};

export const getDietGoal = async (userId: number) => {
  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/goal`);
  return readJson<DietGoal>(response);
};

export const updateDietGoal = async (userId: number, payload: DietGoalPayload) => {
  const response = await authFetch(`${DIET_BASE_URL}/users/${userId}/goal`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return readJson<DietGoal>(response);
};
