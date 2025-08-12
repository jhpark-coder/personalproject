import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS } from '../../config/api';
import NavigationBar from '../NavigationBar';
import './BodyData.css';
import { useToast } from '../ToastProvider';

// 소수점 1자리 반올림 유틸
const round1 = (v: number) => Math.round(v * 10) / 10;

interface BodyRecord {
  id: number;
  measureDate: string;
  weight: number;
  bodyFatPercentage: number;
  muscleMass: number;
  basalMetabolicRate: number;
  bodyWaterPercentage: number;
  boneMass: number;
  visceralFatLevel: number;
  notes?: string;
}

interface TrendsData {
  weightTrend: any[];
  bodyFatTrend: any[];
  muscleMassTrend: any[];
}

const BodyData: React.FC = () => {
  const navigate = useNavigate();
  const [activeTabs, setActiveTabs] = useState({
    muscle: 'daily',
    bodyFat: 'daily', 
    weight: 'daily'
  });
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

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

  // 신체 변화 추이 데이터 로드
  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      // 초기 로드 시 모든 섹션의 기본 기간(daily) 데이터 로드
      loadTrendsData();
    }
  }, []);

  // 탭 변경 핸들러
  const handleTabChange = (section: 'muscle' | 'bodyFat' | 'weight', period: 'daily' | 'weekly' | 'monthly') => {
    setActiveTabs(prev => ({
      ...prev,
      [section]: period
    }));
    
    // 탭 변경 시 해당 섹션의 데이터만 다시 로드
    loadSectionData(section, period);
  };

  // 특정 섹션의 데이터만 로드하는 함수
  const loadSectionData = async (section: 'muscle' | 'bodyFat' | 'weight', period: 'daily' | 'weekly' | 'monthly') => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const endDate = new Date();
      let startDate = new Date();
      
      // 기간별로 다른 날짜 범위 설정
      switch (period) {
        case 'daily':
          startDate = new Date(endDate.getTime() - 4 * 24 * 60 * 60 * 1000); // 최근 5일
          break;
        case 'weekly':
          startDate = new Date(endDate.getTime() - 27 * 24 * 60 * 60 * 1000); // 최근 4주
          break;
        case 'monthly':
          startDate = new Date(endDate.getTime());
          startDate.setMonth(endDate.getMonth() - 2); // 최근 3개월
          break;
        default:
          startDate = new Date(endDate.getTime() - 4 * 24 * 60 * 60 * 1000);
      }

      // 날짜 유효성 검사
      if (startDate > endDate) {
        console.error('시작 날짜가 종료 날짜보다 늦습니다:', startDate, endDate);
        setError('날짜 범위가 잘못되었습니다.');
        return;
      }

      console.log(`=== ${section} 섹션 ${period} 데이터 로드 ===`);
      console.log('userId:', userId);
      console.log('startDate:', startDate.toISOString().split('T')[0]);
      console.log('endDate:', endDate.toISOString().split('T')[0]);
      console.log('period:', period);

      const response = await fetch(
        `${API_ENDPOINTS.MYPAGE_TRENDS(userId)}?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 응답 에러:', errorText);
        throw new Error(`데이터를 불러올 수 없습니다. (${response.status}: ${response.statusText})`);
      }

      const data = await response.json();
      console.log(`=== ${section} 섹션 응답 데이터 ===`);
      console.log('data:', data);

      // 기존 데이터와 병합 (해당 섹션만 업데이트)
      setTrendsData(prev => {
        if (!prev) return data;
        
        const updatedData = { ...prev };
        if (section === 'muscle' && data.muscleMassTrend) {
          updatedData.muscleMassTrend = data.muscleMassTrend;
        }
        if (section === 'bodyFat' && data.bodyFatTrend) {
          updatedData.bodyFatTrend = data.bodyFatTrend;
        }
        if (section === 'weight' && data.weightTrend) {
          updatedData.weightTrend = data.weightTrend;
        }
        
        return updatedData;
      });
    } catch (error) {
      console.error(`${section} 섹션 데이터 로드 실패:`, error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // 기간별 데이터 필터링
  const getFilteredData = (trendData: any[], period: string) => {
    if (!trendData || trendData.length === 0) {
      return [];
    }
    
    // 백엔드에서 이미 정확한 개수로 보내주므로 그대로 사용
    return trendData;
  };

  // 일별 데이터 생성 (최근 5일간)
  const generateDailyData = (data: any[], days: number) => {
    const dailyData: any[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const dateString = targetDate.toISOString().split('T')[0];
      
      // 해당 날짜의 데이터 찾기
      const dayData = data.find(item => {
        const itemDate = new Date(item[0]);
        return itemDate.toDateString() === targetDate.toDateString();
      });
      
      if (dayData) {
        dailyData.push([dateString, parseFloat(dayData[1])]);
      } else {
        // 데이터가 없으면 0으로 설정
        dailyData.push([dateString, 0]);
      }
    }
    
    return dailyData;
  };

  // 주간 평균 계산
  const calculateWeeklyAverages = (data: any[], weeks: number) => {
    const weeklyData: any[] = [];
    const now = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekData = data.filter(item => {
        const itemDate = new Date(item[0]);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });
      
      if (weekData.length > 0) {
        const average = weekData.reduce((sum, item) => sum + parseFloat(item[1]), 0) / weekData.length;
        weeklyData.push([weekStart.toISOString().split('T')[0], average]);
      } else {
        // 데이터가 없는 주는 0으로 설정
        weeklyData.push([weekStart.toISOString().split('T')[0], 0]);
      }
    }
    
    return weeklyData;
  };

  // 월간 평균 계산
  const calculateMonthlyAverages = (data: any[], months: number) => {
    const monthlyData: any[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const monthData = data.filter(item => {
        const itemDate = new Date(item[0]);
        return itemDate >= monthStart && itemDate <= monthEnd;
      });
      
      if (monthData.length > 0) {
        const average = monthData.reduce((sum, item) => sum + parseFloat(item[1]), 0) / monthData.length;
        monthlyData.push([monthStart.toISOString().split('T')[0], average]);
      } else {
        // 데이터가 없는 달은 0으로 설정
        monthlyData.push([monthStart.toISOString().split('T')[0], 0]);
      }
    }
    
    return monthlyData;
  };

  const loadTrendsData = async () => {
    const userId = getUserId();
    if (!userId) {
      setError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 현재 선택된 기간에 따라 다른 API 호출
      const currentPeriod = activeTabs.muscle || activeTabs.bodyFat || activeTabs.weight || 'daily';
      
      const endDate = new Date();
      let startDate = new Date();
      
      // 기간별로 다른 날짜 범위 설정
      switch (currentPeriod) {
        case 'daily':
          startDate = new Date(endDate.getTime() - 4 * 24 * 60 * 60 * 1000); // 최근 5일
          break;
        case 'weekly':
          startDate = new Date(endDate.getTime() - 27 * 24 * 60 * 60 * 1000); // 최근 4주
          break;
        case 'monthly':
          startDate = new Date(endDate.getTime());
          startDate.setMonth(endDate.getMonth() - 2); // 최근 3개월
          break;
        default:
          startDate = new Date(endDate.getTime() - 4 * 24 * 60 * 60 * 1000);
      }

      // 날짜 유효성 검사
      if (startDate > endDate) {
        console.error('시작 날짜가 종료 날짜보다 늦습니다:', startDate, endDate);
        setError('날짜 범위가 잘못되었습니다.');
        setLoading(false);
        return;
      }

      // 날짜 형식 검증 및 로깅
      console.log('=== API 요청 정보 ===');
      console.log('userId:', userId);
      console.log('startDate:', startDate.toISOString().split('T')[0]);
      console.log('endDate:', endDate.toISOString().split('T')[0]);
      console.log('period:', currentPeriod);

      const response = await fetch(
        `${API_ENDPOINTS.MYPAGE_TRENDS(userId)}?period=${currentPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('=== 응답 상태 ===');
      console.log('status:', response.status);
      console.log('statusText:', response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`데이터를 불러올 수 없습니다. (${response.status}) ${errorText?.slice(0,120)}`);
      }

      const data = await response.json();
      console.log('=== 응답 데이터 ===');
      console.log('data:', data);
      setTrendsData(data);
      showToast('신체 데이터 업데이트 완료', 'success');
    } catch (error) {
      console.error('신체 데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      showToast('데이터 로드에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 차트 데이터 포맷팅
  const formatChartData = (trendData: any[], key: string, period: string) => {
    // 주차 문자열(YYYY-Www)을 "8월 1주" 같이 변환
    const parseYearWeek = (yw: string) => {
      const parts = yw.split('-W');
      if (parts.length !== 2) return yw;
      const year = parseInt(parts[0]);
      const week = parseInt(parts[1]);
      if (isNaN(year) || isNaN(week)) return yw;
      const firstJan = new Date(year, 0, 1);
      const target = new Date(firstJan.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const month = target.getMonth() + 1;
      return `${month}월 ${week}주`;
    };

    return trendData.map(item => {
      let formattedDate = '';
      
      switch (period) {
        case 'daily':
          // 일별: "3/15" 형식
          const dailyDate = new Date(item[0]);
          formattedDate = `${dailyDate.getMonth() + 1}/${dailyDate.getDate()}`;
          break;
        case 'weekly':
          // 주별: 백엔드에서 주 시작 ISO 날짜(YYYY-MM-DD)를 보냄 → 월/일 표시
          const weeklyDate = new Date(item[0]);
          if (!isNaN(weeklyDate.getTime())) {
            formattedDate = `${weeklyDate.getMonth() + 1}/${weeklyDate.getDate()}`;
          } else {
            formattedDate = item[0];
          }
          break;
        case 'monthly':
          // 월별: 백엔드에서 "YYYY-MM" 형식의 문자열을 보냄
          if (typeof item[0] === 'string' && item[0].match(/^\d{4}-\d{2}$/)) {
            // YYYY-MM 형식 처리
            const [year, month] = item[0].split('-');
            formattedDate = `${parseInt(month)}월`;
          } else {
            // 기존 방식 (Date 객체)
            const monthlyDate = new Date(item[0]);
            if (!isNaN(monthlyDate.getTime())) {
              formattedDate = `${monthlyDate.getMonth() + 1}월`;
            } else {
              formattedDate = item[0];
            }
          }
          break;
        default:
          const defaultDate = new Date(item[0]);
          formattedDate = defaultDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      }
      
      return {
        date: formattedDate,
        value: round1(parseFloat(item[1]))
      };
    });
  };

  // 현재 값과 변화량 계산
  const calculateCurrentAndChange = (trendData: any[]) => {
    if (trendData.length < 2) return { current: 0, change: 0 };
    
    const current = parseFloat(trendData[trendData.length - 1][1]);
    const previous = parseFloat(trendData[trendData.length - 2][1]);
    const change = current - previous;
    
    return { current, change };
  };

  // 소수점 자릿수 조정 함수
  const formatNumber = (value: number, type: 'weight' | 'muscle' | 'bodyFat') => {
    switch (type) {
      case 'weight':
        return Math.round(value * 10) / 10; // 체중: 소수점 1자리
      case 'muscle':
        return Math.round(value * 10) / 10; // 근육량: 소수점 1자리
      case 'bodyFat':
        return Math.round(value * 10) / 10; // 체지방률: 소수점 1자리
      default:
        return Math.round(value * 10) / 10;
    }
  };

  // 최소/최대 값 계산
  const calculateMinMax = (trendData: any[]) => {
    if (trendData.length === 0) return { min: 0, max: 0 };
    
    const values = trendData.map(item => parseFloat(item[1]));
    return {
      min: Math.round(Math.min(...values) * 10) / 10,
      max: Math.round(Math.max(...values) * 10) / 10
    };
  };

  if (loading) {
    return (
      <div className="body-data-container">
        <div className="header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
            <div className="header-title">신체 데이터</div>
            <div></div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="skeleton skeleton-bar" style={{ width: '40%', marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 180, marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 180 }}></div>
        </div>
        <NavigationBar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="body-data-container">
        <div className="header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate(-1)}>
              ←
            </button>
            <div className="header-title">신체 데이터</div>
            <div></div>
          </div>
        </div>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={loadTrendsData} className="retry-button">
            다시 시도
          </button>
        </div>
        <NavigationBar />
      </div>
    );
  }

  // 현재 선택된 기간의 필터링된 데이터
  const filteredWeightTrend = trendsData?.weightTrend ? getFilteredData(trendsData.weightTrend, activeTabs.weight) : [];
  const filteredMuscleTrend = trendsData?.muscleMassTrend ? getFilteredData(trendsData.muscleMassTrend, activeTabs.muscle) : [];
  const filteredBodyFatTrend = trendsData?.bodyFatTrend ? getFilteredData(trendsData.bodyFatTrend, activeTabs.bodyFat) : [];

  // 필터링된 데이터로 계산
  const weightInfo = filteredWeightTrend.length > 0 ? calculateCurrentAndChange(filteredWeightTrend) : { current: 0, change: 0 };
  const muscleInfo = filteredMuscleTrend.length > 0 ? calculateCurrentAndChange(filteredMuscleTrend) : { current: 0, change: 0 };
  const bodyFatInfo = filteredBodyFatTrend.length > 0 ? calculateCurrentAndChange(filteredBodyFatTrend) : { current: 0, change: 0 };

  const weightMinMax = filteredWeightTrend.length > 0 ? calculateMinMax(filteredWeightTrend) : { min: 0, max: 0 };
  const muscleMinMax = filteredMuscleTrend.length > 0 ? calculateMinMax(filteredMuscleTrend) : { min: 0, max: 0 };
  const bodyFatMinMax = filteredBodyFatTrend.length > 0 ? calculateMinMax(filteredBodyFatTrend) : { min: 0, max: 0 };

  // 포맷된 값들
  const formattedWeightInfo = {
    current: formatNumber(weightInfo.current, 'weight'),
    change: formatNumber(weightInfo.change, 'weight')
  };
  const formattedMuscleInfo = {
    current: formatNumber(muscleInfo.current, 'muscle'),
    change: formatNumber(muscleInfo.change, 'muscle')
  };
  const formattedBodyFatInfo = {
    current: formatNumber(bodyFatInfo.current, 'bodyFat'),
    change: formatNumber(bodyFatInfo.change, 'bodyFat')
  };

  return (
    <div className="body-data-container content-wrapper">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <div className="header-title">신체 데이터</div>
          <button className="add-button" onClick={() => navigate('/body-records/new')} aria-label="신체 기록 추가">추가</button>
        </div>
      </div>

      <div className="body-data-content">
        {/* 근육량 섹션 */}
        <div className="data-section">
          <div className="section-header">
            <div className="section-icon">💪</div>
            <div className="section-info">
              <h3>근육량</h3>
              <span className="current-value">{formattedMuscleInfo.current}kg</span>
            </div>
          </div>
          
          <div className="change-info">
            지난 데이터 대비 {formattedMuscleInfo.change > 0 ? '+' : ''}{formattedMuscleInfo.change}kg
          </div>
          
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTabs.muscle === 'daily' ? 'active' : ''}`}
              onClick={() => handleTabChange('muscle', 'daily')}
            >
              일별
            </button>
            <button 
              className={`tab-button ${activeTabs.muscle === 'weekly' ? 'active' : ''}`}
              onClick={() => handleTabChange('muscle', 'weekly')}
            >
              주별
            </button>
            <button 
              className={`tab-button ${activeTabs.muscle === 'monthly' ? 'active' : ''}`}
              onClick={() => handleTabChange('muscle', 'monthly')}
            >
              월별
            </button>
          </div>
          
          <div className="min-max-info">
            최소 | {muscleMinMax.min}kg 최대 | {muscleMinMax.max}kg
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData(filteredMuscleTrend, 'muscleMass', activeTabs.muscle)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => Number(v).toFixed(1)} domain={[round1(muscleMinMax.min - 0.5), round1(muscleMinMax.max + 0.5)]} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1)} />
                <Line type="monotone" dataKey="value" stroke="var(--primary-blue)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 체지방률 섹션 */}
        <div className="data-section">
          <div className="section-header">
            <div className="section-icon">📊</div>
            <div className="section-info">
              <h3>체지방률</h3>
              <span className="current-value">{formattedBodyFatInfo.current}%</span>
            </div>
          </div>
          
          <div className="change-info">
            지난 데이터 대비 {formattedBodyFatInfo.change > 0 ? '+' : ''}{formattedBodyFatInfo.change}%
          </div>
          
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTabs.bodyFat === 'daily' ? 'active' : ''}`}
              onClick={() => handleTabChange('bodyFat', 'daily')}
            >
              일별
            </button>
            <button 
              className={`tab-button ${activeTabs.bodyFat === 'weekly' ? 'active' : ''}`}
              onClick={() => handleTabChange('bodyFat', 'weekly')}
            >
              주별
            </button>
            <button 
              className={`tab-button ${activeTabs.bodyFat === 'monthly' ? 'active' : ''}`}
              onClick={() => handleTabChange('bodyFat', 'monthly')}
            >
              월별
            </button>
          </div>
          
          <div className="min-max-info">
            최소 | {bodyFatMinMax.min}% 최대 | {bodyFatMinMax.max}%
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData(filteredBodyFatTrend, 'bodyFat', activeTabs.bodyFat)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => Number(v).toFixed(1)} domain={[round1(bodyFatMinMax.min - 0.5), round1(bodyFatMinMax.max + 0.5)]} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1)} />
                <Line type="monotone" dataKey="value" stroke="var(--secondary-red)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 체중 섹션 */}
        <div className="data-section">
          <div className="section-header">
            <div className="section-icon">⚖️</div>
            <div className="section-info">
              <h3>체중</h3>
              <span className="current-value">{formattedWeightInfo.current}kg</span>
            </div>
          </div>
          
          <div className="change-info">
            지난 데이터 대비 {formattedWeightInfo.change > 0 ? '+' : ''}{formattedWeightInfo.change}kg
          </div>
          
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTabs.weight === 'daily' ? 'active' : ''}`}
              onClick={() => handleTabChange('weight', 'daily')}
            >
              일별
            </button>
            <button 
              className={`tab-button ${activeTabs.weight === 'weekly' ? 'active' : ''}`}
              onClick={() => handleTabChange('weight', 'weekly')}
            >
              주별
            </button>
            <button 
              className={`tab-button ${activeTabs.weight === 'monthly' ? 'active' : ''}`}
              onClick={() => handleTabChange('weight', 'monthly')}
            >
              월별
            </button>
          </div>
          
          <div className="min-max-info">
            최소 | {weightMinMax.min}kg 최대 | {weightMinMax.max}kg
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData(filteredWeightTrend, 'weight', activeTabs.weight)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => Number(v).toFixed(1)} domain={[round1(weightMinMax.min - 0.5), round1(weightMinMax.max + 0.5)]} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1)} />
                <Line type="monotone" dataKey="value" stroke="var(--secondary-green)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default BodyData; 