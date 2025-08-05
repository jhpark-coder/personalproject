import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

interface JwtPayload {
  exp?: number; // 만료 시간 (Unix epoch, 초 단위)
}

// 간단한 JWT 디코더 (의존성 없이 base64 디코딩)
const decodeToken = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload as JwtPayload;
  } catch (e) {
    return null;
  }
};

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAuth = true }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      if (requireAuth) {
        // 인증이 필요한 페이지인데 토큰이 없으면 로그인 페이지로
        navigate('/login');
        return;
      } else {
        // 인증이 필요없는 페이지면 그대로 표시
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
    }
    // 1) 토큰 만료 여부 확인 (클라이언트 측)
    const decoded = decodeToken(token);
    if (!decoded) {
      // 디코딩 실패 시 토큰 무효로 판단
      localStorage.removeItem('token');
      if (requireAuth) navigate('/login');
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    const currentTimeSec = Date.now() / 1000;
    if (decoded && decoded.exp && decoded.exp < currentTimeSec) {
      // 만료된 토큰 → 제거 후 로그인 페이지로 이동
      localStorage.removeItem('token');
      if (requireAuth) navigate('/login');
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // 2) 백엔드에 실제 프로필 요청으로 토큰 유효성 확인 (옵셔널, 실패 시 로그아웃)
    try {
      console.log('🔍 AuthGuard: 백엔드 프로필 요청 시작');
      console.log('🔍 URL:', API_ENDPOINTS.PROFILE);
      console.log('🔍 Token (앞 20자):', token.substring(0, 20) + '...');
      
      const res = await fetch(API_ENDPOINTS.PROFILE, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Response status:', res.status);
      console.log('🔍 Response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('🔍 Response error text:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('🔍 Response data:', data);
      
      if (!data.success) {
        console.error('🔍 Backend returned success=false:', data.message);
        throw new Error('Backend authentication failed');
      }
      
      console.log('🔍 AuthGuard: 백엔드 인증 성공');
      setIsAuthenticated(true);
    } catch (e) {
      console.error('🔍 AuthGuard: 백엔드 인증 실패:', e);
      // 실패 → 토큰 제거 및 로그인 페이지 이동
      localStorage.removeItem('token');
      if (requireAuth) navigate('/login');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

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