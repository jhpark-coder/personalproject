import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class WallSitAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // 월 시트 각도 임계값
  private readonly KNEE_ANGLE_MIN = 80;   // 최소 무릎 각도
  private readonly KNEE_ANGLE_MAX = 100;  // 최대 무릎 각도 (90도 기준)
  private readonly BACK_STRAIGHT_MIN = 160; // 등의 직선성
  
  // 시간 추적
  private startTime: number | null = null;
  private holdDuration: number = 0;
  
  // 안정성 확인을 위한 연속 프레임 카운터
  private stableFrameCount: number = 0;
  private readonly STABLE_FRAMES_REQUIRED = 10; // 안정 판정을 위한 연속 프레임

  constructor() {
    super('wall_sit', 'lowerBody');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_SHOULDER, RIGHT_SHOULDER,
      LEFT_HIP, RIGHT_HIP, 
      LEFT_KNEE, RIGHT_KNEE,
      LEFT_ANKLE, RIGHT_ANKLE,
      NOSE, LEFT_EYE, RIGHT_EYE 
    } = POSE_CONSTANTS;

    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const nose = landmarks[NOSE];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];

    // 가시성 임계값
    const isVisible = (p: any, thr = 0.2) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 월 시트는 전신이 보여야 함
    const isFullBodyVisible = isVisible(nose, 0.3) && 
                              (isVisible(leftEye, 0.25) || isVisible(rightEye, 0.25)) &&
                              (isVisible(leftShoulder, 0.25) && isVisible(rightShoulder, 0.25)) &&
                              (isVisible(leftHip, 0.25) && isVisible(rightHip, 0.25)) &&
                              (isVisible(leftKnee, 0.25) && isVisible(rightKnee, 0.25)) &&
                              (isVisible(leftAnkle, 0.2) && isVisible(rightAnkle, 0.2));
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('전신이 화면에 나오도록 뒤로 물러나 주세요');
    }

    // 무릎 각도 계산 (엉덩이-무릎-발목)
    const leftKneeAngle = AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);
    
    // 등의 직선성 계산 (어깨-엉덩이-무릎)
    const avgShoulder = { 
      x: (leftShoulder.x + rightShoulder.x) / 2, 
      y: (leftShoulder.y + rightShoulder.y) / 2 
    };
    const avgHip = { 
      x: (leftHip.x + rightHip.x) / 2, 
      y: (leftHip.y + rightHip.y) / 2 
    };
    const avgKnee = { 
      x: (leftKnee.x + rightKnee.x) / 2, 
      y: (leftKnee.y + rightKnee.y) / 2 
    };
    
    const backAngle = AngleCalculator.calculateAngle(avgShoulder, avgHip, avgKnee);
    
    // 월 시트 자세 판별
    const isKneeAngleCorrect = avgKneeAngle >= this.KNEE_ANGLE_MIN && avgKneeAngle <= this.KNEE_ANGLE_MAX;
    const isBackStraight = backAngle >= this.BACK_STRAIGHT_MIN;
    const isWallSitPosition = isKneeAngleCorrect && isBackStraight;
    
    // 안정성 확인 (연속으로 정확한 자세를 유지해야 카운트 시작)
    if (isWallSitPosition) {
      this.stableFrameCount += 1;
    } else {
      this.stableFrameCount = 0;
    }
    
    const isStableWallSit = this.stableFrameCount >= this.STABLE_FRAMES_REQUIRED;
    
    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    
    // 시간 기반 카운트
    const now = Date.now();
    
    if (isStableWallSit) {
      if (this.startTime === null) {
        this.startTime = now;
      }
      this.holdDuration = Math.floor((now - this.startTime) / 1000); // 초 단위
      
      // 10초마다 카운트 증가
      if (this.holdDuration > 0 && this.holdDuration % 10 === 0 && this.holdDuration !== state.count * 10) {
        state.count = Math.floor(this.holdDuration / 10);
      }
      
      state.phase = 'holding';
    } else {
      if (this.startTime !== null) {
        // 자세가 무너졌을 때 시간 리셋
        this.startTime = null;
        this.holdDuration = 0;
        this.stableFrameCount = 0;
      }
      state.phase = 'setup';
    }
    
    // 신뢰도 계산
    const confidencePoints = [
      leftShoulder, rightShoulder, leftHip, rightHip, 
      leftKnee, rightKnee, leftAnkle, rightAnkle
    ];
    
    return {
      exerciseType: 'wall_sit',
      currentCount: this.holdDuration, // 초 단위로 표시
      isCorrectForm: isWallSitPosition,
      feedback: this.getFeedback(state.phase, avgKneeAngle, backAngle, this.holdDuration),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(phase: string, kneeAngle: number, backAngle: number, duration: number): string {
    if (phase === 'holding') {
      return `훌륭합니다! 월 시트를 ${duration}초 동안 유지하고 있습니다`;
    }
    
    if (kneeAngle < this.KNEE_ANGLE_MIN) {
      return '더 아래로 앉아서 무릎을 90도로 만드세요';
    }
    
    if (kneeAngle > this.KNEE_ANGLE_MAX) {
      return '무릎을 더 굽혀서 90도 각도를 만드세요';
    }
    
    if (backAngle < this.BACK_STRAIGHT_MIN) {
      return '등을 벽에 완전히 밀착시키고 곧게 펴세요';
    }
    
    return '벽에 등을 대고 무릎을 90도로 굽혀 앉은 자세를 취하세요';
  }
}