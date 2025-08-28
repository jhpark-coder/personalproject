/**
 * MediaPipe Pose 로더 - 안정성 및 오류 복구 강화
 */

// import { Pose } from '@mediapipe/pose';

export interface MediaPipeConfig {
  modelComplexity: 0 | 1 | 2;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  smoothLandmarks: boolean;
  enableSegmentation: boolean;
  selfieMode: boolean;
}

export interface LoaderOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackConfig?: MediaPipeConfig;
}

export class MediaPipeLoader {
  private static instance: MediaPipeLoader | null = null;
  private loadPromise: Promise<Pose> | null = null;
  private isLoaded = false;
  private currentPose: Pose | null = null;

  private constructor() {}

  public static getInstance(): MediaPipeLoader {
    if (!MediaPipeLoader.instance) {
      MediaPipeLoader.instance = new MediaPipeLoader();
    }
    return MediaPipeLoader.instance;
  }

  /**
   * MediaPipe Pose 로드 (재시도 메커니즘 포함)
   */
  public async loadPose(
    config: MediaPipeConfig,
    options: LoaderOptions = {}
  ): Promise<Pose> {
    const { maxRetries = 3, retryDelay = 2000, timeout = 30000 } = options;

    if (this.isLoaded && this.currentPose) {
      return this.currentPose;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadWithRetry(config, maxRetries, retryDelay, timeout);
    return this.loadPromise;
  }

  private async loadWithRetry(
    config: MediaPipeConfig,
    maxRetries: number,
    retryDelay: number,
    timeout: number
  ): Promise<Pose> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 MediaPipe 로드 시도 ${attempt + 1}/${maxRetries + 1}`);
        const pose = await this.createPoseWithTimeout(config, timeout);
        this.currentPose = pose;
        this.isLoaded = true;
        console.log(`✅ MediaPipe Pose 로드 성공 (시도 ${attempt + 1}/${maxRetries + 1})`);
        return pose;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ MediaPipe 로드 실패 (시도 ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
          // 다음 시도 전 대기 (exponential backoff)
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await this.sleep(delay);
          
          // 모델 복잡도 낮춰서 재시도
          if (attempt === 1 && config.modelComplexity > 0) {
            config.modelComplexity = 0;
            console.log('🔧 모델 복잡도를 0으로 낮춰서 재시도');
          }
        }
      }
    }

    // 모든 재시도 실패 시 폴백 옵션 제공
    const errorMessage = `MediaPipe 로드 실패 (${maxRetries + 1}회 시도): ${lastError?.message}`;
    console.error('❌ MediaPipe 로드 최종 실패:', errorMessage);
    console.error('💡 문제 해결 방법:');
    console.error('1. 인터넷 연결 확인');
    console.error('2. 브라우저 캐시 삭제');
    console.error('3. HTTPS 환경에서 실행');
    console.error('4. 최신 브라우저 사용');
    throw new Error(errorMessage);
  }

  private createPoseWithTimeout(config: MediaPipeConfig, timeout: number): Promise<Pose> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`MediaPipe 로드 타임아웃 (${timeout}ms)`));
      }, timeout);

      try {
        // WASM 글로벌 모듈 충돌 방지
        if (typeof globalThis !== 'undefined' && (globalThis as any).Module) {
          delete (globalThis as any).Module;
        }
        if (typeof window !== 'undefined' && (window as any).Module) {
          delete (window as any).Module;
        }
        if (typeof self !== 'undefined' && (self as any).Module) {
          delete (self as any).Module;
        }
        const pose = new Pose({
          locateFile: (file) => {
            // 여러 CDN 옵션 제공 (순서대로 시도) + simd -> wasm 강제 매핑
            let mapped = file;
            if (mapped.includes('simd_wasm_bin')) {
              mapped = mapped.replace('simd_wasm_bin', 'wasm_bin');
            }
            const cdnOptions = [
              `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${mapped}`,
              `https://unpkg.com/@mediapipe/pose@0.5.1675469404/${mapped}`,
              `https://cdn.skypack.dev/@mediapipe/pose@0.5.1675469404/${mapped}`,
            ];
            const selectedCdn = cdnOptions[0]; // 첫 번째 CDN 사용
            console.log(`🌐 CDN 사용: ${selectedCdn}`);
            return selectedCdn;
          }
        });

        pose.setOptions({
          modelComplexity: config.modelComplexity,
          smoothLandmarks: config.smoothLandmarks,
          enableSegmentation: config.enableSegmentation,
          smoothSegmentation: false,
          minDetectionConfidence: config.minDetectionConfidence,
          minTrackingConfidence: config.minTrackingConfidence,
          selfieMode: config.selfieMode
        });

        // 초기화 완료 확인
        const testCallback = (results: any) => {
          clearTimeout(timeoutId);
          console.log('✅ MediaPipe 초기화 테스트 성공');
          resolve(pose);
        };
        
        pose.onResults(testCallback);
        
        // 더미 이미지로 초기화 테스트
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, 1, 1);
          console.log('🧪 MediaPipe 초기화 테스트 시작');
          pose.send({ image: canvas }).catch((error) => {
            console.warn('⚠️ 초기화 테스트 실패, 계속 진행:', error);
            clearTimeout(timeoutId);
            resolve(pose);
          });
        } else {
          console.warn('⚠️ 캔버스 컨텍스트 생성 실패, 테스트 없이 진행');
          clearTimeout(timeoutId);
          resolve(pose);
        }

      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 현재 로드된 Pose 인스턴스 반환
   */
  public getCurrentPose(): Pose | null {
    return this.currentPose;
  }

  /**
   * 로더 상태 확인
   */
  public isLoading(): boolean {
    return this.loadPromise !== null && !this.isLoaded;
  }

  /**
   * 리셋 (새로운 설정으로 다시 로드할 때)
   */
  public reset(): void {
    if (this.currentPose) {
      this.currentPose.close?.();
    }
    this.currentPose = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * 최적 설정 추천
   */
  public static getOptimalConfig(deviceCapability: 'low' | 'medium' | 'high'): MediaPipeConfig {
    const configs = {
      low: {
        modelComplexity: 0 as const,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        smoothLandmarks: true,
        enableSegmentation: false,
        selfieMode: true
      },
      medium: {
        modelComplexity: 1 as const,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
        smoothLandmarks: true,
        enableSegmentation: false,
        selfieMode: true
      },
      high: {
        modelComplexity: 2 as const,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
        smoothLandmarks: true,
        enableSegmentation: false,
        selfieMode: true
      }
    };

    return configs[deviceCapability];
  }

  /**
   * 디바이스 성능 감지
   */
  public static detectDeviceCapability(): 'low' | 'medium' | 'high' {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 4;
    
    if (cores >= 8 && memory >= 8) return 'high';
    if (cores >= 4 && memory >= 4) return 'medium';
    return 'low';
  }
}

export const mediaLoader = MediaPipeLoader.getInstance();