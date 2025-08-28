import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

/**
 * Situp 운동 분석기
 * - 상체 굴곡 각도 기반 페이즈 전환으로 반복 수 계산
 */
export class SitupAnalyzer extends BaseAnalyzer {
  constructor() {
    super('situp', 'core');
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE } = POSE_CONSTANTS;

    const shL = landmarks[LEFT_SHOULDER], shR = landmarks[RIGHT_SHOULDER];
    const hipL = landmarks[LEFT_HIP], hipR = landmarks[RIGHT_HIP];
    const kneeL = landmarks[LEFT_KNEE], kneeR = landmarks[RIGHT_KNEE];

    if (!this.validateLandmarks([shL, shR, hipL, hipR, kneeL, kneeR])) {
      return this.createErrorAnalysis('핵심 관절점을 찾을 수 없습니다');
    }

    // 상체 굴곡 각도(어깨-엉덩이-무릎)
    const left = AngleCalculator.calculateAngle(shL, hipL, kneeL);
    const right = AngleCalculator.calculateAngle(shR, hipR, kneeR);
    const flex = AngleCalculator.avg(left, right); // 작아질수록 상체가 올라옴

    const isUp = flex < 120;   // 상체 충분히 올라옴
    const isDown = flex > 150; // 누운 자세에 가까움

    if (this.stateRef.phase === 'up' && isDown) {
      this.stateRef.phase = 'down';
    } else if (this.stateRef.phase === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }

    const isCorrectForm = flex < 110;

    return {
      exerciseType: 'situp',
      currentCount: this.stateRef.count,
      isCorrectForm,
      feedback: isCorrectForm ? '좋아요! 상체를 충분히 올렸어요' : '상체를 더 올려 복부 수축을 느껴보세요',
      confidence: this.calculateConfidence([shL, shR, hipL, hipR, kneeL, kneeR] as any)
    };
  }
} 