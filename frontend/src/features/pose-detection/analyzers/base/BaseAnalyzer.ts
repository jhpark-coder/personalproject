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
  
  // External state support - optional override
  setExternalState?(stateRef: { current: any }): void;
  
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
    
    if (visibilities.length === 0) return 0;
    
    // 가중 평균 사용 - 높은 visibility 값에 더 큰 가중치 부여
    const weightedSum = visibilities.reduce((sum, v) => sum + v * v, 0);
    const weightSum = visibilities.reduce((sum, v) => sum + v, 0);
    const weightedAvg = weightSum > 0 ? weightedSum / weightSum : 0;
    
    // 최소 신뢰도 보장 - 일부 랜드마크만 보여도 기본 신뢰도 제공
    const minConfidence = visibilities.length > 0 ? 0.3 : 0;
    return Math.max(minConfidence, Math.min(1, weightedAvg));
  }
} 