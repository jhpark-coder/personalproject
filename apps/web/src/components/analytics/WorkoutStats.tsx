import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Flame, Repeat, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_ENDPOINTS } from '../../config/api';
import NavigationBar from '../NavigationBar';
import { useUser } from '../../context/UserContext';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorState, LoadingState } from '../ui/feedback';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

interface WorkoutRecord {
  id: number;
  workoutDate: string;
  workoutType: string;
  duration: number;
  calories: number;
  intensity: number;
  difficulty: string;
}

type WorkoutTypeStat = [name: string, count: number, avgDuration?: number, avgCalories?: number];
type DifficultyStat = [name: string, value: number];

interface DashboardData {
  recentWorkouts: WorkoutRecord[];
  monthlyWorkoutStats: WorkoutTypeStat[];
  difficultyDistribution: DifficultyStat[];
  workoutTypeStats: WorkoutTypeStat[];
}

const COLORS = ['#10b981', '#2563eb', '#f97316', '#ef4444', '#8b5cf6'];

const WorkoutStats: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = useCallback(() => {
    return user?.id ? String(user.id) : null;
  }, [user?.id]);

  const loadDashboardData = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(API_ENDPOINTS.MYPAGE_DASHBOARD(userId), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('데이터를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      logger.error('운동 통계 로드 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      void loadDashboardData();
    }
  }, [getUserId, loadDashboardData]);

  const calculateWorkoutStats = () => {
    if (!dashboardData?.recentWorkouts) return { totalWorkouts: 0, avgDuration: 0, totalCalories: 0, consecutiveDays: 0 };

    const workouts = dashboardData.recentWorkouts;
    const totalWorkouts = workouts.length;
    const avgDuration = totalWorkouts > 0 ? Math.round(workouts.reduce((sum, w) => sum + (w.duration || 0), 0) / totalWorkouts * 10) / 10 : 0;
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);

    let consecutiveDays = 0;
    const formatLocalYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const workoutSet = new Set(workouts.map((workout) => workout.workoutDate));
    const cursor = new Date();
    for (let i = 0; i < 60; i++) {
      const ymd = formatLocalYmd(cursor);
      if (workoutSet.has(ymd)) {
        consecutiveDays++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalWorkouts, avgDuration, totalCalories, consecutiveDays };
  };

  const workoutTypeData = (dashboardData?.workoutTypeStats ?? []).map((item) => ({
    name: item[0],
    count: item[1],
    avgDuration: Math.round(item[2] || 0),
    avgCalories: Math.round(item[3] || 0),
  }));

  const difficultyData = (dashboardData?.difficultyDistribution ?? []).map((item, index: number) => ({
    name: item[0],
    value: item[1],
    color: COLORS[index % COLORS.length],
  }));

  const workoutStats = calculateWorkoutStats();

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-950">운동 통계</h1>
            <p className="mt-1 text-sm text-muted-foreground">최근 운동 패턴과 난이도 분포를 확인합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4">
        {loading ? (
          <LoadingState title="운동 통계를 불러오는 중입니다." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: '총 운동 횟수', value: workoutStats.totalWorkouts, icon: Dumbbell, tone: 'bg-blue-50 text-blue-700' },
                { label: '평균 운동 시간', value: `${workoutStats.avgDuration}분`, icon: Timer, tone: 'bg-emerald-50 text-emerald-700' },
                { label: '연속 운동일', value: workoutStats.consecutiveDays, icon: Repeat, tone: 'bg-violet-50 text-violet-700' },
                { label: '총 소모 칼로리', value: workoutStats.totalCalories, icon: Flame, tone: 'bg-orange-50 text-orange-700' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label} className="border-white/80 bg-white shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className={`flex size-11 items-center justify-center rounded-lg ${item.tone}`} aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="block text-xl font-black text-slate-950">{item.value}</span>
                        <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {workoutTypeData.length > 0 && (
              <Card className="border-white/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-black">운동 종류별 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workoutTypeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" name="운동 횟수" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {difficultyData.length > 0 && (
              <Card className="border-white/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-black">운동 난이도 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={difficultyData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={85}
                          dataKey="value"
                        >
                          {difficultyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {!!dashboardData?.recentWorkouts?.length && (
              <Card className="border-white/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-black">최근 운동 기록</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {dashboardData.recentWorkouts.slice(0, 10).map((workout) => (
                    <div key={workout.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                      <span className="w-14 shrink-0 text-sm font-bold text-muted-foreground">
                        {new Date(workout.workoutDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-950">{workout.workoutType}</span>
                        <span className="text-xs text-muted-foreground">
                          {workout.duration}분 · {workout.calories}kcal · 난이도: {workout.difficulty}
                        </span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default WorkoutStats;
