import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class SquatAnalyzer extends BaseAnalyzer {
  private readonly DOWN_THRESHOLD = 120;  // 무릎 각도 120도 이하일 때 스쿼트 다운 (더 엄격하게)
  private readonly UP_THRESHOLD = 160;    // 무릎 각도 160도 이상일 때 스쿼트 업 (더 엄격하게)
  private externalStateRef?: { current: { phase: string; count: number } };
  // Y-축 기반 보조 판별 (카메라 각도/가림 등으로 각도 계산이 불안정할 때 사용)
  private lastHipY: number | null = null;
  private smoothingHipY: number | null = null;
  private readonly HIP_Y_SMOOTH = 0.8; // 더 강한 스무딩 (노이즈 감소)
  private readonly Y_DOWN_DELTA = 0.08; // 훨씬 큰 변화 필요 (단순 몸 숙임 방지)
  private readonly Y_UP_DELTA = 0.08;   // 훨씬 큰 변화 필요 (단순 몸 숙임 방지)
  
  // 카운트 쿨다운 - 너무 빠른 연속 카운트 방지
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 800; // 0.8초 쿨다운으로 증가

  constructor() {
    super('squat', 'lowerBody');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE, LEFT_SHOULDER, RIGHT_SHOULDER, NOSE, LEFT_EYE, RIGHT_EYE } = POSE_CONSTANTS;

    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const nose = landmarks[NOSE];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];

    // 가시성 임계값 조정 - 더 엄격하게 체크
    const isVisible = (p: any, thr = 0.4) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 머리부터 발까지 모두 보여야 함 (더 엄격한 기준)
    const isFullBodyVisible = isVisible(nose, 0.5) && 
                              (isVisible(leftEye, 0.4) || isVisible(rightEye, 0.4)) &&
                              (isVisible(leftShoulder, 0.4) && isVisible(rightShoulder, 0.4)) &&
                              (isVisible(leftHip, 0.4) && isVisible(rightHip, 0.4)) &&
                              (isVisible(leftKnee, 0.4) && isVisible(rightKnee, 0.4)) &&
                              (isVisible(leftAnkle, 0.35) && isVisible(rightAnkle, 0.35));
    
    // 너무 가까운지 체크 (머리와 발목 사이 거리로 판단) - 더 엄격하게
    const isTooClose = nose && (leftAnkle || rightAnkle) && 
                       Math.abs((leftAnkle?.y || rightAnkle?.y || 0) - nose.y) < 0.5;
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('전신이 화면에 나오도록 뒤로 물러나 주세요');
    }
    
    if (isTooClose) {
      return this.createErrorAnalysis('너무 가까워요. 한 발짝 뒤로 물러나 주세요');
    }

    // 1) 기본: 무릎 각도(엉덩이-무릎-발목) — 발목이 보일 때
    const canUseAnkles = isVisible(leftAnkle) && isVisible(rightAnkle) && isVisible(leftKnee) && isVisible(rightKnee) && isVisible(leftHip) && isVisible(rightHip);
    // 2) 폴백: 한쪽 체인(어깨-엉덩이-무릎)만 보이더라도 동작
    const shoulderVisible = isVisible(leftShoulder) || isVisible(rightShoulder);
    const leftChain = isVisible(leftHip) && isVisible(leftKnee);
    const rightChain = isVisible(rightHip) && isVisible(rightKnee);
    const canUseHipFallback = shoulderVisible && (leftChain || rightChain);

    if (!(canUseAnkles || canUseHipFallback)) {
      return this.createErrorAnalysis('하체 관절점을 충분히 찾지 못했습니다');
    }

    let phaseMetric = 0; // 자세 판별 지표
    let isDown = false;
    let isUp = false;
    let confidencePoints: any[] = [];

    if (canUseAnkles) {
      const leftKneeAngle = AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle);
      const kneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);
      phaseMetric = kneeAngle;
      isDown = kneeAngle <= this.DOWN_THRESHOLD;
      isUp = kneeAngle >= this.UP_THRESHOLD;
      
      
      confidencePoints = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    } else {
      // 어깨-엉덩이-무릎 각도(엉덩이 각도)를 사용한 근사치 (한쪽 체인만 있어도 계산)
      const s = isVisible(leftShoulder) ? leftShoulder : rightShoulder;
      const hip = leftChain ? leftHip : rightHip;
      const knee = leftChain ? leftKnee : rightKnee;
      const hipAngle = AngleCalculator.calculateAngle(s, hip, knee);
      phaseMetric = hipAngle;
      // 폴백 임계값 (앉을수록 각도가 작아짐)
      const DOWN_HIP = 85;
      const UP_HIP = 115;
      isDown = hipAngle <= DOWN_HIP;
      isUp = hipAngle >= UP_HIP;
      confidencePoints = [s, hip, knee];
    }

    // 3) 추가 폴백: Y축 이동 기반(엉덩이 y좌표 평균) - 메인 판별이 실패했을 때 보조로 사용
    if ((leftHip && rightHip) && canUseAnkles) { // 발목이 보일 때만 Y축 보조 사용
      const hipY = (leftHip.y + rightHip.y) / 2;
      // 지수평활로 노이즈 감소
      if (this.smoothingHipY == null) this.smoothingHipY = hipY;
      this.smoothingHipY = this.HIP_Y_SMOOTH * this.smoothingHipY + (1 - this.HIP_Y_SMOOTH) * hipY;
      if (this.lastHipY == null) this.lastHipY = this.smoothingHipY;
      const dy = (this.smoothingHipY - this.lastHipY);
      const state = this.externalStateRef?.current || this.stateRef;
      
      // Y축 변화는 보조로만 사용 (주 판별이 애매할 때만)
      // 단순 몸 숙임과 구분하기 위해 무릎 각도도 함께 체크
      const leftKneeAngle = AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle);
      const kneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);
      
      // 무릎이 어느 정도 굽혀진 상태에서만 Y축 변화 고려
      if (!isDown && state.phase === 'up' && dy > this.Y_DOWN_DELTA && kneeAngle < 150) {
        isDown = true;
      } else if (!isUp && state.phase === 'down' && dy < -this.Y_UP_DELTA && kneeAngle > 130) {
        isUp = true;
      }
      this.lastHipY = this.smoothingHipY;
      confidencePoints.push(leftHip, rightHip);
    }

    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    const was = state.phase;
    
    if (was === 'up' && isDown) {
      state.phase = 'down';
    }
    if (was === 'down' && isUp) {
      // 카운트 쿨다운 체크 - 너무 빠른 연속 카운트 방지
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.phase = 'up';
        state.count += 1;
        this.lastCountTime = now;
      }
    }

    const isCorrectForm = isDown || isUp;
    
    return {
      exerciseType: 'squat',
      currentCount: state.count,
      isCorrectForm,
      feedback: canUseAnkles ? this.getFeedback(state.phase, phaseMetric) : '발목이 화면에 없어서 근사 분석 중입니다. 한 발짝 뒤로 물러나 주세요.',
      confidence: Math.max(0, Math.min(1, this.calculateConfidence(confidencePoints) - (canUseAnkles ? 0 : 0.15)))
    };
  }

  private getFeedback(phase: string, kneeAngle: number): string {
    if (phase === 'down') {
      return kneeAngle < 90 ? '너무 깊어요, 무릎에 무리가 가지 않게 조절하세요' : '좋아요! 엉덩이를 뒤로 빼며 천천히 내려가세요';
    }
    if (phase === 'up') {
      return '천천히 일어나며 무릎과 발끝 정렬을 유지하세요';
    }
    return '어깨를 펴고 발을 어깨 너비로 벌려 준비하세요';
  }
} 