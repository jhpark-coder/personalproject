import React, { useState, useEffect } from 'react';
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
          // 다음 단계로 이동
          navigate('/onboarding/body-info');
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
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="예: 010-1234-5678"
              className={errors.phoneNumber ? 'error' : ''}
            />
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className="button button-primary button-full"
          onClick={handleNext}
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default OnboardingBasicInfo; 