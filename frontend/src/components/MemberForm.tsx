import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import './MemberForm.css';

const MemberForm: React.FC = () => {
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('로그인 시도:', { email, password });
    // TODO: 로그인 로직 구현
    showModal('로그인', '로그인 기능은 아직 구현되지 않았습니다.', 'info');
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