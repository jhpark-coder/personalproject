import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import './OnboardingBasicInfo.css';

interface BasicInfo {
  height: string;
  weight: string;
  age: string;
  gender: string;
  phoneNumber: string;
}

const OnboardingBasicInfo: React.FC = () => {
  const [formData, setFormData] = useState<BasicInfo>({
    height: '',
    weight: '',
    age: '',
    gender: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState<Partial<BasicInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // SMS 인증 관련 상태
  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');
  
  // 타이머 관련 상태 추가
  const [timeLeft, setTimeLeft] = useState<number>(0); // 초 단위
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [canExtend, setCanExtend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 생년월일로부터 나이 계산하는 함수
  const calculateAgeFromBirthDate = (birthDate: string): string => {
    if (!birthDate || birthDate.length !== 8) return '';
    
    try {
      const year = parseInt(birthDate.substring(0, 4));
      const month = parseInt(birthDate.substring(4, 6));
      const day = parseInt(birthDate.substring(6, 8));
      
      const birth = new Date(year, month - 1, day);
      const today = new Date();
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age.toString();
    } catch (error) {
      console.error('나이 계산 오류:', error);
      return '';
    }
  };

  // 전화번호 형식 변환 함수
  const formatPhoneNumber = (phoneNumber: string): string => {
    // 010-XXXX-XXXX 형식을 +82-10-XXXX-XXXX로 변환
    if (phoneNumber.startsWith('010-')) {
      return phoneNumber.replace('010-', '+82-10-');
    }
    // 이미 +82로 시작하면 그대로 반환
    if (phoneNumber.startsWith('+82')) {
      return phoneNumber;
    }
    // 다른 형식이면 그대로 반환
    return phoneNumber;
  };

  // 전화번호 유효성 검사
  const validatePhoneNumber = (phoneNumber: string): string | undefined => {
    if (!phoneNumber) return '휴대전화번호를 입력해주세요';
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return '올바른 휴대전화번호 형식을 입력해주세요 (예: 010-1234-5678)';
    }
    return undefined;
  };

  // 타이머 시작 함수
  const startTimer = (duration: number = 300) => { // 5분 = 300초
    setTimeLeft(duration);
    setIsTimerRunning(true);
    setCanExtend(false);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 타이머 종료
          setIsTimerRunning(false);
          setCanExtend(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 타이머 정리
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
    setTimeLeft(0);
  };

  // 시간 형식 변환 (분:초)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}분${remainingSeconds.toString().padStart(2, '0')}초`;
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  // SMS 인증 코드 발송
  const handleSmsSend = async () => {
    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) {
      setErrors(prev => ({ ...prev, phoneNumber: phoneError }));
      return;
    }

    setIsSmsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(formData.phoneNumber);
      const response = await fetch(API_ENDPOINTS.VERIFY_PHONE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedPhone }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowSmsCodeInput(true);
        
        // 타이머 시작
        startTimer();
        
        alert('SMS 인증 코드가 발송되었습니다.');
      } else {
        alert(data.message || 'SMS 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('SMS 발송 실패:', error);
      alert('SMS 발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSmsLoading(false);
    }
  };

  // SMS 인증 코드 검증
  const handleSmsVerify = async () => {
    if (!smsCode.trim()) {
      alert('인증번호를 입력해주세요.');
      return;
    }

    setIsSmsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(formData.phoneNumber);
      const response = await fetch(API_ENDPOINTS.VERIFY_PHONE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formattedPhone,
          code: smsCode 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSmsVerified(true);
        setVerifiedPhoneNumber(formData.phoneNumber);
        setShowSmsCodeInput(false);
        
        // 타이머 정리
        clearTimer();
        
        alert('전화번호 인증이 완료되었습니다!');
      } else {
        alert(data.message || '인증 코드가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('SMS 인증 실패:', error);
      alert('인증에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSmsLoading(false);
    }
  };

  // 시간연장 함수
  const handleExtendTime = async () => {
    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) {
      setErrors(prev => ({ ...prev, phoneNumber: phoneError }));
      return;
    }

    setIsSmsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(formData.phoneNumber);
      const response = await fetch(API_ENDPOINTS.VERIFY_PHONE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedPhone }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 타이머 재시작
        clearTimer();
        startTimer();
        
        alert('SMS 인증 코드가 재발송되었습니다.');
      } else {
        alert(data.message || 'SMS 재발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('SMS 재발송 실패:', error);
      alert('SMS 재발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSmsLoading(false);
    }
  };

  // 기존 사용자 데이터 로딩
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('토큰 확인:', token ? '토큰 있음' : '토큰 없음');
        
        if (!token) {
          setIsLoading(false);
          return;
        }

        console.log('프로필 API 호출:', API_ENDPOINTS.PROFILE);
        const response = await fetch(API_ENDPOINTS.PROFILE, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        console.log('프로필 응답 상태:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('프로필 응답 데이터:', data);
          
          if (data.success && data.user) {
            const user = data.user;
            console.log('사용자 데이터:', user);
            
            // 나이가 없고 생년월일이 있으면 나이 계산
            let age = user.age || '';
            if (!age && user.birthDate) {
              age = calculateAgeFromBirthDate(user.birthDate);
            }
            
            setFormData({
              height: user.height || '',
              weight: user.weight || '',
              age: age,
              gender: user.gender || '',
              phoneNumber: user.phoneNumber || ''
            });

            // 기존에 인증된 전화번호가 있으면 인증 완료 상태로 설정
            if (user.phoneNumber) {
              setIsSmsVerified(true);
              setVerifiedPhoneNumber(user.phoneNumber);
            }
          } else {
            console.log('사용자 데이터가 없거나 실패:', data);
          }
        } else {
          console.log('프로필 요청 실패:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('사용자 데이터 로딩 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const validateForm = (): Partial<BasicInfo> => {
    const newErrors: Partial<BasicInfo> = {};

    if (!formData.height) newErrors.height = '키를 입력해주세요';
    if (!formData.weight) newErrors.weight = '몸무게를 입력해주세요';
    if (!formData.age) newErrors.age = '나이를 입력해주세요';
    if (!formData.gender) newErrors.gender = '성별을 선택해주세요';
    if (!formData.phoneNumber) newErrors.phoneNumber = '연락처를 입력해주세요';

    // 숫자 검증
    if (formData.height && (isNaN(Number(formData.height)) || Number(formData.height) < 100 || Number(formData.height) > 250)) {
      newErrors.height = '올바른 키를 입력해주세요 (100-250cm)';
    }
    if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) < 30 || Number(formData.weight) > 200)) {
      newErrors.weight = '올바른 몸무게를 입력해주세요 (30-200kg)';
    }
    if (formData.age && (isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 100)) {
      newErrors.age = '올바른 나이를 입력해주세요 (13-100세)';
    }

    // 전화번호 인증 검사
    if (!isSmsVerified) {
      newErrors.phoneNumber = '전화번호 인증이 필요합니다';
    }

    return newErrors;
  };

  const handleInputChange = (field: keyof BasicInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = async () => {
    const formErrors = validateForm();
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('토큰이 없습니다');
          return;
        }

                  // 기본 정보를 서버에 저장
          const response = await fetch(API_ENDPOINTS.UPDATE_BASIC_INFO, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          });

          if (response.ok) {
            // 다음 단계: 완료 화면
            navigate('/onboarding/complete');
        } else {
          console.error('기본 정보 저장 실패');
        }
      } catch (error) {
        console.error('기본 정보 저장 중 오류:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="onboarding-container">
        <div className="loading-spinner"></div>
        <p>사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">기본 정보</div>
          <div></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '75%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">기본 정보를 입력해주세요</h1>
          <p className="question-subtitle">더 정확한 운동 추천을 위해 필요해요</p>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>키 (cm) *</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
              placeholder="예: 170"
              min="100"
              max="250"
              className={errors.height ? 'error' : ''}
            />
            {errors.height && <span className="error-message">{errors.height}</span>}
          </div>

          <div className="form-group">
            <label>몸무게 (kg) *</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="예: 65"
              min="30"
              max="200"
              className={errors.weight ? 'error' : ''}
            />
            {errors.weight && <span className="error-message">{errors.weight}</span>}
          </div>

          <div className="form-group">
            <label>나이 *</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="예: 25"
              min="13"
              max="100"
              className={errors.age ? 'error' : ''}
            />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>

          <div className="form-group">
            <label>성별 *</label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className={errors.gender ? 'error' : ''}
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className="form-group">
            <label>연락처 *</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="예: 010-1234-5678"
                className={errors.phoneNumber ? 'error' : ''}
                disabled={isSmsVerified}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSmsSend}
                disabled={isSmsVerified || isSmsLoading || !formData.phoneNumber}
                style={{
                  padding: '10px 15px',
                  backgroundColor: isSmsVerified ? '#28a745' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isSmsVerified || isSmsLoading || !formData.phoneNumber ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}
              >
                {isSmsVerified ? '인증완료' : isSmsLoading ? '전송중...' : 'SMS 인증'}
              </button>
            </div>
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
            {isSmsVerified && (
              <span style={{ color: '#28a745', fontSize: '12px' }}>✅ 전화번호 인증이 완료되었습니다.</span>
            )}
          </div>

          {/* SMS 인증 코드 입력 */}
          {showSmsCodeInput && !isSmsVerified && (
            <div className="form-group">
              <label>SMS 인증 코드</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="SMS 인증 코드 6자리"
                  maxLength={6}
                  disabled={isSmsLoading}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSmsVerify}
                  disabled={isSmsLoading || !smsCode.trim()}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: isSmsLoading || !smsCode.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isSmsLoading ? '인증중...' : '인증하기'}
                </button>
              </div>
              
              {/* 타이머 및 연장 버튼 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', color: '#6c757d' }}>⏰</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                    {isTimerRunning ? formatTime(timeLeft) : '시간 만료'}
                  </span>
                </div>
                
                {canExtend && (
                  <button
                    type="button"
                    onClick={handleExtendTime}
                    disabled={isSmsLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: isSmsLoading ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline',
                      opacity: isSmsLoading ? 0.6 : 1
                    }}
                  >
                    시간연장
                  </button>
                )}
              </div>
              
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#6c757d',
                lineHeight: '1.4',
                padding: '0 2px'
              }}>
                인증번호를 발송했습니다. 인증 문자가 오지 않으면 시간연장을 눌러주세요.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className="button button-primary button-full"
          onClick={handleNext}
          disabled={!isSmsVerified}
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default OnboardingBasicInfo; 