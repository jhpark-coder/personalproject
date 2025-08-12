import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from '../context/UserContext';
import NavigationBar from './NavigationBar';
import ChatButton from './ChatButton';
import './Calendar.css';
import { useToast } from './ToastProvider';

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

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { showToast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmails: [] as string[]
  });
  
  // RFC3339 형식(+타임존 오프셋)으로 변환
  const toRfc3339WithOffset = (localDateTime: string): string => {
    if (!localDateTime) return '';
    const date = new Date(localDateTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    const offsetMin = -date.getTimezoneOffset(); // 동경 기준 +값
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const oh = pad(Math.floor(abs / 60));
    const om = pad(abs % 60);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
  };
  
  // 달력 UI를 위한 상태들
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loadedHolidayYear, setLoadedHolidayYear] = useState<number>(0);

  useEffect(() => {
    // URL 파라미터에서 토큰 확인
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    
    if (success === 'true' && token) {
      // 캘린더 연동 완료 - 토큰 저장
      localStorage.setItem('token', token);
      
      const tempToken = urlParams.get('tempToken');
      if (tempToken === 'true') {
        const existingToken = localStorage.getItem('existingToken');
        if (existingToken) {
          localStorage.setItem('token', existingToken);
        }
      }
      
      // URL에서 파라미터 제거
      navigate('/calendar', { replace: true });
    } else {
      checkCalendarStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate]);

  useEffect(() => {
    if (calendarStatus) {
      if (calendarStatus.connected) {
        loadEvents();
      } else {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarStatus]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    if (year !== loadedHolidayYear) {
      loadHolidays(year);
      setLoadedHolidayYear(year);
    }
  }, [currentDate, loadedHolidayYear]);

  // 운동 기록 로드
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userId = getUserId();
      if (!userId) return;

      const response = await fetch(`${API_ENDPOINTS.MYPAGE_WORKOUTS(userId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // API 응답에서 workouts 배열 추출
        const workoutsArray = data.workouts || data.content || data || [];
        setWorkouts(Array.isArray(workoutsArray) ? workoutsArray : []);
      }
    } catch (error) {
      console.error('운동 기록 로드 실패:', error);
      setWorkouts([]); // 에러 시 빈 배열로 초기화
    }
  };

  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).sub; } catch { return null; }
  };

  // 주간 히트맵 렌더링
  const renderWeeklyHeatmap = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일부터 시작
    
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const heatmapDays = [];
    
    // workouts가 배열인지 확인
    if (!Array.isArray(workouts)) {
      return null; // workouts가 배열이 아니면 히트맵을 렌더링하지 않음
    }
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dateStr = formatLocalYmd(date);
      const hasWorkout = workouts.some(workout => 
        workout.workoutDate === dateStr
      );
      
      const isToday = date.toDateString() === today.toDateString();
      
      heatmapDays.push(
        <div 
          key={i} 
          className={`heatmap-day ${hasWorkout ? 'has-workout' : ''} ${isToday ? 'today' : ''}`}
        >
          <div className="day-label">{weekDays[i]}</div>
          <div className="day-indicator"></div>
        </div>
      );
    }
    
    // 이번 주 총 운동일수 (기존 표시 값)
    const workoutDays = workouts.filter(workout => {
      const workoutDate = new Date(workout.workoutDate);
      const weekStart = new Date(startOfWeek);
      const weekEnd = new Date(startOfWeek);
      weekEnd.setDate(weekStart.getDate() + 6);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    }).length;

    // 연속 운동일수 계산 (오늘부터 거꾸로 연속해서 운동한 일수)
    const daysWithWorkout = new Set(workouts.map(w => w.workoutDate));
    let currentStreak = 0;
    const cursor = new Date();
    while (true) {
      const ds = cursor.toISOString().split('T')[0];
      if (daysWithWorkout.has(ds)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    
    return (
      <div className="weekly-heatmap">
        <div className="heatmap-header">
          <h4>이번 주 운동 현황</h4>
          <span className="workout-count">연속 {currentStreak}일 운동!</span>
        </div>
        <div className="heatmap-grid">
          {heatmapDays}
        </div>
      </div>
    );
  };

  // 선택된 날짜의 운동 기록
  const getWorkoutsForDate = (date: Date) => {
    if (!Array.isArray(workouts)) return [];
    const dateStr = formatLocalYmd(date);
    return workouts.filter(workout => workout.workoutDate === dateStr);
  };

  const loadHolidays = async (year: number) => {
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
      if (response.ok) {
        const data = await response.json();
        const holidayEvents: CalendarEvent[] = data.map((holiday: any) => ({
          id: `holiday-${holiday.date}`,
          title: holiday.localName,
          startDate: holiday.date,
          endDate: holiday.date,
          isAllDay: true,
          htmlLink: '',
          type: 'holiday',
        }));
        setHolidays(holidayEvents);
      }
    } catch (error) {
      console.error('공휴일 정보 로드 실패:', error);
    }
  };

  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.CALENDAR_STATUS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setCalendarStatus(data);
    } catch (error) {
      console.error('캘린더 상태 확인 실패:', error);
      setCalendarStatus({ connected: false });
    }
  };

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.CALENDAR_EVENTS}?maxResults=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setError('이벤트를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 오늘(로컬 00:00) 기준으로 과거 일정을 제외한 "다가오는" 일정 필터링
  const getUpcomingEvents = (): CalendarEvent[] => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const withAll = [...events, ...holidays];
    const filtered = withAll.filter((event) => {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : undefined;

      if (isNaN(start.getTime())) return false;

      if (event.isAllDay) {
        // 전일 이벤트는 종료일이 있으면 종료일 23:59:59까지 유효로 간주
        const endRef = end && !isNaN(end.getTime()) ? new Date(end) : new Date(start);
        endRef.setHours(23, 59, 59, 999);
        return endRef.getTime() >= startOfToday.getTime();
      }

      // 시간 이벤트는 시작 시간이 오늘 00:00 이후인 경우만 표시
      return start.getTime() >= startOfToday.getTime();
    });

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        summary: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        startDateTime: toRfc3339WithOffset(newEvent.startDateTime),
        endDateTime: toRfc3339WithOffset(newEvent.endDateTime),
        attendeeEmails: newEvent.attendeeEmails,
      };
      const response = await fetch(API_ENDPOINTS.CALENDAR_EVENTS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const createdEvent = await response.json();
        setEvents([createdEvent, ...events]);
        setShowCreateForm(false);
        setNewEvent({
          title: '',
          description: '',
          location: '',
          startDateTime: '',
          endDateTime: '',
          attendeeEmails: []
        });
        showToast('일정이 추가되었습니다.', 'success');
      } else {
        setError('이벤트 생성에 실패했습니다.');
        showToast('이벤트 생성에 실패했습니다.', 'error');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleCreateWorkoutEvent = async (workoutData: any) => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...workoutData,
        startTime: toRfc3339WithOffset(workoutData.startTime),
        endTime: toRfc3339WithOffset(workoutData.endTime),
      };
      const response = await fetch(API_ENDPOINTS.CALENDAR_WORKOUT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const createdEvent = await response.json();
        setEvents([createdEvent, ...events]);
      } else {
        setError('운동 일정 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) {
      return '날짜 정보 없음';
    }
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        return '날짜 형식 오류';
      }
      return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (error) {
      return '날짜 파싱 오류';
    }
  };

  // 전일 이벤트와 시간 이벤트를 구분하여 처리하는 함수
  const formatEventDateTime = (event: any) => {
    if (!event.startDate) {
      return '날짜 정보 없음';
    }
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    if (isNaN(startDate.getTime())) {
      return '날짜 형식 오류';
    }
    const startFormatted = startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (event.isAllDay) {
      if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
        const endFormatted = endDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return `${startFormatted} ~ ${endFormatted} (하루 종일)`;
      } else {
        return `${startFormatted} (하루 종일)`;
      }
    }
    const startTime = startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      return `${startFormatted} ${startTime} ~ ${endTime}`;
    } else {
      return `${startFormatted} ${startTime}`;
    }
  };

  // 달력 렌더링을 위한 유틸리티 함수들
  const formatLocalYmd = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getEventsForDate = (date: Date) => {
    const userEvents = events.filter(event => {
      // 새로운 백엔드 형식에 맞게 수정
      const eventStart = new Date(event.startDate);
      const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return eventDate.getTime() === targetDate.getTime();
    });
    
    const holidayEvents = holidays.filter(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayDate = new Date(holidayStart.getFullYear(), holidayStart.getMonth(), holidayStart.getDate());
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return holidayDate.getTime() === targetDate.getTime();
    });

    return [...userEvents, ...holidayEvents];
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const days = [];
    
    // 이전 달의 마지막 날들
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay(); // 0: Sunday, 6: Saturday
      const dayEvents = getEventsForDate(date);
      const dayWorkouts = getWorkoutsForDate(date);
      const hasUserEvent = dayEvents.some(e => e.type !== 'holiday');
      const hasHoliday = dayEvents.some(e => e.type === 'holiday');
      const hasWorkout = dayWorkouts.length > 0;
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
      
      const dayClasses = [
        'calendar-day',
        isToday ? 'today' : '',
        isSelected ? 'selected' : '',
        hasUserEvent ? 'has-events' : '',
        hasHoliday ? 'has-holiday' : '',
        hasWorkout ? 'has-workout' : '',
        dayOfWeek === 0 ? 'sunday' : '',
        dayOfWeek === 6 ? 'saturday' : '',
      ].filter(Boolean).join(' ');

      days.push(
        <div 
          key={day} 
          className={dayClasses}
          onClick={() => setSelectedDate(date)}
        >
          <div className="calendar-day-inner">
            <div className="day-number">{day}</div>
            {hasWorkout && <div className="workout-indicator">💪</div>}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      console.log('=== Google Calendar 연동 시작 ===');
      console.log('토큰 존재:', !!token);
      
      const response = await fetch(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('백엔드 응답 상태:', response.status);
      console.log('백엔드 응답 헤더:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('백엔드 에러 응답:', errorText);
        
        let errorMessage = '캘린더 연동을 시작할 수 없습니다.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `서버 오류 (${response.status}): ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('백엔드 응답 데이터:', data);
      
      if (data.success && data.authUrl) {
        console.log('Google OAuth2 URL로 리다이렉트:', data.authUrl);
        showToast('Google 인증 페이지로 이동합니다.', 'info');
        // 백엔드에서 제공한 전체 URL로 리다이렉트
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || '캘린더 연동 URL을 받지 못했습니다.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('캘린더 연동 실패:', errorMessage);
      setError(`캘린더 연동 실패: ${errorMessage}`);
      showToast(`캘린더 연동 실패: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-header-content">
          <button onClick={() => navigate(-1)} className="back-button">←</button>
          <h1>캘린더</h1>
          <div className="calendar-controls">
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >📅 달력</button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >📋 목록</button>
            </div>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="add-event-btn">+ 일정 추가</button>
            <button
              onClick={loadEvents}
              disabled={loading}
              className="sync-btn"
              aria-label="Google 캘린더와 동기화"
              title="Google 캘린더와 동기화"
            >
              {loading ? '동기화 중...' : '동기화'}
            </button>
          </div>
        </div>
      </div>

      {/* 주간 히트맵 */}
      {renderWeeklyHeatmap()}

      {!calendarStatus?.connected && !loading && (
        <div className="calendar-disconnected-banner">
          <h3>Google Calendar 연동</h3>
          <p>운동 일정을 Google Calendar와 동기화하여 편하게 관리하세요.</p>
          <button onClick={handleConnectGoogleCalendar} className="connect-btn">Google Calendar 연동하기</button>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {showCreateForm && (
        <div className="create-event-form">
          <h3>새 일정 추가</h3>
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="일정 제목"
                required
              />
            </div>
            
            <div className="form-group">
              <label>설명</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="일정 설명"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>장소</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="장소"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>시작 시간</label>
                <input
                  type="datetime-local"
                  value={newEvent.startDateTime}
                  onChange={(e) => setNewEvent({...newEvent, startDateTime: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>종료 시간</label>
                <input
                  type="datetime-local"
                  value={newEvent.endDateTime}
                  onChange={(e) => setNewEvent({...newEvent, endDateTime: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                취소
              </button>
              <button type="submit" className="submit-btn">
                일정 추가
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="calendar-content">
        {loading ? (
          <div style={{ padding: 16 }}>
            <div className="skeleton skeleton-bar" style={{ width: '40%', marginBottom: 12 }}></div>
            <div className="skeleton skeleton-card" style={{ height: 220, marginBottom: 12 }}></div>
            <div className="skeleton skeleton-bar" style={{ width: '60%', marginBottom: 8 }}></div>
            <div className="skeleton skeleton-bar" style={{ width: '50%' }}></div>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="calendar-view">
            <div className="calendar-navigation">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="nav-btn"
              >
                ←
              </button>
              <h3 className="current-month">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h3>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="nav-btn"
              >
                →
              </button>
            </div>
            
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                <div className="weekday sunday">일</div>
                <div className="weekday">월</div>
                <div className="weekday">화</div>
                <div className="weekday">수</div>
                <div className="weekday">목</div>
                <div className="weekday">금</div>
                <div className="weekday saturday">토</div>
              </div>
              <div className="calendar-days">
                {renderCalendar()}
              </div>
            </div>
            
            {selectedDate && (
              <div className="selected-date-events">
                <h4>{selectedDate.toLocaleDateString('ko-KR')} 일정</h4>
                
                {/* 운동 기록 */}
                {getWorkoutsForDate(selectedDate).length > 0 && (
                  <div className="workout-section">
                    <h5>💪 운동 기록</h5>
                    {getWorkoutsForDate(selectedDate).map((workout) => (
                      <div key={workout.id} className="workout-item">
                        <div className="workout-header">
                          <h6>{workout.workoutType}</h6>
                          {workout.duration && <span className="duration">{workout.duration}분</span>}
                        </div>
                        <div className="workout-details">
                          {workout.sets && workout.reps && (
                            <span>{workout.sets}세트 × {workout.reps}회</span>
                          )}
                          {workout.weight && <span>{workout.weight}kg</span>}
                          {workout.calories && <span>{workout.calories}kcal</span>}
                        </div>
                        {workout.notes && <p className="workout-notes">{workout.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 캘린더 이벤트 */}
                {getEventsForDate(selectedDate).length > 0 && (
                  <div className="events-section">
                    <h5>📅 일정</h5>
                    {getEventsForDate(selectedDate).map((event) => (
                      <div key={event.id} className={`event-item ${event.type === 'holiday' ? 'holiday-event' : ''}`}>
                        <div className="event-header">
                          <h6>{event.title}</h6>
                          {event.type !== 'holiday' && event.htmlLink && (
                          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="google-link">
                            Google Calendar에서 보기
                          </a>
                          )}
                        </div>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                        {event.location && (
                          <p className="event-location">📍 {event.location}</p>
                        )}
                        <div className="event-time">
                          <span>{formatEventDateTime(event)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {getWorkoutsForDate(selectedDate).length === 0 && getEventsForDate(selectedDate).length === 0 && (
                  <p>해당 날짜에 기록이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="events-list">
            <h3>다가오는 일정</h3>
            {getUpcomingEvents().length === 0 ? (
              <div className="no-events">
                <p>등록된 일정이 없습니다.</p>
                <button onClick={() => setShowCreateForm(true)} className="add-first-event-btn">
                  첫 번째 일정 추가하기
                </button>
              </div>
            ) : (
              getUpcomingEvents().map((event) => (
                <div key={event.id} className={`event-item ${event.type === 'holiday' ? 'holiday-event' : ''}`}>
                  <div className="event-header">
                    <h4>{event.title}</h4>
                    {event.type !== 'holiday' && event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="google-link">
                      Google Calendar에서 보기
                    </a>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  
                  {event.location && (
                    <p className="event-location">📍 {event.location}</p>
                  )}
                  
                  <div className="event-time">
                    <span>{formatEventDateTime(event)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <NavigationBar />
      <ChatButton />
    </div>
  );
};

export default Calendar; 