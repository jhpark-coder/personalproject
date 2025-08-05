// API 설정
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3000';

// 개발 환경에서는 HTTP 허용, 프로덕션에서는 HTTPS 사용
const isDevelopment = import.meta.env.DEV;
const backendUrl = isDevelopment ? API_BASE_URL : API_BASE_URL.replace('http://', 'https://');

// API 엔드포인트
export const API_ENDPOINTS = {
  // 백엔드 URL
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
  
  // 온보딩 관련
  UPDATE_BASIC_INFO: `${backendUrl}/api/auth/update-basic-info`,
  UPDATE_BODY_INFO: `${backendUrl}/api/auth/update-body-info`,
  
  // 알림 관련
  NOTIFICATIONS: `${CHAT_SERVER_URL}/api/notifications`,
  CREATE_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/create`,
  ADMIN_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/admin/create`,
  BROADCAST_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/broadcast`,
  
  // 새로운 API 엔드포인트들
  // 운동 프로그램 관련
  WORKOUT_PROGRAMS: `${backendUrl}/api/workout/programs`,
  WORKOUT_PROGRAM: (id: string) => `${backendUrl}/api/workout/programs/${id}`,
  
  // 분석 데이터 관련
  BODY_DATA: `${backendUrl}/api/analytics/body`,
  WORKOUT_STATS: `${backendUrl}/api/analytics/stats`,
  
  // 대시보드 관련
  DASHBOARD_DATA: `${backendUrl}/api/dashboard/data`, // 통합 API
  DASHBOARD_GOAL: `${backendUrl}/api/dashboard/goal`,
  DASHBOARD_WORKOUT_STATS: `${backendUrl}/api/dashboard/workout-stats`,
  
  // 캘린더 관련
  CALENDAR_AUTH_GOOGLE: `${backendUrl}/api/calendar/auth/google`,
  CALENDAR_AUTH_CALLBACK: `${backendUrl}/api/calendar/auth/google/callback`,
  CALENDAR_LINK_GOOGLE: `${backendUrl}/api/calendar/link-google`,
  CALENDAR_STATUS: `${backendUrl}/api/calendar/status`,
  CALENDAR_DISCONNECT: `${backendUrl}/api/calendar/disconnect`,
  CALENDAR_EVENTS: `${backendUrl}/api/calendar/events`,
  CALENDAR_EVENTS_BY_DATE: (date: string) => `${backendUrl}/api/calendar/events/date/${date}`,
  CALENDAR_CREATE_EVENT: `${backendUrl}/api/calendar/events`,
  CALENDAR_UPDATE_EVENT: (id: string) => `${backendUrl}/api/calendar/events/${id}`,
  CALENDAR_DELETE_EVENT: (id: string) => `${backendUrl}/api/calendar/events/${id}`,
  CALENDAR_WORKOUT: `${backendUrl}/api/calendar/workout`,
  BASE_URL: backendUrl
} as const; 