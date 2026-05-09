import { create } from 'zustand';
import { API_ENDPOINTS } from '../../../config/api';
import { authFetch } from '../../../shared/lib/http';
import { logger } from '../../../shared/lib/logger';
import { hasAuthSession } from '../../../shared/lib/storage';

export interface ChartSeriesDatum {
  week: string;
  value: number;
  minutes?: number;
}

export interface WorkoutData {
  time: string;
  calories: string;
  caloriesComparison: string;
  volume: string;
  count: string;
  comparison: string;
  chartData: ChartSeriesDatum[];
}

export interface GoalData {
  title: string;
  subtitle: string;
  current: number;
  total: number;
  progress: number;
}

export interface RecommendationData {
  title: string;
  description: string;
  icon: string;
  tooltip: string;
}

interface DashboardState {
  workoutData: WorkoutData | null;
  goalData: GoalData | null;
  recommendationData: RecommendationData | null;
  isLoading: boolean;
  error: string | null;
  recommendationVisible: boolean;
  loadDashboardData: () => Promise<void>;
  dismissRecommendation: () => void;
  resetRecommendation: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  workoutData: null,
  goalData: null,
  recommendationData: null,
  isLoading: true,
  error: null,
  recommendationVisible: true,

  loadDashboardData: async () => {
    set({ isLoading: true, error: null });

    if (!hasAuthSession()) {
      set({ isLoading: false, error: '로그인이 필요합니다.' });
      return;
    }

    try {
      const response = await authFetch(API_ENDPOINTS.DASHBOARD_DATA, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('대시보드 데이터 로드 실패');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '대시보드 응답이 올바르지 않습니다.');
      }

      const data = result.data;
      set({
        goalData: data.goal ?? null,
        workoutData: data.stats ?? null,
        recommendationData: data.recommendation ?? null,
        isLoading: false,
        error: null,
        recommendationVisible: true,
      });
    } catch (error) {
      logger.error('대시보드 데이터 로드 실패:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '대시보드 데이터 로드 실패',
      });
    }
  },

  dismissRecommendation: () => set({ recommendationVisible: false }),
  resetRecommendation: () => set({ recommendationVisible: true }),
}));
