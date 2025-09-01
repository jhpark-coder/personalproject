import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class JumpingJackAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // 팔 각도 임계값 (어깨-팔꿈치-손목 각도)
  private readonly ARM_UP_THRESHOLD = 120;    // 팔이 올라간 상태
  private readonly ARM_DOWN_THRESHOLD = 60;   // 팔이 내려간 상태
  
  // 다리 간격 임계값 (엉덩이 간격 기준)
  private readonly LEG_WIDE_THRESHOLD = 0.3;  // 다리 벌린 상태 (어깨 너비 대비)
  private readonly LEG_CLOSE_THRESHOLD = 0.15; // 다리 모은 상태
  
  // 카운트 쿨다운 - 너무 빠른 연속 카운트 방지
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 800; // 0.8초 쿨다운 (빠른 운동)

  constructor() {
    super('jumping_jack', 'cardio');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_HIP, RIGHT_HIP, 
      LEFT_SHOULDER, RIGHT_SHOULDER,
      LEFT_ELBOW, RIGHT_ELBOW,
      LEFT_WRIST, RIGHT_WRIST,
      LEFT_ANKLE, RIGHT_ANKLE,
      NOSE, LEFT_EYE, RIGHT_EYE 
    } = POSE_CONSTANTS;

    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftElbow = landmarks[LEFT_ELBOW];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const nose = landmarks[NOSE];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];

    // 가시성 임계값 조정 - 멀리서도 인식 가능하도록
    const isVisible = (p: any, thr = 0.2) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 머리부터 발까지 모두 보여야 함
    const isFullBodyVisible = isVisible(nose, 0.3) && 
                              (isVisible(leftEye, 0.25) || isVisible(rightEye, 0.25)) &&
                              isVisible(leftShoulder, 0.25) && isVisible(rightShoulder, 0.25) &&
                              isVisible(leftElbow, 0.2) && isVisible(rightElbow, 0.2) &&
                              isVisible(leftWrist, 0.2) && isVisible(rightWrist, 0.2) &&
                              isVisible(leftHip, 0.25) && isVisible(rightHip, 0.25) &&
                              (isVisible(leftAnkle, 0.2) || isVisible(rightAnkle, 0.2));
    
    // 너무 가까운지 체크
    const isTooClose = nose && (leftAnkle || rightAnkle) && 
                       Math.abs((leftAnkle?.y || rightAnkle?.y || 0) - nose.y) < 0.5;
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('전신이 화면에 나오도록 뒤로 물러나 주세요');
    }
    
    if (isTooClose) {
      return this.createErrorAnalysis('너무 가까워요. 한 발짝 뒤로 물러나 주세요');
    }

    // 팔 각도 계산 (어깨-팔꿈치-손목)
    const leftArmAngle = AngleCalculator.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = AngleCalculator.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = AngleCalculator.avg(leftArmAngle, rightArmAngle);

    // 다리 간격 계산 (엉덩이 간격을 어깨 너비로 정규화)
    const hipDistance = Math.abs(leftHip.x - rightHip.x);
    const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
    const normalizedLegGap = shoulderDistance > 0 ? hipDistance / shoulderDistance : 0;

    // 자세 판별
    const isArmsUp = avgArmAngle >= this.ARM_UP_THRESHOLD;
    const isArmsDown = avgArmAngle <= this.ARM_DOWN_THRESHOLD;
    const isLegsWide = normalizedLegGap >= this.LEG_WIDE_THRESHOLD;
    const isLegsClose = normalizedLegGap <= this.LEG_CLOSE_THRESHOLD;

    // 점핑잭 상태: 팔 위 + 다리 벌림 = "open", 팔 아래 + 다리 모음 = "close"
    const isOpenPosition = isArmsUp && isLegsWide;
    const isClosePosition = isArmsDown && isLegsClose;

    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    const was = state.phase;

    // 상태 전환
    if (was === 'close' && isOpenPosition) {
      state.phase = 'open';
    } else if (was === 'open' && isClosePosition) {
      // 카운트 쿨다운 체크
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.phase = 'close';
        state.count += 1;
        this.lastCountTime = now;
      }
    }

    const isCorrectForm = isOpenPosition || isClosePosition;
    
    // 신뢰도 계산
    const confidencePoints = [
      leftShoulder, rightShoulder, leftElbow, rightElbow, 
      leftWrist, rightWrist, leftHip, rightHip, leftAnkle, rightAnkle
    ];
    
    return {
      exerciseType: 'jumping_jack',
      currentCount: state.count,
      isCorrectForm,
      feedback: this.getFeedback(state.phase, avgArmAngle, normalizedLegGap),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(phase: string, armAngle: number, legGap: number): string {
    if (phase === 'open') {
      return '좋아요! 팔을 위로 올리고 다리를 벌려주세요';
    }
    if (phase === 'close') {
      return '팔을 내리고 다리를 모아주세요';
    }
    return '팔과 다리를 동시에 움직이며 리듬감 있게 운동하세요';
  }
}