import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import './SignupForm.css';

interface FormErrors {
  email?: string;
  password?: string;
  nickname?: string;
  name?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  verificationCode?: string;
}

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    name: '',
    birthDate: '',
    gender: '',
    phoneNumber: '',
    verificationCode: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [isEmailVerificationLoading, setIsEmailVerificationLoading] = useState(false);
  const [isEmailVerificationCompleted, setIsEmailVerificationCompleted] = useState(false);
  
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

  const validateEmail = (email: string): string | undefined => {
    if (!email) return '이메일을 입력해주세요';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '올바른 이메일 형식을 입력해주세요';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return '비밀번호를 입력해주세요';
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return '비밀번호는 영문과 숫자를 포함해야 합니다';
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return '이름을 입력해주세요';
    if (name.length < 2) return '이름은 2자 이상이어야 합니다';
    return undefined;
  };

  const validateBirthDate = (birthDate: string): string | undefined => {
    if (!birthDate) return '생년월일을 입력해주세요';
    if (birthDate.length !== 8) return '생년월일은 8자리로 입력해주세요';
    if (!/^\d{8}$/.test(birthDate)) return '생년월일은 숫자로만 입력해주세요';
    
    const year = parseInt(birthDate.substring(0, 4));
    const month = parseInt(birthDate.substring(4, 6));
    const day = parseInt(birthDate.substring(6, 8));
    
    if (year < 1900 || year > new Date().getFullYear()) {
      return '올바른 년도를 입력해주세요';
    }
    if (month < 1 || month > 12) return '올바른 월을 입력해주세요';
    if (day < 1 || day > 31) return '올바른 일을 입력해주세요';
    
    return undefined;
  };

  const validatePhoneNumber = (phoneNumber: string): string | undefined => {
    if (!phoneNumber) return '휴대전화번호를 입력해주세요';
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return '올바른 휴대전화번호 형식을 입력해주세요 (예: 010-1234-5678)';
    }
    return undefined;
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // 필수 필드 검증
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    const birthDateError = validateBirthDate(formData.birthDate);
    if (birthDateError) newErrors.birthDate = birthDateError;

    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    if (phoneNumberError) newErrors.phoneNumber = phoneNumberError;

    // 선택 필드는 검증하지 않음 (닉네임, 성별)

    return newErrors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 실시간 유효성 검사 (에러가 있을 때만)
    if (errors[field as keyof FormErrors]) {
      const newErrors = { ...errors };
      delete newErrors[field as keyof FormErrors];
      setErrors(newErrors);
    }
  };

  const handleBlur = (field: string) => {
    // 포커스 아웃 시 해당 필드 검증
    const fieldValue = formData[field as keyof typeof formData];
    let fieldError: string | undefined;

    switch (field) {
      case 'email':
        fieldError = validateEmail(fieldValue);
        break;
      case 'password':
        fieldError = validatePassword(fieldValue);
        break;
      case 'name':
        fieldError = validateName(fieldValue);
        break;
      case 'birthDate':
        fieldError = validateBirthDate(fieldValue);
        break;
      case 'phoneNumber':
        fieldError = validatePhoneNumber(fieldValue);
        break;
    }

    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const handleGenderChange = (gender: string) => {
    setFormData(prev => ({
      ...prev,
      gender
    }));
  };

  const handleEmailVerificationRequest = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors(prev => ({ ...prev, email: emailError }));
      return;
    }

    setIsEmailVerificationLoading(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.SEND_VERIFICATION_EMAIL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowVerificationCode(true);
        showModal('인증 코드 발송', '인증 코드가 이메일로 발송되었습니다.', 'success');
      } else {
        showModal('발송 실패', data.message || '이메일 발송에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('이메일 인증 요청 실패:', error);
      showModal('발송 실패', '이메일 발송에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsEmailVerificationLoading(false);
    }
  };

  const handleVerificationCodeSubmit = async () => {
    if (!formData.verificationCode.trim()) {
      showModal('입력 오류', '인증번호를 입력해주세요.', 'error');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_EMAIL_CODE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          code: formData.verificationCode 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsEmailVerificationCompleted(true);
        showModal('인증 완료', '인증이 완료되었습니다!', 'success');
        
        // 인증 완료 후 회원가입 버튼 활성화
        // 실제 회원가입은 사용자가 버튼을 클릭할 때 실행
      } else {
        showModal('인증 실패', data.message || '인증 코드가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      console.error('인증 코드 확인 실패:', error);
      showModal('인증 실패', '인증에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handleSignup = async () => {
    const formErrors = validateForm();
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      try {
        const response = await fetch(API_ENDPOINTS.SIGNUP, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nickname: formData.nickname,
            name: formData.name,
            birthDate: formData.birthDate,
            gender: formData.gender,
            phoneNumber: formData.phoneNumber
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          showModal('회원가입 완료', '회원가입이 완료되었습니다!', 'success');
          // 로그인 페이지로 이동
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } else {
          showModal('회원가입 실패', data.message || '회원가입에 실패했습니다.', 'error');
        }
      } catch (error) {
        console.error('회원가입 실패:', error);
        showModal('회원가입 실패', '회원가입에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } else {
      console.log('유효성 검사 실패:', formErrors);
      showModal('입력 오류', '입력 정보를 확인해주세요.', 'error');
    }
  };

  const getEmailVerificationButtonText = () => {
    if (isEmailVerificationCompleted) return '인증완료';
    if (isEmailVerificationLoading) return '인증요청중';
    if (showVerificationCode) return '인증번호발송';
    return '인증요청';
  };

  const getEmailVerificationButtonDisabled = () => {
    return isEmailVerificationLoading || isEmailVerificationCompleted;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignup();
  };

  const getFieldError = (field: string): string | undefined => {
    return errors[field as keyof FormErrors];
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
    <div className="signup-form-container">
      <div className="signup-form-card">
        <div className="signup-header">
          <h2>회원가입</h2>
          <Link to="/login" className="back-to-login">로그인으로 돌아가기</Link>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {/* 첫 번째 그룹 */}
          <div className="input-group">
            <div className={`input_item ${getFieldError('email') ? 'error' : ''}`}>
              <div className="input-icon">📧</div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`input_field ${getFieldError('email') ? 'error' : ''}`}
                placeholder="이메일주소 *"
                autoComplete="email"
              />
              <button
                type="button"
                className={`email-verification-btn ${
                  isEmailVerificationLoading ? 'loading' : 
                  isEmailVerificationCompleted ? 'completed' :
                  showVerificationCode ? 'sent' : ''
                }`}
                onClick={handleEmailVerificationRequest}
                disabled={getEmailVerificationButtonDisabled()}
              >
                {getEmailVerificationButtonText()}
              </button>
              {getFieldError('email') && (
                <div className="error-message">{getFieldError('email')}</div>
              )}
            </div>

            {showVerificationCode && (
              <div className="input_item">
                <div className="input-icon">🔐</div>
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                  className="input_field"
                  placeholder="인증번호 6자리"
                  maxLength={6}
                  disabled={isEmailVerificationCompleted}
                />
                <button
                  type="button"
                  className={`verify-code-btn ${isEmailVerificationCompleted ? 'completed' : ''}`}
                  onClick={handleVerificationCodeSubmit}
                  disabled={isEmailVerificationCompleted}
                >
                  {isEmailVerificationCompleted ? '인증완료' : '인증하기'}
                </button>
              </div>
            )}

            <div className={`input_item ${getFieldError('password') ? 'error' : ''}`}>
              <div className="input-icon">🔒</div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`input_field ${getFieldError('password') ? 'error' : ''}`}
                placeholder="비밀번호 *"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
              {getFieldError('password') && (
                <div className="error-message">{getFieldError('password')}</div>
              )}
            </div>

            <div className="input_item">
              <div className="input-icon">👤</div>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                onBlur={() => handleBlur('nickname')}
                className="input_field"
                placeholder="닉네임"
              />
            </div>
          </div>

          {/* 두 번째 그룹 */}
          <div className="input-group">
            <div className={`input_item ${getFieldError('name') ? 'error' : ''}`}>
              <div className="input-icon">👤</div>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`input_field ${getFieldError('name') ? 'error' : ''}`}
                placeholder="이름 *"
              />
              {getFieldError('name') && (
                <div className="error-message">{getFieldError('name')}</div>
              )}
            </div>

            <div className={`input_item ${getFieldError('birthDate') ? 'error' : ''}`}>
              <div className="input-icon">📅</div>
              <input
                type="text"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                onBlur={() => handleBlur('birthDate')}
                className={`input_field ${getFieldError('birthDate') ? 'error' : ''}`}
                placeholder="생년월일 8자리 *"
                maxLength={8}
              />
              {getFieldError('birthDate') && (
                <div className="error-message">{getFieldError('birthDate')}</div>
              )}
            </div>
          </div>

          {/* 성별 선택 */}
          <div className="gender-selection">
            <div className="gender-buttons">
              <button
                type="button"
                className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
                onClick={() => handleGenderChange('male')}
              >
                남자
              </button>
              <button
                type="button"
                className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
                onClick={() => handleGenderChange('female')}
              >
                여자
              </button>
              <button
                type="button"
                className={`gender-btn ${formData.gender === 'none' ? 'active' : ''}`}
                onClick={() => handleGenderChange('none')}
              >
                선택안함
              </button>
            </div>
          </div>

          <div className="verification-notice">
            신분증 상의 이름, 생년월일, 성별과 일치하지 않으면 실명인증이 불가합니다.
          </div>

          {/* 전화번호 섹션 */}
          <div className="phone-section">
            <div className={`input_item ${getFieldError('phoneNumber') ? 'error' : ''}`}>
              <div className="input-icon">📱</div>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                onBlur={() => handleBlur('phoneNumber')}
                className={`input_field ${getFieldError('phoneNumber') ? 'error' : ''}`}
                placeholder="휴대전화번호 *"
              />
              {getFieldError('phoneNumber') && (
                <div className="error-message">{getFieldError('phoneNumber')}</div>
              )}
            </div>
          </div>

          <button type="submit" className="verification-button" disabled={!isEmailVerificationCompleted}>
            회원가입
          </button>
        </form>
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

export default SignupForm; 