import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Flame, Repeat, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../NavigationBar';
import { API_ENDPOINTS } from '../../config/api';
import { useUser } from '../../context/UserContext';
import { authFetch } from '../../shared/lib/http';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorState, LoadingState } from '../ui/feedback';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

interface RecordsSummary {
  pr: {
    maxVolume?: { workoutType: string; date: string; volume: number };
    maxReps?: { workoutType: string; date: string; reps: number; sets?: number };
    longestDuration?: { workoutType: string; date: string; minutes: number };
  };
  streak: { current: number; longest: number };
  cumulative: { totalCalories: number; totalVolume: number; totalWorkouts: number; totalMinutes: number };
}

const EmptyValue = () => <span className="text-sm text-muted-foreground">기록 없음</span>;

const RecordsRoom: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState<RecordsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = user?.id;
        if (!userId) throw new Error('로그인이 필요합니다.');
        const res = await authFetch(API_ENDPOINTS.MYPAGE_RECORDS_ROOM(String(userId)), {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`데이터 로드 실패 (${res.status}): ${text?.slice(0, 200)}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`JSON 응답이 아닙니다: ${text?.slice(0, 200)}`);
        }
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <Page>
        <PageHeader>
          <PageHeaderContent>
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-xl font-bold text-slate-950">나의 기록실</h1>
          </PageHeaderContent>
        </PageHeader>
        <PageMain>
          <LoadingState title="기록을 불러오는 중입니다." />
        </PageMain>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page>
        <PageMain>
          <ErrorState message={error || '기록 데이터를 찾을 수 없습니다.'} onRetry={() => navigate(-1)} />
        </PageMain>
      </Page>
    );
  }

  const { pr, streak, cumulative } = data;

  const prCards = [
    {
      label: '최대 볼륨',
      icon: Trophy,
      body: pr.maxVolume ? (
        <>
          <div className="text-base font-semibold text-slate-950">{pr.maxVolume.workoutType}</div>
          <div className="text-sm text-muted-foreground">{pr.maxVolume.volume?.toLocaleString()} kg</div>
          <div className="text-xs text-muted-foreground">{pr.maxVolume.date}</div>
        </>
      ) : (
        <EmptyValue />
      ),
    },
    {
      label: '세트 최다 반복',
      icon: Repeat,
      body: pr.maxReps ? (
        <>
          <div className="text-base font-semibold text-slate-950">{pr.maxReps.workoutType}</div>
          <div className="text-sm text-muted-foreground">
            {pr.maxReps.reps}회{pr.maxReps.sets ? ` / ${pr.maxReps.sets}세트` : ''}
          </div>
          <div className="text-xs text-muted-foreground">{pr.maxReps.date}</div>
        </>
      ) : (
        <EmptyValue />
      ),
    },
    {
      label: '최장 운동 시간',
      icon: Clock,
      body: pr.longestDuration ? (
        <>
          <div className="text-base font-semibold text-slate-950">{pr.longestDuration.workoutType}</div>
          <div className="text-sm text-muted-foreground">{pr.longestDuration.minutes}분</div>
          <div className="text-xs text-muted-foreground">{pr.longestDuration.date}</div>
        </>
      ) : (
        <EmptyValue />
      ),
    },
  ];

  const cumulativeCards = [
    { label: '누적 칼로리', value: `${cumulative.totalCalories.toLocaleString()} kcal`, icon: Flame },
    { label: '누적 볼륨', value: `${cumulative.totalVolume.toLocaleString()} kg`, icon: Trophy },
    { label: '총 운동 횟수', value: `${cumulative.totalWorkouts.toLocaleString()}회`, icon: Repeat },
    { label: '총 운동 시간', value: `${cumulative.totalMinutes.toLocaleString()}분`, icon: Clock },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-950">나의 기록실</h1>
            <p className="text-sm text-muted-foreground">개인 최고 기록과 누적 운동 성과를 확인합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="space-y-4">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>개인 최고 기록</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {prCards.map(({ label, icon: Icon, body }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Icon className="size-4 text-primary" />
                  {label}
                </div>
                {body}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>연속 운동</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-medium text-emerald-700">현재 연속</div>
              <div className="mt-1 text-2xl font-bold text-emerald-900">{streak.current}일</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-700">최장 연속</div>
              <div className="mt-1 text-2xl font-bold text-blue-900">{streak.longest}일</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>누적 통계</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cumulativeCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <Icon className="mb-3 size-5 text-primary" />
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 text-lg font-bold text-slate-950">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default RecordsRoom;
