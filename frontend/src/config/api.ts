// API 설정
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3000';

// HTTPS 환경에서 HTTP 백엔드 접근을 위한 설정
const isHttps = window.location.protocol === 'https:';
const backendUrl = isHttps ? 'http://localhost:8080' : API_BASE_URL;

// API 엔드포인트
export const API_ENDPOINTS = {
  // 백엔드 URL - HTTPS 환경에서도 HTTP 백엔드 접근
  BACKEND_URL: backendUrl,
  
  // 통신 서버 URL
  COMMUNICATION_SERVER_URL: CHAT_SERVER_URL,
  
  // 인증 관련
  LOGIN: `${backendUrl}/api/auth/login`,
  SIGNUP: `${backendUrl}/api/auth/signup`,
  SEND_VERIFICATION_EMAIL: `${backendUrl}/api/auth/send-verification-email`,
  VERIFY_EMAIL_CODE: `${backendUrl}/api/auth/verify-email-code`,
  RESEND_VERIFICATION_EMAIL: `${backendUrl}/api/auth/resend-verification-email`,
  CHECK_EMAIL: `${backendUrl}/api/auth/check-email`,

  VERIFY_PHONE: `${backendUrl}/api/auth/verify-phone`,
  
  // 프로필 및 로그아웃
  PROFILE: `${backendUrl}/api/auth/profile`,
  LOGOUT: `${backendUrl}/api/auth/logout`,
  
  // OAuth2 관련
  OAUTH2_AUTHORIZATION: (provider: string) => `${backendUrl}/oauth2/authorization/${provider}`,
  OAUTH2_USER_INFO: `${backendUrl}/api/auth/oauth2-user-info`,
  
  // 알림 관련
  NOTIFICATIONS: `${CHAT_SERVER_URL}/api/notifications`,
  CREATE_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/create`,
  ADMIN_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/admin/create`,
  BROADCAST_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/broadcast`,
} as const; 