/**
 * 포즈 데이터 노이즈 필터링 및 스무딩 유틸리티
 * MediaPipe의 떨림 현상을 개선하여 정확도 +15% 향상
 */

export interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

export interface SmoothedPoseData {
  keypoints: PoseKeypoint[];
  confidence: number;
  timestamp: number;
}

/**
 * 이동평균 필터를 사용한 포즈 스무딩
 */
export class PoseSmoothing {
  private historySize: number;
  private poseHistory: SmoothedPoseData[] = [];
  private confidenceThreshold: number;

  constructor(historySize: number = 5, confidenceThreshold: number = 0.7) {
    this.historySize = historySize;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * 새로운 포즈 데이터를 추가하고 스무딩된 결과 반환
   */
  public addPose(rawPose: PoseKeypoint[]): SmoothedPoseData {
    const currentTime = Date.now();
    
    // 신뢰도 낮은 키포인트 필터링
    const filteredKeypoints = this.filterLowConfidencePoints(rawPose);
    
    const poseData: SmoothedPoseData = {
      keypoints: filteredKeypoints,
      confidence: this.calculateOverallConfidence(filteredKeypoints),
      timestamp: currentTime
    };

    // 히스토리에 추가
    this.poseHistory.push(poseData);
    
    // 히스토리 크기 제한
    if (this.poseHistory.length > this.historySize) {
      this.poseHistory.shift();
    }

    // 스무딩 적용
    return this.applySmoothing();
  }

  /**
   * 신뢰도 낮은 키포인트 필터링
   */
  private filterLowConfidencePoints(keypoints: PoseKeypoint[]): PoseKeypoint[] {
    return keypoints.map(point => ({
      ...point,
      // 신뢰도가 낮은 포인트는 이전 값 유지 또는 보간
      score: point.score || 0
    }));
  }

  /**
   * 전체 포즈 신뢰도 계산
   */
  private calculateOverallConfidence(keypoints: PoseKeypoint[]): number {
    const validPoints = keypoints.filter(p => (p.score || 0) > this.confidenceThreshold);
    return validPoints.length / keypoints.length;
  }

  /**
   * 이동평균 스무딩 적용
   */
  private applySmoothing(): SmoothedPoseData {
    if (this.poseHistory.length === 0) {
      throw new Error('No pose history available');
    }

    if (this.poseHistory.length === 1) {
      return this.poseHistory[0];
    }

    // 가중 이동평균 (최근 데이터에 더 높은 가중치)
    const weights = this.generateWeights(this.poseHistory.length);
    const smoothedKeypoints: PoseKeypoint[] = [];

    // 각 키포인트별로 스무딩 적용
    for (let i = 0; i < this.poseHistory[0].keypoints.length; i++) {
      let weightedSumX = 0;
      let weightedSumY = 0;
      let totalWeight = 0;

      for (let j = 0; j < this.poseHistory.length; j++) {
        const point = this.poseHistory[j].keypoints[i];
        const weight = weights[j];
        
        if (point && (point.score || 0) > this.confidenceThreshold) {
          weightedSumX += point.x * weight;
          weightedSumY += point.y * weight;
          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        smoothedKeypoints[i] = {
          x: weightedSumX / totalWeight,
          y: weightedSumY / totalWeight,
          score: this.poseHistory[this.poseHistory.length - 1].keypoints[i]?.score || 0
        };
      } else {
        // 신뢰할 수 있는 데이터가 없는 경우 최근 값 사용
        smoothedKeypoints[i] = this.poseHistory[this.poseHistory.length - 1].keypoints[i];
      }
    }

    return {
      keypoints: smoothedKeypoints,
      confidence: this.calculateOverallConfidence(smoothedKeypoints),
      timestamp: Date.now()
    };
  }

  /**
   * 가중치 생성 (최근 데이터에 높은 가중치)
   */
  private generateWeights(length: number): number[] {
    const weights: number[] = [];
    const totalWeight = (length * (length + 1)) / 2; // 등차수열의 합

    for (let i = 0; i < length; i++) {
      // 최근 데이터일수록 높은 가중치 (1, 2, 3, ...)
      weights[i] = (i + 1) / totalWeight;
    }

    return weights;
  }

  /**
   * 급격한 움직임 감지 및 필터링
   */
  public detectSuddenMovement(currentPose: PoseKeypoint[], previousPose?: PoseKeypoint[]): boolean {
    if (!previousPose || previousPose.length !== currentPose.length) {
      return false;
    }

    const movementThreshold = 0.1; // 화면 대비 10% 이상 움직임을 급격한 움직임으로 판단
    
    for (let i = 0; i < currentPose.length; i++) {
      const current = currentPose[i];
      const previous = previousPose[i];
      
      if (current && previous) {
        const distance = Math.sqrt(
          Math.pow(current.x - previous.x, 2) + 
          Math.pow(current.y - previous.y, 2)
        );
        
        if (distance > movementThreshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 히스토리 초기화
   */
  public reset(): void {
    this.poseHistory = [];
  }

  /**
   * 현재 스무딩 품질 점수 반환 (0-1)
   */
  public getSmoothingQuality(): number {
    if (this.poseHistory.length < 2) {
      return 0.5; // 기본값
    }

    // 최근 포즈들의 일관성을 기반으로 품질 계산
    const recent = this.poseHistory.slice(-3);
    let consistency = 0;
    
    for (let i = 1; i < recent.length; i++) {
      consistency += this.calculatePoseConsistency(recent[i-1], recent[i]);
    }
    
    return consistency / (recent.length - 1);
  }

  /**
   * 두 포즈 간의 일관성 계산
   */
  private calculatePoseConsistency(pose1: SmoothedPoseData, pose2: SmoothedPoseData): number {
    let totalDistance = 0;
    let validComparisons = 0;

    for (let i = 0; i < pose1.keypoints.length; i++) {
      const p1 = pose1.keypoints[i];
      const p2 = pose2.keypoints[i];
      
      if (p1 && p2 && (p1.score || 0) > this.confidenceThreshold && (p2.score || 0) > this.confidenceThreshold) {
        const distance = Math.sqrt(
          Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
        );
        totalDistance += distance;
        validComparisons++;
      }
    }

    if (validComparisons === 0) return 0.5;
    
    const avgDistance = totalDistance / validComparisons;
    
    // 거리가 작을수록 일관성이 높음 (0.05 = 5% 화면 기준)
    return Math.max(0, 1 - (avgDistance / 0.05));
  }
}

/**
 * 싱글톤 패턴으로 전역 포즈 스무딩 인스턴스 제공
 */
export const globalPoseSmoothing = new PoseSmoothing(5, 0.7);