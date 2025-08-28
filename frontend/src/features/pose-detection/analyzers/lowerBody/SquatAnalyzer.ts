import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class SquatAnalyzer extends BaseAnalyzer {
  constructor() {
    super('squat', 'lowerBody');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE } = POSE_CONSTANTS;
    
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    
    if (!this.validateLandmarks([kneeL, kneeR, hipL, hipR, ankleL, ankleR])) {
      return this.createErrorAnalysis('하체 관절점을 찾을 수 없습니다');
    }
    
    const kneeAngle = AngleCalculator.avg(
      AngleCalculator.calculateAngle(hipL, kneeL, ankleL),
      AngleCalculator.calculateAngle(hipR, kneeR, ankleR)
    );
    
    return this.analyzeSquatPhase(kneeAngle);
  }
  
  private analyzeSquatPhase(kneeAngle: number): ExerciseAnalysis {
    const isDown = kneeAngle <= 110;
    const isUp = kneeAngle >= 155;
    const was = this.stateRef.phase;
    
    if (was === 'up' && isDown) this.stateRef.phase = 'down';
    if (was === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }
    
    return {
      exerciseType: 'squat',
      currentCount: this.stateRef.count,
      isCorrectForm: isDown || isUp,
      feedback: this.getSquatFeedback(was),
      confidence: this.stateRef.phase === 'down' ? 0.8 : 0.9
    };
  }
  
  private getSquatFeedback(phase: string): string {
    switch (phase) {
      case 'down': return '좋아요! 무릎을 더 굽혀보세요';
      case 'up': return '천천히 일어나세요';
      default: return '스쿼트 자세를 취해보세요';
    }
  }
} 