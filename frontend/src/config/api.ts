// API 설정
const isDevelopment = import.meta.env.DEV;

const DEFAULT_BACKEND_URL = isDevelopment ? 'http://localhost:8080' : '';
// 통신 서버는 환경변수 미설정 시 항상 localhost:3000으로 폴백
const DEFAULT_CHAT_SERVER_URL = 'http://localhost:3000';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_URL;
export const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || DEFAULT_CHAT_SERVER_URL;

// 개발 환경에서는 HTTP 허용, 프로덕션에서는 HTTPS 사용
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
  // 이메일 인증 관련 - 문자 인증으로 대체하여 주석처리
  // SEND_VERIFICATION_EMAIL: `${backendUrl}/api/auth/send-verification-email`,
  // VERIFY_EMAIL_CODE: `${backendUrl}/api/auth/verify-email-code`,
  // RESEND_VERIFICATION_EMAIL: `${backendUrl}/api/auth/resend-verification-email`,
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

  
  // 알림 관련
  NOTIFICATIONS: `${CHAT_SERVER_URL}/api/notifications`,
  CREATE_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/create`,
  ADMIN_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/admin/create`,
  BROADCAST_NOTIFICATION: `${CHAT_SERVER_URL}/api/notifications/broadcast`,
  
  // 새로운 API 엔드포인트들
  // 운동 프로그램 관련
  WORKOUT_PROGRAMS: `${backendUrl}/api/workout/programs`,
  WORKOUT_PROGRAM: (id: string) => `${backendUrl}/api/workout/programs/${id}`,
  
  // 운동정보 관련
  EXERCISES: `${backendUrl}/api/exercise-information`,
  
  // 분석 데이터 관련
  BODY_DATA: `${backendUrl}/api/analytics/body`,
  WORKOUT_STATS: `${backendUrl}/api/analytics/stats`,
  
  // 마이페이지 관련
  MYPAGE_DASHBOARD: (userId: string) => `${backendUrl}/api/mypage/${userId}/dashboard`,
  MYPAGE_TRENDS: (userId: string) => `${backendUrl}/api/mypage/${userId}/trends`,
  MYPAGE_WORKOUTS: (userId: string) => `${backendUrl}/api/mypage/${userId}/workouts`,
  MYPAGE_BODY_RECORDS: (userId: string) => `${backendUrl}/api/mypage/${userId}/body-records`,
  MYPAGE_REPORT: (userId: string) => `${backendUrl}/api/mypage/${userId}/report`,
  MYPAGE_RECORDS_ROOM: (userId: string) => `${backendUrl}/api/mypage/${userId}/records-room`,
  
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