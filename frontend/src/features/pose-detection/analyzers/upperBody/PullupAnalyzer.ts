import { BaseAnalyzer } from '../base/BaseAnalyzer';
import type { ExerciseAnalysis } from '../base/BaseAnalyzer';
import { AngleCalculator } from '../base/AngleCalculator';
import { POSE_CONSTANTS } from '../../utils/pose-constants';

export class PullupAnalyzer extends BaseAnalyzer {
  private externalStateRef?: { current: { phase: string; count: number } };
  
  // 팔 각도 임계값 (어깨-팔꿈치-손목 각도)
  private readonly ARM_UP_THRESHOLD = 70;     // 팔이 굽혀진 상태 (턱걸이 올린 상태)
  private readonly ARM_DOWN_THRESHOLD = 150;  // 팔이 펴진 상태 (턱걸이 내린 상태)
  
  // Y축 위치 기반 보조 판별
  private lastShoulderY: number | null = null;
  private smoothingShoulderY: number | null = null;
  private readonly SHOULDER_Y_SMOOTH = 0.7; 
  private readonly Y_UP_DELTA = 0.03;   // 위로 올라가는 변화량
  private readonly Y_DOWN_DELTA = 0.03; // 아래로 내려가는 변화량
  
  // 카운트 쿨다운
  private lastCountTime: number = 0;
  private readonly COUNT_COOLDOWN = 1500; // 1.5초 쿨다운 (어려운 운동)

  constructor() {
    super('pullup', 'upperBody');
  }
  
  setExternalState(stateRef: { current: { phase: string; count: number } }) {
    this.externalStateRef = stateRef;
  }

  analyze(landmarks: any[]): ExerciseAnalysis {
    const { 
      LEFT_SHOULDER, RIGHT_SHOULDER,
      LEFT_ELBOW, RIGHT_ELBOW,
      LEFT_WRIST, RIGHT_WRIST,
      LEFT_HIP, RIGHT_HIP,
      NOSE, LEFT_EYE, RIGHT_EYE 
    } = POSE_CONSTANTS;

    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftElbow = landmarks[LEFT_ELBOW];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const nose = landmarks[NOSE];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];

    // 가시성 임계값
    const isVisible = (p: any, thr = 0.3) => !!p && (p.visibility ?? 0) > thr;
    
    // 턱걸이는 상체 위주로 체크
    const isUpperBodyVisible = isVisible(nose, 0.4) && 
                               (isVisible(leftEye, 0.3) || isVisible(rightEye, 0.3)) &&
                               isVisible(leftShoulder, 0.4) && isVisible(rightShoulder, 0.4) &&
                               isVisible(leftElbow, 0.3) && isVisible(rightElbow, 0.3) &&
                               isVisible(leftWrist, 0.3) && isVisible(rightWrist, 0.3) &&
                               (isVisible(leftHip, 0.2) || isVisible(rightHip, 0.2));
    
    if (!isUpperBodyVisible) {
      return this.createErrorAnalysis('상체가 충분히 보이지 않습니다. 카메라 위치를 조정해주세요');
    }

    // 팔 각도 계산 (어깨-팔꿈치-손목)
    const leftArmAngle = AngleCalculator.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = AngleCalculator.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = AngleCalculator.avg(leftArmAngle, rightArmAngle);

    // Y축 위치 변화 추적 (어깨 높이)
    let isUp = false;
    let isDown = false;
    
    // 각도 기반 판별
    const isUpByAngle = avgArmAngle <= this.ARM_UP_THRESHOLD;
    const isDownByAngle = avgArmAngle >= this.ARM_DOWN_THRESHOLD;
    
    // Y축 보조 판별
    if (leftShoulder && rightShoulder) {
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      
      // 지수평활로 노이즈 감소
      if (this.smoothingShoulderY == null) this.smoothingShoulderY = shoulderY;
      this.smoothingShoulderY = this.SHOULDER_Y_SMOOTH * this.smoothingShoulderY + (1 - this.SHOULDER_Y_SMOOTH) * shoulderY;
      
      if (this.lastShoulderY !== null) {
        const dy = this.lastShoulderY - this.smoothingShoulderY; // Y축은 위쪽이 작은 값
        
        // 각도와 Y축 변화 조합으로 판별
        isUp = isUpByAngle || (dy > this.Y_UP_DELTA);
        isDown = isDownByAngle || (dy < -this.Y_DOWN_DELTA);
      } else {
        isUp = isUpByAngle;
        isDown = isDownByAngle;
      }
      
      this.lastShoulderY = this.smoothingShoulderY;
    } else {
      isUp = isUpByAngle;
      isDown = isDownByAngle;
    }

    // 외부 상태 사용 (우선) 또는 내부 상태 폴백
    const state = this.externalStateRef?.current || this.stateRef;
    const was = state.phase;

    // 상태 전환: down(매달린 상태) -> up(올린 상태) -> down
    if (was === 'down' && isUp) {
      state.phase = 'up';
    } else if (was === 'up' && isDown) {
      // 카운트 쿨다운 체크
      const now = Date.now();
      if (now - this.lastCountTime >= this.COUNT_COOLDOWN) {
        state.phase = 'down';
        state.count += 1;
        this.lastCountTime = now;
      }
    }

    const isCorrectForm = isUp || isDown;
    
    // 신뢰도 계산
    const confidencePoints = [
      leftShoulder, rightShoulder, leftElbow, rightElbow, 
      leftWrist, rightWrist, leftHip, rightHip
    ];
    
    return {
      exerciseType: 'pullup',
      currentCount: state.count,
      isCorrectForm,
      feedback: this.getFeedback(state.phase, avgArmAngle),
      confidence: this.calculateConfidence(confidencePoints)
    };
  }

  private getFeedback(phase: string, armAngle: number): string {
    if (phase === 'up') {
      return '좋아요! 턱을 바까지 올리고 잠깐 버티세요';
    }
    if (phase === 'down') {
      return '팔을 완전히 펴고 다음 동작을 준비하세요';
    }
    return '턱걸이봐를 잡고 몸을 위로 당겨 올리세요';
  }
}