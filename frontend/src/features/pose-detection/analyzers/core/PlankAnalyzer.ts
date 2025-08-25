import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class PlankAnalyzer extends BaseAnalyzer {
  constructor() {
    super('plank', 'core');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_HIP, RIGHT_HIP } = POSE_CONSTANTS;
    
    const shL = landmarks[LEFT_SHOULDER], shR = landmarks[RIGHT_SHOULDER];
    const elL = landmarks[LEFT_ELBOW], elR = landmarks[RIGHT_ELBOW];
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    
    if (!this.validateLandmarks([shL, shR, elL, elR, hipL, hipR])) {
      return this.createErrorAnalysis('코어 관절점을 찾을 수 없습니다');
    }
    
    const left = AngleCalculator.calculateAngle(shL, elL, hipL);
    const right = AngleCalculator.calculateAngle(shR, elR, hipR);
    const arm = AngleCalculator.avg(left, right);
    
    return this.analyzePlankForm(arm);
  }
  
  private analyzePlankForm(arm: number): ExerciseAnalysis {
    const isPlank = AngleCalculator.isInRange(arm, 80, 100);
    
    return {
      exerciseType: 'plank',
      currentCount: this.stateRef.count,
      isCorrectForm: isPlank,
      feedback: this.getPlankFeedback(isPlank),
      confidence: this.calculateConfidence([isPlank ? 0.9 : 0.7])
    };
  }
  
  private getPlankFeedback(isPlank: boolean): string {
    if (isPlank) {
      return '좋아요! 자세를 유지하세요';
    } else {
      return '팔 각도 90° 근처로 유지하세요';
    }
  }
} 