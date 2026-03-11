import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import ChatButton from './ChatButton';
import NavigationBar from './NavigationBar';
import './Dashboard.css';
import TodayChecklist from './TodayChecklist';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import {
  getAuthToken,
  getCurrentProvider,
  isOnboardingCompleted,
  isProviderOnboardingCompleted,
} from '../shared/lib/storage';

// JWT 토큰에서 role을 추출하는 함수
const getRoleFromToken = (): string => {
  try {
    const token = getAuthToken();
    if (!token) return 'ROLE_USER';
    
    // JWT 토큰 디코딩 (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'ROLE_USER';
  } catch (error) {
    console.error('토큰에서 role 추출 실패:', error);
    return 'ROLE_USER';
  }
};

interface WorkoutData {
  time: string;
  calories: string;
  caloriesComparison: string;
  volume: string;
  count: string;
  comparison: string;
  chartData: ChartSeriesDatum[];
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

interface ChartSeriesDatum {
  week: string;
  value: number;
  minutes?: number;
}

interface TooltipPayload {
  payload?: {
    minutes?: number;
  };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [recommendationData, setRecommendationData] = useState<RecommendationData | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // YYYYWW 형태를 'M월 N째주'로 변환
  const formatYearWeekToMonthNthWeek = (yearWeek: string): string => {
    const match = /^\s*(\d{4})(\d{2,3})\s*$/.exec(String(yearWeek));
    if (!match) return yearWeek;
    const year = Number(match[1]);
    const weekOfYear = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(weekOfYear) || weekOfYear <= 0) return yearWeek;

    // 1월 1일부터 (week-1)주 후의 날짜를 기준으로 월/월내 n째주 계산 (일요일 시작 기준)
    const firstJan = new Date(year, 0, 1);
    const approxDate = new Date(firstJan.getTime() + (weekOfYear - 1) * 7 * 24 * 60 * 60 * 1000);

    const monthIndex = approxDate.getMonth(); // 0-11
    const firstOfMonth = new Date(approxDate.getFullYear(), monthIndex, 1);
    const weekOfMonth = Math.ceil((approxDate.getDate() + firstOfMonth.getDay()) / 7);

    return `${monthIndex + 1}월 ${weekOfMonth}째주`;
  };

  // 온보딩 완료 여부 확인
  useEffect(() => {
    const userRole = getRoleFromToken();
    const isAdmin = userRole === 'ROLE_ADMIN';
    
    // 관리자는 온보딩 체크를 건너뛰고 바로 대시보드 데이터 로드
    if (isAdmin) {
      console.log('👨‍💼 관리자: 온보딩 체크 건너뛰고 대시보드 데이터 로드');
      loadDashboardData();
      return;
    }
    
    const localOnboardingCompleted = isOnboardingCompleted();
    const currentProvider = getCurrentProvider();
    const providerOnboardingCompleted = isProviderOnboardingCompleted(currentProvider);

    // 사용자 프로필 완성도 기반 온보딩 완료 판단
    // 주의: Dashboard 내부에서 user 컨텍스트는 직접 접근하지 않으므로, 서버 데이터 로드 전에 보수적으로 로컬 플래그를 우선 고려하되,
    // provider 키가 존재하거나 프로필 완성 추정 시 보정
    const shouldTreatAsCompleted = Boolean(localOnboardingCompleted || providerOnboardingCompleted);

    console.log('Dashboard - localOnboardingCompleted:', localOnboardingCompleted);
    console.log('Dashboard - currentProvider:', currentProvider);
    console.log('Dashboard - providerOnboardingCompleted:', providerOnboardingCompleted);

    if (shouldTreatAsCompleted) {
      console.log('✅ onboarding 완료로 간주, 대시보드 데이터 로드');
      loadDashboardData();
    } else {
      console.log('❌ onboarding 미완료, onboarding 페이지로 이동');
      navigate('/onboarding/experience');
    }
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // JWT 토큰 가져오기
      const token = getAuthToken();
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
        <div style={{ padding: 16 }}>
          <div className="skeleton skeleton-bar" style={{ width: '30%', marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 140, marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 180 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content content-wrapper">
          <div className="app-title">FitMate</div>
          <div className="header-actions">
            <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content content-wrapper">
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
          
          <div className="stats-content">
            <div className="stats-summary">
              <div className="stats-item">
                <p>이번 주 총 운동 시간은</p>
                <h2 className="stats-value">{workoutData?.time || '0분'}</h2>
                <p className="stats-comparison">{workoutData?.comparison || '데이터 없음'}</p>
              </div>
              
              <div className="stats-item">
                <p>이번 주 총 소모 칼로리는</p>
                <h2 className="stats-value calories-value">{workoutData?.calories || '0 kcal'}</h2>
                <p className="stats-comparison">{workoutData?.caloriesComparison || '데이터 없음'}</p>
              </div>
            </div>
            
            <div className="stats-chart">
              {(() => {
                const hasData = !!(workoutData?.chartData && workoutData.chartData.length > 0);
                if (!hasData) {
                  return (
                    <div style={{
                      height: 220,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#80868B'
                    }}>
                      운동 기록이 없습니다.
                    </div>
                  );
                }

                const series = workoutData!.chartData.map((d, i, arr) => ({
                  name: d.week,
                  label: formatYearWeekToMonthNthWeek(d.week),
                  value: d.value,
                  minutes: d.minutes ?? 0,
                  isLast: i === arr.length - 1
                }));

                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#80868B' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }} 
                        formatter={(val: number, _name, payload: TooltipPayload) => {
                          const minutes: number = payload?.payload?.minutes ?? 0;
                          const h = Math.floor(minutes / 60);
                          const m = minutes % 60;
                          const text = h > 0 ? `${h}시간 ${m}분` : `${m}분`;
                          return [text, '운동시간'];
                        }}
                        labelFormatter={(label: string) => label}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {series.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isLast ? 'var(--chart-active)' : 'var(--chart-neutral)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 오늘의 체크리스트 카드 (간결) */}
        <TodayChecklist onStart={() => navigate('/motion')} />

        {/* 추천 루틴 팝업 */}
        {showRecommendation && recommendationData && (
          <div className="recommendation-overlay">
            <div className="recommendation-inner content-wrapper">
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
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />

      {/* 챗봇 버튼 */}
      <ChatButton />
    </div>
  );
};

export default Dashboard; 
