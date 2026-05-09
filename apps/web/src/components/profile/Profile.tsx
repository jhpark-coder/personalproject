import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, Dumbbell, LogOut, Mail, Phone, Ruler, Scale, Trophy, UserRound, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import { API_ENDPOINTS } from '../../config/api';
import { authFetch } from '../../shared/lib/http';
import { clearAuthSession } from '../../shared/lib/storage';
import { logger } from '../../shared/lib/logger';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorState, LoadingState } from '../ui/feedback';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

interface WorkoutRecordItem {
  id: number;
  workoutType: string;
  workoutDate: string;
  duration?: number;
  calories?: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

const getProviderDisplayName = (provider: string) => {
  if (!provider || provider === 'unknown' || provider === 'null') return '로컬';

  switch (provider.toLowerCase()) {
    case 'google':
      return 'Google';
    case 'kakao':
      return 'Kakao';
    case 'naver':
      return 'Naver';
    case 'local':
      return '로컬';
    default:
      return provider;
  }
};

const getInitials = (name: string) => {
  if (!name) return 'FM';
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
};

const getGenderDisplayName = (gender: string) => {
  if (!gender) return '';
  switch (gender.toLowerCase()) {
    case 'male':
      return '남';
    case 'female':
      return '여';
    default:
      return '기타';
  }
};

const formatKoreanDate = (ymd: string) => {
  try {
    const [year, month, day] = ymd.split('-').map((value) => parseInt(value, 10));
    const date = new Date(year, (month || 1) - 1, day || 1);
    if (Number.isNaN(date.getTime())) return ymd;
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  } catch {
    return ymd;
  }
};

const Profile: React.FC = () => {
  const { user, loading, error, refresh } = useUser();
  const navigate = useNavigate();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutRecordItem[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    if (typeof refresh === 'function') refresh();
  }, [refresh]);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user?.id) return;
      try {
        setRecentLoading(true);
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        const toYmd = (date: Date) => date.toISOString().slice(0, 10);
        const url = `${API_ENDPOINTS.MYPAGE_WORKOUTS(String(user.id))}?startDate=${toYmd(start)}&endDate=${toYmd(end)}`;
        const res = await authFetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('최근 활동 조회 실패');
        const data = await res.json();
        const list = (data?.workouts || data?.content || data || []) as WorkoutRecordItem[];
        const sorted = [...list].sort((a, b) => (b.workoutDate || '').localeCompare(a.workoutDate || ''));
        setRecentWorkouts(sorted.slice(0, 5));
      } catch (e) {
        logger.error(e);
        setRecentWorkouts([]);
      } finally {
        setRecentLoading(false);
      }
    };
    void fetchRecent();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (logoutError) {
      logger.error('로그아웃 중 오류:', logoutError);
    } finally {
      clearAuthSession();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <Page>
        <PageMain>
          <LoadingState title="프로필을 불러오는 중입니다." />
        </PageMain>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageMain>
          <ErrorState message={`프로필 로드 실패: ${error}`} onRetry={refresh} />
        </PageMain>
      </Page>
    );
  }

  if (!user) {
    return (
      <Page>
        <PageMain>
          <ErrorState message="사용자 정보를 찾을 수 없습니다." onRetry={refresh} />
        </PageMain>
      </Page>
    );
  }

  const basicInfo = [
    { label: '키', value: user.height ? `${user.height}cm` : '미입력', icon: Ruler },
    { label: '체중', value: user.weight ? `${user.weight}kg` : '미입력', icon: Scale },
    { label: '나이', value: user.age ? `${user.age}세` : '미입력', icon: UserRound },
    { label: '성별', value: user.gender ? getGenderDisplayName(user.gender) : '미입력', icon: Users },
    { label: '번호', value: user.phoneNumber || '미입력', icon: Phone },
    { label: '생년월일', value: user.birthDate || '미입력', icon: CalendarDays },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-950">내 프로필</h1>
            <p className="text-sm text-muted-foreground">계정 정보와 최근 운동 기록을 확인합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="border-white/80 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {user.picture ? (
                  <img src={user.picture} alt="프로필 사진" className="size-full object-cover" />
                ) : (
                  getInitials(user.name || user.email || 'FitMate')
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-slate-950">{user.name}</h2>
                <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
              <Badge variant="secondary">로그인 방법: {getProviderDisplayName(user.provider || 'local')}</Badge>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>빠른 이동</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button type="button" variant="outline" className="justify-between" onClick={() => navigate('/analytics/body')}>
                <span className="flex items-center gap-2">
                  <Scale className="size-4" />
                  신체 데이터 분석
                </span>
              </Button>
              <Button type="button" variant="outline" className="justify-between" onClick={() => navigate('/analytics/stats')}>
                <span className="flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  운동 통계 분석
                </span>
              </Button>
              <Button type="button" variant="outline" className="justify-between" onClick={() => navigate('/records-room')}>
                <span className="flex items-center gap-2">
                  <Trophy className="size-4" />
                  나의 기록실
                </span>
              </Button>
              <Button type="button" variant="destructive" onClick={handleLogout}>
                <LogOut className="size-4" />
                로그아웃
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {basicInfo.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="truncate text-sm font-semibold text-slate-900">{value}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="size-5 text-primary" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading && <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-muted-foreground">불러오는 중입니다.</p>}
              {!recentLoading && recentWorkouts && recentWorkouts.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {recentWorkouts.map((workout) => (
                    <div key={workout.id} className="grid gap-2 p-4 sm:grid-cols-[90px_1fr]">
                      <div className="text-sm font-semibold text-primary">{formatKoreanDate(workout.workoutDate)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{workout.workoutType}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {workout.sets ? `${workout.sets}세트` : ''}
                          {workout.reps ? ` x ${workout.reps}회` : ''}
                          {workout.weight ? ` · ${workout.weight}kg` : ''}
                          {workout.duration ? ` · ${workout.duration}분` : ''}
                          {workout.calories ? ` · ${workout.calories}kcal` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !recentLoading && (
                  <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-muted-foreground">
                    최근 일주일 내 기록이 없습니다.
                  </p>
                )
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>현재 목표</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-muted-foreground">목표 정보가 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </PageMain>

      <NavigationBar />
      <ChatButton />
    </Page>
  );
};

export default Profile;
