import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import './MemberForm.css';

const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 모달 상태
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
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
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('token', data.token);
        
        // 사용자 정보를 localStorage에 저장 (선택사항)
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        showModal('로그인 성공', '로그인이 완료되었습니다!', 'success');
        
        // 1.5초 후 대시보드로 이동
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
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