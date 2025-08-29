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

  constructor() {
    this.checkGoogleCloudAvailability();
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
   * 브라우저 기본 TTS로 음성 합성 (폴백)
   */
  private synthesizeWithBrowser(text: string, options: TTSOptions = {}): TTSResult {
    try {
      if (!('speechSynthesis' in window)) {
        throw new Error('브라우저에서 음성 합성을 지원하지 않습니다.');
      }

      // 기존 음성 중지
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // 한국어 음성 찾기
      const voices = window.speechSynthesis.getVoices();
      const koreanVoice = voices.find(voice => voice.lang.startsWith('ko-KR'));
      
      if (koreanVoice) {
        utterance.voice = koreanVoice;
      }

      // 옵션 설정
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // 음성 재생
      window.speechSynthesis.speak(utterance);

      return {
        success: true,
        method: 'browser-fallback'
      };
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
    return this.synthesizeWithBrowser(text, options);
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
    
    return this.synthesizeWithBrowser(text, browserOptions);
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
