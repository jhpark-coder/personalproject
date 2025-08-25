import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class BurpeeAnalyzer extends BaseAnalyzer {
  constructor() {
    super('burpee', 'cardio');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST, LEFT_FOOT_INDEX, RIGHT_FOOT_INDEX } = POSE_CONSTANTS;
    
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    const shL = landmarks[LEFT_SHOULDER], shR = landmarks[RIGHT_SHOULDER];
    const elL = landmarks[LEFT_ELBOW], elR = landmarks[RIGHT_ELBOW];
    const wrL = landmarks[LEFT_WRIST], wrR = landmarks[RIGHT_WRIST];
    const toeL = landmarks[LEFT_FOOT_INDEX], toeR = landmarks[RIGHT_FOOT_INDEX];
    
    if (!this.validateLandmarks([hipL, hipR, kneeL, kneeR, ankleL, ankleR, shL, shR, elL, elR, wrL, wrR, toeL, toeR])) {
      return this.createErrorAnalysis('전신 관절점을 찾을 수 없습니다');
    }
    
    // 스쿼트 자세 (무릎 각도)
    const kneeAngle = AngleCalculator.avg(
      AngleCalculator.calculateAngle(hipL, kneeL, ankleL),
      AngleCalculator.calculateAngle(hipR, kneeR, ankleR)
    );
    
    // 푸시업 자세 (팔꿈치 각도)
    const elbowAngle = AngleCalculator.avg(
      AngleCalculator.calculateAngle(shL, elL, wrL),
      AngleCalculator.calculateAngle(shR, elR, wrR)
    );
    
    // 점프 자세 (발목-발끝 y축 변화)
    const lift = AngleCalculator.avg(
      (ankleL.y - toeL.y),
      (ankleR.y - toeR.y)
    );
    
    return this.analyzeBurpeePhase(kneeAngle, elbowAngle, lift);
  }
  
  private analyzeBurpeePhase(kneeAngle: number, elbowAngle: number, lift: number): ExerciseAnalysis {
    const isSquatDown = kneeAngle <= 110;
    const isPushupDown = elbowAngle <= 90;
    const isJumping = lift > 0.05;
    
    const was = this.stateRef.phase;
    
    if (was === 'up' && isSquatDown) this.stateRef.phase = 'squat';
    if (was === 'squat' && isPushupDown) this.stateRef.phase = 'pushup';
    if (was === 'pushup' && isJumping) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }
    
    return {
      exerciseType: 'burpee',
      currentCount: this.stateRef.count,
      isCorrectForm: isSquatDown || isPushupDown || isJumping,
      feedback: this.getBurpeeFeedback(was),
      confidence: this.calculateConfidence([this.stateRef.phase === 'up' ? 0.9 : 0.8])
    };
  }
  
  private getBurpeeFeedback(phase: string): string {
    switch (phase) {
      case 'squat': return '스쿼트 자세 - 무릎을 더 굽혀보세요';
      case 'pushup': return '푸시업 자세 - 가슴을 바닥에 가깝게';
      case 'up': return '점프! - 폭발적으로 점프하세요';
      default: return '버피 자세를 취해보세요';
    }
  }
} 