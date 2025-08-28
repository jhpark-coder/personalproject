/**
 * 메모리 관리 및 성능 최적화 유틸리티
 */

export interface MemoryUsageStats {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  memoryUsagePercent: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: MemoryUsageStats;
  activeTasks: number;
  resourceCount: {
    mediaStreams: number;
    eventListeners: number;
    animationFrames: number;
    audioObjects: number;
  };
}

export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private resourceRegistry = new Map<string, () => void>();
  private performanceMonitor: {
    frameCount: number;
    lastTime: number;
    fps: number;
    frameTime: number;
  } = { frameCount: 0, lastTime: 0, fps: 0, frameTime: 0 };
  
  private cleanupTasks: (() => void)[] = [];
  private activeStreams = new Set<MediaStream>();
  private activeEventListeners = new Map<EventTarget, Map<string, EventListener>>();
  private activeAnimationFrames = new Set<number>();
  private activeAudioObjects = new Set<HTMLAudioElement>();
  private gcTimer: number | null = null;

  private constructor() {
    this.initializePerformanceMonitoring();
    this.setupMemoryPressureHandling();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * 리소스 등록 및 자동 정리
   */
  public registerResource(id: string, cleanupFunction: () => void): void {
    // 기존 리소스 정리
    if (this.resourceRegistry.has(id)) {
      const existingCleanup = this.resourceRegistry.get(id);
      if (existingCleanup) {
        try {
          existingCleanup();
        } catch (error) {
          console.warn(`리소스 정리 실패 (${id}):`, error);
        }
      }
    }

    this.resourceRegistry.set(id, cleanupFunction);
  }

  /**
   * MediaStream 관리
   */
  public registerMediaStream(stream: MediaStream, id?: string): void {
    this.activeStreams.add(stream);
    
    const cleanup = () => {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`미디어 트랙 정리: ${track.label || track.kind}`);
      });
      this.activeStreams.delete(stream);
    };

    if (id) {
      this.registerResource(`mediastream_${id}`, cleanup);
    }

    // 스트림이 종료되면 자동으로 정리
    stream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        this.activeStreams.delete(stream);
      });
    });
  }

  /**
   * 이벤트 리스너 관리
   */
  public registerEventListener(
    target: EventTarget, 
    event: string, 
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(event, listener, options);

    // 등록 추적
    if (!this.activeEventListeners.has(target)) {
      this.activeEventListeners.set(target, new Map());
    }
    this.activeEventListeners.get(target)!.set(event, listener);

    // 정리 함수 등록
    const cleanup = () => {
      target.removeEventListener(event, listener);
      const targetListeners = this.activeEventListeners.get(target);
      if (targetListeners) {
        targetListeners.delete(event);
        if (targetListeners.size === 0) {
          this.activeEventListeners.delete(target);
        }
      }
    };

    this.registerResource(`eventlistener_${Date.now()}_${Math.random()}`, cleanup);
  }

  /**
   * AnimationFrame 관리
   */
  public registerAnimationFrame(callback: FrameRequestCallback): number {
    const frameId = requestAnimationFrame((time) => {
      this.activeAnimationFrames.delete(frameId);
      this.updatePerformanceMetrics(time);
      callback(time);
    });

    this.activeAnimationFrames.add(frameId);
    return frameId;
  }

  /**
   * Audio 객체 관리
   */
  public registerAudioObject(audio: HTMLAudioElement, id?: string): void {
    this.activeAudioObjects.add(audio);

    const cleanup = () => {
      audio.pause();
      audio.src = '';
      audio.load();
      if (audio.srcObject) {
        URL.revokeObjectURL(audio.src);
      }
      this.activeAudioObjects.delete(audio);
    };

    if (id) {
      this.registerResource(`audio_${id}`, cleanup);
    }

    // 재생 완료 시 자동 정리
    audio.addEventListener('ended', () => {
      cleanup();
    });

    // 오류 시 자동 정리
    audio.addEventListener('error', () => {
      cleanup();
    });
  }

  /**
   * 성능 모니터링 초기화
   */
  private initializePerformanceMonitoring(): void {
    this.performanceMonitor.lastTime = performance.now();
    
    const monitor = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - this.performanceMonitor.lastTime;
      
      this.performanceMonitor.frameCount++;
      this.performanceMonitor.frameTime = deltaTime;
      
      // FPS 계산 (1초마다)
      if (deltaTime >= 1000) {
        this.performanceMonitor.fps = this.performanceMonitor.frameCount;
        this.performanceMonitor.frameCount = 0;
        this.performanceMonitor.lastTime = currentTime;
      }

      // 다음 프레임 예약
      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  /**
   * 성능 메트릭 업데이트
   */
  private updatePerformanceMetrics(time: number): void {
    // 프레임 시간 계산
    const deltaTime = time - this.performanceMonitor.lastTime;
    
    // 이동 평균으로 프레임 시간 업데이트
    this.performanceMonitor.frameTime = 
      this.performanceMonitor.frameTime * 0.9 + deltaTime * 0.1;
  }

  /**
   * 메모리 압박 상황 처리
   */
  private setupMemoryPressureHandling(): void {
    // 메모리 사용량 모니터링
    this.gcTimer = window.setInterval(() => {
      const memoryInfo = this.getMemoryUsage();
      
      if (memoryInfo.memoryUsagePercent > 80) {
        console.warn('메모리 사용량 높음:', memoryInfo);
        this.performEmergencyCleanup();
      } else if (memoryInfo.memoryUsagePercent > 90) {
        console.error('메모리 사용량 위험:', memoryInfo);
        this.performAggressiveCleanup();
      }
    }, 5000); // 5초마다 체크

    // 페이지 언로드 시 모든 리소스 정리
    this.registerEventListener(window, 'beforeunload', () => {
      this.cleanup();
    });

    // 페이지 숨김 시 정리
    this.registerEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.pauseActiveResources();
      } else {
        this.resumeActiveResources();
      }
    });
  }

  /**
   * 메모리 사용량 확인
   */
  public getMemoryUsage(): MemoryUsageStats {
    const performance = (window as any).performance;
    
    if (performance && performance.memory) {
      const memory = performance.memory;
      return {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        memoryUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }

    // 브라우저가 메모리 정보를 제공하지 않는 경우
    return {
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      memoryUsagePercent: 0
    };
  }

  /**
   * 성능 메트릭 조회
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      fps: Math.round(1000 / this.performanceMonitor.frameTime),
      frameTime: this.performanceMonitor.frameTime,
      memoryUsage,
      activeTasks: this.resourceRegistry.size,
      resourceCount: {
        mediaStreams: this.activeStreams.size,
        eventListeners: Array.from(this.activeEventListeners.values()).reduce(
          (total, listeners) => total + listeners.size, 0
        ),
        animationFrames: this.activeAnimationFrames.size,
        audioObjects: this.activeAudioObjects.size
      }
    };
  }

  /**
   * 긴급 정리 (메모리 압박 시)
   */
  private performEmergencyCleanup(): void {
    console.log('긴급 메모리 정리 시작');

    // 오래된 리소스부터 정리
    const resourceIds = Array.from(this.resourceRegistry.keys());
    const cleanupCount = Math.ceil(resourceIds.length * 0.3); // 30% 정리

    for (let i = 0; i < cleanupCount; i++) {
      const resourceId = resourceIds[i];
      const cleanup = this.resourceRegistry.get(resourceId);
      if (cleanup) {
        try {
          cleanup();
          this.resourceRegistry.delete(resourceId);
        } catch (error) {
          console.warn(`긴급 정리 실패 (${resourceId}):`, error);
        }
      }
    }

    // 강제 가비지 컬렉션 (가능한 경우)
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * 공격적 정리 (심각한 메모리 압박 시)
   */
  private performAggressiveCleanup(): void {
    console.log('공격적 메모리 정리 시작');

    // 모든 비필수 리소스 정리
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.activeStreams.clear();

    this.activeAudioObjects.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.activeAudioObjects.clear();

    this.activeAnimationFrames.forEach(frameId => {
      cancelAnimationFrame(frameId);
    });
    this.activeAnimationFrames.clear();

    // 강제 가비지 컬렉션
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * 활성 리소스 일시 정지
   */
  private pauseActiveResources(): void {
    // 미디어 스트림 일시 정지
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => {
        if (track.enabled) {
          track.enabled = false;
          (track as any)._pausedByMemoryManager = true;
        }
      });
    });

    // 오디오 일시 정지
    this.activeAudioObjects.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        (audio as any)._pausedByMemoryManager = true;
      }
    });
  }

  /**
   * 활성 리소스 재개
   */
  private resumeActiveResources(): void {
    // 미디어 스트림 재개
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => {
        if ((track as any)._pausedByMemoryManager) {
          track.enabled = true;
          delete (track as any)._pausedByMemoryManager;
        }
      });
    });

    // 오디오 재개
    this.activeAudioObjects.forEach(audio => {
      if ((audio as any)._pausedByMemoryManager) {
        audio.play().catch(error => {
          console.warn('오디오 재개 실패:', error);
        });
        delete (audio as any)._pausedByMemoryManager;
      }
    });
  }

  /**
   * 특정 리소스 정리
   */
  public cleanupResource(id: string): void {
    const cleanup = this.resourceRegistry.get(id);
    if (cleanup) {
      try {
        cleanup();
        this.resourceRegistry.delete(id);
        console.log(`리소스 정리 완료: ${id}`);
      } catch (error) {
        console.error(`리소스 정리 실패 (${id}):`, error);
      }
    }
  }

  /**
   * 모든 리소스 정리
   */
  public cleanup(): void {
    console.log('전체 리소스 정리 시작');

    // 등록된 모든 리소스 정리
    for (const [id, cleanup] of this.resourceRegistry.entries()) {
      try {
        cleanup();
      } catch (error) {
        console.warn(`리소스 정리 실패 (${id}):`, error);
      }
    }
    this.resourceRegistry.clear();

    // 활성 리소스 직접 정리
    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.activeStreams.clear();

    this.activeAnimationFrames.forEach(frameId => {
      cancelAnimationFrame(frameId);
    });
    this.activeAnimationFrames.clear();

    this.activeAudioObjects.forEach(audio => {
      audio.pause();
      audio.src = '';
      if (audio.srcObject) {
        URL.revokeObjectURL(audio.src);
      }
    });
    this.activeAudioObjects.clear();

    // 이벤트 리스너 정리
    for (const [target, listeners] of this.activeEventListeners.entries()) {
      for (const [event, listener] of listeners.entries()) {
        try {
          target.removeEventListener(event, listener);
        } catch (error) {
          console.warn('이벤트 리스너 제거 실패:', error);
        }
      }
    }
    this.activeEventListeners.clear();

    // 타이머 정리
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    console.log('전체 리소스 정리 완료');
  }

  /**
   * 메모리 최적화 제안
   */
  public getOptimizationSuggestions(): string[] {
    const metrics = this.getPerformanceMetrics();
    const suggestions: string[] = [];

    if (metrics.fps < 30) {
      suggestions.push('낮은 FPS: 렌더링 최적화 필요');
    }

    if (metrics.memoryUsage.memoryUsagePercent > 70) {
      suggestions.push('높은 메모리 사용량: 리소스 정리 권장');
    }

    if (metrics.resourceCount.mediaStreams > 1) {
      suggestions.push('다중 미디어 스트림: 불필요한 스트림 정리');
    }

    if (metrics.resourceCount.animationFrames > 5) {
      suggestions.push('과다한 애니메이션 프레임: 최적화 필요');
    }

    if (suggestions.length === 0) {
      suggestions.push('메모리 사용량 정상');
    }

    return suggestions;
  }

  /**
   * 리소스 사용량 리포트
   */
  public generateResourceReport(): {
    summary: string;
    details: { [key: string]: number };
    suggestions: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    
    return {
      summary: `FPS: ${metrics.fps}, 메모리: ${metrics.memoryUsage.memoryUsagePercent.toFixed(1)}%, 활성 태스크: ${metrics.activeTasks}`,
      details: {
        fps: metrics.fps,
        frameTime: metrics.frameTime,
        memoryPercent: metrics.memoryUsage.memoryUsagePercent,
        activeTasks: metrics.activeTasks,
        mediaStreams: metrics.resourceCount.mediaStreams,
        eventListeners: metrics.resourceCount.eventListeners,
        animationFrames: metrics.resourceCount.animationFrames,
        audioObjects: metrics.resourceCount.audioObjects
      },
      suggestions: this.getOptimizationSuggestions()
    };
  }
}

// 전역 메모리 매니저 인스턴스
export const memoryManager = MemoryManager.getInstance();

// 유틸리티 함수들
export const withMemoryManagement = <T extends (...args: any[]) => any>(
  fn: T,
  resourceId: string
): T => {
  return ((...args: any[]) => {
    const cleanup = () => {
      // 함수 실행 후 정리 로직
      console.log(`함수 리소스 정리: ${resourceId}`);
    };

    memoryManager.registerResource(resourceId, cleanup);
    
    try {
      return fn(...args);
    } catch (error) {
      cleanup();
      throw error;
    }
  }) as T;
};

export const createManagedInterval = (
  callback: () => void,
  delay: number,
  resourceId: string
): number => {
  const intervalId = setInterval(callback, delay);
  
  memoryManager.registerResource(resourceId, () => {
    clearInterval(intervalId);
  });
  
  return intervalId;
};

export const createManagedTimeout = (
  callback: () => void,
  delay: number,
  resourceId: string
): number => {
  const timeoutId = setTimeout(() => {
    callback();
    memoryManager.cleanupResource(resourceId);
  }, delay);
  
  memoryManager.registerResource(resourceId, () => {
    clearTimeout(timeoutId);
  });
  
  return timeoutId;
};