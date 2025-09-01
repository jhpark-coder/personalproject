import { API_ENDPOINTS } from '../config/api';
import { apiClient, handleApiError } from './axiosConfig';

/**
 * Quick Tunnel 환경에서 동적 OAuth 인증을 처리하는 헬퍼 함수
 * 
 * @param provider OAuth 프로바이더 (google, kakao, naver)
 * @param isCalendarOnly 캘린더 전용 인증 여부
 * @returns Promise<boolean> 성공 여부
 */
export const handleDynamicOAuthLogin = async (provider: string, isCalendarOnly: boolean = false): Promise<boolean> => {
  try {
    // 현재 baseURL 감지
    const currentBaseUrl = API_ENDPOINTS.GET_CURRENT_BASE_URL();
    
    // Quick Tunnel 환경 감지 (localhost가 아닌 https 도메인)
    const isQuickTunnel = currentBaseUrl.includes('https://') && !currentBaseUrl.includes('localhost');
    
    console.log('OAuth 로그인 시작:', { provider, currentBaseUrl, isQuickTunnel, isCalendarOnly });
    
    // Quick Tunnel 환경에서는 localhost:8080으로 직접 OAuth 처리
    // Naver OAuth는 localhost:8080만 등록되어 있음
    let authUrl: string;
    
    if (isQuickTunnel) {
      // trycloudflare 환경에서는 localhost:8080으로 직접 연결
      // 백엔드는 localhost에서 실행 중이므로 직접 접근 가능
      authUrl = `http://localhost:8080/oauth2/authorization/${provider}`;
      console.log('Quick Tunnel 환경 감지: localhost:8080으로 OAuth 처리');
    } else {
      // 일반 환경에서는 상대 경로 사용
      authUrl = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider);
    }
    
    // 캘린더 전용 요청인 경우 파라미터 추가
    if (isCalendarOnly) {
      const separator = authUrl.includes('?') ? '&' : '?';
      authUrl += `${separator}calendarOnly=true`;
    }
    
    console.log('OAuth 인증 URL:', authUrl);
    
    // OAuth 인증 페이지로 이동 (같은 창에서)
    window.location.href = authUrl;
    
    return true;
  } catch (error) {
    console.error('OAuth 로그인 처리 중 오류:', handleApiError(error));
    return false;
  }
};

/**
 * 환경별 OAuth 상태 확인
 */
export const getOAuthEnvironmentInfo = () => {
  const currentBaseUrl = API_ENDPOINTS.GET_CURRENT_BASE_URL();
  const isQuickTunnel = currentBaseUrl.includes('https://') && !currentBaseUrl.includes('localhost');
  const isLocalhost = currentBaseUrl.includes('localhost');
  
  return {
    currentBaseUrl,
    isQuickTunnel,
    isLocalhost,
    environment: isQuickTunnel ? 'Quick Tunnel' : isLocalhost ? 'Localhost' : 'Unknown'
  };
};