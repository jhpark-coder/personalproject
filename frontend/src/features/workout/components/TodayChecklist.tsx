import React, { useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import { getUserData } from '@utils/userProfile';
import { getKoreaTime } from '../../../utils/dateUtils';

interface ChecklistItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  exerciseType?: string;
  targetSets?: number;
  targetReps?: number;
  estimatedDuration?: number;
}

interface WorkoutRecommendation {
  workoutPlan: {
    main?: {
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        restSeconds: number;
        hasAICoaching: boolean;
      }>;
    };
    warmup?: any[];
    cooldown?: any[];
  };
  totalDuration: number;
  estimatedCalories: number;
}

const getTodayKey = (): string => {
  const d = getKoreaTime();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 운동 타입별 아이콘 매핑
const getExerciseIcon = (exerciseType: string): string => {
  const iconMap: { [key: string]: string } = {
    squat: '🦵',
    pushup: '💪',
    plank: '🧘‍♂️',
    lunge: '🚶‍♂️',
    calf_raise: '🦿',
    burpee: '🏃‍♂️',
    mountain_climber: '🧗‍♂️',
    default: '🏋️‍♂️'
  };
  return iconMap[exerciseType] || iconMap.default;
};

// 운동 이름을 한글로 변환
const getExerciseDisplayName = (exerciseName: string): string => {
  const nameMap: { [key: string]: string } = {
    squat: '스쿼트',
    pushup: '푸시업',
    plank: '플랭크',
    lunge: '런지',
    calf_raise: '카프 레이즈',
    burpee: '버피',
    mountain_climber: '마운틴 클라이머',
    default: exerciseName
  };
  return nameMap[exerciseName] || nameMap.default;
};

const TodayChecklist: React.FC<{ onStart?: () => void }> = ({ onStart }) => {
  const todayKey = useMemo(getTodayKey, []);
  const storageKey = `todayChecklist:${todayKey}`;
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [recommendations, setRecommendations] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 오늘의 추천 운동 가져오기
  const fetchTodayRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // 백엔드에서 사용자 프로필 가져오기 (우선순위: 백엔드 > localStorage > 기본값)
      const userData = await getUserData();
      
      console.log('🎯 TodayChecklist - 사용자 데이터:', userData);

      const response = await apiClient.post('/api/workout/recommend', userData);

      if (response.data.success) {
        const recommendation: WorkoutRecommendation = response.data.data;
        
        // 추천 운동을 체크리스트 아이템으로 변환
        const checklistItems: ChecklistItem[] = [];
        
        // 메인 운동들을 추출하여 변환
        if (recommendation.workoutPlan?.main?.exercises) {
          recommendation.workoutPlan.main.exercises.forEach((exercise, index) => {
            if (exercise.hasAICoaching) { // AI 코칭 지원 운동만 포함
              const exerciseType = exercise.name.toLowerCase().replace(/\s+/g, '_');
              checklistItems.push({
                id: `exercise_${index}`,
                title: getExerciseDisplayName(exercise.name),
                subtitle: `${exercise.sets}세트 × ${exercise.reps}회`,
                icon: getExerciseIcon(exerciseType),
                exerciseType: exerciseType,
                targetSets: exercise.sets,
                targetReps: exercise.reps,
                estimatedDuration: exercise.sets * exercise.reps * 2 + exercise.restSeconds * exercise.sets
              });
            }
          });
        }

        // 기본 운동 추가 (추천이 부족한 경우)
        if (checklistItems.length === 0) {
          checklistItems.push(
            { id: 'warmup', title: '준비 운동', subtitle: '5분', icon: '🔥' },
            { id: 'main', title: '주 운동', subtitle: '20분', icon: '🏋️‍♂️' },
            { id: 'cooldown', title: '정리 운동', subtitle: '5분', icon: '🧘‍♂️' }
          );
        }

        setRecommendations(checklistItems);
        console.log('✅ TodayChecklist - 추천 운동 로드 완료:', checklistItems);
      } else {
        throw new Error(response.data.message || '운동 추천을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('운동 추천 로드 실패:', err);
      setError('운동 추천을 가져오는 중 오류가 발생했습니다.');
      
      // 에러 시 기본 체크리스트 표시
      setRecommendations([
        { id: 'warmup', title: '준비 운동', subtitle: '5분', icon: '🔥' },
        { id: 'main', title: '주 운동', subtitle: '20분', icon: '🏋️‍♂️' },
        { id: 'cooldown', title: '정리 운동', subtitle: '5분', icon: '🧘‍♂️' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 오늘의 운동 완료 상태 확인
  const checkTodayWorkoutStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 오늘 운동 기록 확인
      const today = getKoreaTime();
      const todayStr = today.toISOString().split('T')[0];
      
      // 사용자 ID 가져오기
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;

      if (userId) {
        const response = await apiClient.get(`/api/mypage/${userId}/workouts?startDate=${todayStr}&endDate=${todayStr}`);
        
        if (response.data.success && response.data.workouts) {
          const todayWorkouts = response.data.workouts;
          
          // 운동별 완료 상태 업데이트
          const newCompleted: Record<string, boolean> = {};
          
          recommendations.forEach(item => {
            if (item.exerciseType) {
              // 해당 운동이 오늘 완료되었는지 확인
              const isCompleted = todayWorkouts.some((workout: any) => 
                workout.workoutType === item.exerciseType || 
                workout.exerciseName === item.title
              );
              newCompleted[item.id] = isCompleted;
            }
          });
          
          setCompleted(newCompleted);
          
          // localStorage에 저장
          localStorage.setItem(storageKey, JSON.stringify(newCompleted));
        }
      }
    } catch (error) {
      console.error('오늘 운동 상태 확인 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 추천 운동 로드
  useEffect(() => {
    fetchTodayRecommendations();
  }, []);

  // 추천 운동이 로드되면 오늘 운동 상태 확인
  useEffect(() => {
    if (recommendations.length > 0) {
      checkTodayWorkoutStatus();
    }
  }, [recommendations]);

  // localStorage에서 완료 상태 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const savedCompleted = JSON.parse(raw);
        setCompleted(prev => ({ ...prev, ...savedCompleted }));
      }
    } catch {}
  }, [storageKey]);

  // 체크리스트 업데이트 이벤트 감지
  useEffect(() => {
    const handleChecklistUpdate = (event: CustomEvent) => {
      const { exerciseType, checklistState } = event.detail;
      
      // 체크리스트 상태 업데이트
      if (checklistState) {
        setCompleted(prev => ({ ...prev, ...checklistState }));
      }
      
      // 해당 운동 타입이 추천 목록에 있는지 확인하고 자동 체크
      setRecommendations(prev => prev.map(item => {
        if (item.exerciseType === exerciseType) {
          return { ...item };
        }
        return item;
      }));
      
      // 오늘 운동 상태 다시 확인
      setTimeout(() => {
        checkTodayWorkoutStatus();
      }, 1000);
    };

    // 이벤트 리스너 등록
    window.addEventListener('checklistUpdated', handleChecklistUpdate as EventListener);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('checklistUpdated', handleChecklistUpdate as EventListener);
    };
  }, []);

  // 수동 체크 토글 (백업용)
  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const allDone = recommendations.length > 0 && recommendations.every(it => completed[it.id]);

  if (loading) {
    return (
      <div className="card today-card">
        <div className="card-header">
          <h3 className="card-title">오늘의 체크리스트</h3>
          <button className="arrow-button" onClick={onStart}>→</button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#80868B' }}>
          오늘의 운동을 준비하고 있습니다...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card today-card">
        <div className="card-header">
          <h3 className="card-title">오늘의 체크리스트</h3>
          <button className="arrow-button" onClick={onStart}>→</button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card today-card">
      <div className="card-header">
        <h3 className="card-title">오늘의 체크리스트</h3>
        <button className="arrow-button" onClick={onStart}>→</button>
      </div>

      <ul className="today-list">
        {recommendations.map(item => (
          <li key={item.id} className={`today-item ${completed[item.id] ? 'done' : ''}`} onClick={() => toggle(item.id)}>
            <span className="today-icon">{item.icon}</span>
            <div className="today-text">
              <div className="today-title">{item.title}</div>
              {item.subtitle && <div className="today-sub">{item.subtitle}</div>}
            </div>
            <input type="checkbox" checked={!!completed[item.id]} readOnly />
          </li>
        ))}
      </ul>

      {allDone && (
        <div className="today-all-done">
          🎉 오늘의 운동을 모두 완료했습니다!
        </div>
      )}

      {recommendations.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#80868B' }}>
          오늘의 운동 추천이 없습니다.
        </div>
      )}
    </div>
  );
};

export default TodayChecklist; 