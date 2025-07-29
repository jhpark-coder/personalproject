import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 백엔드에서 사용자 정보 확인
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('토큰이 없어서 로그인 페이지로 이동');
          navigate('/login');
          return;
        }

        console.log('토큰이 있어서 사용자 정보 확인 중...');
        
        const response = await fetch(API_ENDPOINTS.PROFILE, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log('프로필 응답 상태:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('프로필 응답 데이터:', data);
          
          if (data.success) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              provider: data.user.provider
            });
            setIsLoading(false);
          } else {
            console.log('프로필 조회 실패:', data.message);
            // 인증 실패 시 로그인 페이지로 이동
            localStorage.removeItem('token');
            navigate('/login');
          }
        } else {
          console.log('프로필 응답 실패:', response.status);
          // 응답 실패 시 로그인 페이지로 이동
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('인증 확인 실패:', error);
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // 토큰 삭제
      localStorage.removeItem('token');

      if (response.ok) {
        // 로그인 페이지로 이동
        navigate('/login');
      } else {
        console.error('로그아웃 실패');
        navigate('/login');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard">
        <div className="loading">사용자 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>FitMate</h1>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>안녕하세요, {user.name}님! 👋</h2>
          <p>AI 기반 종합 피트니스 플랫폼에서 건강한 라이프스타일을 시작해보세요.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI 운동 코치</h3>
            <p>개인 맞춤형 운동 루틴과 실시간 피드백을 제공합니다.</p>
            <button className="feature-btn">AI 코치 시작</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏃‍♂️</div>
            <h3>실시간 자세 교정</h3>
            <p>MoveNet AI로 실시간 운동 자세를 분석하고 교정합니다.</p>
            <button 
              className="feature-btn"
              onClick={() => window.location.href = '/pose-detection'}
            >
              자세 교정 시작
            </button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>건강 분석</h3>
            <p>AI가 분석한 건강 데이터와 운동 성과를 확인하세요.</p>
            <button className="feature-btn">분석 보기</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🍎</div>
            <h3>영양 관리</h3>
            <p>AI 기반 영양 분석과 식단 추천을 받아보세요.</p>
            <button className="feature-btn">영양 관리</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💪</div>
            <h3>운동 루틴</h3>
            <p>체력과 목표에 맞는 맞춤형 운동 프로그램을 제공합니다.</p>
            <button className="feature-btn">루틴 보기</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>목표 관리</h3>
            <p>체중, 근력, 지구력 등 다양한 목표를 설정하고 추적하세요.</p>
            <button className="feature-btn">목표 설정</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>웨어러블 연동</h3>
            <p>스마트워치, 밴드와 연동하여 실시간 건강 데이터를 확인하세요.</p>
            <button className="feature-btn">기기 연동</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>커뮤니티</h3>
            <p>같은 목표를 가진 사람들과 소통하고 경쟁해보세요.</p>
            <button className="feature-btn">커뮤니티</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏥</div>
            <h3>건강 체크</h3>
            <p>AI가 분석한 건강 상태와 개선 방안을 확인하세요.</p>
            <button className="feature-btn">건강 체크</button>
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <h4>오늘 운동 시간</h4>
            <p className="stat-value">0분</p>
          </div>
          <div className="stat-card">
            <h4>이번 주 목표 달성률</h4>
            <p className="stat-value">0%</p>
          </div>
          <div className="stat-card">
            <h4>현재 체중</h4>
            <p className="stat-value">--kg</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 