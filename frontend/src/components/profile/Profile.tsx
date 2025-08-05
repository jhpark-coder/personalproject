import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../NavigationBar';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, loading, error, refresh } = useUser();
  const navigate = useNavigate();

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
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>프로필을 불러오는 중...</p>
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

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ←
        </button>
        <h1>내 프로필</h1>
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

        {/* 운동 통계 섹션 */}
        <div className="workout-stats">
          <h3 className="stats-title">운동 통계</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏋️‍♂️</div>
              <div className="stat-content">
                <div className="stat-value">12</div>
                <div className="stat-label">총<br/>운동 횟수</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-value">3.2</div>
                <div className="stat-label">평균<br/>운동 시간</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">85%</div>
                <div className="stat-label">목표<br/>달성률</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-value">7</div>
                <div className="stat-label">연속<br/>운동일</div>
              </div>
            </div>
          </div>
        </div>

        {/* 기본 정보 섹션 (컴팩트하게) */}
        <div className="basic-info">
          <h3 className="info-title">기본 정보</h3>
          <div className="info-grid">
            {user.height && (
              <div className="info-item">
                <span className="info-label">키</span>
                <span className="info-value">{user.height}cm</span>
              </div>
            )}
            
            {user.weight && (
              <div className="info-item">
                <span className="info-label">체중</span>
                <span className="info-value">{user.weight}kg</span>
              </div>
            )}
            
            {user.age && (
              <div className="info-item">
                <span className="info-label">나이</span>
                <span className="info-value">{user.age}세</span>
              </div>
            )}
            
            {user.gender && (
              <div className="info-item">
                <span className="info-label">성별</span>
                <span className="info-value">{getGenderDisplayName(user.gender)}</span>
              </div>
            )}
            
            {user.phoneNumber && (
              <div className="info-item">
                <span className="info-label">번호</span>
                <span className="info-value">{user.phoneNumber}</span>
              </div>
            )}
            
            {user.birthDate && (
              <div className="info-item">
                <span className="info-label">생년월일</span>
                <span className="info-value">{user.birthDate}</span>
              </div>
            )}
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
          <button onClick={handleLogout} className="logout-button">
            로그아웃
          </button>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default Profile; 