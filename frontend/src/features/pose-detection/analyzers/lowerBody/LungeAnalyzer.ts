import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class LungeAnalyzer extends BaseAnalyzer {
  constructor() {
    super('lunge', 'lowerBody');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE } = POSE_CONSTANTS;
    
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    
    if (!this.validateLandmarks([hipL, hipR, kneeL, kneeR, ankleL, ankleR])) {
      return this.createErrorAnalysis('하체 관절점을 찾을 수 없습니다');
    }
    
    const angleL = AngleCalculator.calculateAngle(hipL, kneeL, ankleL);
    const angleR = AngleCalculator.calculateAngle(hipR, kneeR, ankleR);
    const frontKnee = Math.min(angleL, angleR);
    
    return this.analyzeLungePhase(frontKnee);
  }
  
  private analyzeLungePhase(frontKnee: number): ExerciseAnalysis {
    const isDown = frontKnee <= 105;
    const isUp = frontKnee >= 155;
    const was = this.stateRef.phase;
    
    if (was === 'up' && isDown) this.stateRef.phase = 'down';
    if (was === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }
    
    return {
      exerciseType: 'lunge',
      currentCount: this.stateRef.count,
      isCorrectForm: isDown || isUp,
      feedback: this.getLungeFeedback(was),
      confidence: this.calculateConfidence([this.stateRef.phase === 'down' ? 0.8 : 0.9])
    };
  }
  
  private getLungeFeedback(phase: string): string {
    switch (phase) {
      case 'down': return '하강 구간 - 무릎을 더 굽혀보세요';
      case 'up': return '상승 구간 - 천천히 일어나세요';
      default: return '런지 자세를 취해보세요';
    }
  }
} 