import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../NavigationBar';
import './Profile.css';
import { API_ENDPOINTS } from '../../config/api';

interface RecordsSummary {
  pr: {
    maxVolume?: { workoutType: string; date: string; volume: number };
    maxReps?: { workoutType: string; date: string; reps: number; sets?: number };
    longestDuration?: { workoutType: string; date: string; minutes: number };
  };
  streak: { current: number; longest: number };
  cumulative: { totalCalories: number; totalVolume: number; totalWorkouts: number; totalMinutes: number };
}

const RecordsRoom: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<RecordsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).sub; } catch { return null; }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = getUserId();
        if (!userId) throw new Error('로그인이 필요합니다.');
        const res = await fetch(API_ENDPOINTS.MYPAGE_RECORDS_ROOM(String(userId)), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`데이터 로드 실패 (${res.status}): ${text?.slice(0,200)}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`JSON 아님: ${text?.slice(0,200)}`);
        }
        const json = await res.json();
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="profile-container records-room">
      <div className="header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기">←</button>
          <div className="header-title">나의 기록실</div>
          <div></div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="skeleton skeleton-bar" style={{ width: '40%', marginBottom: 12 }}></div>
        <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 12 }}></div>
        <div className="skeleton skeleton-card" style={{ height: 120 }}></div>
      </div>
    </div>
  );
  if (error) return (
    <div className="profile-container">
      <div className="profile-error">
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="retry-button" aria-label="뒤로 가기">뒤로</button>
      </div>
    </div>
  );
  if (!data) return null;

  const { pr, streak, cumulative } = data;

  return (
    <div className="profile-container records-room">
      <div className="header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기">←</button>
          <div className="header-title">나의 기록실</div>
          <div></div>
        </div>
      </div>

      <div className="profile-content">
        <div className="basic-info">
          <h3 className="info-title">🏆 개인 최고 기록 (PR)</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">최대 볼륨</span>
              <span className="info-value">
                {pr.maxVolume ? (
                  <div className="value-stack">
                    <div className="primary">{pr.maxVolume.workoutType}</div>
                    <div className="secondary">{pr.maxVolume.volume?.toLocaleString()} kg</div>
                    <div className="tertiary">({pr.maxVolume.date})</div>
                  </div>
                ) : '기록 없음'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">한 세트 최다 횟수</span>
              <span className="info-value">
                {pr.maxReps ? (
                  <div className="value-stack">
                    <div className="primary">{pr.maxReps.workoutType}</div>
                    <div className="secondary">{pr.maxReps.reps}회{pr.maxReps.sets ? ` / ${pr.maxReps.sets}세트` : ''}</div>
                    <div className="tertiary">({pr.maxReps.date})</div>
                  </div>
                ) : '기록 없음'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">최장 운동 시간</span>
              <span className="info-value">
                {pr.longestDuration ? (
                  <div className="value-stack">
                    <div className="primary">{pr.longestDuration.workoutType}</div>
                    <div className="secondary">{pr.longestDuration.minutes}분</div>
                    <div className="tertiary">({pr.longestDuration.date})</div>
                  </div>
                ) : '기록 없음'}
              </span>
            </div>
          </div>
        </div>

        <div className="basic-info">
          <h3 className="info-title">🔥 연속 운동 (Streak)</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">현재 연속</span>
              <span className="info-value">{streak.current}일</span>
            </div>
            <div className="info-item">
              <span className="info-label">최장 연속</span>
              <span className="info-value">{streak.longest}일</span>
            </div>
          </div>
        </div>

        <div className="basic-info">
          <h3 className="info-title">📈 누적 통계</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">누적 칼로리</span>
              <span className="info-value">{cumulative.totalCalories.toLocaleString()} kcal</span>
            </div>
            <div className="info-item">
              <span className="info-label">누적 볼륨</span>
              <span className="info-value">{cumulative.totalVolume.toLocaleString()} kg</span>
            </div>
            <div className="info-item">
              <span className="info-label">총 운동 횟수</span>
              <span className="info-value">{cumulative.totalWorkouts.toLocaleString()} 회</span>
            </div>
            <div className="info-item">
              <span className="info-label">총 운동 시간</span>
              <span className="info-value">{cumulative.totalMinutes.toLocaleString()} 분</span>
            </div>
          </div>
        </div>
      </div>

      <NavigationBar />
    </div>
  );
};

export default RecordsRoom; 
