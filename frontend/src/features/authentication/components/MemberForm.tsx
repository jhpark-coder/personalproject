import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '@components/ui/Modal';
import { API_ENDPOINTS } from '@config/api';
import { useUser } from '@context/UserContext';
import { handleDynamicOAuthLogin, getOAuthEnvironmentInfo } from '@utils/oauthHelper';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import './MemberForm.css';

const MemberForm = () => {
  const navigate = useNavigate(); // 네비게이트 => 스프링부트의 리다이렉트와 유사
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
      const response = await apiClient.get(`${API_ENDPOINTS.BACKEND_URL}/test/login-page`);

      // 정상 응답 처리
      const remainingTokens = response.data.remainingTokens || '알 수 없음';
      const totalCapacity = response.data.totalCapacity || 10;
      showModal('Rate Limiting 테스트', 
        `성공! 남은 요청: ${remainingTokens}/${totalCapacity}회`, 'success');

    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Rate Limiting 테스트 실패:', errorMessage);
      showModal('Rate Limiting 테스트', errorMessage, 'error');
    } finally {
      setIsRateLimitTesting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showModal('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    try {
      // 실제 로그인 API 호출
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
        email: email,
        password: password
      });

      if (response.data.success) {
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('token', response.data.token);
        
        // 사용자 정보를 localStorage에 저장 (선택사항)
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // UserContext에 사용자 정보 설정
        if (response.data.user) {
          setUserFromLogin(response.data.user, response.data.token);
        }
        
        showModal('로그인 성공', '로그인에 성공했습니다!', 'success');
        
        // 2초 후 대시보드로 이동
        setTimeout(() => {
          navigate('/'); // 스프링부트에서 redirect:/dashboard 와 유사
        }, 1000);
      } else {
        showModal('로그인 실패', response.data.message || '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('로그인 실패:', errorMessage);
      showModal('로그인 실패', errorMessage, 'error');
    }
  };

  const handleSocialLogin = async (provider: string) => {
    console.log(`${provider} 로그인 시도`);
    
    // 환경 정보 확인
    const envInfo = getOAuthEnvironmentInfo();
    console.log('OAuth 환경 정보:', envInfo);
    
    try {
      // 동적 OAuth 로그인 처리
      const success = await handleDynamicOAuthLogin(provider, false);
      
      if (!success) {
        showModal('로그인 실패', '소셜 로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (error) {
      console.error('소셜 로그인 실패:', error);
      showModal('로그인 실패', '소셜 로그인에 실패했습니다. 다시 시도해주세요.', 'error');
    }
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
      
      {/* 모달 */}
      {modal.isOpen && (
        <Modal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      )}
    </div>
  );
};

export default MemberForm; 