import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Percent, Plus, Scale } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS } from '../../config/api';
import NavigationBar from '../NavigationBar';
import { useToast } from '../toastContext';
import { useUser } from '../../context/UserContext';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorState, LoadingState } from '../ui/feedback';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';
import { cn } from '../../lib/utils';

type TrendEntry = [date: string, value: number | string];
type TrendPeriod = 'daily' | 'weekly' | 'monthly';
type SectionKey = 'muscle' | 'bodyFat' | 'weight';

const round1 = (v: number) => Math.round(v * 10) / 10;

interface TrendsData {
  weightTrend: TrendEntry[];
  bodyFatTrend: TrendEntry[];
  muscleMassTrend: TrendEntry[];
}

const periodLabels: Record<TrendPeriod, string> = {
  daily: '일별',
  weekly: '주별',
  monthly: '월별',
};

const BodyData: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTabs, setActiveTabs] = useState<Record<SectionKey, TrendPeriod>>({
    muscle: 'daily',
    bodyFat: 'daily',
    weight: 'daily',
  });
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const getUserId = useCallback(() => {
    return user?.id ? String(user.id) : null;
  }, [user?.id]);

  const loadTrendsData = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentPeriod = activeTabs.muscle || activeTabs.bodyFat || activeTabs.weight || 'daily';
      const response = await authFetch(
        `${API_ENDPOINTS.MYPAGE_TRENDS(userId)}?period=${currentPeriod}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`데이터를 불러올 수 없습니다. (${response.status}) ${errorText?.slice(0, 120)}`);
      }

      const data = await response.json() as TrendsData;
      setTrendsData(data);
      showToast('신체 데이터 업데이트 완료', 'success');
    } catch (error) {
      logger.error('신체 데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      showToast('데이터 로드에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTabs.bodyFat, activeTabs.muscle, activeTabs.weight, getUserId, showToast]);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      void loadTrendsData();
    }
  }, [getUserId, loadTrendsData]);

  const loadSectionData = async (section: SectionKey, period: TrendPeriod) => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const response = await authFetch(
        `${API_ENDPOINTS.MYPAGE_TRENDS(userId)}?period=${period}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`데이터를 불러올 수 없습니다. (${response.status}: ${response.statusText})`);
      }

      const data = await response.json();
      setTrendsData(prev => {
        if (!prev) return data;

        const updatedData = { ...prev };
        if (section === 'muscle' && data.muscleMassTrend) updatedData.muscleMassTrend = data.muscleMassTrend;
        if (section === 'bodyFat' && data.bodyFatTrend) updatedData.bodyFatTrend = data.bodyFatTrend;
        if (section === 'weight' && data.weightTrend) updatedData.weightTrend = data.weightTrend;
        return updatedData;
      });
    } catch (error) {
      logger.error(`${section} 섹션 데이터 로드 실패:`, error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  const handleTabChange = (section: SectionKey, period: TrendPeriod) => {
    setActiveTabs(prev => ({
      ...prev,
      [section]: period,
    }));
    void loadSectionData(section, period);
  };

  const formatChartData = (trendData: TrendEntry[], period: TrendPeriod) => trendData.map((item) => {
    let formattedDate = '';

    switch (period) {
      case 'daily': {
        const dailyDate = new Date(item[0]);
        formattedDate = `${dailyDate.getMonth() + 1}/${dailyDate.getDate()}`;
        break;
      }
      case 'weekly': {
        const weeklyDate = new Date(item[0]);
        formattedDate = !isNaN(weeklyDate.getTime()) ? `${weeklyDate.getMonth() + 1}/${weeklyDate.getDate()}` : item[0];
        break;
      }
      case 'monthly': {
        if (typeof item[0] === 'string' && item[0].match(/^\d{4}-\d{2}$/)) {
          const [, month] = item[0].split('-');
          formattedDate = `${parseInt(month)}월`;
        } else {
          const monthlyDate = new Date(item[0]);
          formattedDate = !isNaN(monthlyDate.getTime()) ? `${monthlyDate.getMonth() + 1}월` : item[0];
        }
        break;
      }
      default:
        formattedDate = item[0];
    }

    return {
      date: formattedDate,
      value: round1(parseFloat(String(item[1]))),
    };
  });

  const calculateCurrentAndChange = (trendData: TrendEntry[]) => {
    if (trendData.length < 2) return { current: 0, change: 0 };

    const current = parseFloat(String(trendData[trendData.length - 1][1]));
    const previous = parseFloat(String(trendData[trendData.length - 2][1]));
    return { current: round1(current), change: round1(current - previous) };
  };

  const calculateMinMax = (trendData: TrendEntry[]) => {
    if (trendData.length === 0) return { min: 0, max: 0 };

    const values = trendData.map(item => parseFloat(String(item[1])));
    return {
      min: round1(Math.min(...values)),
      max: round1(Math.max(...values)),
    };
  };

  const sections = [
    {
      key: 'muscle' as const,
      title: '근육량',
      unit: 'kg',
      icon: Dumbbell,
      trend: trendsData?.muscleMassTrend ?? [],
      stroke: '#2563eb',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      key: 'bodyFat' as const,
      title: '체지방률',
      unit: '%',
      icon: Percent,
      trend: trendsData?.bodyFatTrend ?? [],
      stroke: '#ef4444',
      tone: 'bg-red-50 text-red-700',
    },
    {
      key: 'weight' as const,
      title: '체중',
      unit: 'kg',
      icon: Scale,
      trend: trendsData?.weightTrend ?? [],
      stroke: '#10b981',
      tone: 'bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-950">신체 데이터</h1>
              <p className="mt-1 text-sm text-muted-foreground">체중, 근육량, 체지방률 변화를 확인합니다.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/body-records/new')} aria-label="신체 기록 추가">
            <Plus size={16} />
            추가
          </Button>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4">
        {loading ? (
          <LoadingState title="신체 데이터를 불러오는 중입니다." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTrendsData} />
        ) : (
          sections.map((section) => {
            const Icon = section.icon;
            const trend = section.trend;
            const currentInfo = calculateCurrentAndChange(trend);
            const minMax = calculateMinMax(trend);
            const activePeriod = activeTabs[section.key];
            const chartData = formatChartData(trend, activePeriod);

            return (
              <Card key={section.key} className="border-white/80 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-11 items-center justify-center rounded-lg ${section.tone}`} aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <div>
                      <CardTitle className="text-lg font-black">{section.title}</CardTitle>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        지난 데이터 대비 {currentInfo.change > 0 ? '+' : ''}{currentInfo.change}{section.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-950">{currentInfo.current}{section.unit}</div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      최소 {minMax.min}{section.unit} · 최대 {minMax.max}{section.unit}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(periodLabels) as TrendPeriod[]).map((period) => (
                      <Button
                        key={period}
                        type="button"
                        variant={activePeriod === period ? 'default' : 'outline'}
                        onClick={() => handleTabChange(section.key, period)}
                      >
                        {periodLabels[period]}
                      </Button>
                    ))}
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis
                          tickFormatter={(v) => Number(v).toFixed(1)}
                          domain={[round1(minMax.min - 0.5), round1(minMax.max + 0.5)]}
                        />
                        <Tooltip formatter={(v: number | string) => Number(v).toFixed(1)} />
                        <Line type="monotone" dataKey="value" stroke={section.stroke} strokeWidth={2.4} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {!trend.length && (
                    <div className={cn('rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm font-semibold text-muted-foreground')}>
                      표시할 신체 데이터가 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default BodyData;
