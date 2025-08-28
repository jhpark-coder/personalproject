/**
 * 카메라 스트림 관리자 - 안정성 및 호환성 강화
 */

export interface CameraConfig {
  width: { ideal: number; min: number; max: number };
  height: { ideal: number; min: number; max: number };
  frameRate: { ideal: number; min: number; max: number };
  facingMode: 'user' | 'environment';
}

export interface CameraStatus {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
  deviceInfo: {
    label: string;
    deviceId: string;
    resolution: { width: number; height: number };
    frameRate: number;
  } | null;
}

export class CameraManager {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private status: CameraStatus = {
    isActive: false,
    hasPermission: false,
    error: null,
    deviceInfo: null
  };

  /**
   * 카메라 권한 확인 및 요청
   */
  public async checkPermissions(): Promise<{ state: string; canRequest: boolean }> {
    try {
      // 권한 API 지원 확인
      if ('permissions' in navigator) {
        const permission = await (navigator.permissions as any).query({ name: 'camera' });
        return {
          state: permission.state,
          canRequest: permission.state !== 'denied'
        };
      }

      // 권한 API 미지원 시 직접 테스트
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1, height: 1 } 
        });
        testStream.getTracks().forEach(track => track.stop());
        return { state: 'granted', canRequest: true };
      } catch (error) {
        const err = error as any;
        return {
          state: err.name === 'NotAllowedError' ? 'denied' : 'prompt',
          canRequest: err.name !== 'NotAllowedError'
        };
      }
    } catch (error) {
      console.warn('권한 확인 실패:', error);
      return { state: 'unknown', canRequest: true };
    }
  }

  /**
   * 사용 가능한 카메라 디바이스 목록 조회
   */
  public async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('디바이스 열거 실패:', error);
      return [];
    }
  }

  /**
   * 최적 카메라 설정 결정
   */
  public getOptimalConfig(preference: 'quality' | 'performance' | 'balanced' = 'balanced'): CameraConfig {
    const configs = {
      quality: {
        width: { ideal: 1280, min: 640, max: 1920 },
        height: { ideal: 720, min: 480, max: 1080 },
        frameRate: { ideal: 30, min: 15, max: 60 },
        facingMode: 'user' as const
      },
      performance: {
        width: { ideal: 640, min: 480, max: 1280 },
        height: { ideal: 480, min: 360, max: 720 },
        frameRate: { ideal: 24, min: 15, max: 30 },
        facingMode: 'user' as const
      },
      balanced: {
        width: { ideal: 854, min: 640, max: 1280 },
        height: { ideal: 480, min: 360, max: 720 },
        frameRate: { ideal: 24, min: 15, max: 30 },
        facingMode: 'user' as const
      }
    };

    return configs[preference];
  }

  /**
   * 카메라 스트림 시작 (향상된 오류 처리)
   */
  public async startCamera(
    videoElement: HTMLVideoElement,
    config?: Partial<CameraConfig>
  ): Promise<CameraStatus> {
    try {
      // 기존 스트림 정리
      this.stopCamera();

      // 권한 확인
      const permission = await this.checkPermissions();
      if (permission.state === 'denied') {
        throw new Error('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
      }

      // 최적 설정 적용
      const optimalConfig = this.getOptimalConfig('balanced');
      const finalConfig = { ...optimalConfig, ...config };

      // 카메라 스트림 획득 (fallback 전략)
      let stream: MediaStream | null = null;
      const attempts = [
        // 1. 요청된 설정으로 시도
        () => navigator.mediaDevices.getUserMedia({
          video: {
            ...finalConfig,
            facingMode: finalConfig.facingMode
          }
        }),
        // 2. facingMode 제거하고 재시도
        () => navigator.mediaDevices.getUserMedia({
          video: {
            width: finalConfig.width,
            height: finalConfig.height,
            frameRate: finalConfig.frameRate
          }
        }),
        // 3. 기본 설정으로 재시도
        () => navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        }),
        // 4. 최소 설정으로 마지막 시도
        () => navigator.mediaDevices.getUserMedia({ video: true })
      ];

      let lastError: Error | null = null;
      for (const attempt of attempts) {
        try {
          stream = await attempt();
          break;
        } catch (error) {
          lastError = error as Error;
          console.warn('카메라 설정 시도 실패:', error);
        }
      }

      if (!stream) {
        throw lastError || new Error('카메라 스트림을 가져올 수 없습니다.');
      }

      // 비디오 엘리먼트에 스트림 연결
      videoElement.srcObject = stream;
      
      // 메타데이터 로드 대기
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('비디오 메타데이터 로드 타임아웃'));
        }, 10000);

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        videoElement.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('비디오 로드 오류'));
        };
      });

      // 재생 시작
      await videoElement.play();

      // 스트림 정보 수집
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      this.currentStream = stream;
      this.videoElement = videoElement;
      this.status = {
        isActive: true,
        hasPermission: true,
        error: null,
        deviceInfo: {
          label: videoTrack.label || '알 수 없는 카메라',
          deviceId: settings.deviceId || '',
          resolution: {
            width: settings.width || 640,
            height: settings.height || 480
          },
          frameRate: settings.frameRate || 30
        }
      };

      console.log('✅ 카메라 시작 성공:', this.status.deviceInfo);
      return { ...this.status };

    } catch (error) {
      const err = error as any;
      let errorMessage = '카메라 시작 실패';

      // 구체적인 오류 메시지 생성
      if (err.name === 'NotAllowedError') {
        errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '카메라가 다른 애플리케이션에서 사용 중입니다. 다른 앱을 종료한 후 다시 시도해주세요.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '요청한 카메라 설정을 지원하지 않습니다. 다른 설정으로 시도하겠습니다.';
      }

      this.status = {
        isActive: false,
        hasPermission: err.name !== 'NotAllowedError',
        error: errorMessage,
        deviceInfo: null
      };

      console.error('❌ 카메라 시작 실패:', err);
      throw new Error(errorMessage);
    }
  }

  /**
   * 카메라 스트림 중지
   */
  public stopCamera(): void {
    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => {
          track.stop();
          console.log('카메라 트랙 정지:', track.label);
        });
        this.currentStream = null;
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      this.status = {
        isActive: false,
        hasPermission: this.status.hasPermission,
        error: null,
        deviceInfo: null
      };

      console.log('⏹️ 카메라 정지 완료');
    } catch (error) {
      console.error('카메라 정지 중 오류:', error);
    }
  }

  /**
   * 카메라 전환 (전면/후면)
   */
  public async switchCamera(): Promise<CameraStatus> {
    if (!this.videoElement) {
      throw new Error('비디오 엘리먼트가 설정되지 않았습니다.');
    }

    const currentFacingMode = this.status.deviceInfo?.deviceId?.includes('front') 
      ? 'user' 
      : this.status.deviceInfo?.deviceId?.includes('back') 
        ? 'environment' 
        : 'user';

    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    return this.startCamera(this.videoElement, { facingMode: newFacingMode });
  }

  /**
   * 현재 스트림 상태 반환
   */
  public getStatus(): CameraStatus {
    return { ...this.status };
  }

  /**
   * 스트림 품질 모니터링
   */
  public monitorStreamQuality(): {
    width: number;
    height: number;
    frameRate: number;
    bandwidth: number;
  } | null {
    if (!this.currentStream) return null;

    const videoTrack = this.currentStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0,
      frameRate: settings.frameRate || 0,
      bandwidth: 0 // WebRTC stats API로 계산 가능
    };
  }

  /**
   * 해상도 동적 조정
   */
  public async adjustResolution(width: number, height: number): Promise<void> {
    if (!this.currentStream || !this.videoElement) {
      throw new Error('활성 스트림이 없습니다.');
    }

    const videoTrack = this.currentStream.getVideoTracks()[0];
    await videoTrack.applyConstraints({
      width: { ideal: width },
      height: { ideal: height }
    });

    // 디바이스 정보 업데이트
    const newSettings = videoTrack.getSettings();
    if (this.status.deviceInfo) {
      this.status.deviceInfo.resolution = {
        width: newSettings.width || width,
        height: newSettings.height || height
      };
    }
  }
}

export const cameraManager = new CameraManager();