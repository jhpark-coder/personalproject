import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Flame,
  MoreHorizontal,
  Settings,
  Sparkles,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import ChatButton from './ChatButton';
import NavigationBar from './NavigationBar';
import TodayChecklist from './TodayChecklist';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useUser } from '../context/UserContext';
import { logger } from '../shared/lib/logger';
import {
  getCurrentProvider,
  isOnboardingCompleted,
  isProviderOnboardingCompleted,
} from '../shared/lib/storage';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';
import { useDashboardStore } from '../features/dashboard/store/dashboardStore';

interface TooltipPayload {
  payload?: {
    minutes?: number;
  };
}

const formatYearWeekToMonthNthWeek = (yearWeek: string): string => {
  const match = /^\s*(\d{4})(\d{2,3})\s*$/.exec(String(yearWeek));
  if (!match) return yearWeek;
  const year = Number(match[1]);
  const weekOfYear = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(weekOfYear) || weekOfYear <= 0) return yearWeek;

  const firstJan = new Date(year, 0, 1);
  const approxDate = new Date(firstJan.getTime() + (weekOfYear - 1) * 7 * 24 * 60 * 60 * 1000);
  const monthIndex = approxDate.getMonth();
  const firstOfMonth = new Date(approxDate.getFullYear(), monthIndex, 1);
  const weekOfMonth = Math.ceil((approxDate.getDate() + firstOfMonth.getDay()) / 7);

  return `${monthIndex + 1}월 ${weekOfMonth}째주`;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const {
    workoutData,
    goalData,
    recommendationData,
    isLoading,
    error,
    recommendationVisible,
    loadDashboardData,
    dismissRecommendation,
  } = useDashboardStore();

  useEffect(() => {
    const userRole = user?.role || 'ROLE_USER';
    const isAdmin = userRole === 'ROLE_ADMIN';

    if (isAdmin) {
      logger.debug('관리자: 온보딩 체크를 건너뛰고 대시보드 데이터를 로드합니다.');
      void loadDashboardData();
      return;
    }

    const localOnboardingCompleted = isOnboardingCompleted();
    const currentProvider = getCurrentProvider();
    const providerOnboardingCompleted = isProviderOnboardingCompleted(currentProvider);
    const shouldTreatAsCompleted = Boolean(localOnboardingCompleted || providerOnboardingCompleted);

    logger.debug('Dashboard - localOnboardingCompleted:', localOnboardingCompleted);
    logger.debug('Dashboard - currentProvider:', currentProvider);
    logger.debug('Dashboard - providerOnboardingCompleted:', providerOnboardingCompleted);

    if (shouldTreatAsCompleted) {
      void loadDashboardData();
    } else {
      navigate('/onboarding/experience');
    }
  }, [loadDashboardData, navigate, user?.role]);

  const progressValue = goalData?.total ? Math.round((goalData.current / goalData.total) * 100) : 0;
  const chartSeries = (workoutData?.chartData ?? []).map((item, index, arr) => ({
    name: item.week,
    label: formatYearWeekToMonthNthWeek(item.week),
    value: item.value,
    minutes: item.minutes ?? 0,
    isLast: index === arr.length - 1,
  }));

  if (isLoading) {
    return (
      <div className="min-h-dvh w-full bg-slate-50 pb-24">
        <div className="mx-auto w-full max-w-6xl px-4 py-5">
          <div className="h-8 w-36 animate-pulse rounded-md bg-slate-200" />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-56 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-56 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-slate-50 pb-24 text-foreground">
      <header className="border-b border-white/60 bg-[linear-gradient(135deg,#172554_0%,#1d4ed8_48%,#0f766e_100%)] text-white shadow-soft">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                FitMate
              </Badge>
              <span className="text-xs font-semibold text-blue-100">오늘의 운동 허브</span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              {user?.name ? `${user.name}님, 오늘 루틴을 시작하세요` : '오늘 루틴을 시작하세요'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
              목표, 운동량, 추천 루틴, 체크리스트를 한 화면에서 바로 판단하고 실행할 수 있게 정리했습니다.
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="shrink-0 bg-white/15 text-white hover:bg-white/25"
            onClick={() => navigate('/settings')}
            aria-label="설정으로 이동"
          >
            <Settings size={19} />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="grid gap-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-sm font-semibold text-red-700">{error}</CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: '운동 시간', value: workoutData?.time || '0분', icon: Timer, tone: 'blue' },
              { label: '소모 칼로리', value: workoutData?.calories || '0 kcal', icon: Flame, tone: 'orange' },
              { label: '운동 횟수', value: workoutData?.count || '0회', icon: Dumbbell, tone: 'emerald' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="border-white/80 bg-white shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-lg',
                        item.tone === 'blue' && 'bg-blue-50 text-blue-700',
                        item.tone === 'orange' && 'bg-orange-50 text-orange-700',
                        item.tone === 'emerald' && 'bg-emerald-50 text-emerald-700',
                      )}
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
                      <p className="truncate text-xl font-black text-slate-950">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden border-white/80 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700" aria-hidden="true">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-950">
                      {goalData?.title || '목표 설정'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {goalData?.subtitle || '이번 주 운동 목표를 설정해보세요.'}
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="목표 메뉴">
                <MoreHorizontal size={19} />
              </Button>
            </CardHeader>

            <CardContent className="grid gap-5 p-5 pt-0">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">진행률</span>
                  <span className="font-black text-primary">
                    {goalData ? `${goalData.current}/${goalData.total}` : '0/0'}
                  </span>
                </div>
                <Progress value={progressValue} />
              </div>
              <Button className="h-11 w-full font-bold" onClick={() => navigate('/motion')}>
                운동 시작하기
                <ArrowRight size={17} />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5">
              <div>
                <CardTitle className="text-lg font-black text-slate-950">운동량 변화</CardTitle>
                <CardDescription className="mt-1">
                  {workoutData?.comparison || '최근 기록이 쌓이면 변화가 표시됩니다.'}
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" aria-label="운동량 상세 보기">
                <ArrowRight size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {chartSeries.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                        formatter={(value: number, _name: string, payload: TooltipPayload) => {
                          const minutes = payload?.payload?.minutes ?? Number(value);
                          const h = Math.floor(minutes / 60);
                          const m = minutes % 60;
                          return [h > 0 ? `${h}시간 ${m}분` : `${m}분`, '운동시간'];
                        }}
                        labelFormatter={(label: string) => label}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartSeries.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isLast ? '#2563eb' : '#cbd5e1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm font-semibold text-muted-foreground">
                  운동 기록이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-4">
          {recommendationVisible && recommendationData && (
            <Card className="border-blue-100 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5">
                <div>
                  <Badge variant="success" className="mb-3 gap-2">
                    <Sparkles size={13} />
                    추천 루틴
                  </Badge>
                  <CardTitle className="text-lg font-black text-slate-950">{recommendationData.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {recommendationData.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={dismissRecommendation} aria-label="추천 루틴 닫기">
                  <X size={18} />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 p-5 pt-0">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-semibold leading-6 text-blue-800">
                  {recommendationData.tooltip}
                </div>
                <Button className="h-10" onClick={() => navigate('/motion')}>
                  바로 시작
                  <ArrowRight size={16} />
                </Button>
              </CardContent>
            </Card>
          )}

          <TodayChecklist onStart={() => navigate('/motion')} />

          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="flex items-center gap-2 text-base font-black text-slate-950">
                <CalendarDays size={18} className="text-primary" />
                다음 행동
              </CardTitle>
              <CardDescription className="leading-6">
                캘린더에서 이번 주 운동 일정을 확인하고 비어 있는 날을 채우세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/calendar')}>
                캘린더 보기
                <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>

      <NavigationBar />
      <ChatButton />
    </div>
  );
};

export default Dashboard;
