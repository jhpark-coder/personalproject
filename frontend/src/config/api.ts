// API 설정
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// API 엔드포인트
export const API_ENDPOINTS = {
  // 인증 관련
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  SIGNUP: `${API_BASE_URL}/api/auth/signup`,
  SEND_VERIFICATION_EMAIL: `${API_BASE_URL}/api/auth/send-verification-email`,
  VERIFY_EMAIL_CODE: `${API_BASE_URL}/api/auth/verify-email-code`,
  RESEND_VERIFICATION_EMAIL: `${API_BASE_URL}/api/auth/resend-verification-email`,
  CHECK_EMAIL: `${API_BASE_URL}/api/auth/check-email`,
  SOCIAL_LOGIN: `${API_BASE_URL}/api/auth/social-login`,
  VERIFY_PHONE: `${API_BASE_URL}/api/auth/verify-phone`,
  
  // OAuth2 관련
  OAUTH2_LOGIN_SUCCESS: `${API_BASE_URL}/api/oauth2/login-success`,
  OAUTH2_LOGIN_FAILURE: `${API_BASE_URL}/api/oauth2/login-failure`,
  
  // OAuth2 인증 URL
  OAUTH2_AUTHORIZATION: (provider: string) => `${API_BASE_URL}/oauth2/authorization/${provider}`,
} as const; 