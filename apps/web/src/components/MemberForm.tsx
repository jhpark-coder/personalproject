import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from '../context/UserContext';
import {
  clearOnboardingFlags,
  consumeJustSignedUp,
  setAuthToken,
  setCurrentProvider,
  setOnboardingCompleted,
  setStoredUser,
} from '../shared/lib/storage';
import './MemberForm.css';

const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUserFromLogin } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });
  const [isRateLimitTesting, setIsRateLimitTesting] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // Rate Limiting 테스트 함수 추가
  const testRateLimiting = async () => {
    // 이미 테스트 중이면 중복 실행 방지
    if (isRateLimitTesting) {
      return;
    }

    setIsRateLimitTesting(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/test/login-page`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 429는 바디 파싱 없이 바로 처리
      if (response.status === 429) {
        showModal('Rate Limiting 테스트', '요청이 너무 많습니다! (분당 10회 제한)', 'error');
        return;
      }

      // 비정상 상태(401/403/5xx 등)에서 HTML이 올 수 있으므로 방어적으로 처리
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await response.json().catch(() => ({} as { message?: string }));
          const msg = errData.message ? errData.message : `오류(${response.status})`;
          showModal('Rate Limiting 테스트', msg, 'error');
        } else {
          const text = await response.text();
          showModal('Rate Limiting 테스트', `오류(${response.status}) - JSON이 아닌 응답 수신`, 'error');
          console.error('Rate Limiting 테스트 비JSON 응답:', text);
        }
        return;
      }

      // 정상 응답(JSON 기대)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        showModal('Rate Limiting 테스트', '서버가 JSON이 아닌 응답을 반환했습니다.', 'error');
        console.error('비JSON 응답 본문:', text);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        const remainingTokens = data.remainingTokens || '알 수 없음';
        const totalCapacity = data.totalCapacity || 10;
        showModal('Rate Limiting 테스트', 
          `성공! 남은 요청: ${remainingTokens}/${totalCapacity}회`, 'success');
      } else {
        showModal('Rate Limiting 테스트', data.message || '테스트 실패', 'error');
      }
    } catch (error) {
      console.error('Rate Limiting 테스트 실패:', error);
      showModal('Rate Limiting 테스트', '테스트 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRateLimitTesting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('로그인 시도:', { email, password });
    
    // 기본 유효성 검사
    if (!email || !password) {
      showModal('로그인 실패', '이메일과 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('로그인 실패', '올바른 이메일 형식을 입력해주세요.', 'error');
      return;
    }

    try {
      // 실제 로그인 API 호출
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAuthToken(data.token);
        
        if (data.user) {
          setStoredUser(data.user);
        }
        
        // UserContext에 사용자 정보 설정
        if (data.user) {
          setUserFromLogin(data.user, data.token);
        }
        
        setCurrentProvider('local');
        
        // 테스트 사용자인 경우 온보딩 완료 상태 설정
        if (email === 'test@fitmate.com') {
          setOnboardingCompleted(true);
          console.log('✅ 테스트 사용자 로그인 성공, 온보딩 완료 상태 설정');
          navigate('/');
          return;
        } else {
          // 일반 사용자: justSignedUp 플래그가 있으면 온보딩으로 이동
          const justSignedUp = consumeJustSignedUp();
          if (justSignedUp) {
            clearOnboardingFlags();
            setCurrentProvider('local');
            navigate('/onboarding/experience');
            return;
          }
        }
        
        // 기본: 즉시 홈으로 이동
        navigate('/');
      } else {
        showModal('로그인 실패', data.message || '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      showModal('로그인 실패', '로그인에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} 로그인 시도`);
    // 실제 OAuth2 URL로 리다이렉트
    const oauth2Url = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider);
    window.location.href = oauth2Url;
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="member-form-container">
      <div className="member-form-card">
        {/* Rate Limiting 테스트 버튼 추가 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button 
            onClick={testRateLimiting}
            disabled={isRateLimitTesting}
            style={{
              padding: '10px 20px',
              backgroundColor: isRateLimitTesting ? '#6c757d' : 'var(--primary-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isRateLimitTesting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isRateLimitTesting ? 0.6 : 1
            }}
          >
            {isRateLimitTesting ? '⏳ 테스트 중...' : '🚀 Rate Limiting 테스트 (분당 10회)'}
          </button>
        </div>

        <form onSubmit={handleLogin} className="member-form">
          <div className="input-group">
            <div className="input_item id" id="input_item_email">
              <input
                type="text"
                id="email"
                name="email"
                maxLength={50}
                autoCapitalize="off"
                title="이메일주소"
                aria-label="이메일주소"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className={`input_id ${emailFocused || email ? 'active' : ''}`}
                autoComplete="email"
              />
              <label
                htmlFor="email"
                className={`text_label ${emailFocused || email ? 'active' : ''}`}
                id="email_label"
                aria-hidden="true"
              >
                이메일주소
              </label>
            </div>
          </div>

          <div className="input-group">
            <div className="input_item id" id="input_item_password">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                maxLength={41}
                autoCapitalize="none"
                title="비밀번호"
                aria-label="비밀번호"
                value={password}
                onChange={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                className={`input_id ${passwordFocused || password ? 'active' : ''}`}
                autoComplete="current-password"
              />
              <label
                htmlFor="password"
                className={`text_label ${passwordFocused || password ? 'active' : ''}`}
                id="password_label"
                aria-hidden="true"
              >
                비밀번호
              </label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button">
            로그인
          </button>
        </form>

        <div className="social-login-section">
          <div className="social-login-buttons">
            <button
              className="social-login-btn google-btn"
              onClick={() => handleSocialLogin('google')}
            >
              <img src="/images/Google_Login_Btn.png" alt="Google 로그인" />
            </button>
            <button
              className="social-login-btn naver-btn"
              onClick={() => handleSocialLogin('naver')}
            >
              <img src="/images/Naver_Login_Btn.png" alt="Naver 로그인" />
            </button>
            <button
              className="social-login-btn kakao-btn"
              onClick={() => handleSocialLogin('kakao')}
            >
              <img src="/images/Kakao_Login_Btn.png" alt="Kakao 로그인" />
            </button>
          </div>
        </div>

        <div className="form-links">
          <button className="form-link-btn">비밀번호 찾기</button>
          <span className="link-divider">|</span>
          <button className="form-link-btn">아이디 찾기</button>
          <span className="link-divider">|</span>
          <Link to="/signup" className="form-link-btn">회원가입</Link>
        </div>
      </div>
      
      {/* 모달 컴포넌트 */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default MemberForm; 
