/**
 * 포즈 렌더링 최적화 유틸리티
 */

export interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

export interface RenderConfig {
  pointColor: string;
  lineColor: string;
  pointSize: number;
  lineWidth: number;
  visibilityThreshold: number;
  highlightKeyPoints?: number[];
  highlightColor?: string;
}

export interface PerformanceStats {
  avgRenderTime: number;
  frameCount: number;
  droppedFrames: number;
  lastRenderTime: number;
}

export class PoseRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private lastFrameData: PoseKeypoint[] | null = null;
  private frameStats: PerformanceStats = {
    avgRenderTime: 0,
    frameCount: 0,
    droppedFrames: 0,
    lastRenderTime: 0
  };
  
  // 캐시된 연결선 정보
  private static readonly POSE_CONNECTIONS = [
    [11, 12], // 어깨
    [11, 13], [12, 14], // 팔
    [13, 15], [14, 16], // 손목
    [11, 23], [12, 24], // 몸통
    [23, 24], // 허리
    [23, 25], [24, 26], // 다리
    [25, 27], [26, 28], // 발목
  ];

  // 주요 포인트 인덱스
  private static readonly KEY_POINTS = {
    NOSE: 0,
    LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
    LEFT_WRIST: 15, RIGHT_WRIST: 16,
    LEFT_HIP: 23, RIGHT_HIP: 24,
    LEFT_KNEE: 25, RIGHT_KNEE: 26,
    LEFT_ANKLE: 27, RIGHT_ANKLE: 28
  };

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context를 가져올 수 없습니다.');
    }
    this.ctx = ctx;

    this.config = {
      pointColor: '#00FF00',
      lineColor: '#00FF00',
      pointSize: 3,
      lineWidth: 2,
      visibilityThreshold: 0.3,
      highlightColor: '#FF0000',
      ...config
    };

    // 캔버스 최적화 설정
    this.optimizeCanvas();
  }

  /**
   * 캔버스 렌더링 최적화
   */
  private optimizeCanvas(): void {
    // 픽셀 비율 최적화
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    this.ctx.scale(dpr, dpr);
    
    // 렌더링 품질 최적화
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * 포즈 렌더링 (성능 최적화된 버전)
   */
  public renderPose(keypoints: PoseKeypoint[]): void {
    const startTime = performance.now();

    // 프레임 드롭 감지
    if (this.shouldSkipFrame(keypoints)) {
      this.frameStats.droppedFrames++;
      return;
    }

    // 차분 렌더링 (변경된 부분만 다시 그리기)
    if (this.shouldUseDifferentialRendering(keypoints)) {
      this.renderDifferential(keypoints);
    } else {
      this.renderFull(keypoints);
    }

    // 성능 통계 업데이트
    this.updateFrameStats(startTime);
    this.lastFrameData = [...keypoints];
  }

  /**
   * 프레임 스킵 판단
   */
  private shouldSkipFrame(keypoints: PoseKeypoint[]): boolean {
    // 렌더링 시간이 16ms(60fps) 초과하면 프레임 스킵
    const renderBudget = 16;
    return this.frameStats.lastRenderTime > renderBudget;
  }

  /**
   * 차분 렌더링 사용 여부 판단
   */
  private shouldUseDifferentialRendering(keypoints: PoseKeypoint[]): boolean {
    if (!this.lastFrameData || this.lastFrameData.length !== keypoints.length) {
      return false;
    }

    // 변화량이 적으면 차분 렌더링 사용
    let totalChange = 0;
    for (let i = 0; i < keypoints.length; i++) {
      const curr = keypoints[i];
      const prev = this.lastFrameData[i];
      if (curr && prev) {
        totalChange += Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      }
    }

    return totalChange < 0.1; // 전체 변화량이 10% 미만
  }

  /**
   * 차분 렌더링
   */
  private renderDifferential(keypoints: PoseKeypoint[]): void {
    if (!this.lastFrameData) {
      this.renderFull(keypoints);
      return;
    }

    // 변경된 포인트만 업데이트
    const changedPoints: number[] = [];
    for (let i = 0; i < keypoints.length; i++) {
      const curr = keypoints[i];
      const prev = this.lastFrameData[i];
      
      if (!curr || !prev) continue;
      
      const change = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      if (change > 0.02) { // 2% 이상 변화한 포인트
        changedPoints.push(i);
      }
    }

    // 변경된 포인트와 연관된 부분만 다시 그리기
    this.renderChangedRegions(keypoints, changedPoints);
  }

  /**
   * 변경된 영역만 렌더링
   */
  private renderChangedRegions(keypoints: PoseKeypoint[], changedPoints: number[]): void {
    for (const pointIndex of changedPoints) {
      // 포인트 주변 영역 클리어
      const point = keypoints[pointIndex];
      if (!point || (point.score || 0) < this.config.visibilityThreshold) continue;

      const clearSize = this.config.pointSize + 2;
      const x = point.x * this.canvas.width / window.devicePixelRatio;
      const y = point.y * this.canvas.height / window.devicePixelRatio;
      
      this.ctx.clearRect(
        x - clearSize, y - clearSize,
        clearSize * 2, clearSize * 2
      );

      // 포인트 다시 그리기
      this.drawPoint(x, y, pointIndex);

      // 관련 연결선 다시 그리기
      this.redrawConnections(keypoints, pointIndex);
    }
  }

  /**
   * 전체 렌더링
   */
  private renderFull(keypoints: PoseKeypoint[]): void {
    // 캔버스 클리어
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 연결선 먼저 그리기
    this.drawConnections(keypoints);

    // 포인트 나중에 그리기 (위에 표시되도록)
    this.drawPoints(keypoints);
  }

  /**
   * 연결선 그리기
   */
  private drawConnections(keypoints: PoseKeypoint[]): void {
    this.ctx.strokeStyle = this.config.lineColor;
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.beginPath();

    for (const [start, end] of PoseRenderer.POSE_CONNECTIONS) {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];

      if (!startPoint || !endPoint) continue;
      if ((startPoint.score || 0) < this.config.visibilityThreshold) continue;
      if ((endPoint.score || 0) < this.config.visibilityThreshold) continue;

      const startX = startPoint.x * this.canvas.width / window.devicePixelRatio;
      const startY = startPoint.y * this.canvas.height / window.devicePixelRatio;
      const endX = endPoint.x * this.canvas.width / window.devicePixelRatio;
      const endY = endPoint.y * this.canvas.height / window.devicePixelRatio;

      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
    }

    this.ctx.stroke();
  }

  /**
   * 특정 포인트 관련 연결선 다시 그리기
   */
  private redrawConnections(keypoints: PoseKeypoint[], pointIndex: number): void {
    this.ctx.strokeStyle = this.config.lineColor;
    this.ctx.lineWidth = this.config.lineWidth;

    for (const [start, end] of PoseRenderer.POSE_CONNECTIONS) {
      if (start !== pointIndex && end !== pointIndex) continue;

      const startPoint = keypoints[start];
      const endPoint = keypoints[end];

      if (!startPoint || !endPoint) continue;
      if ((startPoint.score || 0) < this.config.visibilityThreshold) continue;
      if ((endPoint.score || 0) < this.config.visibilityThreshold) continue;

      const startX = startPoint.x * this.canvas.width / window.devicePixelRatio;
      const startY = startPoint.y * this.canvas.height / window.devicePixelRatio;
      const endX = endPoint.x * this.canvas.width / window.devicePixelRatio;
      const endY = endPoint.y * this.canvas.height / window.devicePixelRatio;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  /**
   * 포인트들 그리기
   */
  private drawPoints(keypoints: PoseKeypoint[]): void {
    for (let i = 0; i < keypoints.length; i++) {
      const point = keypoints[i];
      if (!point || (point.score || 0) < this.config.visibilityThreshold) continue;

      const x = point.x * this.canvas.width / window.devicePixelRatio;
      const y = point.y * this.canvas.height / window.devicePixelRatio;
      
      this.drawPoint(x, y, i);
    }
  }

  /**
   * 개별 포인트 그리기
   */
  private drawPoint(x: number, y: number, index: number): void {
    // 하이라이트 포인트인지 확인
    const isHighlight = this.config.highlightKeyPoints?.includes(index);
    const color = isHighlight ? (this.config.highlightColor || this.config.pointColor) : this.config.pointColor;
    const size = isHighlight ? this.config.pointSize * 1.5 : this.config.pointSize;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  /**
   * 성능 통계 업데이트
   */
  private updateFrameStats(startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.frameStats.frameCount++;
    this.frameStats.lastRenderTime = renderTime;
    
    // 이동 평균으로 평균 렌더링 시간 계산
    const alpha = 0.1;
    this.frameStats.avgRenderTime = 
      this.frameStats.avgRenderTime * (1 - alpha) + renderTime * alpha;
  }

  /**
   * 렌더링 설정 업데이트
   */
  public updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 특정 관절 하이라이트
   */
  public highlightJoints(jointNames: string[]): void {
    const jointIndices = jointNames.map(name => {
      const key = name.toUpperCase() as keyof typeof PoseRenderer.KEY_POINTS;
      return PoseRenderer.KEY_POINTS[key];
    }).filter(index => index !== undefined);

    this.config.highlightKeyPoints = jointIndices;
  }

  /**
   * 성능 통계 반환
   */
  public getPerformanceStats(): PerformanceStats {
    return { ...this.frameStats };
  }

  /**
   * 캔버스 크기 조정
   */
  public resize(width?: number, height?: number): void {
    if (width && height) {
      this.canvas.width = width;
      this.canvas.height = height;
    } else {
      this.optimizeCanvas();
    }
  }

  /**
   * 렌더러 정리
   */
  public dispose(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.lastFrameData = null;
  }
}

/**
 * 포즈 렌더러 팩토리
 */
export class PoseRendererFactory {
  static createOptimizedRenderer(
    canvas: HTMLCanvasElement,
    exerciseType?: string
  ): PoseRenderer {
    // 운동별 최적화된 설정
    const configs = {
      squat: {
        pointColor: '#00FF00',
        lineColor: '#00AA00',
        highlightKeyPoints: [
          PoseRenderer.KEY_POINTS.LEFT_HIP,
          PoseRenderer.KEY_POINTS.RIGHT_HIP,
          PoseRenderer.KEY_POINTS.LEFT_KNEE,
          PoseRenderer.KEY_POINTS.RIGHT_KNEE
        ],
        highlightColor: '#FF6600'
      },
      pushup: {
        pointColor: '#0080FF',
        lineColor: '#0060AA',
        highlightKeyPoints: [
          PoseRenderer.KEY_POINTS.LEFT_SHOULDER,
          PoseRenderer.KEY_POINTS.RIGHT_SHOULDER,
          PoseRenderer.KEY_POINTS.LEFT_ELBOW,
          PoseRenderer.KEY_POINTS.RIGHT_ELBOW
        ],
        highlightColor: '#FF3300'
      },
      default: {
        pointColor: '#00FF00',
        lineColor: '#00AA00',
        pointSize: 3,
        lineWidth: 2,
        visibilityThreshold: 0.3
      }
    };

    const config = configs[exerciseType as keyof typeof configs] || configs.default;
    return new PoseRenderer(canvas, config);
  }
}