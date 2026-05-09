import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Database, FileText, ShieldCheck, Trophy, UserCircle, XCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LoadingState } from '../ui/feedback';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

interface CalendarStatus {
  connected: boolean;
  provider?: string;
  lastSync?: string | null;
}

const settingsItems = [
  {
    title: '프로필 관리',
    description: '개인정보 및 신체정보 관리',
    path: '/profile',
    icon: UserCircle,
  },
  {
    title: '나의 기록실',
    description: '운동 기록 및 성과 관리',
    path: '/records-room',
    icon: Trophy,
  },
  {
    title: '이용약관',
    description: '서비스 이용 조건 확인',
    path: '/terms',
    icon: FileText,
  },
  {
    title: '개인정보 처리방침',
    description: '개인정보 처리와 권리 안내',
    path: '/privacy',
    icon: ShieldCheck,
  },
  {
    title: '데이터 및 계정 권리',
    description: '삭제, 내보내기, 동의 철회 요청',
    path: '/data-rights',
    icon: Database,
  },
] as const;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.CALENDAR_STATUS, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setCalendarStatus(data.status);
      } else {
        setCalendarStatus(data);
      }
    } catch (error) {
      logger.error('캘린더 상태 확인 실패:', error);
      setCalendarStatus({ connected: false, provider: 'google', lastSync: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkCalendarStatus();
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnecting(true);
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
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.CALENDAR_DISCONNECT, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setCalendarStatus({ connected: false, provider: 'google', lastSync: null });
      }
    } catch (error) {
      logger.error('캘린더 연결 해제 실패:', error);
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-950">설정</h1>
            <p className="mt-1 text-sm text-muted-foreground">계정, 캘린더, 앱 정보를 관리합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4">
        {loading ? (
          <LoadingState title="설정 정보를 불러오는 중입니다." />
        ) : (
          <>
            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black">캘린더 연동</CardTitle>
                <CardDescription>운동 일정을 Google Calendar와 동기화합니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {calendarStatus?.connected ? (
                  <>
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">구글 캘린더가 연동되어 있습니다.</p>
                        <p className="mt-1 text-sm">마지막 동기화: {calendarStatus.lastSync || '정보 없음'}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-fit" onClick={handleDisconnectCalendar}>
                      연동 해제
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">
                      <XCircle className="mt-0.5 size-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">구글 캘린더가 연동되어 있지 않습니다.</p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                          <li>운동 일정 자동 동기화</li>
                          <li>운동 알림 설정</li>
                          <li>운동 기록 관리</li>
                        </ul>
                      </div>
                    </div>
                    <Button className="w-fit" onClick={handleConnectGoogleCalendar} disabled={isConnecting}>
                      {isConnecting ? '연동 중...' : '구글 캘린더 연동하기'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black">계정</CardTitle>
                <CardDescription>개인 정보와 서비스 문서를 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:bg-muted"
                      onClick={() => navigate(item.path)}
                      aria-label={`${item.title}로 이동`}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-950">{item.title}</span>
                        <span className="block truncate text-xs font-semibold text-muted-foreground">{item.description}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black">앱 정보</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  ['버전', '1.0.0'],
                  ['개발자', 'FitMate Team'],
                  ['출시일', '2024.12'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                    <span className="font-semibold text-muted-foreground">{label}</span>
                    <span className="font-bold text-slate-950">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </PageMain>

      <NavigationBar />
      <ChatButton />
    </Page>
  );
};

export default Settings;
