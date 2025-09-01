// 통합 운동 타입 정의
export type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 
                          'burpee' | 'mountain_climber' | 'bridge' | 'situp' | 'crunch' | 
                          'jumping_jack' | 'jump_squat' | 'pullup' | 'deadlift' | 'wall_sit' | 
                          'high_knees' | 'side_plank';

// 통합 운동 정보 인터페이스
export interface WorkoutExercise {
  id?: string;
  exerciseType: ExerciseType;
  name?: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  estimatedDuration?: number;
  duration?: number;
  instructions?: string;
}

// 운동 프로그램 인터페이스
export interface WorkoutProgram {
  id: 'recommended' | 'upper_body' | 'cardio' | 'lower_body';
  title: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  estimatedCalories: number;
  exercises: WorkoutExercise[];
}

// 운동 분석 결과 인터페이스
export interface ExerciseAnalysis {
  exerciseType: string;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
}