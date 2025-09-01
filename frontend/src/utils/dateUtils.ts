/**
 * 한국 시간대 관련 유틸리티 함수들
 */

/**
 * 현재 시간을 한국 시간대로 변환하여 반환
 */
export const getKoreaTime = (): Date => {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreaTime;
};

/**
 * 주어진 날짜를 한국 시간대로 변환하여 반환
 */
export const toKoreaTime = (date: Date): Date => {
  const koreaTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreaTime;
};

/**
 * 한국 시간대로 포맷팅된 날짜 문자열 반환
 */
export const formatKoreaTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const koreaTime = toKoreaTime(date);
  return koreaTime.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  });
};

/**
 * 한국 시간대로 포맷팅된 날짜만 반환
 */
export const formatKoreaDate = (date: Date): string => {
  const koreaTime = toKoreaTime(date);
  return koreaTime.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * 한국 시간대로 포맷팅된 시간만 반환
 */
export const formatKoreaTimeOnly = (date: Date): string => {
  const koreaTime = toKoreaTime(date);
  return koreaTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 현재 한국 시간을 ISO 문자열로 반환
 */
export const getKoreaTimeISOString = (): string => {
  return getKoreaTime().toISOString();
};

/**
 * 주어진 날짜가 오늘인지 확인 (한국 시간 기준)
 */
export const isToday = (date: Date): boolean => {
  const koreaDate = toKoreaTime(date);
  const today = getKoreaTime();

  return koreaDate.getFullYear() === today.getFullYear() &&
         koreaDate.getMonth() === today.getMonth() &&
         koreaDate.getDate() === today.getDate();
};

/**
 * 주어진 날짜가 이번 주인지 확인 (한국 시간 기준)
 */
export const isThisWeek = (date: Date): boolean => {
  const koreaDate = toKoreaTime(date);
  const today = getKoreaTime();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일 시작
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일 끝
  endOfWeek.setHours(23, 59, 59, 999);

  return koreaDate >= startOfWeek && koreaDate <= endOfWeek;
};

/**
 * 주어진 날짜가 이번 달인지 확인 (한국 시간 기준)
 */
export const isThisMonth = (date: Date): boolean => {
  const koreaDate = toKoreaTime(date);
  const today = getKoreaTime();

  return koreaDate.getFullYear() === today.getFullYear() &&
         koreaDate.getMonth() === today.getMonth();
};
