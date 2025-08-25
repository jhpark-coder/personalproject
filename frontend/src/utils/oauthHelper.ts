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
    
    if (isQuickTunnel) {
      // Quick Tunnel 환경에서는 백엔드에 동적 redirect URL 업데이트 요청
      const { data: updateResult } = await apiClient.post(API_ENDPOINTS.UPDATE_OAUTH_REDIRECT, {
        baseUrl: currentBaseUrl,
        provider: provider
      });
      
      console.log('OAuth 리다이렉트 URL 업데이트 결과:', updateResult);
    }
    
    // OAuth 인증 URL 생성
    let authUrl = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider);
    
    // 캘린더 전용 요청인 경우 파라미터 추가
    if (isCalendarOnly) {
      const separator = authUrl.includes('?') ? '&' : '?';
      authUrl += `${separator}calendarOnly=true`;
    }
    
    console.log('OAuth 인증 URL:', authUrl);
    
    // OAuth 인증 페이지로 이동
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