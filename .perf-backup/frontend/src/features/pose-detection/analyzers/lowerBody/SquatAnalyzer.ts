import { BaseAnalyzer, ExerciseAnalysis, FormAssessment } from '../base/BaseAnalyzer';
import { Point3D, AngleCalculator, AngleCalculationResult } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';
import { ExerciseState } from '../../state/ExerciseStateMachine';
import { FrameAnalysisData } from '../../state/ExerciseStateMachine';

export class SquatAnalyzer extends BaseAnalyzer {
  private readonly MIN_SQUAT_ANGLE = 90; // 무릎 각도 기준
  private readonly MAX_SQUAT_ANGLE = 160;
  private readonly IDEAL_SQUAT_DEPTH = 100; // 이상적인 스쿼트 깊이
  private readonly HIP_KNEE_RATIO_THRESHOLD = 0.9;
  private readonly KNEE_OVER_TOE_THRESHOLD = 0.1; // 무릎이 발끝을 넘지 않도록

  constructor() {
    super('squat', 'lowerBody');
  }

  analyze(landmarks: Point3D[]): ExerciseAnalysis {
    return this.analyzeWithStateMachine(landmarks);
  }

  protected createFrameAnalysisData(
    landmarks: Point3D[],
    timestamp: number,
    confidence: number
  ): FrameAnalysisData {
    const angles = this.calculateSquatAngles(landmarks);

    return {
      landmarks,
      angles,
      timestamp,
      confidence,
      exerciseType: 'squat'
    };
  }

  protected assessForm(frameData: FrameAnalysisData): FormAssessment {
    const { kneeAngle, hipKneeRatio, kneeOverToe, backAlignment, footAlignment } = frameData.angles;

    const issues: string[] = [];
    const corrections: string[] = [];
    const strengths: string[] = [];

    let score = 100;

    // 1. 스쿼트 깊이 평가
    if (kneeAngle.value > this.IDEAL_SQUAT_DEPTH) {
      issues.push('스쿼트 깊이가 부족합니다');
      corrections.push('더 깊게 앉아보세요');
      score -= 20;
    } else if (kneeAngle.value < this.MIN_SQUAT_ANGLE) {
      issues.push('너무 깊게 앉았습니다');
      corrections.push('무릎에 무리가 가지 않도록 조절하세요');
      score -= 15;
    } else {
      strengths.push('적절한 스쿼트 깊이입니다');
    }

    // 2. 무릎과 발끝 정렬 평가
    if (Math.abs(kneeOverToe.value) > this.KNEE_OVER_TOE_THRESHOLD) {
      if (kneeOverToe.value > 0) {
        issues.push('무릎이 발끝을 넘어갑니다');
        corrections.push('무릎을 발끝 방향으로 유지하세요');
      } else {
        issues.push('무릎이 발끝보다 뒤로 빠졌습니다');
        corrections.push('무릎을 약간 앞으로 내밀어보세요');
      }
      score -= 15;
    } else {
      strengths.push('무릎과 발끝 정렬이 좋습니다');
    }

    // 3. 등과 엉덩이 정렬 평가
    if (backAlignment.value < 160) {
      issues.push('등이 굽어있습니다');
      corrections.push('등을 펴고 가슴을 내밀어보세요');
      score -= 15;
    } else {
      strengths.push('등과 엉덩이 정렬이 좋습니다');
    }

    // 4. 발 정렬 평가
    if (Math.abs(footAlignment.value) > 15) {
      issues.push('발이 벌어져 있습니다');
      corrections.push('발을 어깨 너비로 유지하세요');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      corrections,
      strengths
    };
  }

  protected setupCustomStateConditions(): void {
    this.stateMachine.setCustomConditions({
      isContract: (data) => {
        const kneeAngle = data.angles.kneeAngle?.value || 180;
        const hipKneeRatio = data.angles.hipKneeRatio?.value || 1.0;
        return kneeAngle < 140 && hipKneeRatio < 1.1;
      },
      isRelax: (data) => {
        const kneeAngle = data.angles.kneeAngle?.value || 180;
        return kneeAngle < this.MIN_SQUAT_ANGLE;
      },
      isReady: (data) => {
        const kneeAngle = data.angles.kneeAngle?.value || 180;
        return kneeAngle > this.MAX_SQUAT_ANGLE;
      }
    });
  }

  private calculateSquatAngles(landmarks: Point3D[]): { [key: string]: AngleCalculationResult } {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE, LEFT_SHOULDER, RIGHT_SHOULDER } = POSE_CONSTANTS;

    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];

    // 무릎 각도 계산
    const leftKneeAngle = AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle);
    const kneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);

    // 엉덩이-무릎 비율 계산 (깊이 판단)
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const kneeHeight = (leftKnee.y + rightKnee.y) / 2;
    const hipKneeRatio = kneeHeight / hipHeight;

    // 무릎과 발끝 정렬 계산
    const leftKneeOverToe = leftKnee.x - leftAnkle.x;
    const rightKneeOverToe = rightKnee.x - rightAnkle.x;
    const kneeOverToe = (leftKneeOverToe + rightKneeOverToe) / 2;

    // 등 정렬 계산 (어깨-엉덩이 각도)
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    } as Point3D;
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    } as Point3D;

    // 임의의 기준점 생성 (등 정렬 계산용)
    const backReference = {
      x: hipMidpoint.x,
      y: hipMidpoint.y - 50 // 엉덩이 위쪽 기준점
    } as Point3D;

    const backAlignment = AngleCalculator.calculateAngle(shoulderMidpoint, hipMidpoint, backReference);

    // 발 정렬 계산
    const footAlignment = AngleCalculator.calculateAngle(
      leftAnkle,
      { x: (leftAnkle.x + rightAnkle.x) / 2, y: leftAnkle.y } as Point3D,
      rightAnkle
    );

    return {
      kneeAngle,
      leftKneeAngle,
      rightKneeAngle,
      hipKneeRatio: { value: hipKneeRatio, confidence: Math.min(leftKneeAngle.confidence, rightKneeAngle.confidence) },
      kneeOverToe: { value: kneeOverToe, confidence: Math.min(leftKneeAngle.confidence, rightKneeAngle.confidence) },
      backAlignment,
      footAlignment
    };
  }

  private calculateConfidence(landmarks: Point3D[]): number {
    const relevantPoints = [
      landmarks[POSE_CONSTANTS.LEFT_HIP],
      landmarks[POSE_CONSTANTS.RIGHT_HIP],
      landmarks[POSE_CONSTANTS.LEFT_KNEE],
      landmarks[POSE_CONSTANTS.RIGHT_KNEE],
      landmarks[POSE_CONSTANTS.LEFT_ANKLE],
      landmarks[POSE_CONSTANTS.RIGHT_ANKLE]
    ];

    const validPoints = relevantPoints.filter(point =>
      point && typeof point.visibility === 'number' && point.visibility > 0.5
    );

    return validPoints.length / relevantPoints.length;
  }
} 