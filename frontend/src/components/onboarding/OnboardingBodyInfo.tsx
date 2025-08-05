import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import './OnboardingBodyInfo.css';

interface BodyInfo {
  bodyFatPercentage: string;
  muscleMass: string;
  basalMetabolicRate: string;
  bodyWaterPercentage: string;
  boneMass: string;
  visceralFatLevel: string;
}

const OnboardingBodyInfo: React.FC = () => {
  const [formData, setFormData] = useState<BodyInfo>({
    bodyFatPercentage: '',
    muscleMass: '',
    basalMetabolicRate: '',
    bodyWaterPercentage: '',
    boneMass: '',
    visceralFatLevel: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (field: keyof BodyInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('토큰이 없습니다');
        return;
      }

      // 상세 신체정보를 서버에 저장 (선택사항이므로 빈 값도 허용)
      const response = await fetch(API_ENDPOINTS.UPDATE_BODY_INFO, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // 온보딩 완료 상태 설정
        localStorage.setItem('onboardingCompleted', 'true');
        
        // 홈으로 이동
        navigate('/');
      } else {
        console.error('신체정보 저장 실패');
        // 저장 실패해도 홈으로 이동 (선택사항이므로)
        localStorage.setItem('onboardingCompleted', 'true');
        navigate('/');
      }
    } catch (error) {
      console.error('신체정보 저장 중 오류:', error);
      // 오류가 발생해도 홈으로 이동 (선택사항이므로)
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/');
    }
  };

  const handleSkip = () => {
    // 건너뛰기 선택 시에도 온보딩 완료 처리
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/');
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">상세 신체정보</div>
          <div></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">상세 신체정보를 입력해주세요</h1>
          <p className="question-subtitle">모든 항목은 선택사항입니다. 인바디 측정 결과가 있다면 입력해주세요.</p>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>체지방률 (%)</label>
            <input
              type="number"
              value={formData.bodyFatPercentage}
              onChange={(e) => handleInputChange('bodyFatPercentage', e.target.value)}
              placeholder="예: 15.5"
              min="5"
              max="50"
              step="0.1"
            />
            <small>인바디에서 측정한 체지방률을 입력해주세요</small>
          </div>

          <div className="form-group">
            <label>근육량 (kg)</label>
            <input
              type="number"
              value={formData.muscleMass}
              onChange={(e) => handleInputChange('muscleMass', e.target.value)}
              placeholder="예: 45.2"
              min="20"
              max="100"
              step="0.1"
            />
            <small>인바디에서 측정한 근육량을 입력해주세요</small>
          </div>

          <div className="form-group">
            <label>기초대사량 (kcal)</label>
            <input
              type="number"
              value={formData.basalMetabolicRate}
              onChange={(e) => handleInputChange('basalMetabolicRate', e.target.value)}
              placeholder="예: 1500"
              min="800"
              max="3000"
            />
            <small>인바디에서 측정한 기초대사량을 입력해주세요</small>
          </div>

          <div className="form-group">
            <label>체수분률 (%)</label>
            <input
              type="number"
              value={formData.bodyWaterPercentage}
              onChange={(e) => handleInputChange('bodyWaterPercentage', e.target.value)}
              placeholder="예: 60.5"
              min="40"
              max="80"
              step="0.1"
            />
            <small>인바디에서 측정한 체수분률을 입력해주세요</small>
          </div>

          <div className="form-group">
            <label>골격근량 (kg)</label>
            <input
              type="number"
              value={formData.boneMass}
              onChange={(e) => handleInputChange('boneMass', e.target.value)}
              placeholder="예: 3.2"
              min="1"
              max="10"
              step="0.1"
            />
            <small>인바디에서 측정한 골격근량을 입력해주세요</small>
          </div>

          <div className="form-group">
            <label>내장지방레벨</label>
            <input
              type="number"
              value={formData.visceralFatLevel}
              onChange={(e) => handleInputChange('visceralFatLevel', e.target.value)}
              placeholder="예: 8"
              min="1"
              max="30"
            />
            <small>인바디에서 측정한 내장지방레벨을 입력해주세요</small>
          </div>
        </div>

        <div className="info-section">
          <div className="info-box">
            <h3>💡 인바디 측정이 없다면?</h3>
            <p>인바디 측정 결과가 없어도 괜찮습니다. 나중에 언제든지 입력할 수 있어요.</p>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className="button button-secondary button-full"
          onClick={handleSkip}
          style={{ marginBottom: '10px' }}
        >
          나중에 입력하기
        </button>
        <button
          className="button button-primary button-full"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>
    </div>
  );
};

export default OnboardingBodyInfo; 