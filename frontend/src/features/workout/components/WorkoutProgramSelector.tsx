import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@utils/axiosConfig';
import './WorkoutProgramSelector.css';

export type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 
                          'burpee' | 'mountain_climber';

export interface WorkoutExercise {
  exerciseType: ExerciseType;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  estimatedDuration: number; // 예상 소요시간 (초)
}

export interface WorkoutProgram {
  id: 'recommended' | 'upper_body' | 'cardio' | 'lower_body';
  title: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // 총 예상시간 (분)
  estimatedCalories: number; // 예상 칼로리
  exercises: WorkoutExercise[];
}

const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'recommended',
    title: '추천 운동세트',
    description: '온보딩 데이터 기반 개인 맞춤 추천',
    icon: '🎯',
    color: '#007AFF',
    difficulty: 'intermediate',
    estimatedDuration: 25,
    estimatedCalories: 180,
    exercises: [] // API에서 동적으로 가져옴
  },
  {
    id: 'upper_body',
    title: '상체 단련세트',
    description: '상체 근력 강화에 집중한 운동',
    icon: '💪',
    color: '#FF3B30',
    difficulty: 'intermediate',
    estimatedDuration: 20,
    estimatedCalories: 160,
    exercises: [
      { exerciseType: 'pushup', targetSets: 3, targetReps: 12, restSeconds: 90, estimatedDuration: 300 },
      { exerciseType: 'plank', targetSets: 3, targetReps: 30, restSeconds: 60, estimatedDuration: 240 },
      { exerciseType: 'burpee', targetSets: 3, targetReps: 8, restSeconds: 120, estimatedDuration: 360 },
    ]
  },
  {
    id: 'cardio',
    title: '체력증진 (유산소)세트',
    description: '심폐지구력 향상을 위한 고강도 운동',
    icon: '⚡',
    color: '#34C759',
    difficulty: 'intermediate',
    estimatedDuration: 30,
    estimatedCalories: 250,
    exercises: [
      { exerciseType: 'mountain_climber', targetSets: 4, targetReps: 20, restSeconds: 60, estimatedDuration: 240 },
      { exerciseType: 'burpee', targetSets: 3, targetReps: 10, restSeconds: 90, estimatedDuration: 300 },
      { exerciseType: 'squat', targetSets: 4, targetReps: 15, restSeconds: 60, estimatedDuration: 300 },
    ]
  },
  {
    id: 'lower_body',
    title: '하체 단련세트',
    description: '하체 근력과 안정성 강화 운동',
    icon: '🦵',
    color: '#AF52DE',
    difficulty: 'beginner',
    estimatedDuration: 18,
    estimatedCalories: 140,
    exercises: [
      { exerciseType: 'squat', targetSets: 3, targetReps: 15, restSeconds: 90, estimatedDuration: 300 },
      { exerciseType: 'lunge', targetSets: 3, targetReps: 12, restSeconds: 90, estimatedDuration: 300 },
      { exerciseType: 'calf_raise', targetSets: 3, targetReps: 20, restSeconds: 60, estimatedDuration: 240 },
    ]
  }
];

interface WorkoutProgramSelectorProps {
  onSelectProgram?: (program: WorkoutProgram) => void;
  isModal?: boolean;
  onClose?: () => void;
}

const WorkoutProgramSelector: React.FC<WorkoutProgramSelectorProps> = ({ 
  onSelectProgram, 
  isModal = false,
  onClose 
}) => {
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram['id'] | null>(null);
  const [programs, setPrograms] = useState<WorkoutProgram[]>(WORKOUT_PROGRAMS);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 추천 운동세트 동적 로딩
  useEffect(() => {
    const loadRecommendedProgram = async () => {
      try {
        setLoading(true);
        
        // 사용자 정보 가져오기 (localStorage 또는 API에서)
        const userData = {
          goal: localStorage.getItem('userGoal') || 'fitness',
          experience: localStorage.getItem('userExperience') || 'beginner',
          weight: localStorage.getItem('userWeight') || '70',
          height: localStorage.getItem('userHeight') || '170',
          age: localStorage.getItem('userAge') || '25'
        };

        const response = await apiClient.post('/api/workout/recommend', userData);

        if (response.data.success) {
          const recommendation = response.data.data;
          
          // 추천 데이터를 WorkoutProgram 형태로 변환
          const recommendedExercises: WorkoutExercise[] = [];
          
          // 메인 운동들을 추출하여 변환
          if (recommendation.workoutPlan?.main?.exercises) {
            recommendation.workoutPlan.main.exercises.forEach((exercise: any) => {
              if (exercise.hasAICoaching) { // AI 코칭 지원 운동만 포함
                recommendedExercises.push({
                  exerciseType: mapExerciseNameToType(exercise.name),
                  targetSets: exercise.sets || 3,
                  targetReps: exercise.reps || 10,
                  restSeconds: exercise.restSeconds || 90,
                  estimatedDuration: (exercise.sets || 3) * (exercise.reps || 10) * 2 + (exercise.restSeconds || 90) * (exercise.sets || 3)
                });
              }
            });
          }

          // 추천 프로그램 업데이트
          setPrograms(prev => prev.map(program => {
            if (program.id === 'recommended') {
              return {
                ...program,
                exercises: recommendedExercises,
                estimatedDuration: Math.ceil(recommendation.totalDuration || 25),
                estimatedCalories: recommendation.estimatedCalories || 180,
                difficulty: mapExperienceToDifficulty(userData.experience)
              };
            }
            return program;
          }));
        }
      } catch (error) {
        console.error('추천 프로그램 로드 실패:', error);
        // 실패 시 기본 추천 유지
      } finally {
        setLoading(false);
      }
    };

    loadRecommendedProgram();
  }, []);

  // 운동 이름을 ExerciseType으로 매핑
  const mapExerciseNameToType = (name: string): ExerciseType => {
    const nameMap: { [key: string]: ExerciseType } = {
      '스쿼트': 'squat',
      '런지': 'lunge', 
      '푸시업': 'pushup',
      '플랭크': 'plank',
      '카프 레이즈': 'calf_raise',
      '버피': 'burpee',
      '마운틴 클라이머': 'mountain_climber'
    };
    return nameMap[name] || 'squat';
  };

  // 경험도를 난이도로 매핑
  const mapExperienceToDifficulty = (experience: string): 'beginner' | 'intermediate' | 'advanced' => {
    const difficultyMap: { [key: string]: 'beginner' | 'intermediate' | 'advanced' } = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    };
    return difficultyMap[experience] || 'beginner';
  };

  const handleProgramSelect = (programId: WorkoutProgram['id']) => {
    setSelectedProgram(programId);
  };

  const handleStartWorkout = () => {
    const selected = programs.find(p => p.id === selectedProgram);
    if (!selected) return;

    if (onSelectProgram) {
      // 모달 모드: 부모 컴포넌트에 프로그램 전달
      onSelectProgram(selected);
    } else {
      // 페이지 모드: 통합 워크아웃 세션으로 이동
      navigate('/workout/integrated', { 
        state: { selectedProgram: selected }
      });
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      beginner: '초급',
      intermediate: '중급',
      advanced: '고급'
    };
    return labels[difficulty as keyof typeof labels] || '중급';
  };

  const containerClassName = isModal ? 'workout-program-modal' : 'workout-program-selector';

  return (
    <div className={containerClassName}>
      {isModal && <div className="modal-overlay" onClick={onClose} />}
      
      <div className={isModal ? 'modal-content' : 'selector-content'}>
        {/* 헤더 */}
        <div className="selector-header">
          {!isModal && (
            <div className="header-nav">
              <button className="back-button" onClick={() => navigate(-1)}>
                ←
              </button>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%' }}></div>
              </div>
            </div>
          )}
          
          {isModal && (
            <button className="modal-close-button" onClick={onClose}>
              ✕
            </button>
          )}
          
          <div className="header-content">
            <h1 className="selector-title">운동 프로그램 선택</h1>
            <p className="selector-subtitle">오늘 어떤 운동을 하고 싶으세요?</p>
          </div>
        </div>

        {/* 프로그램 목록 */}
        <div className="programs-section">
          {loading && selectedProgram === null ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>개인 맞춤 추천을 준비하고 있습니다...</p>
            </div>
          ) : (
            programs.map((program) => (
              <div
                key={program.id}
                className={`program-card ${selectedProgram === program.id ? 'selected' : ''}`}
                onClick={() => handleProgramSelect(program.id)}
              >
                <div className="program-content">
                  <div className="program-icon" style={{ backgroundColor: program.color }}>
                    {program.icon}
                  </div>
                  
                  <div className="program-info">
                    <div className="program-main">
                      <h3 className="program-title">
                        {program.title}
                        {program.id === 'recommended' && loading && (
                          <span className="loading-indicator">...</span>
                        )}
                      </h3>
                      <p className="program-description">{program.description}</p>
                    </div>
                    
                    <div className="program-details">
                      <div className="detail-item">
                        <span className="detail-icon">⏱️</span>
                        <span>{program.estimatedDuration}분</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">🔥</span>
                        <span>{program.estimatedCalories}kcal</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">📊</span>
                        <span>{getDifficultyLabel(program.difficulty)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">💪</span>
                        <span>{program.exercises.length}개 운동</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedProgram === program.id && (
                  <div className="selected-indicator">
                    <div className="check-icon">✓</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 선택된 프로그램 미리보기 */}
        {selectedProgram && (
          <div className="selected-preview">
            <h4>선택된 운동</h4>
            <div className="exercise-list">
              {programs.find(p => p.id === selectedProgram)?.exercises.map((exercise, index) => (
                <div key={index} className="exercise-item">
                  <span className="exercise-number">{index + 1}</span>
                  <span className="exercise-name">
                    {getExerciseDisplayName(exercise.exerciseType)}
                  </span>
                  <span className="exercise-details">
                    {exercise.targetSets}세트 × {exercise.targetReps}회
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="bottom-button-container">
          <button
            className={`button button-primary button-full ${!selectedProgram ? 'disabled' : ''}`}
            onClick={handleStartWorkout}
            disabled={!selectedProgram || loading}
          >
            {loading ? '준비 중...' : '운동 시작하기'}
          </button>
          
          {isModal && (
            <button 
              className="button button-secondary button-full"
              onClick={onClose}
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 운동 타입을 한글 이름으로 변환
const getExerciseDisplayName = (exerciseType: ExerciseType): string => {
  const displayNames: { [key in ExerciseType]: string } = {
    squat: '스쿼트',
    lunge: '런지',
    pushup: '푸시업', 
    plank: '플랭크',
    calf_raise: '카프 레이즈',
    burpee: '버피',
    mountain_climber: '마운틴 클라이머'
  };
  return displayNames[exerciseType] || exerciseType;
};

export default WorkoutProgramSelector;