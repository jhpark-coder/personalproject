export interface ExerciseAnalysis {
  exerciseType: string;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
}

export interface ExerciseAnalyzer {
  analyze(landmarks: any[]): ExerciseAnalysis;
  getExerciseType(): string;
  getCategory(): string;
}

export abstract class BaseAnalyzer implements ExerciseAnalyzer {
  protected stateRef: { phase: string; count: number };
  protected exerciseType: string;
  protected category: string;
  
  constructor(exerciseType: string, category: string) {
    this.exerciseType = exerciseType;
    this.category = category;
    this.stateRef = { phase: 'up', count: 0 };
  }
  
  abstract analyze(landmarks: any[]): ExerciseAnalysis;
  
  getExerciseType(): string {
    return this.exerciseType;
  }
  
  getCategory(): string {
    return this.category;
  }
  
  protected resetState(): void {
    this.stateRef = { phase: 'up', count: 0 };
  }
  
  protected validateLandmarks(landmarks: any[]): boolean {
    return landmarks.every(landmark => landmark && landmark.visibility > 0.3);
  }
  
  protected createErrorAnalysis(message: string): ExerciseAnalysis {
    return {
      exerciseType: this.exerciseType,
      currentCount: this.stateRef.count,
      isCorrectForm: false,
      feedback: message,
      confidence: 0
    };
  }
  
  protected calculateConfidence(landmarks: any[]): number {
    const visibilities = landmarks
      .filter(landmark => landmark && landmark.visibility)
      .map(landmark => landmark.visibility);
    
    return visibilities.length > 0 ? Math.min(...visibilities) : 0;
  }
} 