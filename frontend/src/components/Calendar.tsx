import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './Calendar.css';

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
}

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
  
  // 달력 UI를 위한 상태들
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // URL 파라미터에서 토큰 확인
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const existingUser = urlParams.get('existingUser');
    const newUser = urlParams.get('newUser');
    const calendarOnly = urlParams.get('calendarOnly');
    const calendarLinked = urlParams.get('calendarLinked');
    
    console.log('=== Calendar 컴포넌트 OAuth2 콜백 처리 ===');
    console.log('URL 파라미터:', window.location.search);
    console.log('Success:', success);
    console.log('Token 존재:', !!token);
    console.log('기존 사용자:', existingUser);
    console.log('새 사용자:', newUser);
    console.log('캘린더 전용:', calendarOnly);
    console.log('캘린더 연동됨:', calendarLinked);
    
    if (success === 'true' && token) {
      // 캘린더 연동 완료 - 토큰 저장
      localStorage.setItem('token', token);
      console.log('캘린더 연동 토큰 저장됨');
      
      // 임시 토큰인 경우 처리
      const tempToken = urlParams.get('tempToken');
      if (tempToken === 'true') {
        console.log('임시 토큰 감지됨 - 기존 사용자 토큰으로 교체 필요');
        // 임시 토큰은 5분 후 만료되므로, 사용자가 다시 로그인하도록 안내
        // 또는 기존 토큰이 있다면 그것을 사용
        const existingToken = localStorage.getItem('existingToken');
        if (existingToken) {
          localStorage.setItem('token', existingToken);
          console.log('기존 토큰으로 복원됨');
        }
      }
      
      // URL에서 파라미터 제거
      navigate('/calendar', { replace: true });
      return;
    }
    
    checkCalendarStatus();
    loadEvents();
  }, [location, navigate]);



  const checkCalendarStatus = async () => {
    try {
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
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.CALENDAR_EVENTS}?maxResults=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('받은 캘린더 이벤트 데이터:', data);
        

        
        setEvents(data);
      } else {
        setError('이벤트를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('캘린더 이벤트 로드 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.CALENDAR_EVENTS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
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
      } else {
        setError('이벤트 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  const handleCreateWorkoutEvent = async (workoutData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.CALENDAR_WORKOUT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workoutData)
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
    console.log('formatDateTime 호출됨:', dateTimeString);
    
    if (!dateTimeString) {
      console.log('dateTimeString이 null 또는 undefined');
      return '날짜 정보 없음';
    }
    
    try {
      const date = new Date(dateTimeString);
      
      // Invalid Date 체크
      if (isNaN(date.getTime())) {
        console.log('Invalid Date 감지:', dateTimeString);
        return '날짜 형식 오류';
      }
      
      const formatted = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log('포맷된 날짜:', formatted);
      return formatted;
    } catch (error) {
      console.error('날짜 파싱 오류:', error, '원본:', dateTimeString);
      return '날짜 파싱 오류';
    }
  };

  // 전일 이벤트와 시간 이벤트를 구분하여 처리하는 함수
  const formatEventDateTime = (event: any) => {
    console.log('formatEventDateTime 호출됨:', event);
    
    // 새로운 백엔드 형식에 맞게 수정
    if (!event.startDate) {
      return '날짜 정보 없음';
    }
    
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    
    if (isNaN(startDate.getTime())) {
      return '날짜 형식 오류';
    }
    
    const startFormatted = startDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // 하루 종일 이벤트인 경우
    if (event.isAllDay) {
      if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
        const endFormatted = endDate.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return `${startFormatted} ~ ${endFormatted} (하루 종일)`;
      } else {
        return `${startFormatted} (하루 종일)`;
      }
    }
    
    // 시간 이벤트인 경우 (isAllDay가 false인 경우)
    const startTime = startDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${startFormatted} ${startTime} ~ ${endTime}`;
    } else {
      return `${startFormatted} ${startTime}`;
    }
  };

  // 달력 렌더링을 위한 유틸리티 함수들
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
    return events.filter(event => {
      // 새로운 백엔드 형식에 맞게 수정
      const eventStart = new Date(event.startDate);
      const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return eventDate.getTime() === targetDate.getTime();
    });
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
      const dayEvents = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="day-number">{day}</span>
          {dayEvents.length > 0 && (
            <div className="event-indicator">
              <span className="event-count">{dayEvents.length}</span>
            </div>
          )}
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
        // 백엔드에서 제공한 전체 URL로 리다이렉트
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || '캘린더 연동 URL을 받지 못했습니다.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('캘린더 연동 실패:', errorMessage);
      setError(`캘린더 연동 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // JWT에서 userId 추출 함수는 더 이상 사용되지 않습니다.
  /*
  function getUserIdFromToken(token: string | null): string {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch {
      return '';
    }
  }
  */

  if (!calendarStatus?.connected) {
    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={() => navigate(-1)} className="back-button">
            ←
          </button>
          <h1>캘린더</h1>
        </div>
        
        <div className="calendar-disconnected">
          <div className="disconnected-content">
            <div className="calendar-icon">📅</div>
            <h3>Google Calendar 연동이 필요합니다</h3>
            <p>운동 일정을 Google Calendar에 추가하려면 Google 계정과 연동해주세요.</p>
            <button onClick={handleConnectGoogleCalendar} className="connect-btn">
              Google Calendar 연동하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← 뒤로
        </button>
        <h1>캘린더</h1>
        <div className="calendar-controls">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 달력
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 목록
            </button>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className="add-event-btn"
          >
            + 일정 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
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
          <div className="loading">일정을 불러오는 중...</div>
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
                <div className="weekday">일</div>
                <div className="weekday">월</div>
                <div className="weekday">화</div>
                <div className="weekday">수</div>
                <div className="weekday">목</div>
                <div className="weekday">금</div>
                <div className="weekday">토</div>
              </div>
              <div className="calendar-days">
                {renderCalendar()}
              </div>
            </div>
            
            {selectedDate && (
              <div className="selected-date-events">
                <h4>{selectedDate.toLocaleDateString('ko-KR')} 일정</h4>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p>해당 날짜에 일정이 없습니다.</p>
                ) : (
                  getEventsForDate(selectedDate).map((event) => (
                    <div key={event.id} className="event-item">
                      <div className="event-header">
                        <h5>{event.title}</h5>
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="google-link">
                          Google Calendar에서 보기
                        </a>
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
        ) : (
          <div className="events-list">
            <h3>다가오는 일정</h3>
            {events.length === 0 ? (
              <div className="no-events">
                <p>등록된 일정이 없습니다.</p>
                <button onClick={() => setShowCreateForm(true)} className="add-first-event-btn">
                  첫 번째 일정 추가하기
                </button>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-header">
                    <h4>{event.title}</h4>
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="google-link">
                      Google Calendar에서 보기
                    </a>
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
    </div>
  );
};

export default Calendar; 