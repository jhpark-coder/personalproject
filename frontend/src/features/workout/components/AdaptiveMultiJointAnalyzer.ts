/**
 * 적응형 다중 관절 분석 시스템 - 안정성 및 개인화 강화
 */

import { PoseKeypoint } from './PoseSmoothing';
import { MultiJointAnalysis, JointGroup, POSE_LANDMARKS } from './MultiJointAnalyzer';

export interface AdaptiveConfig {
  historySize: number;
  confidenceThreshold: number;
  adaptationRate: number;
  userProfileWeight: number;
  exerciseSpecificWeights: { [key: string]: number };
}

export interface UserProfile {
  height?: number; // cm
  weight?: number; // kg
  experience: 'beginner' | 'intermediate' | 'advanced';
  physicalLimitations?: string[];
  preferredAnalysisDepth: 'basic' | 'standard' | 'detailed';
}

export interface AnalysisContext {
  exerciseType: string;
  sessionDuration: number;
  currentSet: number;
  totalSets: number;
  fatigueLevel: number; // 0-1
}

export class AdaptiveMultiJointAnalyzer {
  private jointHistory: PoseKeypoint[][] = [];
  private qualityHistory: number[] = [];
  private adaptiveWeights: Map<string, number> = new Map();
  private config: AdaptiveConfig;
  private userProfile: UserProfile | null = null;
  private errorRecovery: {
    consecutiveErrors: number;
    lastError: Date | null;
    fallbackMode: boolean;
  } = { consecutiveErrors: 0, lastError: null, fallbackMode: false };

  constructor(config?: Partial<AdaptiveConfig>) {
    this.config = {
      historySize: 15,
      confidenceThreshold: 0.3,
      adaptationRate: 0.1,
      userProfileWeight: 0.3,
      exerciseSpecificWeights: {},
      ...config
    };
  }

  /**
   * 사용자 프로필 설정
   */
  public setUserProfile(profile: UserProfile): void {
    this.userProfile = profile;
    this.adaptHistorySize();
    this.initializeAdaptiveWeights();
  }

  /**
   * 히스토리 크기 적응적 조정
   */
  private adaptHistorySize(): void {
    if (!this.userProfile) return;

    const baseSize = 10;
    const experienceMultiplier = {
      beginner: 1.5,    // 더 많은 히스토리로 안정성 증대
      intermediate: 1.0,
      advanced: 0.8     // 빠른 반응성을 위해 히스토리 축소
    };

    this.config.historySize = Math.round(
      baseSize * experienceMultiplier[this.userProfile.experience]
    );
  }

  /**
   * 적응형 가중치 초기화
   */
  private initializeAdaptiveWeights(): void {
    if (!this.userProfile) return;

    // 경험 수준별 가중치 조정
    const experienceAdjustments = {
      beginner: { stability: 1.3, coordination: 0.8 },
      intermediate: { stability: 1.0, coordination: 1.0 },
      advanced: { stability: 0.8, coordination: 1.2 }
    };

    const adjustments = experienceAdjustments[this.userProfile.experience];
    this.adaptiveWeights.set('stability_multiplier', adjustments.stability);
    this.adaptiveWeights.set('coordination_multiplier', adjustments.coordination);
  }

  /**
   * 향상된 다중 관절 분석
   */
  public analyzeMultiJoint(
    landmarks: any[], 
    exerciseType: string,
    context?: AnalysisContext
  ): MultiJointAnalysis {
    try {
      // 에러 복구 모드 확인
      if (this.errorRecovery.fallbackMode) {
        return this.performBasicAnalysis(landmarks, exerciseType);
      }

      // 포즈 키포인트 변환 및 검증
      const keypoints = this.validateAndConvertKeypoints(landmarks);
      if (!keypoints) {
        return this.handleAnalysisError('Invalid keypoints data');
      }

      // 히스토리 관리
      this.updateHistory(keypoints);

      // 적응형 분석 수행
      const analysis = this.performAdaptiveAnalysis(keypoints, exerciseType, context);

      // 성공 시 에러 카운터 리셋
      this.errorRecovery.consecutiveErrors = 0;
      this.errorRecovery.fallbackMode = false;

      return analysis;

    } catch (error) {
      console.warn('다중 관절 분석 오류:', error);
      return this.handleAnalysisError(error as Error);
    }
  }

  /**
   * 키포인트 검증 및 변환
   */
  private validateAndConvertKeypoints(landmarks: any[]): PoseKeypoint[] | null {
    try {
      if (!Array.isArray(landmarks) || landmarks.length === 0) {
        return null;
      }

      const keypoints: PoseKeypoint[] = landmarks.map((lm, index) => {
        if (typeof lm !== 'object' || lm === null) {
          throw new Error(`Invalid landmark at index ${index}`);
        }

        return {
          x: typeof lm.x === 'number' ? lm.x : 0,
          y: typeof lm.y === 'number' ? lm.y : 0,
          score: typeof lm.visibility === 'number' ? lm.visibility : 
                 typeof lm.score === 'number' ? lm.score : 0
        };
      });

      // 최소 키포인트 수 확인
      if (keypoints.length < 33) {
        console.warn(`키포인트 수 부족: ${keypoints.length}/33`);
        return null;
      }

      return keypoints;

    } catch (error) {
      console.error('키포인트 변환 실패:', error);
      return null;
    }
  }

  /**
   * 히스토리 업데이트
   */
  private updateHistory(keypoints: PoseKeypoint[]): void {
    this.jointHistory.push(keypoints);
    
    if (this.jointHistory.length > this.config.historySize) {
      this.jointHistory.shift();
    }

    // 품질 점수 히스토리도 관리
    const qualityScore = this.calculateInstantQuality(keypoints);
    this.qualityHistory.push(qualityScore);
    
    if (this.qualityHistory.length > this.config.historySize) {
      this.qualityHistory.shift();
    }
  }

  /**
   * 즉시 품질 점수 계산
   */
  private calculateInstantQuality(keypoints: PoseKeypoint[]): number {
    let totalScore = 0;
    let validPoints = 0;

    for (const point of keypoints) {
      if ((point.score || 0) > this.config.confidenceThreshold) {
        totalScore += point.score || 0;
        validPoints++;
      }
    }

    return validPoints > 0 ? totalScore / validPoints : 0;
  }

  /**
   * 적응형 분석 수행
   */
  private performAdaptiveAnalysis(
    keypoints: PoseKeypoint[], 
    exerciseType: string,
    context?: AnalysisContext
  ): MultiJointAnalysis {
    // 운동별 관절 그룹 가져오기
    const jointGroups = this.getAdaptiveJointGroups(exerciseType);
    if (jointGroups.length === 0) {
      return this.createDefaultAnalysis();
    }

    // 컨텍스트 기반 분석 가중치 조정
    const contextWeights = this.calculateContextWeights(context);

    // 각 관절 그룹 분석
    const jointGroupScores: { [key: string]: number } = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const group of jointGroups) {
      const baseScore = this.analyzeJointGroupAdvanced(keypoints, group);
      const contextWeight = contextWeights.get(group.name) || 1.0;
      const adaptedWeight = group.weight * contextWeight;
      
      jointGroupScores[group.name] = baseScore;
      totalWeightedScore += baseScore * adaptedWeight;
      totalWeight += adaptedWeight;
    }

    const overallConsistency = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // 적응형 안정성 및 협응성 계산
    const stabilityIndex = this.calculateAdaptiveStability(keypoints, jointGroups, context);
    const coordinationScore = this.calculateAdaptiveCoordination(keypoints, jointGroups, context);

    // 신뢰도 계산 (히스토리 기반)
    const confidenceLevel = this.calculateAdaptiveConfidence(keypoints, jointGroups);

    // 개인화된 폼 교정 제안
    const formCorrections = this.generatePersonalizedCorrections(jointGroupScores, exerciseType, context);

    // 적응형 품질 등급 결정
    const qualityGrade = this.determineAdaptiveQualityGrade(
      overallConsistency, stabilityIndex, coordinationScore, context
    );

    // 적응형 가중치 업데이트
    this.updateAdaptiveWeights(jointGroupScores, exerciseType);

    return {
      overallConsistency,
      jointGroupScores,
      stabilityIndex,
      coordinationScore,
      confidenceLevel,
      formCorrections,
      qualityGrade
    };
  }

  /**
   * 운동별 적응형 관절 그룹 반환
   */
  private getAdaptiveJointGroups(exerciseType: string): JointGroup[] {
    // 기본 관절 그룹에 적응형 가중치 적용
    const baseGroups = this.getBaseJointGroups(exerciseType);
    
    return baseGroups.map(group => ({
      ...group,
      weight: this.adaptiveWeights.get(`${exerciseType}_${group.name}`) || group.weight
    }));
  }

  /**
   * 기본 관절 그룹 정의
   */
  private getBaseJointGroups(exerciseType: string): JointGroup[] {
    const groups: { [key: string]: JointGroup[] } = {
      squat: [
        { name: 'spinal_alignment', joints: [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP], weight: 0.3 },
        { name: 'knee_coordination', joints: [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE], weight: 0.25 },
        { name: 'hip_stability', joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP], weight: 0.2 },
        { name: 'shoulder_stability', joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER], weight: 0.15 },
        { name: 'overall_symmetry', joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP], weight: 0.1 }
      ],
      pushup: [
        { name: 'arm_coordination', joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW], weight: 0.35 },
        { name: 'core_stability', joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP], weight: 0.25 },
        { name: 'spinal_alignment', joints: [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER], weight: 0.2 },
        { name: 'shoulder_symmetry', joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER], weight: 0.2 }
      ]
    };

    return groups[exerciseType] || [];
  }

  /**
   * 컨텍스트 기반 가중치 계산
   */
  private calculateContextWeights(context?: AnalysisContext): Map<string, number> {
    const weights = new Map<string, number>();
    
    if (!context) {
      return weights;
    }

    // 피로도에 따른 가중치 조정
    const fatigueAdjustment = 1.0 + (context.fatigueLevel * 0.3);
    
    // 세트 진행도에 따른 조정
    const setProgressRatio = context.currentSet / context.totalSets;
    const progressAdjustment = 1.0 + (setProgressRatio * 0.2);

    // 모든 그룹에 기본 조정 적용
    weights.set('spinal_alignment', fatigueAdjustment);
    weights.set('core_stability', fatigueAdjustment * progressAdjustment);
    weights.set('overall_symmetry', progressAdjustment);

    return weights;
  }

  /**
   * 고급 관절 그룹 분석
   */
  private analyzeJointGroupAdvanced(keypoints: PoseKeypoint[], group: JointGroup): number {
    const validJoints = group.joints.filter(jointIdx => 
      jointIdx < keypoints.length && 
      (keypoints[jointIdx].score || 0) > this.config.confidenceThreshold
    );

    if (validJoints.length < 2) {
      return 0.5;
    }

    // 시간적 일관성 고려
    const temporalConsistency = this.calculateTemporalConsistency(group);
    
    // 공간적 일관성 계산
    const spatialConsistency = this.calculateSpatialConsistency(keypoints, validJoints, group);

    // 적응형 가중치 적용
    const adaptiveWeight = this.adaptiveWeights.get(`temporal_${group.name}`) || 0.6;
    
    return spatialConsistency * (1 - adaptiveWeight) + temporalConsistency * adaptiveWeight;
  }

  /**
   * 시간적 일관성 계산
   */
  private calculateTemporalConsistency(group: JointGroup): number {
    if (this.jointHistory.length < 3) {
      return 0.7;
    }

    const recentFrames = this.jointHistory.slice(-5);
    let totalConsistency = 0;
    let comparisons = 0;

    for (let i = 1; i < recentFrames.length; i++) {
      for (const jointIdx of group.joints) {
        if (jointIdx >= recentFrames[i].length || jointIdx >= recentFrames[i-1].length) continue;

        const curr = recentFrames[i][jointIdx];
        const prev = recentFrames[i-1][jointIdx];

        if ((curr.score || 0) < this.config.confidenceThreshold || 
            (prev.score || 0) < this.config.confidenceThreshold) continue;

        const distance = Math.sqrt(
          Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
        );

        const consistency = Math.max(0, 1 - (distance / 0.1));
        totalConsistency += consistency;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalConsistency / comparisons : 0.7;
  }

  /**
   * 공간적 일관성 계산
   */
  private calculateSpatialConsistency(
    keypoints: PoseKeypoint[], 
    validJoints: number[], 
    group: JointGroup
  ): number {
    if (validJoints.length < 2) return 0.5;

    let consistencySum = 0;
    let pairCount = 0;

    for (let i = 0; i < validJoints.length; i++) {
      for (let j = i + 1; j < validJoints.length; j++) {
        const joint1 = keypoints[validJoints[i]];
        const joint2 = keypoints[validJoints[j]];

        const consistency = this.calculatePairwiseConsistency(joint1, joint2, group.name);
        consistencySum += consistency;
        pairCount++;
      }
    }

    return pairCount > 0 ? consistencySum / pairCount : 0.5;
  }

  /**
   * 쌍별 일관성 계산 (개선된 버전)
   */
  private calculatePairwiseConsistency(
    joint1: PoseKeypoint, 
    joint2: PoseKeypoint, 
    groupName: string
  ): number {
    const distance = Math.sqrt(
      Math.pow(joint1.x - joint2.x, 2) + Math.pow(joint1.y - joint2.y, 2)
    );

    // 그룹별 적응형 최적 범위
    const adaptiveRanges = this.getAdaptiveOptimalRanges(groupName);
    const range = adaptiveRanges || { min: 0.1, max: 0.5 };

    if (distance >= range.min && distance <= range.max) {
      return 1.0;
    } else if (distance < range.min) {
      return Math.max(0, distance / range.min);
    } else {
      const overshoot = distance - range.max;
      return Math.max(0, 1 - (overshoot / range.max));
    }
  }

  /**
   * 적응형 최적 범위 계산
   */
  private getAdaptiveOptimalRanges(groupName: string): { min: number; max: number } | null {
    if (!this.userProfile) return null;

    // 사용자 체형에 따른 범위 조정
    const baseRanges: { [key: string]: { min: number; max: number } } = {
      spinal_alignment: { min: 0.15, max: 0.6 },
      knee_coordination: { min: 0.08, max: 0.35 },
      hip_stability: { min: 0.12, max: 0.4 },
      shoulder_stability: { min: 0.18, max: 0.5 }
    };

    const baseRange = baseRanges[groupName];
    if (!baseRange) return null;

    // 경험 수준별 허용 오차 조정
    const toleranceMultipliers = {
      beginner: 1.3,
      intermediate: 1.0,
      advanced: 0.8
    };

    const multiplier = toleranceMultipliers[this.userProfile.experience];
    
    return {
      min: baseRange.min * multiplier,
      max: baseRange.max * multiplier
    };
  }

  /**
   * 적응형 안정성 계산
   */
  private calculateAdaptiveStability(
    keypoints: PoseKeypoint[], 
    jointGroups: JointGroup[],
    context?: AnalysisContext
  ): number {
    const baseStability = this.calculateBaseStability(jointGroups);
    
    // 컨텍스트 기반 조정
    let contextAdjustment = 1.0;
    if (context) {
      // 피로도가 높을수록 안정성 요구사항 완화
      contextAdjustment *= (1.0 + context.fatigueLevel * 0.2);
    }

    // 적응형 승수 적용
    const adaptiveMultiplier = this.adaptiveWeights.get('stability_multiplier') || 1.0;
    
    return Math.min(1.0, baseStability * contextAdjustment * adaptiveMultiplier);
  }

  /**
   * 기본 안정성 계산
   */
  private calculateBaseStability(jointGroups: JointGroup[]): number {
    if (this.jointHistory.length < 3) return 0.6;

    let totalStability = 0;
    let groupCount = 0;

    for (const group of jointGroups) {
      const groupStability = this.calculateGroupStability(group);
      totalStability += groupStability * group.weight;
      groupCount += group.weight;
    }

    return groupCount > 0 ? totalStability / groupCount : 0.6;
  }

  /**
   * 그룹 안정성 계산
   */
  private calculateGroupStability(group: JointGroup): number {
    const recentFrames = this.jointHistory.slice(-Math.min(7, this.jointHistory.length));
    if (recentFrames.length < 3) return 0.6;

    let totalVariation = 0;
    let jointCount = 0;

    for (const jointIdx of group.joints) {
      const variations = [];

      for (let i = 1; i < recentFrames.length; i++) {
        if (jointIdx < recentFrames[i].length && jointIdx < recentFrames[i-1].length) {
          const curr = recentFrames[i][jointIdx];
          const prev = recentFrames[i-1][jointIdx];

          if ((curr.score || 0) < this.config.confidenceThreshold || 
              (prev.score || 0) < this.config.confidenceThreshold) continue;

          const variation = Math.sqrt(
            Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
          );
          variations.push(variation);
        }
      }

      if (variations.length > 0) {
        const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
        totalVariation += avgVariation;
        jointCount++;
      }
    }

    if (jointCount === 0) return 0.6;

    const avgVariation = totalVariation / jointCount;
    const stabilityThreshold = this.adaptiveWeights.get(`stability_threshold_${group.name}`) || 0.06;
    
    return Math.max(0, Math.min(1, 1 - (avgVariation / stabilityThreshold)));
  }

  /**
   * 적응형 협응성 계산
   */
  private calculateAdaptiveCoordination(
    keypoints: PoseKeypoint[], 
    jointGroups: JointGroup[],
    context?: AnalysisContext
  ): number {
    // 기본 대칭성 분석
    const symmetryScore = this.calculateSymmetryScore(keypoints);
    
    // 협응성 패턴 분석
    const coordinationPattern = this.analyzeCoordinationPattern(keypoints, jointGroups);
    
    // 적응형 가중치 적용
    const adaptiveMultiplier = this.adaptiveWeights.get('coordination_multiplier') || 1.0;
    
    const baseScore = (symmetryScore * 0.6 + coordinationPattern * 0.4) * adaptiveMultiplier;
    
    // 컨텍스트 조정
    if (context && context.fatigueLevel > 0.7) {
      // 높은 피로도에서는 협응성 기준 완화
      return Math.min(1.0, baseScore * 1.1);
    }

    return Math.min(1.0, baseScore);
  }

  /**
   * 대칭성 점수 계산
   */
  private calculateSymmetryScore(keypoints: PoseKeypoint[]): number {
    const symmetryPairs = [
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE]
    ];

    let symmetrySum = 0;
    let validPairs = 0;

    for (const [leftIdx, rightIdx] of symmetryPairs) {
      if (leftIdx < keypoints.length && rightIdx < keypoints.length) {
        const leftJoint = keypoints[leftIdx];
        const rightJoint = keypoints[rightIdx];

        if ((leftJoint.score || 0) > this.config.confidenceThreshold && 
            (rightJoint.score || 0) > this.config.confidenceThreshold) {
          
          const heightDiff = Math.abs(leftJoint.y - rightJoint.y);
          const heightSymmetry = Math.max(0, 1 - (heightDiff / 0.12));
          
          symmetrySum += heightSymmetry;
          validPairs++;
        }
      }
    }

    return validPairs > 0 ? symmetrySum / validPairs : 0.6;
  }

  /**
   * 협응성 패턴 분석
   */
  private analyzeCoordinationPattern(keypoints: PoseKeypoint[], jointGroups: JointGroup[]): number {
    // 관절 간 동기화 정도 분석
    let coordinationSum = 0;
    let groupCount = 0;

    for (const group of jointGroups) {
      const groupCoordination = this.calculateGroupCoordination(keypoints, group);
      coordinationSum += groupCoordination * group.weight;
      groupCount += group.weight;
    }

    return groupCount > 0 ? coordinationSum / groupCount : 0.6;
  }

  /**
   * 그룹 협응성 계산
   */
  private calculateGroupCoordination(keypoints: PoseKeypoint[], group: JointGroup): number {
    if (this.jointHistory.length < 5) return 0.6;

    // 최근 프레임들에서 관절 움직임의 동기화 정도 계산
    const recentFrames = this.jointHistory.slice(-5);
    let coordinationScore = 0;
    let measurements = 0;

    for (let frameIdx = 1; frameIdx < recentFrames.length; frameIdx++) {
      const movements = [];

      for (const jointIdx of group.joints) {
        if (jointIdx < recentFrames[frameIdx].length && 
            jointIdx < recentFrames[frameIdx-1].length) {
          
          const curr = recentFrames[frameIdx][jointIdx];
          const prev = recentFrames[frameIdx-1][jointIdx];

          if ((curr.score || 0) > this.config.confidenceThreshold && 
              (prev.score || 0) > this.config.confidenceThreshold) {
            
            const movement = Math.sqrt(
              Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            movements.push(movement);
          }
        }
      }

      if (movements.length >= 2) {
        // 움직임의 표준편차로 동기화 정도 측정
        const mean = movements.reduce((sum, m) => sum + m, 0) / movements.length;
        const variance = movements.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / movements.length;
        const stdDev = Math.sqrt(variance);

        // 표준편차가 작을수록 동기화가 잘 됨
        const synchronization = Math.max(0, 1 - (stdDev / 0.05));
        coordinationScore += synchronization;
        measurements++;
      }
    }

    return measurements > 0 ? coordinationScore / measurements : 0.6;
  }

  /**
   * 적응형 신뢰도 계산
   */
  private calculateAdaptiveConfidence(keypoints: PoseKeypoint[], jointGroups: JointGroup[]): number {
    // 즉시 신뢰도
    const instantConfidence = this.calculateInstantConfidence(keypoints, jointGroups);
    
    // 히스토리 기반 신뢰도
    const historicalConfidence = this.qualityHistory.length > 0 
      ? this.qualityHistory.reduce((sum, q) => sum + q, 0) / this.qualityHistory.length
      : 0.5;

    // 적응형 가중치로 결합
    const adaptiveWeight = Math.min(1.0, this.qualityHistory.length / this.config.historySize);
    
    return instantConfidence * (1 - adaptiveWeight) + historicalConfidence * adaptiveWeight;
  }

  /**
   * 즉시 신뢰도 계산
   */
  private calculateInstantConfidence(keypoints: PoseKeypoint[], jointGroups: JointGroup[]): number {
    let totalScore = 0;
    let totalJoints = 0;

    for (const group of jointGroups) {
      for (const jointIdx of group.joints) {
        if (jointIdx < keypoints.length) {
          const score = keypoints[jointIdx].score || 0;
          totalScore += score * group.weight;
          totalJoints += group.weight;
        }
      }
    }

    return totalJoints > 0 ? totalScore / totalJoints : 0;
  }

  /**
   * 개인화된 폼 교정 제안
   */
  private generatePersonalizedCorrections(
    jointGroupScores: { [key: string]: number }, 
    exerciseType: string,
    context?: AnalysisContext
  ): string[] {
    const corrections: string[] = [];
    const threshold = this.userProfile?.experience === 'beginner' ? 0.7 : 0.6;

    for (const [groupName, score] of Object.entries(jointGroupScores)) {
      if (score < threshold) {
        const correction = this.getPersonalizedCorrection(groupName, exerciseType, context);
        if (correction) {
          corrections.push(correction);
        }
      }
    }

    return corrections.slice(0, 3);
  }

  /**
   * 개인화된 교정 제안 생성
   */
  private getPersonalizedCorrection(
    groupName: string, 
    exerciseType: string, 
    context?: AnalysisContext
  ): string | null {
    const baseCorrections = this.getBaseCorrections(groupName, exerciseType);
    if (!baseCorrections) return null;

    // 사용자 프로필에 따른 개인화
    let personalizedCorrection = baseCorrections;

    if (this.userProfile?.experience === 'beginner') {
      personalizedCorrection = `[초보자] ${personalizedCorrection}`;
    }

    // 컨텍스트에 따른 조정
    if (context && context.fatigueLevel > 0.7) {
      personalizedCorrection = `${personalizedCorrection} (피로도 높음: 휴식 후 재시도 권장)`;
    }

    return personalizedCorrection;
  }

  /**
   * 기본 교정 제안 반환
   */
  private getBaseCorrections(groupName: string, exerciseType: string): string | null {
    const corrections: { [key: string]: { [key: string]: string } } = {
      squat: {
        spinal_alignment: '등을 곧게 펴고 시선을 정면으로 유지하세요',
        knee_coordination: '무릎과 발끝의 방향을 일치시켜주세요',
        hip_stability: '엉덩이를 뒤로 빼며 균형을 유지하세요'
      },
      pushup: {
        arm_coordination: '양팔에 균등한 힘을 주어 밀어올리세요',
        core_stability: '복부에 힘을 주어 몸을 일직선으로 유지하세요',
        spinal_alignment: '머리부터 발끝까지 일직선을 유지하세요'
      }
    };

    return corrections[exerciseType]?.[groupName] || null;
  }

  /**
   * 적응형 품질 등급 결정
   */
  private determineAdaptiveQualityGrade(
    overall: number, 
    stability: number, 
    coordination: number,
    context?: AnalysisContext
  ): 'S' | 'A' | 'B' | 'C' | 'D' {
    // 기본 복합 점수
    let composite = overall * 0.5 + stability * 0.3 + coordination * 0.2;

    // 사용자 경험 수준에 따른 기준 조정
    if (this.userProfile?.experience === 'beginner') {
      composite *= 1.1; // 초보자에게는 약간 관대한 평가
    } else if (this.userProfile?.experience === 'advanced') {
      composite *= 0.95; // 고급자에게는 엄격한 평가
    }

    // 컨텍스트 조정
    if (context && context.fatigueLevel > 0.6) {
      composite *= (1.0 + context.fatigueLevel * 0.1);
    }

    if (composite >= 0.9) return 'S';
    if (composite >= 0.8) return 'A';
    if (composite >= 0.7) return 'B';
    if (composite >= 0.6) return 'C';
    return 'D';
  }

  /**
   * 적응형 가중치 업데이트
   */
  private updateAdaptiveWeights(jointGroupScores: { [key: string]: number }, exerciseType: string): void {
    for (const [groupName, score] of Object.entries(jointGroupScores)) {
      const currentWeight = this.adaptiveWeights.get(`${exerciseType}_${groupName}`) || 1.0;
      
      // 성과가 좋은 그룹의 가중치는 감소, 문제가 있는 그룹의 가중치는 증가
      const adjustment = score > 0.8 ? -this.config.adaptationRate : 
                        score < 0.6 ? this.config.adaptationRate : 0;
      
      const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
      this.adaptiveWeights.set(`${exerciseType}_${groupName}`, newWeight);
    }
  }

  /**
   * 오류 처리
   */
  private handleAnalysisError(error: string | Error): MultiJointAnalysis {
    this.errorRecovery.consecutiveErrors++;
    this.errorRecovery.lastError = new Date();

    // 연속 오류가 3회 이상이면 fallback 모드 활성화
    if (this.errorRecovery.consecutiveErrors >= 3) {
      this.errorRecovery.fallbackMode = true;
      console.warn('다중 관절 분석 fallback 모드 활성화');
    }

    return this.createDefaultAnalysis();
  }

  /**
   * 기본 분석 수행 (오류 시 fallback)
   */
  private performBasicAnalysis(landmarks: any[], exerciseType: string): MultiJointAnalysis {
    return {
      overallConsistency: 0.6,
      jointGroupScores: { basic: 0.6 },
      stabilityIndex: 0.6,
      coordinationScore: 0.6,
      confidenceLevel: 0.5,
      formCorrections: ['기본 자세를 확인해주세요'],
      qualityGrade: 'C'
    };
  }

  /**
   * 기본 분석 결과 생성
   */
  private createDefaultAnalysis(): MultiJointAnalysis {
    return {
      overallConsistency: 0.5,
      jointGroupScores: {},
      stabilityIndex: 0.5,
      coordinationScore: 0.5,
      confidenceLevel: 0.5,
      formCorrections: ['운동 자세를 확인해주세요'],
      qualityGrade: 'C'
    };
  }

  /**
   * 분석기 리셋
   */
  public reset(): void {
    this.jointHistory = [];
    this.qualityHistory = [];
    this.errorRecovery = { consecutiveErrors: 0, lastError: null, fallbackMode: false };
  }

  /**
   * 성능 통계 반환
   */
  public getPerformanceStats(): {
    historySize: number;
    errorRate: number;
    adaptiveWeightsCount: number;
    fallbackMode: boolean;
  } {
    return {
      historySize: this.jointHistory.length,
      errorRate: this.errorRecovery.consecutiveErrors / Math.max(1, this.jointHistory.length),
      adaptiveWeightsCount: this.adaptiveWeights.size,
      fallbackMode: this.errorRecovery.fallbackMode
    };
  }
}

// 전역 적응형 다중 관절 분석기 인스턴스
export const globalAdaptiveAnalyzer = new AdaptiveMultiJointAnalyzer();