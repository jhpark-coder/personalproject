/**
 * 브라우저 호환성 검사 및 폴백 처리
 */

export interface BrowserCapabilities {
  mediaDevices: boolean;
  webgl: boolean;
  webgl2: boolean;
  webAssembly: boolean;
  webWorkers: boolean;
  speechSynthesis: boolean;
  mediaRecorder: boolean;
  offscreenCanvas: boolean;
  imageCapture: boolean;
  webRTC: boolean;
}

export interface CompatibilityReport {
  isCompatible: boolean;
  capabilities: BrowserCapabilities;
  warnings: string[];
  recommendations: string[];
  fallbackOptions: string[];
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
  capabilities: BrowserCapabilities;
}

export class BrowserCompatibility {
  private static cachedReport: CompatibilityReport | null = null;
  private static cachedBrowserInfo: BrowserInfo | null = null;

  /**
   * 전체 호환성 검사
   */
  public static checkCompatibility(): CompatibilityReport {
    if (this.cachedReport) {
      return this.cachedReport;
    }

    const capabilities = this.checkCapabilities();
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const fallbackOptions: string[] = [];

    // 필수 기능 검사
    if (!capabilities.mediaDevices) {
      warnings.push('카메라/마이크 접근이 지원되지 않습니다.');
      fallbackOptions.push('최신 브라우저로 업그레이드하거나 HTTPS 환경에서 실행하세요.');
    }

    if (!capabilities.webAssembly) {
      warnings.push('WebAssembly가 지원되지 않습니다.');
      fallbackOptions.push('MediaPipe 성능이 제한될 수 있습니다.');
    }

    if (!capabilities.webgl && !capabilities.webgl2) {
      warnings.push('WebGL이 지원되지 않습니다.');
      recommendations.push('GPU 가속이 비활성화되어 성능이 저하될 수 있습니다.');
    }

    // 선택 기능 검사
    if (!capabilities.speechSynthesis) {
      warnings.push('음성 합성이 지원되지 않습니다.');
      fallbackOptions.push('텍스트 피드백으로 대체됩니다.');
    }

    if (!capabilities.webWorkers) {
      warnings.push('Web Workers가 지원되지 않습니다.');
      recommendations.push('백그라운드 처리 성능이 제한될 수 있습니다.');
    }

    // 호환성 판정
    const isCompatible = capabilities.mediaDevices && 
                        (capabilities.webgl || capabilities.webgl2) &&
                        capabilities.webAssembly;

    const report: CompatibilityReport = {
      isCompatible,
      capabilities,
      warnings,
      recommendations,
      fallbackOptions
    };

    this.cachedReport = report;
    return report;
  }

  /**
   * 개별 기능 검사
   */
  private static checkCapabilities(): BrowserCapabilities {
    return {
      mediaDevices: this.checkMediaDevices(),
      webgl: this.checkWebGL(),
      webgl2: this.checkWebGL2(),
      webAssembly: this.checkWebAssembly(),
      webWorkers: this.checkWebWorkers(),
      speechSynthesis: this.checkSpeechSynthesis(),
      mediaRecorder: this.checkMediaRecorder(),
      offscreenCanvas: this.checkOffscreenCanvas(),
      imageCapture: this.checkImageCapture(),
      webRTC: this.checkWebRTC()
    };
  }

  /**
   * MediaDevices API 지원 확인
   */
  private static checkMediaDevices(): boolean {
    return !!(navigator.mediaDevices && 
             navigator.mediaDevices.getUserMedia &&
             window.isSecureContext);
  }

  /**
   * WebGL 지원 확인
   */
  private static checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  /**
   * WebGL2 지원 확인
   */
  private static checkWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  /**
   * WebAssembly 지원 확인
   */
  private static checkWebAssembly(): boolean {
    return typeof WebAssembly === 'object' && 
           typeof WebAssembly.instantiate === 'function';
  }

  /**
   * Web Workers 지원 확인
   */
  private static checkWebWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Speech Synthesis 지원 확인
   */
  private static checkSpeechSynthesis(): boolean {
    return 'speechSynthesis' in window && 
           'SpeechSynthesisUtterance' in window;
  }

  /**
   * MediaRecorder 지원 확인
   */
  private static checkMediaRecorder(): boolean {
    return typeof MediaRecorder !== 'undefined';
  }

  /**
   * OffscreenCanvas 지원 확인
   */
  private static checkOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
  }

  /**
   * ImageCapture 지원 확인
   */
  private static checkImageCapture(): boolean {
    return typeof ImageCapture !== 'undefined';
  }

  /**
   * WebRTC 지원 확인
   */
  private static checkWebRTC(): boolean {
    return !!(window.RTCPeerConnection && 
             window.RTCSessionDescription && 
             window.RTCIceCandidate);
  }

  /**
   * 브라우저 정보 수집
   */
  public static getBrowserInfo(): BrowserInfo {
    if (this.cachedBrowserInfo) {
      return this.cachedBrowserInfo;
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // 브라우저 감지
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox/')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+(\.\d+)?)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg/')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    // 모바일 감지
    const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    const browserInfo: BrowserInfo = {
      name,
      version,
      engine,
      platform,
      mobile,
      capabilities: this.checkCapabilities()
    };

    this.cachedBrowserInfo = browserInfo;
    return browserInfo;
  }

  /**
   * MediaPipe 호환성 검사
   */
  public static checkMediaPipeCompatibility(): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const browserInfo = this.getBrowserInfo();
    const capabilities = this.checkCapabilities();

    // 브라우저별 알려진 이슈
    if (browserInfo.name === 'Safari' && parseFloat(browserInfo.version) < 14) {
      issues.push('Safari 14 미만에서는 MediaPipe 성능이 제한될 수 있습니다.');
      suggestions.push('Safari를 최신 버전으로 업데이트하세요.');
    }

    if (browserInfo.name === 'Firefox' && parseFloat(browserInfo.version) < 90) {
      issues.push('Firefox 90 미만에서는 일부 MediaPipe 기능이 작동하지 않을 수 있습니다.');
      suggestions.push('Firefox를 최신 버전으로 업데이트하세요.');
    }

    if (browserInfo.mobile && browserInfo.name === 'Chrome' && parseFloat(browserInfo.version) < 88) {
      issues.push('모바일 Chrome 88 미만에서는 성능 이슈가 있을 수 있습니다.');
      suggestions.push('Chrome 모바일을 최신 버전으로 업데이트하세요.');
    }

    // 필수 기능 확인
    if (!capabilities.webAssembly) {
      issues.push('WebAssembly가 지원되지 않아 MediaPipe가 작동하지 않습니다.');
      suggestions.push('최신 브라우저로 업그레이드하세요.');
    }

    if (!capabilities.webgl && !capabilities.webgl2) {
      issues.push('WebGL이 지원되지 않아 GPU 가속을 사용할 수 없습니다.');
      suggestions.push('브라우저에서 하드웨어 가속을 활성화하세요.');
    }

    const compatible = capabilities.webAssembly && 
                      (capabilities.webgl || capabilities.webgl2) && 
                      capabilities.mediaDevices;

    return {
      compatible,
      issues,
      suggestions
    };
  }

  /**
   * 성능 최적화 제안
   */
  public static getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const browserInfo = this.getBrowserInfo();
    const capabilities = this.checkCapabilities();

    // GPU 가속 관련
    if (capabilities.webgl2) {
      recommendations.push('WebGL2를 활용한 최적화된 렌더링 사용 가능');
    } else if (capabilities.webgl) {
      recommendations.push('WebGL을 사용하여 기본적인 GPU 가속 활용');
    } else {
      recommendations.push('CPU 렌더링 모드 - 성능이 제한될 수 있음');
    }

    // 멀티스레딩 관련
    if (capabilities.webWorkers) {
      recommendations.push('Web Workers를 활용한 백그라운드 처리 가능');
    } else {
      recommendations.push('단일 스레드 처리 - 복잡한 작업 시 UI가 멈출 수 있음');
    }

    // OffscreenCanvas 관련
    if (capabilities.offscreenCanvas) {
      recommendations.push('OffscreenCanvas를 활용한 비동기 렌더링 가능');
    }

    // 모바일 최적화
    if (browserInfo.mobile) {
      recommendations.push('모바일 환경 - 낮은 품질 설정 권장');
      recommendations.push('배터리 절약을 위해 프레임레이트 제한 권장');
    }

    return recommendations;
  }

  /**
   * 호환성 리포트 생성
   */
  public static generateCompatibilityReport(): string {
    const report = this.checkCompatibility();
    const browserInfo = this.getBrowserInfo();
    const mediaPipeCompat = this.checkMediaPipeCompatibility();
    const perfRecommendations = this.getPerformanceRecommendations();

    let output = `=== 브라우저 호환성 리포트 ===\n\n`;
    
    // 브라우저 정보
    output += `브라우저: ${browserInfo.name} ${browserInfo.version}\n`;
    output += `엔진: ${browserInfo.engine}\n`;
    output += `플랫폼: ${browserInfo.platform}\n`;
    output += `모바일: ${browserInfo.mobile ? '예' : '아니오'}\n\n`;

    // 전체 호환성
    output += `전체 호환성: ${report.isCompatible ? '✅ 호환됨' : '❌ 비호환'}\n\n`;

    // 기능별 지원 현황
    output += `=== 기능 지원 현황 ===\n`;
    Object.entries(report.capabilities).forEach(([feature, supported]) => {
      output += `${feature}: ${supported ? '✅' : '❌'}\n`;
    });
    output += `\n`;

    // MediaPipe 호환성
    output += `=== MediaPipe 호환성 ===\n`;
    output += `호환성: ${mediaPipeCompat.compatible ? '✅' : '❌'}\n`;
    if (mediaPipeCompat.issues.length > 0) {
      output += `이슈:\n${mediaPipeCompat.issues.map(issue => `- ${issue}`).join('\n')}\n`;
    }
    if (mediaPipeCompat.suggestions.length > 0) {
      output += `제안사항:\n${mediaPipeCompat.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}\n`;
    }
    output += `\n`;

    // 경고사항
    if (report.warnings.length > 0) {
      output += `=== 경고사항 ===\n`;
      output += report.warnings.map(warning => `⚠️ ${warning}`).join('\n');
      output += `\n\n`;
    }

    // 권장사항
    if (report.recommendations.length > 0) {
      output += `=== 권장사항 ===\n`;
      output += report.recommendations.map(rec => `💡 ${rec}`).join('\n');
      output += `\n\n`;
    }

    // 성능 최적화
    if (perfRecommendations.length > 0) {
      output += `=== 성능 최적화 ===\n`;
      output += perfRecommendations.map(rec => `🔧 ${rec}`).join('\n');
      output += `\n\n`;
    }

    // 폴백 옵션
    if (report.fallbackOptions.length > 0) {
      output += `=== 폴백 옵션 ===\n`;
      output += report.fallbackOptions.map(option => `🔄 ${option}`).join('\n');
    }

    return output;
  }

  /**
   * 사용자 친화적 오류 메시지 생성
   */
  public static getUserFriendlyErrorMessage(error: Error | string): {
    title: string;
    message: string;
    actions: string[];
  } {
    const errorStr = typeof error === 'string' ? error : error.message;
    const browserInfo = this.getBrowserInfo();

    // 일반적인 오류 패턴 매칭
    if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission denied')) {
      return {
        title: '카메라 권한 필요',
        message: '운동 자세 분석을 위해 카메라 접근 권한이 필요합니다.',
        actions: [
          '브라우저 주소창의 카메라 아이콘을 클릭하여 권한을 허용하세요',
          '브라우저 설정에서 카메라 권한을 확인하세요',
          'HTTPS 환경에서 접속하고 있는지 확인하세요'
        ]
      };
    }

    if (errorStr.includes('NotFoundError') || errorStr.includes('DevicesNotFoundError')) {
      return {
        title: '카메라를 찾을 수 없습니다',
        message: '사용 가능한 카메라가 없거나 연결되지 않았습니다.',
        actions: [
          '카메라가 제대로 연결되어 있는지 확인하세요',
          '다른 앱에서 카메라를 사용 중인지 확인하세요',
          '컴퓨터를 재시작한 후 다시 시도하세요'
        ]
      };
    }

    if (errorStr.includes('NotReadableError') || errorStr.includes('TrackStartError')) {
      return {
        title: '카메라 사용 중',
        message: '카메라가 다른 애플리케이션에서 사용 중입니다.',
        actions: [
          '비디오 통화 앱(Zoom, Teams 등)을 종료하세요',
          '다른 브라우저 탭에서 카메라를 사용하는지 확인하세요',
          '잠시 후 다시 시도하세요'
        ]
      };
    }

    if (errorStr.includes('OverconstrainedError')) {
      return {
        title: '카메라 설정 오류',
        message: '요청한 카메라 설정을 지원하지 않습니다.',
        actions: [
          '다른 카메라를 시도하세요',
          '낮은 해상도로 다시 시도하세요',
          '브라우저를 업데이트하세요'
        ]
      };
    }

    if (errorStr.includes('WebAssembly')) {
      return {
        title: 'WebAssembly 지원 필요',
        message: 'MediaPipe가 정상적으로 작동하려면 WebAssembly 지원이 필요합니다.',
        actions: [
          '최신 브라우저로 업데이트하세요',
          '브라우저에서 WebAssembly가 활성화되어 있는지 확인하세요',
          '다른 브라우저를 시도해보세요'
        ]
      };
    }

    if (errorStr.includes('WebGL') || errorStr.includes('GPU')) {
      return {
        title: 'GPU 가속 오류',
        message: 'GPU 가속 기능에 문제가 있습니다.',
        actions: [
          '브라우저에서 하드웨어 가속을 활성화하세요',
          '그래픽 드라이버를 업데이트하세요',
          '브라우저를 재시작하세요'
        ]
      };
    }

    // 브라우저별 특정 조언
    let browserSpecificActions: string[] = [];
    if (browserInfo.name === 'Safari') {
      browserSpecificActions = [
        'Safari가 최신 버전인지 확인하세요',
        'Safari 설정에서 카메라 및 마이크 권한을 확인하세요'
      ];
    } else if (browserInfo.name === 'Firefox') {
      browserSpecificActions = [
        'Firefox about:config에서 미디어 설정을 확인하세요',
        'Firefox를 최신 버전으로 업데이트하세요'
      ];
    } else if (browserInfo.name === 'Chrome') {
      browserSpecificActions = [
        'Chrome 설정 > 개인정보 보호 및 보안 > 사이트 설정에서 카메라 권한을 확인하세요',
        'Chrome을 최신 버전으로 업데이트하세요'
      ];
    }

    return {
      title: '예상치 못한 오류',
      message: '시스템에서 예상치 못한 오류가 발생했습니다.',
      actions: [
        '페이지를 새로고침하세요',
        '브라우저를 재시작하세요',
        ...browserSpecificActions,
        '다른 브라우저를 시도해보세요',
        '문제가 지속되면 기술 지원팀에 문의하세요'
      ]
    };
  }
}

// 전역 호환성 체커
export const compatibilityChecker = BrowserCompatibility;