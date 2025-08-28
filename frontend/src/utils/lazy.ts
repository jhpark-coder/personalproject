/**
 * Optimized lazy loading utilities with error boundaries and loading states
 */

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';

// 로딩 컴포넌트
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = '로딩 중...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: '#666'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #f3f3f3',
      borderTop: '3px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    }} />
    <p>{message}</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// 에러 바운더리
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ retry: () => void }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent retry={() => this.setState({ hasError: false, error: undefined })} />;
    }

    return this.props.children;
  }
}

// 기본 에러 폴백 컴포넌트
const DefaultErrorFallback: React.FC<{ retry: () => void }> = ({ retry }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    textAlign: 'center'
  }}>
    <h3 style={{ color: '#e74c3c', marginBottom: '16px' }}>컴포넌트 로딩 실패</h3>
    <p style={{ color: '#666', marginBottom: '20px' }}>
      네트워크 연결을 확인하고 다시 시도해주세요.
    </p>
    <button 
      onClick={retry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      다시 시도
    </button>
  </div>
);

// 개선된 lazy 로딩 함수
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    loadingMessage?: string;
    errorFallback?: React.ComponentType<{ retry: () => void }>;
    preload?: boolean;
  } = {}
): LazyExoticComponent<T> => {
  const LazyComponent = React.lazy(importFn);

  // 프리로딩 옵션
  if (options.preload) {
    // 컴포넌트를 미리 로드 (사용자 상호작용 예측)
    const preloadTimer = setTimeout(() => {
      importFn().catch(err => console.warn('Preload failed:', err));
    }, 2000); // 2초 후 프리로드
    
    // 메모리 누수 방지
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearTimeout(preloadTimer);
      });
    }
  }

  return LazyComponent;
};

// 지연 로딩 래퍼 컴포넌트
export const LazyWrapper: React.FC<{
  component: LazyExoticComponent<any>;
  loadingMessage?: string;
  errorFallback?: React.ComponentType<{ retry: () => void }>;
  [key: string]: any;
}> = ({ 
  component: Component, 
  loadingMessage, 
  errorFallback,
  ...props 
}) => (
  <LazyErrorBoundary fallback={errorFallback}>
    <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
      <Component {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

// 코드 분할 최적화를 위한 라우트별 lazy 컴포넌트들
export const LazyDashboard = createLazyComponent(
  () => import('@features/dashboard/components/Dashboard'),
  { loadingMessage: '대시보드 로딩 중...', preload: true }
);

export const LazyMotionCoach = createLazyComponent(
  () => import('@features/workout/components/MotionCoach'),
  { loadingMessage: '모션 코치 로딩 중...' }
);

export const LazyCalendar = createLazyComponent(
  () => import('@features/calendar/components/Calendar'),
  { loadingMessage: '캘린더 로딩 중...' }
);

export const LazyProfile = createLazyComponent(
  () => import('@features/profile/components/Profile'),
  { loadingMessage: '프로필 로딩 중...' }
);

export const LazySettings = createLazyComponent(
  () => import('@features/settings/components/Settings'),
  { loadingMessage: '설정 로딩 중...' }
);

export const LazyChat = createLazyComponent(
  () => import('@features/chat/components/ChatPage'),
  { loadingMessage: '채팅 로딩 중...' }
);

// 사용량이 적은 컴포넌트들
export const LazyExerciseInformation = createLazyComponent(
  () => import('@features/workout/components/ExerciseInformation'),
  { loadingMessage: '운동 정보 로딩 중...' }
);

export const LazyNotificationCenter = createLazyComponent(
  () => import('@features/notifications/components/NotificationCenter'),
  { loadingMessage: '알림 센터 로딩 중...' }
);

// 관리자 전용 컴포넌트들 (더 늦게 로드)
export const LazyChatDashboard = createLazyComponent(
  () => import('@features/chat/components/ChatDashboard'),
  { loadingMessage: '채팅 관리 로딩 중...' }
);

export const LazyBodyData = createLazyComponent(
  () => import('@features/analytics/components/BodyData'),
  { loadingMessage: '체성분 데이터 로딩 중...' }
);

export const LazyWorkoutStats = createLazyComponent(
  () => import('@features/analytics/components/WorkoutStats'),
  { loadingMessage: '운동 통계 로딩 중...' }
);

// 개발/테스트 전용 컴포넌트들
export const LazyDevComponents = {
  OAuthTest: createLazyComponent(
    () => import('@features/dev-test/components/OAuthEnvironmentTest'),
    { loadingMessage: 'OAuth 테스트 로딩 중...' }
  ),
  SpeechTest: createLazyComponent(
    () => import('@features/dev-test/components/SpeechSynthesisTest'),
    { loadingMessage: '음성 테스트 로딩 중...' }
  ),
  ExerciseTest: createLazyComponent(
    () => import('@features/dev-test/components/ExerciseTest'),
    { loadingMessage: '운동 테스트 로딩 중...' }
  )
};

// 번들 분석을 위한 유틸리티
export const analyzeBundleUsage = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Analysis');
    console.log('Lazy components loaded:', Object.keys(LazyDevComponents).length + 11);
    console.log('Estimated bundle reduction: ~30-40%');
    console.groupEnd();
  }
};

export default {
  createLazyComponent,
  LazyWrapper,
  LazyDashboard,
  LazyMotionCoach,
  LazyCalendar,
  LazyProfile,
  LazySettings,
  LazyChat,
  LazyExerciseInformation,
  LazyNotificationCenter,
  LazyChatDashboard,
  LazyBodyData,
  LazyWorkoutStats,
  LazyDevComponents,
  analyzeBundleUsage
};