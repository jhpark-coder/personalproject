import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class MountainClimberAnalyzer extends BaseAnalyzer {
  constructor() {
    super('mountain_climber', 'cardio');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE } = POSE_CONSTANTS;
    
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    
    if (!this.validateLandmarks([hipL, hipR, kneeL, kneeR, ankleL, ankleR])) {
      return this.createErrorAnalysis('하체 관절점을 찾을 수 없습니다');
    }
    
    // 무릎이 가슴 쪽으로 올라오는지 확인
    const leftKneeToChest = AngleCalculator.calculateVerticalDistance(hipL, kneeL);
    const rightKneeToChest = AngleCalculator.calculateVerticalDistance(hipR, kneeR);
    
    // 무릎이 가슴 높이까지 올라왔는지 판단
    const isLeftKneeUp = leftKneeToChest < 0.1;
    const isRightKneeUp = rightKneeToChest < 0.1;
    
    return this.analyzeMountainClimberPhase(isLeftKneeUp, isRightKneeUp);
  }
  
  private analyzeMountainClimberPhase(isLeftKneeUp: boolean, isRightKneeUp: boolean): ExerciseAnalysis {
    const was = this.stateRef.phase;
    
    if (was === 'left' && isRightKneeUp) {
      this.stateRef.phase = 'right';
      this.stateRef.count += 1;
    } else if (was === 'right' && isLeftKneeUp) {
      this.stateRef.phase = 'left';
      this.stateRef.count += 1;
    } else if (was === 'up') {
      this.stateRef.phase = 'left';
    }
    
    return {
      exerciseType: 'mountain_climber',
      currentCount: this.stateRef.count,
      isCorrectForm: isLeftKneeUp || isRightKneeUp,
      feedback: this.getMountainClimberFeedback(was),
      confidence: this.calculateConfidence([this.stateRef.phase === 'up' ? 0.9 : 0.8])
    };
  }
  
  private getMountainClimberFeedback(phase: string): string {
    switch (phase) {
      case 'left': return '왼쪽 무릎 올리기';
      case 'right': return '오른쪽 무릎 올리기';
      default: return '마운틴 클라이머 자세를 취해보세요';
    }
  }
} 