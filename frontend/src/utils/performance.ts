/**
 * Performance monitoring and optimization utilities
 * Provides real-time performance metrics and optimization hints
 */

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  bundleSize: number;
  loadTime: number;
}

interface ComponentMetrics {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  propsChanges: number;
}

class PerformanceMonitor {
  private metrics: Map<string, ComponentMetrics> = new Map();
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
    
    if (this.isEnabled) {
      this.startFPSMonitoring();
      this.setupMemoryMonitoring();
    }
  }

  // FPS 모니터링
  private startFPSMonitoring(): void {
    const calculateFPS = (timestamp: number) => {
      this.frameCount++;
      
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }
      
      const delta = timestamp - this.lastFrameTime;
      
      if (delta >= 1000) { // 1초마다 FPS 계산
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.fpsHistory = [...this.fpsHistory.slice(-59), fps]; // 최근 60초 유지
        
        if (fps < 30) {
          console.warn(`⚠️ 낮은 FPS 감지: ${fps}fps`);
        }
        
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    requestAnimationFrame(calculateFPS);
  }

  // 메모리 사용량 모니터링
  private setupMemoryMonitoring(): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        
        const usagePercentage = (usedMB / limitMB) * 100;
        
        if (usagePercentage > 80) {
          console.warn(`⚠️ 높은 메모리 사용량: ${usedMB}MB (${usagePercentage.toFixed(1)}%)`);
        }
      }
    }, 10000); // 10초마다 체크
  }

  // 컴포넌트 렌더링 성능 측정
  measureRender<T extends React.ComponentType<any>>(
    component: T,
    componentName: string
  ): T {
    if (!this.isEnabled) return component;

    return React.memo(React.forwardRef((props: any, ref: any) => {
      const renderStart = performance.now();
      
      // 이전 props와 비교하여 변경 감지
      const prevProps = React.useRef(props);
      const propsChanged = React.useMemo(() => {
        const changed = JSON.stringify(prevProps.current) !== JSON.stringify(props);
        prevProps.current = props;
        return changed;
      }, [props]);

      React.useLayoutEffect(() => {
        const renderTime = performance.now() - renderStart;
        this.updateComponentMetrics(componentName, renderTime, propsChanged);
      });

      return React.createElement(component, { ...props, ref });
    })) as T;
  }

  private updateComponentMetrics(name: string, renderTime: number, propsChanged: boolean): void {
    const existing = this.metrics.get(name) || {
      name,
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      propsChanges: 0
    };

    const newRenderCount = existing.renderCount + 1;
    const newAverageTime = (existing.averageRenderTime * existing.renderCount + renderTime) / newRenderCount;

    this.metrics.set(name, {
      ...existing,
      renderCount: newRenderCount,
      averageRenderTime: newAverageTime,
      lastRenderTime: renderTime,
      propsChanges: propsChanged ? existing.propsChanges + 1 : existing.propsChanges
    });

    // 성능 경고
    if (renderTime > 16) { // 60fps 기준
      console.warn(`⚠️ 느린 렌더링 감지 (${name}): ${renderTime.toFixed(2)}ms`);
    }
  }

  // 성능 리포트 생성
  getPerformanceReport(): PerformanceMetrics & { components: ComponentMetrics[] } {
    const currentFPS = this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
    const averageFPS = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
      : 0;

    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = Math.round(((performance as any).memory.usedJSHeapSize / 1024 / 1024));
    }

    return {
      renderTime: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.averageRenderTime, 0) / this.metrics.size,
      memoryUsage,
      fps: currentFPS,
      bundleSize: 0, // TODO: 번들 크기 측정
      loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
      components: Array.from(this.metrics.values())
    };
  }

  // 성능 최적화 힌트 제공
  getOptimizationHints(): string[] {
    const hints: string[] = [];
    const report = this.getPerformanceReport();

    if (report.fps < 30) {
      hints.push('FPS가 낮습니다. 불필요한 리렌더링을 줄이고 React.memo를 활용하세요.');
    }

    if (report.memoryUsage > 100) {
      hints.push('메모리 사용량이 높습니다. 메모리 누수를 확인하고 cleanup을 강화하세요.');
    }

    report.components.forEach(comp => {
      if (comp.averageRenderTime > 10) {
        hints.push(`${comp.name} 컴포넌트의 렌더링이 느립니다. 최적화가 필요합니다.`);
      }
      
      if (comp.propsChanges / comp.renderCount > 0.8) {
        hints.push(`${comp.name} 컴포넌트의 props가 자주 변경됩니다. 메모이제이션을 고려하세요.`);
      }
    });

    return hints;
  }

  // 성능 대시보드 (개발 환경에서만)
  showPerformanceDashboard(): void {
    if (!this.isEnabled) return;

    const report = this.getPerformanceReport();
    const hints = this.getOptimizationHints();

    console.group('📊 Performance Dashboard');
    console.log('📈 Current Metrics:', {
      FPS: report.fps,
      'Memory (MB)': report.memoryUsage,
      'Avg Render Time (ms)': report.renderTime.toFixed(2)
    });
    
    if (report.components.length > 0) {
      console.table(report.components);
    }
    
    if (hints.length > 0) {
      console.group('💡 Optimization Hints');
      hints.forEach(hint => console.log(`• ${hint}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        performanceMonitor.showPerformanceDashboard();
      }, 30000); // 30초마다 리포트

      return () => clearInterval(interval);
    }
  }, []);

  return React.useCallback(() => {
    return performanceMonitor.getPerformanceReport();
  }, []);
};

// 성능 측정을 위한 HOC
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return performanceMonitor.measureRender(WrappedComponent, componentName);
};

export default performanceMonitor;