import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class CalfRaiseAnalyzer extends BaseAnalyzer {
  constructor() {
    super('calf_raise', 'lowerBody');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_ANKLE, RIGHT_ANKLE, LEFT_FOOT_INDEX, RIGHT_FOOT_INDEX } = POSE_CONSTANTS;
    
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    const toeL = landmarks[LEFT_FOOT_INDEX], toeR = landmarks[RIGHT_FOOT_INDEX];
    
    if (!this.validateLandmarks([ankleL, ankleR, toeL, toeR])) {
      return this.createErrorAnalysis('발 관절점을 찾을 수 없습니다');
    }
    
    const dyL = (ankleL.y - toeL.y);
    const dyR = (ankleR.y - toeR.y);
    const lift = AngleCalculator.avg(dyL, dyR);
    
    return this.analyzeCalfRaisePhase(lift);
  }
  
  private analyzeCalfRaisePhase(lift: number): ExerciseAnalysis {
    const isUp = lift > 0.03; // 발뒤꿈치가 발끝보다 올라옴
    const isDown = lift < 0.01;
    const was = this.stateRef.phase;
    
    if (was === 'up' && isDown) this.stateRef.phase = 'down';
    if (was === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }
    
    return {
      exerciseType: 'calf_raise',
      currentCount: this.stateRef.count,
      isCorrectForm: true,
      feedback: this.getCalfRaiseFeedback(was),
      confidence: this.calculateConfidence([this.stateRef.phase === 'up' ? 0.9 : 0.8])
    };
  }
  
  private getCalfRaiseFeedback(phase: string): string {
    switch (phase) {
      case 'up': return '상승 - 발뒤꿈치를 더 높이 올리세요';
      case 'down': return '하강 - 천천히 내리세요';
      default: return '카프 레이즈 자세를 취해보세요';
    }
  }
} 