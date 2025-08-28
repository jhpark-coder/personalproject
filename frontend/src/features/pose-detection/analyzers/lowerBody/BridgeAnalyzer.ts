import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

/**
 * Bridge 운동 분석기
 * - 힙 상승/하강 페이즈를 추적하여 반복 수 계산
 * - 어깨-엉덩이-무릎 라인 각도와 힙 높이를 활용해 폼 판별
 */
export class BridgeAnalyzer extends BaseAnalyzer {
  constructor() {
    super('bridge', 'lowerBody');
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE } = POSE_CONSTANTS;

    const shL = landmarks[LEFT_SHOULDER], shR = landmarks[RIGHT_SHOULDER];
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];

    if (!this.validateLandmarks([shL, shR, hipL, hipR, kneeL, kneeR])) {
      return this.createErrorAnalysis('핵심 관절점을 찾을 수 없습니다');
    }

    // 좌/우 엉덩이 라인의 각도(어깨-엉덩이-무릎)
    const leftLine = AngleCalculator.calculateAngle(shL, hipL, kneeL);
    const rightLine = AngleCalculator.calculateAngle(shR, hipR, kneeR);
    const lineAngle = AngleCalculator.avg(leftLine, rightLine); // 180°에 가까울수록 일직선

    // 힙 높이(작을수록 카메라에 가까움이 아니고 화면 상단에 가까움: y값이 작을수록 위)
    const hipY = (hipL.y + hipR.y) / 2;
    const shoulderY = (shL.y + shR.y) / 2;
    const kneeY = (kneeL.y + kneeR.y) / 2;

    // 상대적 힙 상승 정도 (무릎과 어깨 사이에서 위치)
    const hipLiftRatio = 1 - (hipY - shoulderY) / (kneeY - shoulderY + 1e-6); // 0~1 정규화

    // 페이즈 판단 기준
    const isUp = lineAngle > 165 && hipLiftRatio > 0.6; // 거의 일직선 + 충분히 올림
    const isDown = lineAngle < 150 || hipLiftRatio < 0.4;

    if (this.stateRef.phase === 'up' && isDown) {
      this.stateRef.phase = 'down';
    } else if (this.stateRef.phase === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }

    const isCorrectForm = lineAngle > 165 && hipLiftRatio > 0.65;

    return {
      exerciseType: 'bridge',
      currentCount: this.stateRef.count,
      isCorrectForm,
      feedback: isCorrectForm ? '좋아요! 엉덩이를 충분히 올렸어요' : '엉덩이를 더 올려 일직선에 가깝게 유지하세요',
      confidence: this.calculateConfidence([shL, shR, hipL, hipR, kneeL, kneeR] as any)
    };
  }
} 