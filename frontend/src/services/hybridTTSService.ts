import { API_ENDPOINTS } from '../config/api';
import apiClient from '../utils/axiosConfig';

export interface TTSOptions {
  voice?: string;
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
  method: 'google-cloud' | 'browser-fallback';
}

export interface VoiceCategory {
  name: string;
  description: string;
  quality: string;
  cost: string;
  voices: Map<string, string>;
}

export interface VoiceDetails {
  voiceName: string;
  category: string;
  quality: string;
  cost: string;
  description: string;
  bestFor: string;
  language: string;
  gender: string;
}

class HybridTTSService {
  private audioContext: AudioContext | null = null;
  private isGoogleCloudAvailable: boolean = true;
  private isMobileDevice: boolean = false;
  private hasUserInteracted: boolean = false;
  private voicesLoaded: boolean = false;
  private audioPermissionGranted: boolean = false;

  constructor() {
    this.checkGoogleCloudAvailability();
    this.initializeMobileDetection();
    this.setupVoiceLoading();
    this.setupUserInteractionListener();
  }

  /**
   * 모바일 기기 감지 및 초기화
   */
  private initializeMobileDetection(): void {
    this.isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // iOS Safari 특별 처리
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                       !window.MSStream && 
                       !(window as any).chrome;
    
    if (isIOSSafari) {
      this.isMobileDevice = true;
      console.log('iOS Safari 감지: TTS 권한 처리 모드 활성화');
    }
  }

  /**
   * 사용자 상호작용 리스너 설정
   */
  private setupUserInteractionListener(): void {
    const handleFirstInteraction = () => {
      this.hasUserInteracted = true;
      this.initializeAudioContext();
      console.log('사용자 상호작용 감지: TTS 권한 활성화');
      
      // 이벤트 리스너 제거
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    // 모바일과 데스크톱 모두에서 상호작용 감지
    document.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
  }

  /**
   * AudioContext 초기화 (모바일 권한 처리)
   */
  private initializeAudioContext(): void {
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          
          // iOS에서 AudioContext 재생 권한 획득
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
              this.audioPermissionGranted = true;
              console.log('AudioContext 권한 획득 완료');
            }).catch(error => {
              console.error('AudioContext 권한 획득 실패:', error);
            });
          } else {
            this.audioPermissionGranted = true;
          }
        }
      }
    } catch (error) {
      console.error('AudioContext 초기화 실패:', error);
    }
  }

  /**
   * 음성 목록 로딩 (비동기)
   */
  private setupVoiceLoading(): void {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.voicesLoaded = true;
          console.log(`음성 목록 로드 완료: ${voices.length}개 음성 사용 가능`);
        }
      };

      // 즉시 로드 시도
      loadVoices();

      // iOS Safari에서는 음성 목록이 비동기로 로드됨
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // 타이머로 주기적 확인 (iOS 대비)
      const voiceCheckInterval = setInterval(() => {
        if (!this.voicesLoaded) {
          loadVoices();
        } else {
          clearInterval(voiceCheckInterval);
        }
      }, 500);

      // 5초 후 타이머 정리
      setTimeout(() => {
        clearInterval(voiceCheckInterval);
      }, 5000);
    }
  }

  /**
   * Google Cloud TTS 서비스 가용성 확인
   */
  private async checkGoogleCloudAvailability(): Promise<void> {
    try {
      const response = await apiClient.get('/api/tts/status');
      const status = response.data;
      this.isGoogleCloudAvailable = status.available;
    } catch (error) {
      this.isGoogleCloudAvailable = false;
      console.warn('Google Cloud TTS 서비스를 사용할 수 없습니다. 브라우저 기본 음성을 사용합니다.');
    }
  }

  /**
   * Google Cloud TTS로 음성 합성
   */
  private async synthesizeWithGoogleCloud(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    try {
      const response = await apiClient.post('/api/tts/synthesize', {
        text,
        voice: options.voice,
        language: options.language || 'ko-KR'
      }, {
        responseType: 'blob'
      });

      // response.data가 Blob인지 확인
      if (response.data instanceof Blob) {
        const audioUrl = URL.createObjectURL(response.data);
        return {
          success: true,
          audioUrl,
          method: 'google-cloud'
        };
      } else {
        console.error('응답 데이터가 Blob이 아닙니다:', typeof response.data);
        throw new Error('Invalid response data type');
      }
    } catch (error) {
      console.error('Google Cloud TTS 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'google-cloud'
      };
    }
  }

  /**
   * 모바일 기기에서 TTS 권한 확인
   */
  private checkMobileTTSPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isMobileDevice) {
        resolve(true);
        return;
      }

      if (!this.hasUserInteracted) {
        console.warn('모바일에서 TTS 사용을 위해 사용자 상호작용이 필요합니다');
        resolve(false);
        return;
      }

      // iOS에서 더 엄격한 검사
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        if (!this.audioPermissionGranted) {
          console.warn('iOS에서 오디오 권한이 필요합니다');
          resolve(false);
          return;
        }
      }

      resolve(true);
    });
  }

  /**
   * 브라우저 기본 TTS로 음성 합성 (모바일 최적화)
   */
  private async synthesizeWithBrowser(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    try {
      if (!('speechSynthesis' in window)) {
        throw new Error('브라우저에서 음성 합성을 지원하지 않습니다.');
      }

      // 모바일 권한 확인
      const hasPermission = await this.checkMobileTTSPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: '모바일에서 TTS 사용을 위해 화면을 터치해주세요',
          method: 'browser-fallback'
        };
      }

      // 기존 음성 중지
      window.speechSynthesis.cancel();

      // 음성 목록이 로드될 때까지 대기
      if (!this.voicesLoaded) {
        await this.waitForVoices(2000); // 최대 2초 대기
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // 한국어 음성 찾기 (우선순위: 한국어 > 영어 > 기본값)
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find(voice => voice.lang.startsWith('ko-KR') || voice.lang.startsWith('ko'));
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // 모바일 최적화 설정
      if (this.isMobileDevice) {
        utterance.rate = Math.max(0.7, Math.min(options.rate || 0.9, 1.2)); // 모바일에서 적절한 속도
        utterance.pitch = Math.max(0.8, Math.min(options.pitch || 1.0, 1.2)); // 모바일에서 적절한 음높이
        utterance.volume = Math.max(0.7, Math.min(options.volume || 0.9, 1.0)); // 모바일에서 적절한 볼륨
      } else {
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
      }

      // 음성 재생 성공/실패 처리
      return new Promise((resolve) => {
        let resolved = false;

        utterance.onstart = () => {
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              method: 'browser-fallback'
            });
          }
        };

        utterance.onerror = (event) => {
          if (!resolved) {
            resolved = true;
            console.error('브라우저 TTS 오류:', event.error);
            resolve({
              success: false,
              error: `TTS 재생 실패: ${event.error}`,
              method: 'browser-fallback'
            });
          }
        };

        // iOS Safari에서 간헐적으로 onstart가 호출되지 않는 경우 대비
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              method: 'browser-fallback'
            });
          }
        }, 100);

        // 음성 재생 시작
        window.speechSynthesis.speak(utterance);
      });

    } catch (error) {
      console.error('브라우저 TTS 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'browser-fallback'
      };
    }
  }

  /**
   * 음성 목록 로딩 대기
   */
  private waitForVoices(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.voicesLoaded) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.voicesLoaded = true;
          resolve();
        } else if (Date.now() - startTime > timeout) {
          resolve(); // 타임아웃 시에도 계속 진행
        } else {
          setTimeout(checkVoices, 50);
        }
      };

      checkVoices();
    });
  }

  /**
   * 하이브리드 음성 합성 (설정된 방법 우선, 실패 시 폴백)
   */
  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    // 설정된 TTS 방법 확인
    const savedSettings = localStorage.getItem('ttsSettings');
    let preferredMethod: 'google-cloud' | 'browser-fallback' = 'google-cloud';
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        preferredMethod = settings.method;
      } catch (error) {
        console.error('TTS 설정 파싱 실패:', error);
      }
    }

    // 설정된 방법으로 먼저 시도
    if (preferredMethod === 'google-cloud' && this.isGoogleCloudAvailable) {
      const result = await this.synthesizeWithGoogleCloud(text, options);
      if (result.success) {
        return result;
      }
      console.log('Google Cloud TTS 실패, 브라우저 TTS로 폴백');
    }

    // 브라우저 TTS로 폴백
    return await this.synthesizeWithBrowser(text, options);
  }

  /**
   * 운동 가이드용 음성 합성
   */
  async synthesizeExerciseGuide(text: string): Promise<TTSResult> {
    // 설정된 TTS 방법 확인
    const savedSettings = localStorage.getItem('ttsSettings');
    let preferredMethod: 'google-cloud' | 'browser-fallback' = 'google-cloud';
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        preferredMethod = settings.method;
      } catch (error) {
        console.error('TTS 설정 파싱 실패:', error);
      }
    }

    // 설정된 방법으로 먼저 시도
    if (preferredMethod === 'google-cloud' && this.isGoogleCloudAvailable) {
      try {
        const response = await apiClient.post('/api/tts/exercise-guide', { text }, {
          responseType: 'blob'
        });
        
        // response.data가 Blob인지 확인
        if (response.data instanceof Blob) {
          const audioUrl = URL.createObjectURL(response.data);
          return {
            success: true,
            audioUrl,
            method: 'google-cloud'
          };
        } else {
          console.error('응답 데이터가 Blob이 아닙니다:', typeof response.data);
          throw new Error('Invalid response data type');
        }
      } catch (error) {
        console.error('운동 가이드 Google Cloud TTS 실패, 브라우저 TTS로 폴백:', error);
      }
    }

    // 브라우저 TTS로 폴백 (설정된 옵션 사용)
    const browserOptions = { rate: 0.8, pitch: 1.0, volume: 1.2 };
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.method === 'browser-fallback') {
          browserOptions.rate = settings.rate;
          browserOptions.pitch = settings.pitch;
          browserOptions.volume = settings.volume;
        }
      } catch (error) {
        console.error('TTS 설정 파싱 실패:', error);
      }
    }
    
    return await this.synthesizeWithBrowser(text, browserOptions);
  }

  /**
   * 모바일에서 TTS 권한을 강제로 활성화 (사용자 버튼 클릭 시 호출)
   */
  async enableMobileTTS(): Promise<boolean> {
    if (!this.isMobileDevice) {
      return true;
    }

    try {
      // 사용자 상호작용 플래그 설정
      this.hasUserInteracted = true;
      
      // AudioContext 초기화
      this.initializeAudioContext();
      
      // 테스트 음성 재생으로 권한 확인
      const testResult = await this.synthesizeWithBrowser('테스트', { 
        rate: 1.0, 
        pitch: 1.0, 
        volume: 0.1 // 낮은 볼륨으로 테스트
      });
      
      if (testResult.success) {
        console.log('모바일 TTS 권한 활성화 성공');
        return true;
      } else {
        console.warn('모바일 TTS 권한 활성화 실패:', testResult.error);
        return false;
      }
    } catch (error) {
      console.error('모바일 TTS 권한 활성화 중 오류:', error);
      return false;
    }
  }

  /**
   * 현재 TTS 상태 확인
   */
  getTTSStatus() {
    return {
      isMobile: this.isMobileDevice,
      hasUserInteracted: this.hasUserInteracted,
      voicesLoaded: this.voicesLoaded,
      audioPermissionGranted: this.audioPermissionGranted,
      speechSynthesisSupported: 'speechSynthesis' in window,
      googleCloudAvailable: this.isGoogleCloudAvailable
    };
  }

  /**
   * 사용 가능한 음성 목록 조회
   */
  async getAvailableVoices(): Promise<Map<string, VoiceCategory>> {
    try {
      const response = await apiClient.get('/api/tts/voices');
      const voiceCategories = response.data;
      
      // Map으로 변환하고 정렬
      const result = new Map<string, VoiceCategory>();
      Object.entries(voiceCategories).forEach(([key, value]: [string, any]) => {
        // Standard 음성의 경우 A, B, C, D 순서로 정렬
        let sortedVoices: [string, string][];
        if (key === 'standard') {
          sortedVoices = (Object.entries(value.voices) as [string, string][]).sort(([a], [b]) => {
            const aSuffix = a.split('-').pop() || '';
            const bSuffix = b.split('-').pop() || '';
            return aSuffix.localeCompare(bSuffix);
          });
        } else {
          sortedVoices = Object.entries(value.voices) as [string, string][];
        }
        
        result.set(key, {
          name: value.name,
          description: value.description,
          quality: value.quality,
          cost: value.cost,
          voices: new Map(sortedVoices)
        });
      });
      
      return result;
    } catch (error) {
      console.error('음성 목록 조회 실패:', error);
      
      // 브라우저 기본 음성 목록 반환
      const voices = new Map<string, VoiceCategory>();
      if ('speechSynthesis' in window) {
        const browserVoices = window.speechSynthesis.getVoices();
        const koreanVoices = browserVoices.filter(voice => voice.lang.startsWith('ko'));
        
        if (koreanVoices.length > 0) {
          const browserVoiceMap = new Map<string, string>();
          koreanVoices.forEach(voice => {
            browserVoiceMap.set(voice.name, `${voice.name} (${voice.lang})`);
          });
          
          voices.set('browser', {
            name: '브라우저 기본 음성',
            description: '브라우저에서 제공하는 기본 음성',
            quality: '기본',
            cost: '무료',
            voices: browserVoiceMap
          });
        }
      }
      return voices;
    }
  }

  /**
   * 특정 음성의 상세 정보 조회
   */
  async getVoiceDetails(voiceName: string): Promise<VoiceDetails | null> {
    try {
      const response = await apiClient.get(`/api/tts/voices/${voiceName}`);
      if (response.status !== 200) return null;
      
      const details = response.data;
      return details as VoiceDetails;
    } catch (error) {
      console.error('음성 상세 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 음성 미리듣기
   */
  async previewVoice(voiceName: string): Promise<TTSResult> {
    try {
      const response = await apiClient.post(`/api/tts/preview/${voiceName}`, {}, {
        responseType: 'blob'
      });
      
      // response.data가 Blob인지 확인
      if (response.data instanceof Blob) {
        const audioUrl = URL.createObjectURL(response.data);
        return {
          success: true,
          audioUrl,
          method: 'google-cloud'
        };
      } else {
        console.error('응답 데이터가 Blob이 아닙니다:', typeof response.data);
        throw new Error('Invalid response data type');
      }
    } catch (error) {
      console.error('음성 미리듣기 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'google-cloud'
      };
    }
  }

  /**
   * 음성 재생 중지
   */
  stop(): void {
    // Google Cloud TTS 중지
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // 브라우저 TTS 중지
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 서비스 상태 확인
   */
  async getServiceStatus(): Promise<{ googleCloud: boolean; browser: boolean }> {
    const browserAvailable = 'speechSynthesis' in window;
    
    return {
      googleCloud: this.isGoogleCloudAvailable,
      browser: browserAvailable
    };
  }
}

// 싱글톤 인스턴스 생성
export const hybridTTSService = new HybridTTSService();
export default hybridTTSService;
