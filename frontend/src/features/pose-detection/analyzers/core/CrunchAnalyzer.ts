import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

/**
 * Crunch 운동 분석기
 * - Situp보다 작은 가동범위 기준으로 페이즈 전환
 */
export class CrunchAnalyzer extends BaseAnalyzer {
  constructor() {
    super('crunch', 'core');
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
    const flex = AngleCalculator.avg(left, right);

    // 크런치: situp보다 작은 범위
    const isUp = flex < 140;  // 살짝만 올라와도 인정
    const isDown = flex > 160;

    if (this.stateRef.phase === 'up' && isDown) {
      this.stateRef.phase = 'down';
    } else if (this.stateRef.phase === 'down' && isUp) {
      this.stateRef.phase = 'up';
      this.stateRef.count += 1;
    }

    const isCorrectForm = flex < 135;

    return {
      exerciseType: 'crunch',
      currentCount: this.stateRef.count,
      isCorrectForm,
      feedback: isCorrectForm ? '좋아요! 복부에 힘을 유지하세요' : '턱과 가슴의 간격 유지하며 상체를 살짝 들어 올리세요',
      confidence: this.calculateConfidence([shL, shR, hipL, hipR, kneeL, kneeR] as any)
    };
  }
} 