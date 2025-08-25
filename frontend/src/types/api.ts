// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User related types
export interface UserData {
  id: number;
  email: string;
  name: string;
  birthDate?: string;
  phone?: string;
  role?: string;
}

export interface LoginResponse {
  user: UserData;
  token: string;
}

// Exercise related types
export interface Exercise {
  id: number;
  name: string;
  description?: string;
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string;
  instructions?: string;
}

export interface ExerciseRecommendation {
  id: number;
  name: string;
  reason: string;
  score: number;
}

// Workout related types
export interface WorkoutRecord {
  id: number;
  workoutDate: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  difficulty: string;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  averageDifficulty: number;
  workoutTypeStats: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  difficultyDistribution: Array<{
    difficulty: string;
    count: number;
    percentage: number;
  }>;
}

// Body record types
export interface BodyRecord {
  id: number;
  recordDate: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi?: number;
}

export interface BodyTrendData {
  date: string;
  value: number;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'workout' | 'holiday' | 'custom';
  description?: string;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Dashboard types
export interface DashboardData {
  user: UserData;
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