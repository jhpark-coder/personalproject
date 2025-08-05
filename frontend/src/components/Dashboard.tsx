import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import './Dashboard.css';

interface WorkoutData {
  time: string;
  volume: string;
  count: string;
  comparison: string;
  chartData: Array<{week: string, value: number}>;
}

interface GoalData {
  title: string;
  subtitle: string;
  current: number;
  total: number;
  progress: number;
}

interface RecommendationData {
  title: string;
  description: string;
  icon: string;
  tooltip: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [recommendationData, setRecommendationData] = useState<RecommendationData | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 온보딩 완료 여부 확인
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    const currentProvider = localStorage.getItem('currentProvider');
    const providerOnboardingKey = currentProvider ? `onboardingCompleted_${currentProvider}` : null;
    const providerOnboardingCompleted = providerOnboardingKey ? localStorage.getItem(providerOnboardingKey) : null;
    
    console.log('Dashboard - onboardingCompleted:', onboardingCompleted);
    console.log('Dashboard - currentProvider:', currentProvider);
    console.log('Dashboard - providerOnboardingKey:', providerOnboardingKey);
    console.log('Dashboard - providerOnboardingCompleted:', providerOnboardingCompleted);
    
    // 전체 onboarding이 완료되었거나, 현재 provider의 onboarding이 완료된 경우
    if (onboardingCompleted === 'true' || providerOnboardingCompleted === 'true') {
      console.log('onboarding 완료, 대시보드 데이터 로드');
      loadDashboardData();
    } else {
      console.log('onboarding 미완료, onboarding 페이지로 이동');
      navigate('/onboarding/experience');
    }
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('토큰이 없습니다');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // 통합 API 호출 - 하나의 토큰만 사용
      const response = await fetch(API_ENDPOINTS.DASHBOARD_DATA, { headers });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          setGoalData(data.goal);
          setWorkoutData(data.stats);
          setRecommendationData(data.recommendation);
        }
      } else {
        console.error('대시보드 데이터 로드 실패');
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    navigate('/motion');
  };

  const handleCloseRecommendation = () => {
    setShowRecommendation(false);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <div className="app-title">FitMate</div>
          <div className="header-actions">
            <button className="upgrade-button">업그레이드</button>
            <button className="settings-button" onClick={() => navigate('/settings')}>
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content">
        {/* 목표 카드 */}
        <div className="card goal-card">
          <div className="card-header">
            <div className="goal-info">
              <div className="goal-icon">📈</div>
              <div className="goal-text">
                <h3 className="goal-title">{goalData?.title || '목표 설정'}</h3>
                <p className="goal-subtitle">{goalData?.subtitle || '목표를 설정해주세요'}</p>
              </div>
            </div>
            <button className="menu-button">⋯</button>
          </div>
          
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${goalData ? (goalData.current / goalData.total) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {goalData ? `${goalData.current}/${goalData.total}` : '0/0'}
            </div>
          </div>
          
          <button 
            className="button button-primary button-full"
            onClick={handleStartWorkout}
          >
            운동 시작하기
          </button>
        </div>

        {/* 운동량 변화 카드 */}
        <div className="card stats-card">
          <div className="card-header">
            <h3 className="card-title">운동량 변화</h3>
            <button className="arrow-button">→</button>
          </div>
          
          <div className="stats-tabs">
            <button className="tab-button active">시간</button>
            <button className="tab-button">볼륨</button>
            <button className="tab-button">밀도</button>
          </div>
          
          <div className="stats-content">
            <div className="stats-summary">
              <p>이번 주 평균 운동 시간은</p>
              <h2 className="stats-value">{workoutData?.time || '0분'}입니다</h2>
              <p className="stats-comparison">{workoutData?.comparison || '데이터 없음'}</p>
            </div>
            
            <div className="stats-chart">
              <div className="chart-placeholder">
                {workoutData?.chartData.map((data, index) => (
                  <div 
                    key={index}
                    className={`chart-bar ${index === workoutData.chartData.length - 1 ? 'active' : ''}`}
                    style={{ height: `${data.value}%` }}
                  ></div>
                )) || Array(5).fill(0).map((_, index) => (
                  <div key={index} className="chart-bar" style={{ height: '20%' }}></div>
                ))}
              </div>
              <div className="chart-labels">
                <span>~05-03</span>
                <span>~05-10</span>
                <span>~05-17</span>
                <span>~05-24</span>
                <span>~05-31</span>
              </div>
            </div>
          </div>
        </div>

        {/* 추천 루틴 팝업 */}
        {showRecommendation && recommendationData && (
          <div className="recommendation-overlay">
            <div className="recommendation-card">
              <div className="recommendation-header">
                <h3>추천 루틴</h3>
                <button 
                  className="close-button"
                  onClick={handleCloseRecommendation}
                >
                  ✕
                </button>
              </div>
              
              <div className="routine-card">
                <div className="routine-icon">{recommendationData.icon}</div>
                <div className="routine-info">
                  <h4 className="routine-title">{recommendationData.title}</h4>
                  <p className="routine-details">{recommendationData.description}</p>
                </div>
              </div>
              
              <div className="recommendation-tooltip">
                <div className="tooltip-arrow"></div>
                <p>{recommendationData.tooltip}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="navigation-bar">
        <Link to="/" className="nav-item active">
          <div className="nav-icon">🏠</div>
          <span>홈</span>
        </Link>
        <Link to="/calendar" className="nav-item">
          <div className="nav-icon">📅</div>
          <span>캘린더</span>
        </Link>
        <Link to="/programs" className="nav-item">
          <div className="nav-icon">🏋️‍♂️</div>
          <span>라이브러리</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <div className="nav-icon">👤</div>
          <span>마이페이지</span>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard; 