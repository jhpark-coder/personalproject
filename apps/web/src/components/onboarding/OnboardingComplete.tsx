import React, { useState } from 'react';
import { BarChart3, Bell, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Page, PageMain } from '../ui/page';
import {
  getCurrentProvider,
  setOnboardingCompleted,
  setProviderOnboardingCompleted,
} from '../../shared/lib/storage';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';

const benefits = [
  { label: '운동 일정 자동 동기화', icon: CalendarDays },
  { label: '운동 알림 설정', icon: Bell },
  { label: '운동 기록 관리', icon: BarChart3 },
];

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  const markComplete = () => {
    setOnboardingCompleted(true);
    setProviderOnboardingCompleted(getCurrentProvider(), true);
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingCalendar(true);
      markComplete();

      const response = await authFetch(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        window.location.href = data.authUrl;
      } else {
        logger.error('캘린더 연동 시작 실패:', data.message);
      }
    } catch (error) {
      logger.error('캘린더 연동 실패:', error);
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const handleSkipCalendar = () => {
    markComplete();
    navigate('/');
  };

  return (
    <Page className="bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      <PageMain className="flex min-h-dvh max-w-3xl items-center py-8">
        <Card className="w-full border-emerald-100 bg-white/95 shadow-lg">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-9" />
            </div>
            <CardTitle className="text-2xl">온보딩 완료</CardTitle>
            <CardDescription className="text-base">
              이제 FitMate와 함께 운동 계획과 기록을 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-base font-semibold text-slate-950">구글 캘린더 연동</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                운동 일정을 캘린더와 연결하면 예정 운동과 알림을 더 일관되게 관리할 수 있습니다.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {benefits.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-medium text-slate-700 shadow-sm">
                    <Icon className="size-4 text-primary" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleSkipCalendar}>
                나중에 하기
              </Button>
              <Button type="button" onClick={handleConnectGoogleCalendar} disabled={isConnectingCalendar}>
                {isConnectingCalendar && <Loader2 className="size-4 animate-spin" />}
                {isConnectingCalendar ? '연동 중' : '구글 캘린더 연동'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
};

export default OnboardingComplete;
