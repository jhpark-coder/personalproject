import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import NavigationBar from '@components/ui/NavigationBar';
import './WorkoutStats.css';
import type { WorkoutStats as WorkoutStatsType } from '../../../types/api';

interface WorkoutStatsProps {
  userId?: number;
}

interface WorkoutStatsData {
  user: {
    id: number;
    name: string;
    email: string;
  };
  recentWorkouts: Array<{
    id: number;
    workoutDate: string;
    workoutType: string;
    duration: number;
    calories: number;
    intensity: number;
    difficulty: string;
    sets?: number;
    reps?: number;
    weight?: number;
    notes?: string;
  }>;
  monthlyWorkoutStats: Array<{
    month: string;
    count: number;
    duration: number;
  }>;
  difficultyDistribution: Array<{
    difficulty: string;
    count: number;
    percentage: number;
  }>;
  workoutTypeStats: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

const WorkoutStats: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<WorkoutStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveDays, setConsecutiveDays] = useState(0);

  // 사용자 ID 가져오기 (JWT 토큰에서 추출)
  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub; // JWT의 sub 필드에 userId가 저장되어 있음
    } catch {
      return null;
    }
  };

  // 대시보드 데이터 로드
  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      loadDashboardData();
    }
  }, []);

  // 연속운동일수 로드
  useEffect(() => {
    const fetchConsecutiveDays = async () => {
      try {
        const userId = getUserId();
        if (!userId) return;
        
        const response = await apiClient.get(`/api/mypage/${userId}/records-room`);
        setConsecutiveDays(response.data.streak?.current || 0);
      } catch (error) {
        console.error('연속운동일수 로드 실패:', handleApiError(error));
      }
    };
    
    fetchConsecutiveDays();
  }, []);

  const loadDashboardData = async () => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 전체 운동 기록을 가져오기 위해 records-room API 사용
      const response = await apiClient.get(`/api/mypage/${userId}/workouts`);
      const data = response.data;
      
      // 전체 운동 기록을 recentWorkouts 형태로 변환하여 호환성 유지
      const transformedData = {
        ...data,
        recentWorkouts: data.workouts || []
      };
      
      setDashboardData(transformedData);
    } catch (error) {
      console.error('운동 통계 로드 실패:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 운동 통계 계산
  const calculateWorkoutStats = () => {
    if (!dashboardData?.recentWorkouts) return { totalWorkouts: 0, avgDuration: 0, totalCalories: 0, consecutiveDays: 0 };
    
    const workouts = dashboardData.recentWorkouts;
    const totalWorkouts = workouts.length;
    const avgDuration = totalWorkouts > 0 ? Math.round(workouts.reduce((sum, w) => sum + (w.duration || 0), 0) / totalWorkouts * 10) / 10 : 0;
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    
    return { totalWorkouts, avgDuration, totalCalories, consecutiveDays };
  };

  // 운동 종류별 차트 데이터 포맷팅
  const formatWorkoutTypeData = () => {
    if (!dashboardData?.workoutTypeStats) return [];
    
    return dashboardData.workoutTypeStats.map((item: { type: string; count: number; percentage: number }) => ({
      name: item.type,
      value: item.count,
      percentage: item.percentage
    }));
  };

  // 난이도별 차트 데이터 포맷팅
  const formatDifficultyData = () => {
    if (!dashboardData?.difficultyDistribution) return [];
    
    const difficultyColors = ['#34C759', '#007AFF', '#FF9500', '#FF3B30', '#AF52DE'];
    
    return dashboardData.difficultyDistribution.map((item: { difficulty: string; count: number; percentage: number }, index: number) => ({
      name: item.difficulty,
      value: item.count,
      percentage: item.percentage,
      color: difficultyColors[index % difficultyColors.length]
    }));
  };

  if (loading) {
    return (
      <div className="workout-stats-container">
        <div className="header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
            <div className="header-title">운동 통계</div>
            <div className="header-actions">
              <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
                ⚙️
              </button>
            </div>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>데이터를 불러오는 중...</p>
        </div>
        <NavigationBar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="workout-stats-container">
        <div className="header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate(-1)}>
              ←
            </button>
            <div className="header-title">운동 통계</div>
            <div className="header-actions">
              <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
                ⚙️
              </button>
            </div>
          </div>
        </div>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-button">
            다시 시도
          </button>
        </div>
        <NavigationBar />
      </div>
    );
  }

  const workoutStats = calculateWorkoutStats();
  const workoutTypeData = formatWorkoutTypeData();
  const difficultyData = formatDifficultyData();

  return (
    <div className="workout-stats-container">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <div className="header-title">운동 통계</div>
          <div className="header-actions">
            <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
              ⚙️
            </button>
          </div>
        </div>
      </div>
      
      <div className="stats-content">
        {/* 요약 통계 */}
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-icon">🏋️‍♂️</div>
            <div className="stat-content">
              <div className="stat-value">{workoutStats.totalWorkouts}</div>
              <div className="stat-label">총 운동 횟수</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{workoutStats.avgDuration}</div>
              <div className="stat-label">평균 운동 시간(분)</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{workoutStats.consecutiveDays}</div>
              <div className="stat-label">연속 운동일</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-value">{workoutStats.totalCalories}</div>
              <div className="stat-label">총 소모 칼로리</div>
            </div>
          </div>
        </div>

        {/* 운동 종류별 통계 */}
        {workoutTypeData.length > 0 && (
          <div className="chart-section">
            <h3>운동 종류별 통계</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workoutTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#007AFF" name="운동 횟수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 난이도별 분포 */}
        {difficultyData.length > 0 && (
          <div className="chart-section">
            <h3>운동 난이도 분포</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 최근 운동 기록 */}
        {dashboardData?.recentWorkouts && dashboardData.recentWorkouts.length > 0 && (
          <div className="recent-workouts">
            <h3>최근 운동 기록</h3>
            <div className="workout-list">
              {dashboardData.recentWorkouts.slice(0, 10).map((workout) => (
                <div key={workout.id} className="workout-item">
                  <div className="workout-date">
                    {new Date(workout.workoutDate).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="workout-info">
                    <div className="workout-type">{workout.workoutType}</div>
                    <div className="workout-details">
                      {workout.duration}분 • {workout.calories}kcal • 난이도: {workout.difficulty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default WorkoutStats; 