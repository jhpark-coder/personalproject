import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class SidePlankAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number; side: 'left' | 'right' } };
  
  // 사이드 플랭크 각도 임계값 
  private readonly PLANK_ANGLE_MIN = 160;  // 몸의 직선성 최소 각도
  private readonly PLANK_ANGLE_MAX = 180;  // 완벽한 직선
  
  // 측면 기울기 임계값 (어깨-엉덩이-무릎 각도)
  private readonly SIDE_ANGLE_MIN = 140;   // 옆으로 누운 각도 최소
  
  // 시간 추적
  private startTime: number | null = null;
  private holdDuration: number = 0;

  constructor() {
    super('side_plank', 'core');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number; side: 'left' | 'right' } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_SHOULDER, RIGHT_SHOULDER,
      LEFT_ELBOW, RIGHT_ELBOW,
      LEFT_HIP, RIGHT_HIP, 
      LEFT_KNEE, RIGHT_KNEE,
      LEFT_ANKLE, RIGHT_ANKLE,
      NOSE 
    } = POSE_CONSTANTS;

    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftElbow = landmarks[LEFT_ELBOW];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const nose = landmarks[NOSE];

    // 가시성 임계값
    const isVisible = (p: any, thr = 0.3) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 사이드 플랭크는 전신이 보여야 함
    const isFullBodyVisible = isVisible(nose, 0.3) &&
                              (isVisible(leftShoulder, 0.3) || isVisible(rightShoulder, 0.3)) &&
                              (isVisible(leftElbow, 0.2) || isVisible(rightElbow, 0.2)) &&
                              (isVisible(leftHip, 0.3) && isVisible(rightHip, 0.3)) &&
                              (isVisible(leftKnee, 0.3) && isVisible(rightKnee, 0.3)) &&
                              (isVisible(leftAnkle, 0.2) || isVisible(rightAnkle, 0.2));
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('전신이 화면에 나오도록 조정해주세요');
    }

    // 어느 쪽으로 누워있는지 판단 (어깨 위치로 결정)
    const isLayingOnLeft = leftShoulder.y > rightShoulder.y; // 왼쪽이 아래
    const isLayingOnRight = rightShoulder.y > leftShoulder.y; // 오른쪽이 아래
    
    if (!isLayingOnLeft && !isLayingOnRight) {
      return this.createErrorAnalysis('옆으로 누운 자세를 취해주세요');
    }

    // 현재 측면 결정
    const currentSide: 'left' | 'right' = isLayingOnLeft ? 'left' : 'right';
    
    // 몸의 직선성 계산 (어깨-엉덩이-발목)
    let bodyLineAngle = 0;
    let confidencePoints: any[] = [];
    
    if (currentSide === 'left' && leftAnkle) {
      // 왼쪽으로 누웠을 때: 왼쪽 어깨-엉덩이-발목
      bodyLineAngle = AngleCalculator.calculateAngle(leftShoulder, leftHip, leftAnkle);
      confidencePoints = [leftShoulder, leftHip, leftAnkle, rightHip];
    } else if (currentSide === 'right' && rightAnkle) {
      // 오른쪽으로 누웠을 때: 오른쪽 어깨-엉덩이-발목
      bodyLineAngle = AngleCalculator.calculateAngle(rightShoulder, rightHip, rightAnkle);
      confidencePoints = [rightShoulder, rightHip, rightAnkle, leftHip];
    } else {
      return this.createErrorAnalysis('발목이 화면에 보이지 않습니다');
    }

    // 플랭크 자세 유지 여부 판단
    const isHoldingPlank = bodyLineAngle >= this.PLANK_ANGLE_MIN && bodyLineAngle <= this.PLANK_ANGLE_MAX;
    
    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || { ...this.stateRef, side: currentSide as 'left' | 'right' };
    
    // 시간 기반 카운트 (30초 단위)
    const now = Date.now();
    
    if (isHoldingPlank) {
      if (this.startTime === null) {
        this.startTime = now;
      }
      this.holdDuration = Math.floor((now - this.startTime) / 1000); // 초 단위
      
      // 30초마다 카운트 증가
      if (this.holdDuration > 0 && this.holdDuration % 30 === 0 && this.holdDuration !== state.count * 30) {
        state.count = Math.floor(this.holdDuration / 30);
      }
      
      state.phase = 'holding';
      state.side = currentSide;
    } else {
      if (this.startTime !== null) {
        // 자세가 무너졌을 때 시간 리셋
        this.startTime = null;
        this.holdDuration = 0;
      }
      state.phase = 'setup';
    }
    
    return {
      exerciseType: 'side_plank',
      currentCount: this.holdDuration, // 초 단위로 표시
      isCorrectForm: isHoldingPlank,
      feedback: this.getFeedback(state.phase, currentSide, bodyLineAngle),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(phase: string, side: 'left' | 'right', bodyAngle: number): string {
    const sideText = side === 'left' ? '왼쪽' : '오른쪽';
    
    if (phase === 'holding') {
      return `좋아요! ${sideText} 사이드 플랭크를 유지하고 있습니다 (${this.holdDuration}초)`;
    }
    
    if (bodyAngle < this.PLANK_ANGLE_MIN) {
      return `${sideText} 사이드 플랭크 자세에서 몸을 더 곧게 펴세요`;
    }
    
    return `${sideText}으로 누워 팔꿈치로 몸을 지탱하고 일직선을 만드세요`;
  }
}