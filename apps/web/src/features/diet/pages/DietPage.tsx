import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Camera,
  Flame,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Search,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from 'lucide-react';

import ChatButton from '../../../components/ChatButton';
import NavigationBar from '../../../components/NavigationBar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Progress } from '../../../components/ui/progress';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../../../components/ui/page';
import { useUser } from '../../../context/UserContext';
import { cn } from '../../../lib/utils';
import { logger } from '../../../shared/lib/logger';
import {
  analyzeFoodPhoto,
  createDietEntry,
  deleteDietEntry,
  getDietGoal,
  getDietSummary,
  searchFoods,
  updateDietGoal,
  type DietDailySummary,
  type DietGoal,
  type FoodPhotoAnalysis,
  type FoodItem,
  type MealType,
} from '../api/diet';
import { formatCalories, formatMacro, MEAL_LABELS, toLocalDateInputValue } from '../lib/dietSummary';

interface EntryFormState {
  foodName: string;
  mealType: MealType;
  time: string;
  servingMultiplier: string;
  servingGrams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  memo: string;
}

interface GoalFormState {
  dailyCalories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const initialEntryForm: EntryFormState = {
  foodName: '',
  mealType: 'LUNCH',
  time: '12:00',
  servingMultiplier: '1',
  servingGrams: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  memo: '',
};

const initialGoalForm: GoalFormState = {
  dailyCalories: '',
  protein: '',
  carbs: '',
  fat: '',
};

const numberOrUndefined = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const statTone = {
  calories: 'bg-orange-50 text-orange-700',
  protein: 'bg-emerald-50 text-emerald-700',
  carbs: 'bg-blue-50 text-blue-700',
  fat: 'bg-violet-50 text-violet-700',
};

export default function DietPage() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue());
  const [summary, setSummary] = useState<DietDailySummary | null>(null);
  const [goal, setGoal] = useState<DietGoal | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<FoodPhotoAnalysis | null>(null);
  const [entryForm, setEntryForm] = useState<EntryFormState>(initialEntryForm);
  const [goalForm, setGoalForm] = useState<GoalFormState>(initialGoalForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? 0;

  const loadDiet = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const [nextSummary, nextGoal] = await Promise.all([
        getDietSummary(userId, selectedDate),
        getDietGoal(userId),
      ]);
      setSummary(nextSummary);
      setGoal(nextGoal);
    } catch (err) {
      logger.error('Diet load failed', err);
      setError('식단 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, userId]);

  useEffect(() => {
    void loadDiet();
  }, [loadDiet]);

  useEffect(() => {
    if (!goal) return;
    setGoalForm({
      dailyCalories: String(goal.dailyCalories),
      protein: String(goal.protein),
      carbs: String(goal.carbs),
      fat: String(goal.fat),
    });
  }, [goal]);

  useEffect(() => {
    const controller = window.setTimeout(async () => {
      try {
        const results = await searchFoods(foodQuery);
        setFoods(results);
      } catch (err) {
        logger.error('Food search failed', err);
      }
    }, 180);

    return () => window.clearTimeout(controller);
  }, [foodQuery]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: 'calories',
        label: '칼로리',
        value: formatCalories(summary.totals.calories),
        target: formatCalories(summary.targets.dailyCalories),
        percent: summary.targets.caloriePercent,
        icon: Flame,
      },
      {
        key: 'protein',
        label: '단백질',
        value: formatMacro(summary.totals.protein),
        target: formatMacro(summary.targets.protein),
        percent: summary.targets.proteinPercent,
        icon: Scale,
      },
      {
        key: 'carbs',
        label: '탄수화물',
        value: formatMacro(summary.totals.carbs),
        target: formatMacro(summary.targets.carbs),
        percent: summary.targets.carbsPercent,
        icon: Utensils,
      },
      {
        key: 'fat',
        label: '지방',
        value: formatMacro(summary.totals.fat),
        target: formatMacro(summary.targets.fat),
        percent: summary.targets.fatPercent,
        icon: Target,
      },
    ];
  }, [summary]);

  const selectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setFoodQuery(food.name);
    setEntryForm((current) => ({
      ...current,
      foodName: food.name,
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    }));
  };

  const clearSelectedFood = () => {
    setSelectedFood(null);
    setEntryForm((current) => ({
      ...current,
      foodName: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    }));
  };

  const handleRecommendationFood = async (foodName?: string | null) => {
    if (!foodName) return;
    setFoodQuery(foodName);
    setEntryForm((current) => ({ ...current, foodName }));
    try {
      const results = await searchFoods(foodName);
      setFoods(results);
      const exact = results.find((food) => food.name === foodName);
      if (exact) selectFood(exact);
    } catch (err) {
      logger.error('Recommendation food search failed', err);
    }
  };

  const handleCreateEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const calories = numberOrUndefined(entryForm.calories);
    if (!selectedFood && (!entryForm.foodName.trim() || calories === undefined)) {
      setError('직접 입력 음식은 이름과 칼로리가 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createDietEntry(userId, {
        foodItemId: selectedFood?.id,
        foodName: selectedFood?.name ?? entryForm.foodName.trim(),
        mealType: entryForm.mealType,
        eatenAt: `${selectedDate}T${entryForm.time || '12:00'}:00`,
        servingMultiplier: numberOrUndefined(entryForm.servingMultiplier) ?? 1,
        servingGrams: numberOrUndefined(entryForm.servingGrams),
        calories: selectedFood ? undefined : calories,
        protein: selectedFood ? undefined : numberOrUndefined(entryForm.protein),
        carbs: selectedFood ? undefined : numberOrUndefined(entryForm.carbs),
        fat: selectedFood ? undefined : numberOrUndefined(entryForm.fat),
        memo: entryForm.memo.trim() || undefined,
      });
      setEntryForm(initialEntryForm);
      setSelectedFood(null);
      setFoodQuery('');
      await loadDiet();
    } catch (err) {
      logger.error('Diet entry save failed', err);
      setError('식단 기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(file);
    setPhotoAnalysis(null);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleAnalyzePhoto = async () => {
    if (!userId || !photoFile) {
      setError('분석할 음식 사진을 선택하세요.');
      return;
    }

    try {
      setPhotoLoading(true);
      setError(null);
      const analysis = await analyzeFoodPhoto(
        userId,
        photoFile,
        entryForm.mealType,
        `${selectedDate}T${entryForm.time || '12:00'}:00`,
      );
      setPhotoAnalysis(analysis);
    } catch (err) {
      logger.error('Food photo analysis failed', err);
      setError('사진 분석에 실패했습니다. 다른 사진을 선택하거나 직접 입력하세요.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSavePhotoAnalysis = async () => {
    if (!userId || !photoAnalysis?.candidates.length) return;
    const candidate = photoAnalysis.candidates[0];

    try {
      setSaving(true);
      setError(null);
      await createDietEntry(userId, {
        foodItemId: candidate.foodItemId ?? undefined,
        foodName: candidate.foodName,
        mealType: entryForm.mealType,
        eatenAt: `${selectedDate}T${entryForm.time || '12:00'}:00`,
        servingGrams: candidate.estimatedServingGrams,
        calories: candidate.foodItemId ? undefined : candidate.calories,
        protein: candidate.foodItemId ? undefined : candidate.protein,
        carbs: candidate.foodItemId ? undefined : candidate.carbs,
        fat: candidate.foodItemId ? undefined : candidate.fat,
        memo: `사진 분석 ${Math.round(candidate.confidence * 100)}%`,
      });
      setPhotoAnalysis(null);
      setPhotoFile(null);
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl(null);
      }
      await loadDiet();
    } catch (err) {
      logger.error('Photo analysis save failed', err);
      setError('사진 분석 결과 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!userId) return;
    try {
      setError(null);
      await deleteDietEntry(userId, entryId);
      await loadDiet();
    } catch (err) {
      logger.error('Diet entry delete failed', err);
      setError('식단 기록 삭제에 실패했습니다.');
    }
  };

  const handleGoalSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      setError(null);
      const nextGoal = await updateDietGoal(userId, {
        dailyCalories: numberOrUndefined(goalForm.dailyCalories),
        protein: numberOrUndefined(goalForm.protein),
        carbs: numberOrUndefined(goalForm.carbs),
        fat: numberOrUndefined(goalForm.fat),
      });
      setGoal(nextGoal);
      await loadDiet();
    } catch (err) {
      logger.error('Diet goal save failed', err);
      setError('식단 목표 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1.5">
                <Utensils className="size-3.5" />
                식단
              </Badge>
              {goal?.estimated && <span className="text-xs font-semibold text-muted-foreground">프로필 기반 목표</span>}
            </div>
            <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950">식단 관리</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="식단 날짜"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-[148px] pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => void loadDiet()} aria-label="식단 새로고침">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="식단 요약">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key} className="border-white/80 bg-white shadow-sm">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
                      <p className="truncate text-xl font-black text-slate-950">{item.value}</p>
                    </div>
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-lg',
                        statTone[item.key as keyof typeof statTone],
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>목표 {item.target}</span>
                      <span>{item.percent}%</span>
                    </div>
                    <Progress value={item.percent} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="grid content-start gap-4">
            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Utensils className="size-5 text-primary" />
                  오늘 식사 기록
                </CardTitle>
                <CardDescription>
                  {summary ? `${summary.entries.length}개 기록, ${formatCalories(summary.totals.calories)}` : '불러오는 중'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {summary?.meals.map((meal) => (
                  <div key={meal.mealType} className="rounded-lg border border-slate-100 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                      <div>
                        <h2 className="font-black text-slate-950">{meal.label}</h2>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {formatCalories(meal.totals.calories)} · 단백질 {formatMacro(meal.totals.protein)}
                        </p>
                      </div>
                      <Badge variant="secondary">{meal.entries.length}개</Badge>
                    </div>
                    {meal.entries.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {meal.entries.map((entry) => (
                          <div key={entry.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-950">{entry.foodName}</span>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {new Date(entry.eatenAt).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatCalories(entry.calories)} · 단백질 {formatMacro(entry.protein)} · 탄수화물{' '}
                                {formatMacro(entry.carbs)} · 지방 {formatMacro(entry.fat)}
                              </p>
                              {entry.memo && <p className="mt-1 text-sm font-medium text-slate-700">{entry.memo}</p>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="justify-self-end text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => void handleDeleteEntry(entry.id)}
                              aria-label={`${entry.foodName} 삭제`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-5 text-sm font-semibold text-muted-foreground">기록이 없습니다.</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <aside className="grid content-start gap-4">
            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Camera className="size-5 text-primary" />
                  사진으로 음식 분석
                </CardTitle>
                <CardDescription>사진에서 음식 후보와 예상 칼로리를 계산합니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <label className="grid cursor-pointer gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                  <span className="flex items-center gap-2">
                    <ImagePlus className="size-4 text-primary" />
                    음식 사진 선택
                  </span>
                  <Input
                    aria-label="음식 사진 선택"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoFileChange}
                    className="cursor-pointer bg-white"
                  />
                </label>

                {photoPreviewUrl && (
                  <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    <img src={photoPreviewUrl} alt="선택한 음식" className="h-44 w-full object-cover" />
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 font-bold"
                  disabled={!photoFile || photoLoading}
                  onClick={() => void handleAnalyzePhoto()}
                >
                  <Camera className="size-4" />
                  {photoLoading ? '분석 중' : '사진 분석하기'}
                </Button>

                {photoAnalysis?.candidates[0] && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-emerald-950">
                          {photoAnalysis.candidates[0].foodName}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-800">
                          {formatCalories(photoAnalysis.candidates[0].calories)} ·{' '}
                          {Math.round(photoAnalysis.candidates[0].estimatedServingGrams)}g · 신뢰도{' '}
                          {Math.round(photoAnalysis.candidates[0].confidence * 100)}%
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          단백질 {formatMacro(photoAnalysis.candidates[0].protein)} · 탄수화물{' '}
                          {formatMacro(photoAnalysis.candidates[0].carbs)} · 지방{' '}
                          {formatMacro(photoAnalysis.candidates[0].fat)}
                        </p>
                      </div>
                      <Badge variant="success">AI 추정</Badge>
                    </div>
                    <Button
                      type="button"
                      className="mt-3 h-10 w-full font-bold"
                      disabled={saving}
                      onClick={() => void handleSavePhotoAnalysis()}
                    >
                      <Plus className="size-4" />
                      분석 결과로 기록 추가
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Plus className="size-5 text-primary" />
                  식사 추가
                </CardTitle>
                <CardDescription>검색 음식은 제공량 기준으로 자동 계산됩니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-3" onSubmit={handleCreateEntry}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="음식 검색"
                      value={foodQuery}
                      onChange={(event) => setFoodQuery(event.target.value)}
                      placeholder="음식 검색"
                      className="pl-9"
                    />
                  </div>

                  {selectedFood && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-bold text-emerald-900">{selectedFood.name}</p>
                        <p className="text-xs font-semibold text-emerald-700">
                          {selectedFood.servingSizeGram}g · {formatCalories(selectedFood.calories)}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSelectedFood}>
                        직접 입력
                      </Button>
                    </div>
                  )}

                  <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                    {foods.slice(0, 8).map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        className={cn(
                          'grid rounded-md px-3 py-2 text-left transition-colors hover:bg-white',
                          selectedFood?.id === food.id && 'bg-white text-primary shadow-sm',
                        )}
                        onClick={() => selectFood(food)}
                      >
                        <span className="font-bold">{food.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {food.servingSizeGram}g · {formatCalories(food.calories)} · 단백질 {formatMacro(food.protein)}
                        </span>
                      </button>
                    ))}
                    {foods.length === 0 && (
                      <span className="px-3 py-4 text-sm font-semibold text-muted-foreground">검색 결과가 없습니다.</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-sm font-semibold">
                      끼니
                      <select
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                        value={entryForm.mealType}
                        onChange={(event) =>
                          setEntryForm((current) => ({ ...current, mealType: event.target.value as MealType }))
                        }
                      >
                        {Object.entries(MEAL_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-semibold">
                      시간
                      <Input
                        type="time"
                        value={entryForm.time}
                        onChange={(event) => setEntryForm((current) => ({ ...current, time: event.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-sm font-semibold">
                      배율
                      <Input
                        inputMode="decimal"
                        value={entryForm.servingMultiplier}
                        onChange={(event) =>
                          setEntryForm((current) => ({ ...current, servingMultiplier: event.target.value }))
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold">
                      섭취량(g)
                      <Input
                        inputMode="decimal"
                        value={entryForm.servingGrams}
                        onChange={(event) =>
                          setEntryForm((current) => ({ ...current, servingGrams: event.target.value }))
                        }
                        placeholder="선택"
                      />
                    </label>
                  </div>

                  {!selectedFood && (
                    <div className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <Input
                        aria-label="직접 입력 음식 이름"
                        value={entryForm.foodName}
                        onChange={(event) => setEntryForm((current) => ({ ...current, foodName: event.target.value }))}
                        placeholder="음식 이름"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          aria-label="직접 입력 칼로리"
                          inputMode="numeric"
                          value={entryForm.calories}
                          onChange={(event) => setEntryForm((current) => ({ ...current, calories: event.target.value }))}
                          placeholder="kcal"
                        />
                        <Input
                          aria-label="직접 입력 단백질"
                          inputMode="decimal"
                          value={entryForm.protein}
                          onChange={(event) => setEntryForm((current) => ({ ...current, protein: event.target.value }))}
                          placeholder="단백질 g"
                        />
                        <Input
                          aria-label="직접 입력 탄수화물"
                          inputMode="decimal"
                          value={entryForm.carbs}
                          onChange={(event) => setEntryForm((current) => ({ ...current, carbs: event.target.value }))}
                          placeholder="탄수화물 g"
                        />
                        <Input
                          aria-label="직접 입력 지방"
                          inputMode="decimal"
                          value={entryForm.fat}
                          onChange={(event) => setEntryForm((current) => ({ ...current, fat: event.target.value }))}
                          placeholder="지방 g"
                        />
                      </div>
                    </div>
                  )}

                  <Input
                    aria-label="식단 메모"
                    value={entryForm.memo}
                    onChange={(event) => setEntryForm((current) => ({ ...current, memo: event.target.value }))}
                    placeholder="메모"
                  />

                  <Button type="submit" className="h-11 font-bold" disabled={saving}>
                    <Plus className="size-4" />
                    기록 추가
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Sparkles className="size-5 text-primary" />
                  추천
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {summary?.recommendations.map((recommendation) => (
                  <button
                    key={`${recommendation.type}-${recommendation.foodName ?? ''}`}
                    type="button"
                    className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-left transition-colors hover:bg-blue-100"
                    onClick={() => void handleRecommendationFood(recommendation.foodName)}
                  >
                    <p className="font-black text-blue-950">{recommendation.title}</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-blue-800">{recommendation.message}</p>
                    {recommendation.foodName && (
                      <Badge variant="outline" className="mt-2 border-blue-200 bg-white text-blue-800">
                        {recommendation.foodName}
                      </Badge>
                    )}
                  </button>
                ))}
                {summary?.recommendations.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-muted-foreground">
                    오늘 기록 흐름이 안정적입니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Target className="size-5 text-primary" />
                  목표
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-2" onSubmit={handleGoalSave}>
                  <Input
                    aria-label="목표 칼로리"
                    inputMode="numeric"
                    value={goalForm.dailyCalories}
                    onChange={(event) => setGoalForm((current) => ({ ...current, dailyCalories: event.target.value }))}
                    placeholder="일일 kcal"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      aria-label="목표 단백질"
                      inputMode="decimal"
                      value={goalForm.protein}
                      onChange={(event) => setGoalForm((current) => ({ ...current, protein: event.target.value }))}
                      placeholder="단백질"
                    />
                    <Input
                      aria-label="목표 탄수화물"
                      inputMode="decimal"
                      value={goalForm.carbs}
                      onChange={(event) => setGoalForm((current) => ({ ...current, carbs: event.target.value }))}
                      placeholder="탄수화물"
                    />
                    <Input
                      aria-label="목표 지방"
                      inputMode="decimal"
                      value={goalForm.fat}
                      onChange={(event) => setGoalForm((current) => ({ ...current, fat: event.target.value }))}
                      placeholder="지방"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="h-11 font-bold" disabled={saving}>
                    <Save className="size-4" />
                    목표 저장
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageMain>

      <NavigationBar />
      <ChatButton />
    </Page>
  );
}
