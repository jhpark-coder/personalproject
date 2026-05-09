import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { logger } from '../shared/lib/logger';
import {
  getCurrentProvider,
  isOnboardingCompleted,
  setOnboardingCompleted,
  setProviderOnboardingCompleted,
} from '../shared/lib/storage';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAuth = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    logger.debug('🔍 AuthGuard useEffect:', {
      user: user?.id,
      loading,
      error,
      hasUser: !!user,
      hasError: !!error,
      requireAuth,
      retryCount,
      pathname: location.pathname
    });

    // 라우트 변경 시 스크롤을 맨 위로 이동
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (!loading) {
      if (user && !error) {
        logger.debug('✅ AuthGuard: 인증 성공');

        // 관리자 체크 및 온보딩 페이지 처리
        const userRole = user.role || 'ROLE_USER';
        const isAdmin = userRole === 'ROLE_ADMIN';
        const isOnboardingPage = location.pathname.startsWith('/onboarding');
        const localOnboardingCompleted = isOnboardingCompleted();

        // 사용자 프로필 완성도 기반 온보딩 완료 판단 (필수 항목이 모두 채워져 있으면 완료로 간주)
        const profileComplete = Boolean(
          user?.height && user?.weight && user?.age && user?.gender
        );

        // 프로필이 이미 완성되었는데 로컬 플래그가 없다면 보정
        if (profileComplete && !localOnboardingCompleted) {
          setOnboardingCompleted(true);
          setProviderOnboardingCompleted(getCurrentProvider(), true);
          logger.debug('🛠 온보딩 플래그 보정: 프로필 완성으로 완료 처리');
        }

        // 관리자가 온보딩 페이지에 접근하려고 하면 메인 페이지로 리다이렉트
        if (isAdmin && isOnboardingPage) {
          logger.debug('👨‍💼 관리자 온보딩 페이지 접근 차단, 메인 페이지로 이동');
          navigate('/');
          return;
        }

        // 일반 사용자가 온보딩을 완료하지 않았고(로컬 플래그/프로필 모두 미완료) 온보딩 페이지가 아닌 경우
        if (
          !isAdmin &&
          !localOnboardingCompleted &&
          !profileComplete &&
          !isOnboardingPage &&
          location.pathname !== '/'
        ) {
          logger.debug('📝 온보딩 미완료, 온보딩 페이지로 이동');
          navigate('/onboarding/experience');
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
        setRetryCount(0); // 성공 시 재시도 카운트 리셋
      } else if (error && requireAuth) {
        logger.debug('❌ AuthGuard: 인증 실패, 로그인 페이지로 이동');
        logger.debug('❌ AuthGuard 상세:', { error, user: user?.id });

        // 재시도 로직 (최대 2회)
        if (retryCount < 2 && (error.includes('FAILED') || error.includes('서버 응답 시간 초과'))) {
          logger.debug(`🔄 AuthGuard 재시도 ${retryCount + 1}/2`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            // UserContext의 refresh 함수 호출
            window.location.reload();
          }, 2000);
          return;
        }

        navigate('/login');
        setIsAuthenticated(false);
        setIsLoading(false);
      } else if (!requireAuth) {
        logger.debug('ℹ️ AuthGuard: 인증 불필요한 페이지');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }
  }, [user, loading, error, requireAuth, navigate, retryCount, location.pathname]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>인증 확인 중...</p>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null; // 로그인 페이지로 리다이렉트됨
  }

  return <>{children}</>;
};

export default AuthGuard;
