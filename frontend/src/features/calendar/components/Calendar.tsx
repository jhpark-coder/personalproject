import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import { useUser } from '@context/UserContext';
import NavigationBar from '@components/ui/NavigationBar';
import ChatButton from '@features/chat/components/ChatButton';
import './Calendar.css';
import { useToast } from '@components/ui/ToastProvider';
import { useUnreadNotifications } from '@features/notifications/hooks/useUnreadNotifications';
import { io } from 'socket.io-client';

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
  recurrence?: string;
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
  const { unreadCount } = useUnreadNotifications(user?.id);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false); // New state for edit form
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); // New state for event being edited
  const [recurrence, setRecurrence] = useState<string>('NONE'); // New state for recurrence in edit form
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  
  // 운동 정보 로드
  const [exerciseList, setExerciseList] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  
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
  const [totalStreak, setTotalStreak] = useState(0);

  // ==================== useEffect 리팩토링 ====================

  // 1. 메인 데이터 로딩 useEffect
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        // 필수 데이터 로딩: 운동 목록, 운동 기록, 연속 운동일수
        await Promise.all([
          loadExercises(),
          loadWorkouts(),
          fetchTotalStreak()
        ]);

        // 캘린더 연동 상태 확인
        const status = await checkCalendarStatus();

        // 연동 콜백 처리
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.get('linked') === 'success') {
          navigate('/calendar', { replace: true });
          if (status?.connected) {
            showToast('🎉 Google Calendar 연동이 완료되었습니다!', 'success');
          } else {
            showToast('❌ 캘린더 연동에 실패했습니다. 다시 시도해주세요.', 'error');
          }
        }
        
        // 연동 상태에 따라 이벤트 로드
        if (status?.connected) {
          await loadEvents(false, null);
        }
      } catch (error) {
        console.error("캘린더 초기화 실패:", handleApiError(error));
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 2. 무한 스크롤을 위한 useEffect
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100 &&
        hasMoreEvents &&
        !loading
      ) {
        loadEvents(true, nextPageToken);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreEvents, loading, nextPageToken]); // 의존성 유지

  // 3. 공휴일 로딩을 위한 useEffect
  useEffect(() => {
    const year = currentDate.getFullYear();
    if (year !== loadedHolidayYear) {
      loadHolidays(year);
      setLoadedHolidayYear(year);
    }
  }, [currentDate, loadedHolidayYear]); // 의존성 유지

  // 4. 연동 콜백 후 상태가 바로 반영되지 않는 경우를 대비해 짧게 폴링
  useEffect(() => {
    // 연동 콜백 후 상태가 바로 반영되지 않는 경우를 대비해 짧게 폴링
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('linked') === 'success') {
        let attempts = 0;
        const maxAttempts = 8; // 최대 8초 정도 폴링
        const interval = setInterval(async () => {
          attempts += 1;
          const status = await checkCalendarStatus();
          if (status?.connected || attempts >= maxAttempts) {
            clearInterval(interval);
            // URL 정리
            params.delete('linked');
            const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
            window.history.replaceState({}, '', cleaned);
            // 연결되면 이벤트 로드
            if (status?.connected) {
              loadEvents(false);
            }
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    } catch {}
  }, []);

  // =========================================================

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmails: [] as string[],
    recurrence: 'NONE'
  });
  
  const [newWorkout, setNewWorkout] = useState({
    workoutType: '',
    workoutDate: '',
    duration: '',
    sets: '',
    reps: '',
    weight: ''
  });

  const loadExercises = async () => {
    try {
      const response = await apiClient.get('/api/exercise-information?size=30');
      setExerciseList(response.data.content || []);
    } catch (error) {
      console.error('운동 정보 로드 실패:', handleApiError(error));
    }
  };

  // 연속운동일수 로드
  const fetchTotalStreak = async () => {
    try {
      const userId = getUserId();
      if (!userId) return;
      
      const response = await apiClient.get(`/api/mypage/${userId}/records-room`);
      const data = response.data;
      setTotalStreak(data.streak?.current || 0);
    } catch (error) {
      console.error('연속운동일수 로드 실패:', handleApiError(error));
    }
  };

  // 운동 기록 로드 (기존 로직 유지)
  const loadWorkouts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userId = getUserId();
      if (!userId) return;

      // 운동 기록 로드 시작

      // 전체 운동 기록을 가져오기 위해 workouts API 사용
      const response = await apiClient.get(`/api/mypage/${userId}/workouts`);
      const data = response.data;
      
      // 운동 기록 API 응답 받음
      
      // workouts 배열이 직접 반환되는 경우와 success 필드가 있는 경우 모두 처리
      let workoutsArray = [];
      if (data && data.success && data.workouts) {
        workoutsArray = data.workouts;
      } else if (data && Array.isArray(data.workouts)) {
        workoutsArray = data.workouts;
      } else if (data && Array.isArray(data)) {
        workoutsArray = data;
      }
      
      // 운동 기록 처리 완료
      
      setWorkouts(workoutsArray);
      
      // 오늘 운동 기록 확인
      const today = new Date();
      const todayStr = formatLocalYmd(today);
      const todayWorkouts = workoutsArray.filter((w: any) => w.workoutDate === todayStr);
      // 오늘 운동 기록 확인 완료
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
      const hasWorkout = workouts.some(workout => {
        // 날짜 형식 정규화 (시간 부분 제거)
        let normalizedWorkoutDate = workout.workoutDate;
        if (typeof workout.workoutDate === 'string') {
          normalizedWorkoutDate = workout.workoutDate.split('T')[0];
        }
        return normalizedWorkoutDate === dateStr;
      });
      
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
    
    // 이번 주 총 운동일수
    const workoutDays = workouts.filter(workout => {
      // 날짜 형식 정규화 (시간 부분 제거)
      let normalizedWorkoutDate = workout.workoutDate;
      if (typeof workout.workoutDate === 'string') {
        normalizedWorkoutDate = workout.workoutDate.split('T')[0];
      }
      
      const workoutDate = new Date(normalizedWorkoutDate);
      const weekStart = new Date(startOfWeek);
      const weekEnd = new Date(startOfWeek);
      weekEnd.setDate(weekStart.getDate() + 6);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    }).length;

    // 이번 주 내에서의 연속 운동일수 계산
    let weekStreak = 0;
    const weekWorkoutSet = new Set();
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalYmd(date);
      if (workouts.some(workout => {
        // 날짜 형식 정규화 (시간 부분 제거)
        let normalizedWorkoutDate = workout.workoutDate;
        if (typeof workout.workoutDate === 'string') {
          normalizedWorkoutDate = workout.workoutDate.split('T')[0];
        }
        return normalizedWorkoutDate === dateStr;
      })) {
        weekStreak++;
        weekWorkoutSet.add(dateStr);
      } else {
        // 이번 주 내에서 끊어지면 연속 카운트 중단
        break;
      }
    }

    // 백엔드에서 계산된 전체 누적 연속 운동일수 사용 (컴포넌트 최상위에서 로드됨)
    
    return (
      <div className="weekly-heatmap">
        <div className="heatmap-header">
          <h4>이번 주 운동 현황</h4>
          <div className="workout-stats">
            <span className="week-streak">이번 주: {weekStreak}일</span>
            <span className="total-streak">누적: {totalStreak}일 연속!</span>
          </div>
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
    // 특정 날짜 운동 기록 검색
    
    const filteredWorkouts = workouts.filter(workout => {
      const workoutDate = workout.workoutDate;
      // 운동 날짜 확인
      
      // 날짜 형식 정규화 (시간 부분 제거)
      let normalizedWorkoutDate = workoutDate;
      if (typeof workoutDate === 'string') {
        // "2024-01-15T00:00:00" -> "2024-01-15"
        normalizedWorkoutDate = workoutDate.split('T')[0];
      }
      
      const isMatch = normalizedWorkoutDate === dateStr;
      // 날짜 비교 수행
      
      return isMatch;
    });
    
    // 운동 기록 필터링 완료
    return filteredWorkouts;
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
      if (!token) {
        const status = { connected: false, message: '로그인이 필요합니다.' };
        setCalendarStatus(status);
        return status;
      }
      
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_STATUS);
      const data = response.data;
      
      setCalendarStatus(data);
      return data;
    } catch (error) {
      const errorMessage = handleApiError(error);
      const status = { 
        connected: false, 
        message: '캘린더 상태 확인 중 오류가 발생했습니다.' 
      };
      if (errorMessage === 'TOKEN_REFRESH_FAILED') {
        showToast('Google Calendar 인증이 만료되었습니다. 다시 연동해주세요.', 'error');
        status.message = '인증이 만료되었습니다.';
      } else {
        console.error('캘린더 상태 확인 실패:', errorMessage);
      }
      setCalendarStatus(status);
      return status;
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (loadMore = false, pageToken: string | null = null) => {
    try {
      if (!calendarStatus?.connected) return;

      setLoading(true);
      
      const params: any = { maxResults: 20 };
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_EVENTS, { params });
      const data = response.data;
      
      if (data && data.events) {
        const newEvents = data.events.map((e: any) => ({ ...e, type: 'user' }));
        if (loadMore) {
          setEvents(prev => [...prev, ...newEvents]);
        } else {
          setEvents(newEvents);
        }
        setNextPageToken(data.nextPageToken || null);
        setHasMoreEvents(!!data.nextPageToken);
      } else {
        setHasMoreEvents(false);
      }

    } catch (error) {
        const errorMessage = handleApiError(error);
        if (errorMessage === 'TOKEN_REFRESH_FAILED') {
            showToast('Google Calendar 인증이 만료되었습니다. 다시 연동해주세요.', 'error');
            setError('인증이 만료되었습니다.');
        } else {
            console.error('이벤트 로드 실패:', errorMessage);
            setError('네트워크 오류가 발생했습니다.');
        }
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
        recurrence: newEvent.recurrence === 'NONE' ? null : newEvent.recurrence, // Send recurrence
      };
      const response = await apiClient.post(API_ENDPOINTS.CALENDAR_EVENTS, payload);
      const createdEvent = response.data;
      setEvents([createdEvent, ...events]);
      setShowCreateForm(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        startDateTime: '',
        endDateTime: '',
        attendeeEmails: [],
        recurrence: 'NONE'
      });
      showToast('일정이 추가되었습니다.', 'success');
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage || '네트워크 오류가 발생했습니다.');
      showToast(errorMessage || '네트워크 오류가 발생했습니다.', 'error');
    }
  };

  // 운동 종류 선택 시 MET 값 설정
  const handleWorkoutTypeChange = (workoutType: string) => {
    setNewWorkout({...newWorkout, workoutType});
    const exercise = exerciseList.find(ex => ex.name === workoutType || ex.koreanName === workoutType);
    setSelectedExercise(exercise);
  };
  
  // 칼로리 및 강도 자동 계산
  const calculateWorkoutData = () => {
    if (!selectedExercise || !newWorkout.duration) {
      return { calories: 0, intensity: 5, difficulty: 'MODERATE' };
    }
    
    const mets = selectedExercise.mets || 5.0;
    const duration = parseInt(newWorkout.duration);
    const userWeight = 70; // 기본 체중 70kg (추후 사용자 프로필에서 가져오기)
    
    // 칼로리 계산: MET × 체중(kg) × 시간(시간 단위)
    const durationHours = duration / 60;
    const calories = Math.round(mets * userWeight * durationHours);
    
    // 운동 강도 (MET 값에 따라 1-10 스케일)
    let intensity;
    if (mets < 3.0) {
      intensity = Math.min(3, Math.max(1, Math.round(mets)));
    } else if (mets < 6.0) {
      intensity = Math.min(6, Math.max(4, Math.round(mets)));
    } else {
      intensity = Math.min(10, Math.max(7, Math.round(mets)));
    }
    
    // 난이도 설정
    let difficulty;
    if (mets < 3.0) {
      difficulty = 'EASY';
    } else if (mets < 6.0) {
      difficulty = 'MODERATE';
    } else {
      difficulty = 'HARD';
    }
    
    return { calories, intensity, difficulty };
  };

  // 운동 기록 추가 함수
  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userId = getUserId();
      if (!userId) {
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      // 운동 데이터 자동 계산
      const { calories, intensity, difficulty } = calculateWorkoutData();
      
      // 운동 기록 데이터 준비
      const workoutRecord = {
        workoutDate: newWorkout.workoutDate,
        workoutType: newWorkout.workoutType,
        duration: newWorkout.duration ? parseInt(newWorkout.duration) : null,
        calories: calories,
        sets: newWorkout.sets ? parseInt(newWorkout.sets) : null,
        reps: newWorkout.reps ? parseInt(newWorkout.reps) : null,
        weight: newWorkout.weight ? parseFloat(newWorkout.weight) : null,
        intensity: intensity,
        difficulty: difficulty,
        notes: selectedExercise ? `MET: ${selectedExercise.mets}, 자동 계산된 칼로리: ${calories} kcal` : null
      };

      // 운동 기록 생성 중

      const response = await apiClient.post(`/api/workout-records/${userId}`, workoutRecord);
      const savedWorkout = response.data;
      // 운동 기록 저장 완료
      
      // 폼 닫기 및 초기화
      setShowWorkoutForm(false);
      setNewWorkout({
        workoutType: '',
        workoutDate: '',
        duration: '',
        sets: '',
        reps: '',
        weight: ''
      });
      setSelectedExercise(null);
      
      // 운동 기록 새로고침
      loadWorkouts();
      
      showToast('운동 기록이 추가되었습니다!', 'success');
    } catch (error) {
      console.error('운동 기록 추가 오류:', handleApiError(error));
      showToast(handleApiError(error) || '네트워크 오류가 발생했습니다.', 'error');
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
      const response = await apiClient.post(API_ENDPOINTS.CALENDAR_WORKOUT, payload);
      const createdEvent = response.data;
      setEvents([createdEvent, ...events]);
    } catch (error) {
      setError(handleApiError(error) || '네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const payload = {
        summary: editingEvent.title,
        description: editingEvent.description,
        location: editingEvent.location,
        startDateTime: toRfc3339WithOffset(editingEvent.startDate),
        endDateTime: toRfc3339WithOffset(editingEvent.endDate),
        // attendeeEmails: editingEvent.attendeeEmails, // Assuming attendees are not editable for simplicity
        recurrence: recurrence === 'NONE' ? null : recurrence, // Send recurrence
      };
      const response = await apiClient.put(API_ENDPOINTS.CALENDAR_UPDATE_EVENT(editingEvent.id), payload);
      const updatedEvent = response.data;
      setEvents((prevEvents) =>
        prevEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
      );
      setShowEditForm(false);
      setEditingEvent(null);
      showToast('일정이 수정되었습니다.', 'success');
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage || '네트워크 오류가 발생했습니다.');
      showToast(errorMessage || '네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await apiClient.delete(API_ENDPOINTS.CALENDAR_DELETE_EVENT(eventId));
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
      showToast('일정이 삭제되었습니다.', 'success');
      // If the deleted event was the selected one, clear selected date
      if (selectedDate && getEventsForDate(selectedDate).length === 0) {
        setSelectedDate(null);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage || '네트워크 오류가 발생했습니다.');
      showToast(errorMessage || '네트워크 오류가 발생했습니다.', 'error');
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
        const message = '로그인이 필요합니다. 다시 로그인해주세요.';
        setError(message);
        showToast(message, 'error');
        navigate('/login');
        return;
      }

      console.log('=== Google Calendar 연동 시작 ===');
      console.log('토큰 존재:', !!token);
      console.log('요청 URL:', API_ENDPOINTS.CALENDAR_AUTH_GOOGLE);
      
      // 세션 상태 확인을 위해 현재 사용자 정보 저장
      const currentUser = user?.id || getUserId();
      if (!currentUser) {
        const message = '사용자 정보를 찾을 수 없습니다.';
        setError(message);
        showToast(message, 'error');
        return;
      }
      
      console.log('현재 사용자 ID:', currentUser);
      
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE);
      const data = response.data;
      
      console.log('백엔드 응답 데이터:', data);
      
      if (data.success && data.authUrl) {
        console.log('Google OAuth2 URL로 리다이렉트:', data.authUrl);
        showToast('Google Calendar 인증 페이지로 이동합니다.', 'info');
        
        // ✅ 수정: 캘린더 연동은 새로운 JWT 토큰을 받아야 하므로 기존 토큰 보존 불필요
        // OAuth2 콜백에서 새 토큰(Google 정보 포함)을 받게 됨
        localStorage.setItem('calendarLinkingInProgress', 'true');
        
        console.log('🚀 Google OAuth 페이지로 이동:', data.authUrl);
        // 백엔드에서 제공한 전체 URL로 리다이렉트
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || '캘린더 연동 URL을 받지 못했습니다.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      if (errorMessage === 'TOKEN_REFRESH_FAILED') {
        showToast('Google Calendar 인증이 만료되었습니다. 다시 연동해주세요.', 'error');
        setError('인증이 만료되었습니다.');
      } else {
        console.error('캘린더 연동 실패:', errorMessage);
        setError(`캘린더 연동 실패: ${errorMessage}`);
        showToast(`캘린더 연동 실패: ${errorMessage}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calendar-container">
      <div className="header">
        <div className="header-content content-wrapper">
          <div className="header-title">캘린더</div>
          <div className="header-actions">
            <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
              ⚙️
            </button>
          </div>
        </div>
      </div>
      {!calendarStatus?.connected && !loading && (
        <div className="calendar-disconnected-banner">
          <h3>🗓️ Google Calendar 연동</h3>
          <p>운동 일정을 Google Calendar와 동기화하여 편하게 관리하세요.</p>
          <div className="calendar-benefits">
            <ul>
              <li>✅ 운동 일정 자동 동기화</li>
              <li>✅ Google Calendar에서 일정 관리</li>
              <li>✅ 다른 기기에서도 일정 확인</li>
            </ul>
          </div>
          <button 
            onClick={handleConnectGoogleCalendar} 
            className="connect-btn"
            disabled={loading}
          >
            {loading ? '연동 중...' : 'Google Calendar 연동하기'}
          </button>
          {calendarStatus?.message && (
            <p className="calendar-status-message">{calendarStatus.message}</p>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {/* 주간 히트맵 */}
      {renderWeeklyHeatmap()}
      
      {showWorkoutForm && (
        <div className="create-event-form">
          <h3>수동 운동 기록 추가</h3>
          <form onSubmit={handleCreateWorkout}>
            <div className="form-group">
              <label>운동 종류 *</label>
              <select
                value={newWorkout.workoutType}
                onChange={(e) => handleWorkoutTypeChange(e.target.value)}
                required
              >
                <option value="">운동을 선택하세요</option>
                {exerciseList.map((exercise) => (
                  <option key={exercise.id} value={exercise.koreanName || exercise.name}>
                    {exercise.koreanName || exercise.name}
                    {exercise.mets && ` (MET: ${exercise.mets})`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>운동 날짜 *</label>
              <input
                type="date"
                value={newWorkout.workoutDate}
                onChange={(e) => setNewWorkout({...newWorkout, workoutDate: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>운동 시간 (분)</label>
              <input
                type="number"
                value={newWorkout.duration}
                onChange={(e) => setNewWorkout({...newWorkout, duration: e.target.value})}
                placeholder="30"
                min="1"
              />
              {selectedExercise && newWorkout.duration && (
                <small style={{color: '#666', display: 'block', marginTop: '4px'}}>
                  예상 칼로리: {calculateWorkoutData().calories} kcal
                </small>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>세트 수</label>
                <input
                  type="number"
                  value={newWorkout.sets}
                  onChange={(e) => setNewWorkout({...newWorkout, sets: e.target.value})}
                  placeholder="3"
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label>회수</label>
                <input
                  type="number"
                  value={newWorkout.reps}
                  onChange={(e) => setNewWorkout({...newWorkout, reps: e.target.value})}
                  placeholder="15"
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label>무게 (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newWorkout.weight}
                  onChange={(e) => setNewWorkout({...newWorkout, weight: e.target.value})}
                  placeholder="50"
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setShowWorkoutForm(false)} className="cancel-btn">
                취소
              </button>
              <button type="submit" className="submit-btn">
                운동 기록 추가
              </button>
            </div>
          </form>
        </div>
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
            
            <div className="form-group">
              <label>반복</label>
              <select
                value={newEvent.recurrence}
                onChange={(e) => setNewEvent({...newEvent, recurrence: e.target.value})}
              >
                <option value="NONE">반복 안 함</option>
                <option value="DAILY">매일</option>
                <option value="WEEKLY">매주</option>
                <option value="MONTHLY">매월</option>
              </select>
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

      {showEditForm && editingEvent && (
        <div className="create-event-form">
          <h3>일정 수정</h3>
          <form onSubmit={handleUpdateEvent}>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                placeholder="일정 제목"
                required
              />
            </div>
            
            <div className="form-group">
              <label>설명</label>
              <textarea
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                placeholder="일정 설명"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>장소</label>
              <input
                type="text"
                value={editingEvent.location || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                placeholder="장소"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>시작 시간</label>
                <input
                  type="datetime-local"
                  value={editingEvent.startDate.substring(0, 16)} // Format for datetime-local input
                  onChange={(e) => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>종료 시간</label>
                <input
                  type="datetime-local"
                  value={editingEvent.endDate.substring(0, 16)} // Format for datetime-local input
                  onChange={(e) => setEditingEvent({ ...editingEvent, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>반복</label>
              <select
                value={editingEvent.recurrence}
                onChange={(e) => setEditingEvent({ ...editingEvent, recurrence: e.target.value })}
              >
                <option value="NONE">반복 안 함</option>
                <option value="DAILY">매일</option>
                <option value="WEEKLY">매주</option>
                <option value="MONTHLY">매월</option>
              </select>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setShowEditForm(false)} className="cancel-btn">
                취소
              </button>
              <button type="submit" className="submit-btn">
                일정 수정
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="calendar-content">
        {/* 동작 버튼 + 탭: 상단 배치 */}
        <div className="calendar-toolbar">
          <div className="toolbar-actions">
            <button onClick={() => setShowWorkoutForm(!showWorkoutForm)} className="add-event-btn">+ 운동 기록 추가</button>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="add-event-btn" style={{marginLeft: '8px', fontSize: '0.9em'}}>+ 일정 추가</button>
            <button
              onClick={() => { loadEvents(false, null); loadWorkouts(); }}
              disabled={loading}
              className="sync-btn"
              aria-label="Google 캘린더와 운동 기록 동기화"
              title="Google 캘린더와 운동 기록 동기화"
            >
              {loading ? '동기화 중...' : '동기화'}
            </button>
          </div>
          <div className="calendar-tabs">
            <button 
              className={`tab-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >달력</button>
            <button 
              className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >일정</button>
          </div>
        </div>
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
                          {event.type !== 'holiday' && (
                            <div className="event-actions">
                              <button onClick={() => { setEditingEvent(event); setShowEditForm(true); }} className="edit-btn">수정</button>
                              <button onClick={() => handleDeleteEvent(event.id)} className="delete-btn">삭제</button>
                            </div>
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
            {events.length === 0 && !loading ? (
              <div className="no-events">
                <p>등록된 일정이 없습니다.</p>
                <button onClick={() => setShowCreateForm(true)} className="add-first-event-btn">
                  첫 번째 일정 추가하기
                </button>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className={`event-item ${event.type === 'holiday' ? 'holiday-event' : ''}`}>
                  <div className="event-header">
                    <h4>{event.title}</h4>
                    {event.type !== 'holiday' && event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="google-link">
                      Google Calendar에서 보기
                    </a>
                    )}
                    {event.type !== 'holiday' && ( // Only show edit/delete for user events
                      <div className="event-actions">
                        <button onClick={() => { setEditingEvent(event); setShowEditForm(true); }} className="edit-btn">수정</button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="delete-btn">삭제</button>
                      </div>
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
            {hasMoreEvents && !loading && (
              <button onClick={() => loadEvents(true, nextPageToken)} className="load-more-btn">
                더 많은 일정 불러오기
              </button>
            )}
          </div>
        )}
      </div>
      <NavigationBar unreadCount={unreadCount} />
      <ChatButton />
    </div>
  );
};

export default Calendar; 