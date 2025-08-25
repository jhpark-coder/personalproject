import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class PushupAnalyzer extends BaseAnalyzer {
  constructor() {
    super('pushup', 'upperBody');
  }
  
  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE } = POSE_CONSTANTS;
    
    const shL = landmarks[LEFT_SHOULDER], shR = landmarks[RIGHT_SHOULDER];
    const elL = landmarks[LEFT_ELBOW], elR = landmarks[RIGHT_ELBOW];
    const wrL = landmarks[LEFT_WRIST], wrR = landmarks[RIGHT_WRIST];
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const ankleL = landmarks[LEFT_ANKLE], ankleR = landmarks[RIGHT_ANKLE];
    
    if (!this.validateLandmarks([shL, shR, elL, elR, wrL, wrR, hipL, hipR, ankleL, ankleR])) {
      return this.createErrorAnalysis('상체 관절점을 찾을 수 없습니다');
    }
    
    const elbowAngle = AngleCalculator.avg(
      AngleCalculator.calculateAngle(shL, elL, wrL),
      AngleCalculator.calculateAngle(shR, elR, wrR)
    );
    
    const bodyL = AngleCalculator.calculateAngle(shL, hipL, ankleL);
    const bodyR = AngleCalculator.calculateAngle(shR, hipR, ankleR);
    const bodyStraight = AngleCalculator.avg(bodyL, bodyR);
    
    return this.analyzePushupPhase(elbowAngle, bodyStraight);
  }
  
  private analyzePushupPhase(elbowAngle: number, bodyStraight: number): ExerciseAnalysis {
    const isDown = elbowAngle <= 90;
    const isUp = elbowAngle >= 160;
    const goodForm = bodyStraight >= 160;
    const was = this.stateRef.phase;
    
    if (was === 'up' && isDown) this.stateRef.phase = 'down';
    if (was === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }
    
    return {
      exerciseType: 'pushup',
      currentCount: this.stateRef.count,
      isCorrectForm: goodForm,
      feedback: this.getPushupFeedback(was, goodForm),
      confidence: this.calculateConfidence([this.stateRef.phase === 'down' ? 0.8 : 0.9])
    };
  }
  
  private getPushupFeedback(phase: string, goodForm: boolean): string {
    if (!goodForm) return '몸통을 일직선으로 유지하세요';
    
    switch (phase) {
      case 'down': return '바닥 근처 - 가슴을 바닥에 가깝게';
      case 'up': return '완전 펴기 - 팔을 완전히 펴세요';
      default: return '푸시업 자세를 취해보세요';
    }
  }
} 