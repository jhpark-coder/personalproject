// Integrated Workout System Types
export type WorkoutSessionStatus = 'preparing' | 'exercising' | 'resting' | 'transitioning' | 'completed';
export type TTSPriority = 'urgent' | 'encouragement' | 'information' | 'ambient';
export type WorkoutPhase = 'warmup' | 'main' | 'cooldown';

// Core State Management Interface
export interface IntegratedWorkoutState {
  // Exercise Queue Management
  exerciseQueue: RecommendedExercise[];
  currentExerciseIndex: number;
  
  // Current Progress
  currentExercise: RecommendedExercise | null;
  currentSet: number;
  currentRep: number;
  targetReps: number;
  targetSets: number;
  
  // Session State
  sessionStatus: WorkoutSessionStatus;
  restTimeRemaining: number;
  restTimeTotal: number;
  
  // Results Aggregation
  completedExercises: ExerciseResult[];
  sessionStartTime: Date;
  sessionId: number | null;
  
  // TTS State
  currentTTSMessage: string | null;
  ttsEnabled: boolean;
  lastTTSTime: Date | null;
  
  // Motion Recognition State
  motionRecognitionActive: boolean;
  formAccuracy: number;
  detectedCount: number;
}

// Recommended Exercise from Adaptive System
export interface RecommendedExercise {
  name: string;
  target: string; // 상체, 하체, 코어, 전신
  sets: number;
  reps: number;
  restSeconds: number;
  mets: double;
  hasAICoaching: boolean;
  adaptationScore: number;
  personalizedTip: string;
  instructions: string[];
  formCheckpoints: string[];
}

// Exercise Result for Session Completion
export interface ExerciseResult {
  exerciseName: string;
  plannedSets: number;
  completedSets: number;
  plannedReps: number;
  completedReps: number;
  avgFormAccuracy: number;
  totalDuration: number; // seconds
  caloriesBurned: number;
  difficulty: number; // 1-5 scale
  completionRate: number; // 0-1
}

// TTS Message System
export interface WorkoutTTSMessages {
  // Exercise Start/Transition
  exerciseStart: (exerciseName: string, sets: number, reps: number) => string;
  exerciseTransition: (fromExercise: string, toExercise: string) => string;
  
  // Real-time Feedback
  repCompleted: (currentRep: number, targetReps: number) => string;
  setCompleted: (currentSet: number, totalSets: number, restTime: number) => string;
  formCorrection: (feedback: string) => string;
  
  // Motivation & Completion
  encouragement: () => string;
  sessionCompleted: (totalExercises: number, duration: number, calories: number) => string;
  
  // Rest Guidance
  restRemaining: (seconds: number) => string;
  restComplete: () => string;
  
  // Phase Transitions
  phaseTransition: (phase: WorkoutPhase) => string;
}

// Motion Recognition Interface for Integration
export interface SmartMotionTracker {
  // Exercise Target Setting
  setExerciseTarget: (exerciseName: string, sets: number, reps: number) => void;
  
  // Real-time Progress Tracking
  onRepCompleted: (callback: (currentRep: number) => void) => void;
  onSetCompleted: (callback: (currentSet: number) => void) => void;
  onExerciseCompleted: (callback: (totalSets: number, accuracy: number) => void) => void;
  
  // Form Feedback + TTS Integration
  onFormFeedback: (callback: (feedback: string, shouldSpeak: boolean) => void) => void;
  
  // Exercise Auto Transition
  switchExercise: (newExercise: string) => void;
  
  // State Management
  getCurrentProgress: () => { currentSet: number; currentRep: number; accuracy: number };
  resetProgress: () => void;
}

// Workout Context for TTS Optimization
export interface WorkoutContext {
  phase: WorkoutPhase;
  exerciseType: string;
  intensity: 'low' | 'medium' | 'high';
  userFatigueLevel: number; // 0-1
  environmentNoise: number; // 0-1
}

// TTS Configuration for Different Contexts
export interface TTSConfig {
  rate: number; // 0.5-2.0
  pitch: number; // -1.0 to 1.0
  volume: number; // 0.0-3.0
  voice: string;
}

// Session Management DTOs
export interface IntegratedSessionRequest {
  goal: string;
  targetDuration: number;
  preferredExercises?: string[];
  avoidExercises?: string[];
  ttsEnabled?: boolean;
}

export interface IntegratedSessionResponse {
  sessionId: number;
  recommendation: any; // from AdaptiveWorkoutRecommendationService
  exerciseQueue: ExerciseQueueItem[];
  welcomeTTSMessage: string;
  estimatedCalories: number;
  estimatedDuration: number;
}

export interface ExerciseQueueItem extends RecommendedExercise {
  queueIndex: number;
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
  actualSets?: number;
  actualReps?: number;
}

// Progress Update DTOs
export interface ExerciseProgressRequest {
  sessionId: number;
  exerciseName: string;
  currentSet: number;
  currentRep: number;
  formAccuracy: number;
  timestamp: Date;
}

export interface ExerciseProgressResponse {
  progress: ExerciseProgressInfo;
  ttsMessage: string | null;
  shouldTriggerTTS: boolean;
  nextAction: 'continue' | 'rest' | 'transition' | 'complete';
}

export interface ExerciseProgressInfo {
  sessionId: number;
  exerciseName: string;
  currentSet: number;
  currentRep: number;
  targetSets: number;
  targetReps: number;
  completionRate: number;
  isSetCompleted: boolean;
  isExerciseCompleted: boolean;
  formAccuracy: number;
  suggestedRestTime: number;
}

// Exercise Completion DTOs
export interface ExerciseCompletionRequest {
  sessionId: number;
  exerciseName: string;
  completedSets: number;
  completedReps: number;
  avgFormAccuracy: number;
  duration: number;
  perceivedExertion: number; // 1-10 RPE scale
  difficulty: number; // 1-5 scale
}

export interface ExerciseCompletionResponse {
  completedExecution: any; // ExerciseExecution entity
  nextExercise: ExerciseQueueItem | null;
  transitionTTSMessage: string;
  isSessionComplete: boolean;
  restTimeBeforeNext: number;
}

// Session Completion DTOs
export interface SessionSummaryRequest {
  sessionId: number;
  actualDuration: number;
  totalCaloriesBurned: number;
  avgFormAccuracy: number;
  overallDifficulty: number; // 1-5 scale
  overallSatisfaction: number; // 1-5 scale
  notes?: string;
}

export interface SessionCompletionResponse {
  session: any; // WorkoutSession entity
  calendarRecord: any; // WorkoutRecord entity
  completionTTSMessage: string;
  nextRecommendationHint: string;
  sessionStats: SessionStats;
}

export interface SessionStats {
  totalExercises: number;
  completedExercises: number;
  totalDuration: number;
  caloriesBurned: number;
  avgFormAccuracy: number;
  completionRate: number;
  improvementAreas: string[];
  achievements: string[];
}

// Form Analysis Integration
export interface FormAnalysis {
  isCorrect: boolean;
  confidence: number;
  suggestion: string;
  correction: string;
  criticalErrors: string[];
  minorAdjustments: string[];
}

// Feedback Style for Intelligent System
export interface FeedbackStyle {
  motivationLevel: 'low' | 'medium' | 'high';
  correctionStyle: 'gentle' | 'direct' | 'technical';
  verbosity: 'minimal' | 'normal' | 'detailed';
  urgency: TTSPriority;
}

// Pattern Learning for TTS Feedback
export interface FeedbackPattern {
  exerciseName: string;
  userId: number;
  preferredStyle: FeedbackStyle;
  responsiveness: number; // 0-1, how well user responds to feedback
  lastUpdated: Date;
  confidenceLevel: number; // 0-1, how confident we are in this pattern
}

// TTS Feedback with Context
export interface TTSFeedback {
  message: string;
  priority: TTSPriority;
  timing: 'immediate' | 'after_rep' | 'after_set' | 'during_rest';
  voiceConfig: TTSConfig;
  shouldInterrupt: boolean;
}

// Exercise Events for State Transitions
export interface ExerciseEvents {
  onExerciseStart: (exercise: RecommendedExercise) => void;
  onRepCompleted: (currentRep: number, targetReps: number) => void;
  onSetCompleted: (currentSet: number, totalSets: number) => void;
  onExerciseCompleted: (result: ExerciseResult) => void;
  onRestStarted: (restTime: number) => void;
  onRestCompleted: () => void;
  onTransitionStarted: (fromExercise: string, toExercise: string) => void;
  onSessionCompleted: (sessionStats: SessionStats) => void;
  onFormFeedback: (analysis: FormAnalysis) => void;
  onTTSTriggered: (message: string, priority: TTSPriority) => void;
}

// Transition Logic Configuration
export interface TransitionThresholds {
  minimumRestTime: number; // seconds
  autoTransitionDelay: number; // seconds
  formAccuracyThreshold: number; // 0-1
  completionRateThreshold: number; // 0-1
  maxTransitionRetries: number;
}

// Failsafe System Interface
export interface WorkoutFailsafeSystem {
  handleMotionDetectionFailure: () => void;
  handleWorkoutAbandonment: (reason: string) => void;
  handleExerciseReorder: (newOrder: string[]) => void;
  handleTTSControl: (action: 'mute' | 'unmute' | 'volume_up' | 'volume_down' | 'speed_up' | 'speed_down') => void;
  handleEmergencyStop: () => void;
  recoverFromError: (errorType: string, context: any) => boolean;
}