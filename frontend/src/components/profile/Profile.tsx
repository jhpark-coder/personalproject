import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import './Profile.css';
import { API_ENDPOINTS } from '../../config/api';

interface WorkoutRecordItem {
  id: number;
  workoutType: string;
  workoutDate: string; // yyyy-MM-dd
  duration?: number;
  calories?: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

const Profile: React.FC = () => {
  const { user, loading, error, refresh } = useUser();
  const navigate = useNavigate();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutRecordItem[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    // 프로필 진입 시 항상 최신 사용자 정보 새로고침
    if (typeof refresh === 'function') {
      refresh();
    }
  }, []);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user?.id) return;
      try {
        setRecentLoading(true);
        const token = localStorage.getItem('token');
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // 오늘 포함 최근 7일
        const toYmd = (d: Date) => d.toISOString().slice(0, 10);
        const url = `${API_ENDPOINTS.MYPAGE_WORKOUTS(String(user.id))}?startDate=${toYmd(start)}&endDate=${toYmd(end)}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token || ''}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('최근 활동 조회 실패');
        const data = await res.json();
        const list = (data?.workouts || data?.content || data || []) as WorkoutRecordItem[];
        // 날짜 내림차순, 최대 5개
        const sorted = [...list].sort((a, b) => (b.workoutDate || '').localeCompare(a.workoutDate || ''));
        setRecentWorkouts(sorted.slice(0, 5));
      } catch (e) {
        console.error(e);
        setRecentWorkouts([]);
      } finally {
        setRecentLoading(false);
      }
    };
    fetchRecent();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('currentProvider');
      localStorage.removeItem('onboardingCompleted');
      
      // onboardingCompleted_로 시작하는 모든 키 제거
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('onboardingCompleted_')) {
          localStorage.removeItem(key);
        }
      });
      
      navigate('/login');
    }
  };

  const getProviderDisplayName = (provider: string) => {
    if (!provider || provider === 'unknown' || provider === 'null') {
      return '로컬';
    }
    
    const providerLower = provider.toLowerCase();
    switch (providerLower) {
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
    if (!name) return '';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
  };

  const getGenderDisplayName = (gender: string) => {
    if (!gender) return '';
    const genderLower = gender.toLowerCase();
    switch (genderLower) {
      case 'male':
        return '남';
      case 'female':
        return '여';
      default:
        return '기타';
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading" style={{ padding: '16px' }}>
          <div className="skeleton skeleton-circle" style={{ width: 80, height: 80, margin: '16px auto' }}></div>
          <div className="skeleton skeleton-bar" style={{ width: '60%', height: 16, margin: '8px auto' }}></div>
          <div className="skeleton skeleton-bar" style={{ width: '40%', height: 12, margin: '8px auto' }}></div>
          <div className="skeleton skeleton-card" style={{ height: 120, margin: '16px 0' }}></div>
          <div className="skeleton skeleton-card" style={{ height: 120 }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>프로필 로드 실패: {error}</p>
          <button onClick={refresh} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>사용자 정보를 찾을 수 없습니다.</p>
          <button onClick={refresh} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const formatKoreanDate = (ymd: string) => {
    try {
      const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10));
      const dt = new Date(y, (m || 1) - 1, d || 1);
      if (isNaN(dt.getTime())) return ymd;
      return dt.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
    } catch {
      return ymd;
    }
  };

  return (
    <div className="profile-container">
      <div className="header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기">
            ←
          </button>
          <div className="header-title">내 프로필</div>
          <div></div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-avatar">
            {user.picture ? (
              <img src={user.picture} alt="프로필 사진" />
            ) : (
              <div className="avatar-placeholder">
                {getInitials(user.name)}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p className="email">{user.email}</p>
            <p className="login-method">
              로그인 방법: {getProviderDisplayName(user.provider || 'local')}
            </p>
          </div>
        </div>

        {/* 기본 정보 섹션 */}
        <div className="basic-info">
          <h3 className="info-title">기본 정보</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">키</span>
              <span className="info-value">{user.height ? `${user.height}cm` : '미입력'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">체중</span>
              <span className="info-value">{user.weight ? `${user.weight}kg` : '미입력'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">나이</span>
              <span className="info-value">{user.age ? `${user.age}세` : '미입력'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">성별</span>
              <span className="info-value">{user.gender ? getGenderDisplayName(user.gender) : '미입력'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">번호</span>
              <span className="info-value">{user.phoneNumber || '미입력'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">생년월일</span>
              <span className="info-value">{user.birthDate || '미입력'}</span>
            </div>
          </div>
        </div>

        {/* PC에서 추가로 보여줄 통계 정보 */}
        <div className="workout-stats pc-only">
          <h3 className="stats-title">최근 활동</h3>
          {recentLoading && (
            <div className="stats-loading">불러오는 중...</div>
          )}
          {!recentLoading && recentWorkouts && recentWorkouts.length > 0 ? (
            <div className="workout-list">
              {recentWorkouts.map((w) => (
                <div key={w.id} className="workout-item">
                  <div className="workout-date">{formatKoreanDate(w.workoutDate)}</div>
                  <div className="workout-info">
                    <div className="workout-type">{w.workoutType}</div>
                    <div className="workout-details">
                      {(w.sets ? `${w.sets}세트` : '')}
                      {(w.reps ? ` × ${w.reps}회` : '')}
                      {(w.weight ? ` · ${w.weight}kg` : '')}
                      {(w.duration ? ` · ${w.duration}분` : '')}
                      {(w.calories ? ` · ${w.calories}kcal` : '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !recentLoading && (
              <div style={{
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: 12,
                color: '#666',
                textAlign: 'center'
              }}>
                최근 일주일 내 기록이 없습니다.
              </div>
            )
          )}
        </div>

        {/* PC에서 추가로 보여줄 목표 정보 */}
        <div className="goals-info pc-only">
          <h3 className="info-title">현재 목표</h3>
          <div style={{
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: 12,
            color: '#666',
            textAlign: 'center'
          }}>
            목표 정보가 없습니다.
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={() => navigate('/analytics/body')} className="action-button analytics-button">
            <span>신체 데이터 분석</span>
            <span>📊</span>
          </button>
          <button onClick={() => navigate('/analytics/stats')} className="action-button analytics-button">
            <span>운동 통계 분석</span>
            <span>📈</span>
          </button>
          <button onClick={() => navigate('/records-room')} className="action-button analytics-button">
            <span>나의 기록실</span>
            <span>🏆</span>
          </button>
          <button onClick={handleLogout} className="logout-button">
            로그아웃
          </button>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
      
      {/* 챗봇 버튼 */}
      <ChatButton />
    </div>
  );
};

export default Profile; 