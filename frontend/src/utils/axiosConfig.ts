import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Axios 인스턴스 생성
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_ENDPOINTS.BACKEND_URL, // 백엔드 baseURL 설정
    timeout: 30000, // 30초 타임아웃
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  // 요청 인터셉터 - 자동 인증 토큰 주입
  instance.interceptors.request.use(
    (config) => {
      // 토큰이 필요한 요청에 자동으로 Authorization 헤더 추가
      const token = localStorage.getItem('token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 요청 로깅 (개발 환경에서만)
      if (import.meta.env.DEV) {
        console.log('📡 API 요청:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data,
          headers: config.headers,
        });
      }
      
      return config;
    },
    (error) => {
      console.error('❌ 요청 인터셉터 에러:', error);
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터 - 에러 처리 및 토큰 갱신
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // 응답 로깅 (개발 환경에서만)
      if (import.meta.env.DEV) {
        console.log('📡 API 응답:', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          data: response.data,
        });
      }
      
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // 에러 로깅
      console.error('❌ API 에러:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });

      // 401 Unauthorized - 토큰 만료 처리
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // 토큰 제거 및 로그인 페이지로 리다이렉트
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // 현재 페이지가 로그인 페이지가 아닌 경우에만 리다이렉트
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(new Error('세션이 만료되었습니다. 다시 로그인해주세요.'));
      }

      // 429 Rate Limit
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000; // 기본 5초
        
        console.log(`⚠️ Rate limit 발생. ${waitTime/1000}초 후 재시도합니다.`);
        
        // 재시도 로직
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(instance(originalRequest));
            }, waitTime);
          });
        }
        
        return Promise.reject(new Error('RATE_LIMIT'));
      }

      // 500번대 서버 에러 - 재시도 로직
      if (error.response?.status && error.response.status >= 500 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // 3초 후 재시도
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            instance(originalRequest)
              .then(resolve)
              .catch(reject);
          }, 3000);
        });
      }

      // 네트워크 에러 처리
      if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
        return Promise.reject(new Error('네트워크 연결을 확인해주세요.'));
      }

      // 타임아웃 에러 처리
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
      }

      // 기타 에러 처리
      const errorMessage = (error.response?.data as any)?.message || 
                          (error.response?.data as any)?.error || 
                          error.message || 
                          '알 수 없는 오류가 발생했습니다.';
      
      return Promise.reject(new Error(errorMessage));
    }
  );

  return instance;
};

// 기본 axios 인스턴스
export const apiClient = createAxiosInstance();

// 통신 서버용 axios 인스턴스 (다른 베이스 URL)
export const communicationClient = axios.create({
  baseURL: API_ENDPOINTS.COMMUNICATION_SERVER_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 통신 서버용 인터셉터 설정
communicationClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('📡 통신서버 요청:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

communicationClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('📡 통신서버 응답:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ 통신서버 에러:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
    });
    
    const errorMessage = (error.response?.data as any)?.message || 
                        error.message || 
                        '통신 서버 오류가 발생했습니다.';
    
    return Promise.reject(new Error(errorMessage));
  }
);

// 유틸리티 함수들
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('Google 캘린더 연동이 필요합니다')) {
        // This is a specific error that should be handled in the UI
        // by showing a toast notification and guiding the user to reconnect.
        return 'TOKEN_REFRESH_FAILED';
    }
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

// 파일 업로드용 설정
export const createFormDataConfig = (): AxiosRequestConfig => ({
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// JWT 토큰 검증 유틸리티
export const isTokenValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export default apiClient;