import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class HighKneesAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // 무릎 높이 임계값 (엉덩이 대비 상대 위치)
  private readonly KNEE_HIGH_THRESHOLD = -0.1; // 무릎이 엉덩이보다 위로 올라간 상태
  private readonly KNEE_LOW_THRESHOLD = 0.1;   // 무릎이 엉덩이보다 아래 있는 상태
  
  // 좌우 무릎 추적
  private lastActiveKnee: 'left' | 'right' | null = null;
  
  // 카운트 쿨다운
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 600; // 0.6초 쿨다운 (빠른 운동)

  constructor() {
    super('high_knees', 'cardio');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_HIP, RIGHT_HIP, 
      LEFT_KNEE, RIGHT_KNEE,
      LEFT_ANKLE, RIGHT_ANKLE,
      NOSE, LEFT_EYE, RIGHT_EYE 
    } = POSE_CONSTANTS;

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
    const isVisible = (p: any, thr = 0.3) => !!p && (p.visibility ?? 0) > thr;
    
    // 상체와 하체 모두 체크
    const isFullBodyVisible = isVisible(nose, 0.4) && 
                              (isVisible(leftEye, 0.3) || isVisible(rightEye, 0.3)) &&
                              (isVisible(leftHip, 0.3) && isVisible(rightHip, 0.3)) &&
                              (isVisible(leftKnee, 0.3) && isVisible(rightKnee, 0.3));
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('상체와 하체가 모두 화면에 나오도록 조정해주세요');
    }

    // 엉덩이 기준점 (평균 위치)
    const hipY = (leftHip.y + rightHip.y) / 2;
    
    // 각 무릎의 상대적 높이 계산
    const leftKneeRelativeY = leftKnee.y - hipY;  // 음수 = 높게 올라감
    const rightKneeRelativeY = rightKnee.y - hipY;
    
    // 무릎이 높이 올라갔는지 판별
    const isLeftKneeHigh = leftKneeRelativeY <= this.KNEE_HIGH_THRESHOLD;
    const isRightKneeHigh = rightKneeRelativeY <= this.KNEE_HIGH_THRESHOLD;
    const isLeftKneeLow = leftKneeRelativeY >= this.KNEE_LOW_THRESHOLD;
    const isRightKneeLow = rightKneeRelativeY >= this.KNEE_LOW_THRESHOLD;
    
    // 현재 높게 올린 무릎 결정
    let currentHighKnee: 'left' | 'right' | null = null;
    if (isLeftKneeHigh && !isRightKneeHigh) {
      currentHighKnee = 'left';
    } else if (isRightKneeHigh && !isLeftKneeHigh) {
      currentHighKnee = 'right';
    }
    
    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    
    // 좌우 무릎 교대로 카운트
    if (currentHighKnee && currentHighKnee !== this.lastActiveKnee) {
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.count += 1;
        this.lastCountTime = now;
        this.lastActiveKnee = currentHighKnee;
        state.phase = currentHighKnee + '_high';
      }
    }
    
    // 둘 다 아래 있을 때는 중간 상태
    if (isLeftKneeLow && isRightKneeLow) {
      state.phase = 'both_low';
      this.lastActiveKnee = null;
    }

    const isCorrectForm = isLeftKneeHigh || isRightKneeHigh;
    
    // 신뢰도 계산
    const confidencePoints = [
      leftHip, rightHip, leftKnee, rightKnee
    ];
    
    return {
      exerciseType: 'high_knees',
      currentCount: state.count,
      isCorrectForm,
      feedback: this.getFeedback(currentHighKnee, leftKneeRelativeY, rightKneeRelativeY),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(highKnee: 'left' | 'right' | null, leftKneeY: number, rightKneeY: number): string {
    if (highKnee === 'left') {
      return '좋아요! 왼쪽 무릎을 높게 올렸습니다. 오른쪽도 준비하세요';
    }
    if (highKnee === 'right') {
      return '좋아요! 오른쪽 무릎을 높게 올렸습니다. 왼쪽도 준비하세요';
    }
    
    // 둘 다 낮을 때 어느 쪽이 더 높은지 안내
    if (leftKneeY < rightKneeY) {
      return '왼쪽 무릎을 더 높게 들어올리세요';
    } else {
      return '오른쪽 무릎을 더 높게 들어올리세요';
    }
  }
}