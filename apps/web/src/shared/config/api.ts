// API 설정
const isDevelopment = import.meta.env.DEV;

// 런타임 프로토콜 감지(브라우저 전용)
const isBrowser = typeof window !== 'undefined';
const isHttps = isBrowser && window.location.protocol === 'https:';

// 통신 서버 기본 URL 결정
// - HTTPS 페이지(터널 등)에서는 혼합 콘텐츠 방지를 위해 기본적으로 상대 경로 사용
// - 환경변수(VITE_CHAT_SERVER_URL)가 명시되면 이를 우선 사용
const DEFAULT_CHAT_SERVER_URL = isDevelopment && !isHttps ? 'http://localhost:4000' : '';

// 명시적으로 설정된 베이스 URL이 있으면 사용, 없으면 상대 경로 사용
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

// 개발/프로덕션 모두 기본은 상대 경로 사용 (Nginx 리버스 프록시 활용)
const backendUrl = API_BASE_URL || '';

// 하위 호환: 기존 코드에서 직접 참조하는 경우를 위해 유지
// HTTPS 환경에서는 기본적으로 상대 경로를 사용하도록 함
const configuredChatServerUrl = (import.meta.env.VITE_CHAT_SERVER_URL || DEFAULT_CHAT_SERVER_URL).trim();
export const CHAT_SERVER_URL = configuredChatServerUrl;

// 알림 REST 전용 베이스
// - HTTPS 환경에서는 상대 경로 사용 -> Vite/Nginx 프록시가 통신 서버로 라우팅
// - 그 외에는 환경변수 또는 로컬 기본값 사용
const NOTIF_BASE_URL = isHttps ? '' : configuredChatServerUrl || '';

// API 엔드포인트
export const API_ENDPOINTS = {
  // 백엔드 URL
  BACKEND_URL: backendUrl,
  
  // 통신 서버 URL (소켓 등)
  COMMUNICATION_SERVER_URL: configuredChatServerUrl,
  
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

  
  // 알림 관련 (HTTPS에서는 상대 경로로 호출)
  NOTIFICATIONS: `${NOTIF_BASE_URL}/api/notifications`,
  CREATE_NOTIFICATION: `${NOTIF_BASE_URL}/api/notifications/create`,
  ADMIN_NOTIFICATION: `${NOTIF_BASE_URL}/api/notifications/admin/create`,
  BROADCAST_NOTIFICATION: `${NOTIF_BASE_URL}/api/notifications/broadcast`,
  
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