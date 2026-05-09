import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, List, MapPin, Plus, RefreshCw } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import NavigationBar from './NavigationBar';
import ChatButton from './ChatButton';
import { useToast } from './toastContext';
import { useUser } from '../context/UserContext';
import { authFetch } from '../shared/lib/http';
import { hasAuthSession } from '../shared/lib/storage';
import { logger } from '../shared/lib/logger';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ErrorState, LoadingState } from './ui/feedback';
import { Input } from './ui/input';
import { Page, PageHeader, PageHeaderContent, PageMain } from './ui/page';
import { cn } from '../lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  htmlLink: string;
  creator?: {
    email: string;
    displayName: string;
  };
  created?: string;
  type?: 'holiday' | 'user';
}

interface WorkoutRecord {
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

interface CalendarStatus {
  connected: boolean;
}

interface HolidayApiResponse {
  date: string;
  localName: string;
}

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmails: [] as string[],
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loadedHolidayYear, setLoadedHolidayYear] = useState<number>(0);

  const formatLocalYmd = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toRfc3339WithOffset = (localDateTime: string): string => {
    if (!localDateTime) return '';
    const date = new Date(localDateTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  };

  const loadWorkouts = useCallback(async () => {
    try {
      if (!user?.id || !hasAuthSession()) return;

      const response = await authFetch(`${API_ENDPOINTS.MYPAGE_WORKOUTS(String(user.id))}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const workoutsArray = data.workouts || data.content || data || [];
        setWorkouts(Array.isArray(workoutsArray) ? workoutsArray : []);
      }
    } catch (loadError) {
      logger.error('운동 기록 로드 실패:', loadError);
      setWorkouts([]);
    }
  }, [user?.id]);

  const getWorkoutsForDate = (date: Date) => {
    if (!Array.isArray(workouts)) return [];
    const dateStr = formatLocalYmd(date);
    return workouts.filter((workout) => workout.workoutDate === dateStr);
  };

  const renderWeeklyHeatmap = () => {
    if (!Array.isArray(workouts)) return null;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const daysWithWorkout = new Set(workouts.map((workout) => workout.workoutDate));
    let currentStreak = 0;
    const cursor = new Date();

    while (daysWithWorkout.has(formatLocalYmd(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return (
      <Card className="border-white/80 bg-white shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">이번 주 운동 현황</CardTitle>
          <Badge variant="success">연속 {currentStreak}일 운동</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-7 gap-2">
          {weekDays.map((dayLabel, index) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + index);
            const hasWorkout = workouts.some((workout) => workout.workoutDate === formatLocalYmd(date));
            const isToday = date.toDateString() === today.toDateString();

            return (
              <div
                key={dayLabel}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium',
                  hasWorkout ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-100 bg-slate-50 text-muted-foreground',
                  isToday && 'ring-2 ring-primary/30',
                )}
              >
                <span>{dayLabel}</span>
                <span className={cn('size-3 rounded-full', hasWorkout ? 'bg-emerald-500' : 'bg-slate-200')} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const loadHolidays = useCallback(async (year: number) => {
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
      if (response.ok) {
        const data = (await response.json()) as HolidayApiResponse[];
        setHolidays(
          data.map((holiday) => ({
            id: `holiday-${holiday.date}`,
            title: holiday.localName,
            startDate: holiday.date,
            endDate: holiday.date,
            isAllDay: true,
            htmlLink: '',
            type: 'holiday',
          })),
        );
      }
    } catch (holidayError) {
      logger.error('공휴일 정보 로드 실패:', holidayError);
    }
  }, []);

  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.CALENDAR_STATUS, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setCalendarStatus(await response.json());
    } catch (statusError) {
      logger.error('캘린더 상태 확인 실패:', statusError);
      setCalendarStatus({ connected: false });
    }
  };

  const loadEvents = async () => {
    try {
      const response = await authFetch(`${API_ENDPOINTS.CALENDAR_EVENTS}?maxResults=20`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setEvents(await response.json());
      } else {
        setError('이벤트를 불러오는데 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('success') === 'true') {
      navigate('/calendar', { replace: true });
    } else {
      void checkCalendarStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate]);

  useEffect(() => {
    if (calendarStatus) {
      if (calendarStatus.connected) {
        void loadEvents();
      } else {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarStatus]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    if (year !== loadedHolidayYear) {
      void loadHolidays(year);
      setLoadedHolidayYear(year);
    }
  }, [currentDate, loadedHolidayYear, loadHolidays]);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  const getUpcomingEvents = (): CalendarEvent[] => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return [...events, ...holidays]
      .filter((event) => {
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : undefined;
        if (Number.isNaN(start.getTime())) return false;

        if (event.isAllDay) {
          const endRef = end && !Number.isNaN(end.getTime()) ? new Date(end) : new Date(start);
          endRef.setHours(23, 59, 59, 999);
          return endRef.getTime() >= startOfToday.getTime();
        }

        return start.getTime() >= startOfToday.getTime();
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        summary: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        startDateTime: toRfc3339WithOffset(newEvent.startDateTime),
        endDateTime: toRfc3339WithOffset(newEvent.endDateTime),
        attendeeEmails: newEvent.attendeeEmails,
      };
      const response = await authFetch(API_ENDPOINTS.CALENDAR_EVENTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const createdEvent = await response.json();
        setEvents((prev) => [createdEvent, ...prev]);
        setShowCreateForm(false);
        setNewEvent({
          title: '',
          description: '',
          location: '',
          startDateTime: '',
          endDateTime: '',
          attendeeEmails: [],
        });
        showToast('일정이 추가되었습니다.', 'success');
      } else {
        setError('이벤트 생성에 실패했습니다.');
        showToast('이벤트 생성에 실패했습니다.', 'error');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const formatEventDateTime = (event: CalendarEvent) => {
    if (!event.startDate) return '날짜 정보 없음';
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    if (Number.isNaN(startDate.getTime())) return '날짜 형식 오류';

    const startFormatted = startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (event.isAllDay) {
      if (endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
        const endFormatted = endDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return `${startFormatted} ~ ${endFormatted} (하루 종일)`;
      }
      return `${startFormatted} (하루 종일)`;
    }

    const startTime = startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      return `${startFormatted} ${startTime} ~ ${endTime}`;
    }
    return `${startFormatted} ${startTime}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
  };

  const getEventsForDate = (date: Date) => {
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const userEvents = events.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
      return eventDate === targetDate;
    });
    const holidayEvents = holidays.filter((holiday) => {
      const holidayStart = new Date(holiday.startDate);
      const holidayDate = new Date(holidayStart.getFullYear(), holidayStart.getMonth(), holidayStart.getDate()).getTime();
      return holidayDate === targetDate;
    });
    return [...userEvents, ...holidayEvents];
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const days = [];

    for (let i = 0; i < startingDay; i += 1) {
      days.push(<div key={`empty-${i}`} className="min-h-16 rounded-lg bg-slate-50 md:min-h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay();
      const dayEvents = getEventsForDate(date);
      const dayWorkouts = getWorkoutsForDate(date);
      const hasUserEvent = dayEvents.some((event) => event.type !== 'holiday');
      const hasHoliday = dayEvents.some((event) => event.type === 'holiday');
      const hasWorkout = dayWorkouts.length > 0;
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          className={cn(
            'flex min-h-16 flex-col items-start justify-between rounded-lg border bg-white p-2 text-left transition-colors hover:bg-slate-50 md:min-h-24',
            isToday && 'border-primary ring-2 ring-primary/20',
            isSelected && 'bg-primary/5',
            hasHoliday && 'border-red-200 bg-red-50',
            hasUserEvent && 'border-blue-200',
            dayOfWeek === 0 && 'text-red-600',
            dayOfWeek === 6 && 'text-blue-600',
          )}
          onClick={() => setSelectedDate(date)}
        >
          <span className="text-sm font-semibold">{day}</span>
          <div className="flex flex-wrap gap-1">
            {hasWorkout && <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-label="운동 기록 있음"><Dumbbell className="size-3" /></span>}
            {hasUserEvent && <span className="size-2 rounded-full bg-blue-500" aria-label="일정 있음" />}
            {hasHoliday && <span className="size-2 rounded-full bg-red-500" aria-label="공휴일" />}
          </div>
        </button>,
      );
    }

    return days;
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!hasAuthSession()) {
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      const response = await authFetch(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '캘린더 연동을 시작할 수 없습니다.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `서버 오류 (${response.status}): ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success && data.authUrl) {
        showToast('Google 인증 페이지로 이동합니다.', 'info');
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || '캘린더 연동 URL을 받지 못했습니다.');
      }
    } catch (connectError) {
      const errorMessage = connectError instanceof Error ? connectError.message : String(connectError);
      logger.error('캘린더 연동 실패:', errorMessage);
      setError(`캘린더 연동 실패: ${errorMessage}`);
      showToast(`캘린더 연동 실패: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate) : [];
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="flex-col items-stretch gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-950">캘린더</h1>
                <p className="text-sm text-muted-foreground">운동 일정, Google Calendar 일정, 공휴일을 함께 확인합니다.</p>
              </div>
            </div>
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <Button type="button" variant={viewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setViewMode('calendar')}>
                <CalendarDays className="size-4" />
                달력
              </Button>
              <Button type="button" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
                <List className="size-4" />
                목록
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm((prev) => !prev)}>
                <Plus className="size-4" />
                일정 추가
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadEvents()} disabled={loading} aria-label="Google 캘린더와 동기화">
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                {loading ? '동기화 중' : '동기화'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button type="button" variant={viewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setViewMode('calendar')}>달력</Button>
            <Button type="button" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>목록</Button>
            <Button type="button" variant="outline" onClick={() => setShowCreateForm((prev) => !prev)}>일정 추가</Button>
            <Button type="button" variant="outline" onClick={() => void loadEvents()} disabled={loading}>{loading ? '동기화 중' : '동기화'}</Button>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="space-y-4">
        {renderWeeklyHeatmap()}

        {!calendarStatus?.connected && !loading && (
          <Card className="border-blue-200 bg-blue-50 shadow-sm">
            <CardHeader>
              <CardTitle>Google Calendar 연동</CardTitle>
              <CardDescription>운동 일정을 Google Calendar와 동기화하여 편하게 관리하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={handleConnectGoogleCalendar}>Google Calendar 연동하기</Button>
            </CardContent>
          </Card>
        )}

        {error && <ErrorState message={error} onRetry={() => void checkCalendarStatus()} />}

        {showCreateForm && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>새 일정 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  제목
                  <Input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="일정 제목" required />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  설명
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="일정 설명"
                    rows={3}
                    className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  장소
                  <Input type="text" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="장소" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    시작 시간
                    <Input type="datetime-local" value={newEvent.startDateTime} onChange={(e) => setNewEvent({ ...newEvent, startDateTime: e.target.value })} required />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    종료 시간
                    <Input type="datetime-local" value={newEvent.endDateTime} onChange={(e) => setNewEvent({ ...newEvent, endDateTime: e.target.value })} required />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>취소</Button>
                  <Button type="submit">일정 추가</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <LoadingState title="캘린더를 불러오는 중입니다." />
        ) : viewMode === 'calendar' ? (
          <div className="space-y-4">
            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} aria-label="이전 달">
                  <ChevronLeft className="size-5" />
                </Button>
                <CardTitle>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} aria-label="다음 달">
                  <ChevronRight className="size-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
                  {weekDays.map((dayLabel, index) => (
                    <div key={dayLabel} className={cn(index === 0 && 'text-red-600', index === 6 && 'text-blue-600')}>{dayLabel}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
              </CardContent>
            </Card>

            {selectedDate && (
              <Card className="border-white/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>{selectedDate.toLocaleDateString('ko-KR')} 기록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDateWorkouts.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Dumbbell className="size-4 text-primary" /> 운동 기록</h3>
                      {selectedDateWorkouts.map((workout) => (
                        <div key={workout.id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-emerald-950">{workout.workoutType}</h4>
                            {workout.duration && <Badge variant="success">{workout.duration}분</Badge>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-emerald-800">
                            {workout.sets && workout.reps && <span>{workout.sets}세트 x {workout.reps}회</span>}
                            {workout.weight && <span>{workout.weight}kg</span>}
                            {workout.calories && <span>{workout.calories}kcal</span>}
                          </div>
                          {workout.notes && <p className="mt-2 text-sm text-emerald-800">{workout.notes}</p>}
                        </div>
                      ))}
                    </section>
                  )}

                  {selectedDateEvents.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><CalendarDays className="size-4 text-primary" /> 일정</h3>
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className={cn('rounded-lg border p-3', event.type === 'holiday' ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50')}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-semibold text-slate-950">{event.title}</h4>
                            {event.type !== 'holiday' && event.htmlLink && (
                              <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">Google Calendar에서 보기</a>
                            )}
                          </div>
                          {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
                          {event.location && <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" /> {event.location}</p>}
                          <div className="mt-2 text-sm text-muted-foreground">{formatEventDateTime(event)}</div>
                        </div>
                      ))}
                    </section>
                  )}

                  {selectedDateWorkouts.length === 0 && selectedDateEvents.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-muted-foreground">해당 날짜에 기록이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>다가오는 일정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getUpcomingEvents().length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 p-8 text-center text-muted-foreground">
                  <p className="text-sm font-medium">등록된 일정이 없습니다.</p>
                  <Button type="button" onClick={() => setShowCreateForm(true)}>첫 번째 일정 추가하기</Button>
                </div>
              ) : (
                getUpcomingEvents().map((event) => (
                  <div key={event.id} className={cn('rounded-lg border p-4', event.type === 'holiday' ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-950">{event.title}</h3>
                      {event.type !== 'holiday' && event.htmlLink && (
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">Google Calendar에서 보기</a>
                      )}
                    </div>
                    {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
                    {event.location && <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" /> {event.location}</p>}
                    <div className="mt-2 text-sm text-muted-foreground">{formatEventDateTime(event)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </PageMain>

      <NavigationBar />
      <ChatButton />
    </Page>
  );
};

export default Calendar;
