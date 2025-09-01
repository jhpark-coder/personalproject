import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class DeadliftAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // 힙 힌지 패턴 각도 임계값
  private readonly HIP_HINGE_DOWN_THRESHOLD = 100; // 엉덩이 힌지 하강 (어깨-엉덩이-무릎)
  private readonly HIP_HINGE_UP_THRESHOLD = 140;   // 엉덩이 힌지 상승
  private readonly KNEE_BEND_THRESHOLD = 140;      // 무릎 굽힘 최대 (엉덩이-무릎-발목)
  
  // Y축 기반 보조 판별
  private lastHipY: number | null = null;
  private smoothingHipY: number | null = null;
  private readonly HIP_Y_SMOOTH = 0.8;
  private readonly Y_DOWN_DELTA = 0.03; // 힌지 패턴 하강
  private readonly Y_UP_DELTA = 0.03;   // 힌지 패턴 상승
  
  // 카운트 쿨다운
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 1200; // 1.2초 쿨다운

  constructor() {
    super('deadlift', 'lowerBody');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE, 
      LEFT_SHOULDER, RIGHT_SHOULDER, NOSE, LEFT_EYE, RIGHT_EYE 
    } = POSE_CONSTANTS;

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

    // 가시성 임계값
    const isVisible = (p: any, thr = 0.2) => !!p && (p.visibility ?? 0) > thr;
    
    // 전신 체크 - 데드리프트는 전신 운동
    const isFullBodyVisible = isVisible(nose, 0.3) && 
                              (isVisible(leftEye, 0.25) || isVisible(rightEye, 0.25)) &&
                              (isVisible(leftShoulder, 0.25) && isVisible(rightShoulder, 0.25)) &&
                              (isVisible(leftHip, 0.25) && isVisible(rightHip, 0.25)) &&
                              (isVisible(leftKnee, 0.25) && isVisible(rightKnee, 0.25)) &&
                              (isVisible(leftAnkle, 0.2) && isVisible(rightAnkle, 0.2));
    
    if (!isFullBodyVisible) {
      return this.createErrorAnalysis('전신이 화면에 나오도록 뒤로 물러나 주세요');
    }

    let phaseMetric = 0;
    let isDown = false;
    let isUp = false;
    let confidencePoints: any[] = [];

    // 힙 힌지 패턴 분석 (어깨-엉덩이-무릎 각도)
    if (leftShoulder && rightShoulder && leftHip && rightHip && leftKnee && rightKnee) {
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
      
      // 힙 힌지 각도 (어깨-엉덩이-무릎)
      const hipHingeAngle = AngleCalculator.calculateAngle(avgShoulder, avgHip, avgKnee);
      phaseMetric = hipHingeAngle;
      
      // 무릎 각도도 확인 (과도한 무릎 굽힘 방지)
      const leftKneeAngle = leftAnkle ? AngleCalculator.calculateAngle(leftHip, leftKnee, leftAnkle) : 180;
      const rightKneeAngle = rightAnkle ? AngleCalculator.calculateAngle(rightHip, rightKnee, rightAnkle) : 180;
      const avgKneeAngle = AngleCalculator.avg(leftKneeAngle, rightKneeAngle);
      
      // 힙 힌지 패턴 판별 (무릎은 적게 굽히고 엉덩이로만 힌지)
      isDown = hipHingeAngle <= this.HIP_HINGE_DOWN_THRESHOLD && avgKneeAngle >= this.KNEE_BEND_THRESHOLD;
      isUp = hipHingeAngle >= this.HIP_HINGE_UP_THRESHOLD;
      
      confidencePoints = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee];
      if (leftAnkle && rightAnkle) {
        confidencePoints.push(leftAnkle, rightAnkle);
      }
    }

    // Y축 보조 판별 (엉덩이 위치 변화)
    if (leftHip && rightHip) {
      const hipY = (leftHip.y + rightHip.y) / 2;
      
      // 지수평활로 노이즈 감소
      if (this.smoothingHipY == null) this.smoothingHipY = hipY;
      this.smoothingHipY = this.HIP_Y_SMOOTH * this.smoothingHipY + (1 - this.HIP_Y_SMOOTH) * hipY;
      
      if (this.lastHipY !== null) {
        const dy = this.smoothingHipY - this.lastHipY;
        const state = this.externalStateRef?.current || this.stateRef;
        
        // Y축 변화로 보조 판별
        if (!isDown && state.phase === 'up' && dy > this.Y_DOWN_DELTA) {
          isDown = true;
        } else if (!isUp && state.phase === 'down' && dy < -this.Y_UP_DELTA) {
          isUp = true;
        }
      }
      
      this.lastHipY = this.smoothingHipY;
    }

    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    const was = state.phase;

    // 상태 전환: up(직립) -> down(힌지) -> up
    if (was === 'up' && isDown) {
      state.phase = 'down';
    } else if (was === 'down' && isUp) {
      // 카운트 쿨다운 체크
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.phase = 'up';
        state.count += 1;
        this.lastCountTime = now;
      }
    }

    const isCorrectForm = isDown || isUp;
    
    return {
      exerciseType: 'deadlift',
      currentCount: state.count,
      isCorrectForm,
      feedback: this.getFeedback(state.phase, phaseMetric),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(phase: string, hipAngle: number): string {
    if (phase === 'down') {
      return hipAngle < 80 ? '너무 깊게 굽히지 마세요. 힙 힌지 패턴을 유지하세요' : '좋아요! 엉덩이를 뒤로 밀며 내려가세요';
    }
    if (phase === 'up') {
      return '엉덩이를 앞으로 밀어내며 직립 자세로 일어나세요';
    }
    return '엉덩이를 뒤로 밀어내는 힌지 패턴으로 운동하세요';
  }
}