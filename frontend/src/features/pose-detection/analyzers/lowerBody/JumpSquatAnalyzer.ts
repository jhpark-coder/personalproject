import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class JumpSquatAnalyzer extends BaseAnalyzer {
  private readonly DOWN_THRESHOLD = 120;  // 스쿼트 하강 임계값
  private readonly UP_THRESHOLD = 160;    // 스쿼트 상승 임계값
  private readonly JUMP_THRESHOLD = 0.05; // 점프 감지 임계값 (Y축 변화)
  
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // Y축 기반 점프 감지
  private lastHipY: number | null = null;
  private smoothingHipY: number | null = null;
  private readonly HIP_Y_SMOOTH = 0.7; // 점프용 스무딩
  
  // 카운트 쿨다운 - 점프 운동이므로 조금 더 긴 쿨다운
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 1200; // 1.2초 쿨다운

  constructor() {
    super('jump_squat', 'lowerBody');
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

    // 가시성 임계값 조정
    const isVisible = (p: any, thr = 0.2) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 점프 운동이므로 전신이 보여야 함
    const isFullBodyVisible = isVisible(nose, 0.3) && 
                              (isVisible(leftEye, 0.25) || isVisible(rightEye, 0.25)) &&
                              (isVisible(leftShoulder, 0.25) || isVisible(rightShoulder, 0.25)) &&
                              (isVisible(leftHip, 0.25) && isVisible(rightHip, 0.25)) &&
                              (isVisible(leftKnee, 0.25) && isVisible(rightKnee, 0.25)) &&
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

    // 스쿼트 각도 계산 (기본 스쿼트와 동일)
    let phaseMetric = 0;
    let isDown = false;
    let isUp = false;
    let isJumping = false;
    let confidencePoints: any[] = [];

    // 발목이 보일 때 - 정확한 각도 계산
    const canUseAnkles = isVisible(leftAnkle) && isVisible(rightAnkle) && 
                         isVisible(leftKnee) && isVisible(rightKnee) && 
                         isVisible(leftHip) && isVisible(rightHip);

    if (canUseAnkles) {
      const leftKneeAngle = AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle);
      const kneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);
      phaseMetric = kneeAngle;
      isDown = kneeAngle <= this.DOWN_THRESHOLD;
      isUp = kneeAngle >= this.UP_THRESHOLD;
      confidencePoints = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    } else {
      // 폴백: 어깨-엉덩이-무릎 각도 사용
      const s = isVisible(leftShoulder) ? leftShoulder : rightShoulder;
      const hip = isVisible(leftHip) ? leftHip : rightHip;
      const knee = isVisible(leftKnee) ? leftKnee : rightKnee;
      
      if (s && hip && knee) {
        const hipAngle = AngleCalculator.calculateAngle(s, hip, knee);
        phaseMetric = hipAngle;
        const DOWN_HIP = 85;
        const UP_HIP = 115;
        isDown = hipAngle <= DOWN_HIP;
        isUp = hipAngle >= UP_HIP;
        confidencePoints = [s, hip, knee];
      }
    }

    // 점프 감지 - Y축 이동 기반
    if (leftHip && rightHip) {
      const hipY = (leftHip.y + rightHip.y) / 2;
      
      // 지수평활로 노이즈 감소
      if (this.smoothingHipY == null) this.smoothingHipY = hipY;
      this.smoothingHipY = this.HIP_Y_SMOOTH * this.smoothingHipY + (1 - this.HIP_Y_SMOOTH) * hipY;
      
      if (this.lastHipY !== null) {
        const dy = this.lastHipY - this.smoothingHipY; // Y축은 위쪽이 작은 값
        isJumping = dy > this.JUMP_THRESHOLD; // 급격한 위쪽 이동 = 점프
      }
      
      this.lastHipY = this.smoothingHipY;
      confidencePoints.push(leftHip, rightHip);
    }

    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    const was = state.phase;

    // 점프 스쿼트 상태 전환: down -> jump -> up
    if (was === 'up' && isDown) {
      state.phase = 'down';
    } else if (was === 'down' && isJumping) {
      state.phase = 'jump';
    } else if (was === 'jump' && isUp) {
      // 카운트 쿨다운 체크
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.phase = 'up';
        state.count += 1;
        this.lastCountTime = now;
      }
    }

    const isCorrectForm = isDown || isUp || isJumping;
    
    return {
      exerciseType: 'jump_squat',
      currentCount: state.count,
      isCorrectForm,
      feedback: this.getFeedback(state.phase, phaseMetric, isJumping),
      confidence: Math.max(0, Math.min(1, this.calculateConfidence(confidencePoints) - (canUseAnkles ? 0 : 0.15)))
    };
  }

  private getFeedback(phase: string, kneeAngle: number, isJumping: boolean): string {
    if (phase === 'down') {
      return kneeAngle < 90 ? '너무 깊어요, 무릎에 무리가 가지 않게 조절하세요' : '좋아요! 엉덩이를 뒤로 빼며 앉듯이 내려가세요';
    }
    if (phase === 'jump') {
      return '힘차게 점프하세요! 발끝으로 밀어올리세요';
    }
    if (phase === 'up') {
      return '착지할 때 무릎을 살짝 굽혀 충격을 흡수하세요';
    }
    return '스쿼트 자세로 앉았다가 힘차게 점프하세요';
  }
}