// MediaPipe Pose Detection Types
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResults {
  poseLandmarks: PoseLandmark[];
  poseWorldLandmarks?: PoseLandmark[];
}

export interface ExerciseAnalysis {
  type: string;
  count: number;
  quality: 'good' | 'fair' | 'poor';
  feedback: string;
  angle?: number;
}

export interface ExerciseType {
  name: string;
  key: string;
}

// Error types
export interface GumError {
  name: string;
  message: string;
  constraint?: string;
}

// Log data type
export interface LogData {
  timestamp: number;
  message: string;
  data?: unknown;
} 