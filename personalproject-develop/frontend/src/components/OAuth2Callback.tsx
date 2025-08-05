import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from './Modal';
import './OAuth2Callback.css';

const OAuth2Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
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

  useEffect(() => {
    console.log('OAuth2Callback useEffect 실행');
    console.log('현재 프로토콜:', window.location.protocol);
    console.log('현재 호스트:', window.location.host);
    console.log('현재 경로:', window.location.pathname);
    console.log('현재 해시:', window.location.hash);
    console.log('searchParams:', Object.fromEntries(searchParams.entries()));
    
    // HashRouter 환경에서 URL 파라미터 추출
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    console.log('해시 파라미터:', Object.fromEntries(hashParams.entries()));
    
    const success = searchParams.get('success') || hashParams.get('success');
    const error = searchParams.get('error') || hashParams.get('error');
    const token = searchParams.get('token') || hashParams.get('token');
    const provider = searchParams.get('provider') || hashParams.get('provider');
    const email = searchParams.get('email') || hashParams.get('email');
    const name = searchParams.get('name') || hashParams.get('name');
    const picture = searchParams.get('picture') || hashParams.get('picture');
    const isNew = searchParams.get('isNewUser') || hashParams.get('isNewUser');

    console.log('파싱된 파라미터들:', {
      success,
      error,
      token: token ? '토큰 있음' : '토큰 없음',
      provider,
      email,
      name,
      picture: picture ? '사진 있음' : '사진 없음',
      isNew
    });

    // URL에서 직접 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL 파라미터 직접 확인:', Object.fromEntries(urlParams.entries()));

    if (error) {
      console.log('에러 발생:', error);
      let errorMessage = '소셜 로그인에 실패했습니다.';
      
             // 구체적인 에러 메시지 제공
       if (error === 'oauth2_failed') {
         errorMessage = 'OAuth2 인증 과정에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
         console.error('OAuth2 실패 상세 정보:', {
           url: window.location.href,
           searchParams: Object.fromEntries(searchParams.entries()),
           hash: window.location.hash
         });
       } else if (error === 'missing_info') {
         errorMessage = '필수 사용자 정보를 가져올 수 없습니다.';
       }
      
      setModal({
        isOpen: true,
        title: '로그인 실패',
        message: errorMessage,
        type: 'error'
      });
      return;
    }

    if (success === 'true' && token) {
      console.log('로그인 성공, 토큰 저장 중...');
      try {
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('token', token);
        
        // 사용자 정보를 localStorage에 저장 (선택사항)
        if (email && name) {
          localStorage.setItem('user', JSON.stringify({
            email,
            name,
            provider,
            picture
          }));
        }

        // 새로운 사용자인지 확인
        console.log('isNew 값:', isNew, '타입:', typeof isNew);
        if (isNew === 'true') {
          console.log('새 사용자로 판단, 추가 정보 입력 모달 표시');
          setShowAdditionalInfo(true);
        } else {
          console.log('기존 사용자로 판단, 바로 대시보드로 이동');
          // 기존 사용자는 바로 대시보드로 이동
          setModal({
            isOpen: true,
            title: '로그인 성공',
            message: '소셜 로그인이 완료되었습니다!',
            type: 'success'
          });
          
          // 2초 후 메인 페이지로 이동
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (err) {
        console.error('토큰 저장 중 오류:', err);
        setModal({
          isOpen: true,
          title: '저장 오류',
          message: '로그인 정보 저장 중 오류가 발생했습니다.',
          type: 'error'
        });
      }
    } else {
      console.log('인증 정보 누락:', { success, token });
      console.log('현재 URL:', window.location.href);
      console.log('URL 파라미터:', window.location.search);
      console.log('해시:', window.location.hash);
      
      // 디버깅을 위해 잠시 대기
      setTimeout(() => {
        setModal({
          isOpen: true,
          title: '인증 오류',
          message: '인증 정보가 올바르지 않습니다. URL: ' + window.location.href,
          type: 'error'
        });
      }, 1000);
    }
  }, [searchParams, navigate]);

  const handleAdditionalInfoComplete = () => {
    // 추가 정보를 서버에 저장
    // TODO: API 호출로 추가 정보 저장
    
    setShowAdditionalInfo(false);
    setModal({
      isOpen: true,
      title: '프로필 설정 완료',
      message: '추가 정보가 저장되었습니다!',
      type: 'success'
    });
    
    // 2초 후 대시보드로 이동
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleAdditionalInfoSkip = () => {
    setShowAdditionalInfo(false);
    setModal({
      isOpen: true,
      title: '환영합니다',
      message: 'FitMate에 오신 것을 환영합니다!',
      type: 'success'
    });
    
    // 2초 후 대시보드로 이동
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    navigate('/login');
  };

  return (
    <div className="oauth2-callback-container">
      <div style={{ position: 'fixed', top: '10px', left: '10px', background: 'red', color: 'white', padding: '10px', zIndex: 9999 }}>
        OAuth2Callback 렌더링됨
      </div>
      
      {showAdditionalInfo ? (
        <AdditionalInfoModal 
          onComplete={handleAdditionalInfoComplete}
          onSkip={handleAdditionalInfoSkip}
        />
      ) : (
        <div className="oauth2-callback-content">
          <h2>소셜 로그인 처리 중...</h2>
          <div className="loading-spinner"></div>
          <p>잠시만 기다려주세요.</p>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
            URL 파라미터: {window.location.search}
          </div>
        </div>
      )}
      
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

// 추가 정보 입력 모달 컴포넌트
const AdditionalInfoModal: React.FC<{
  onComplete: () => void;
  onSkip: () => void;
}> = ({ onComplete, onSkip }) => {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    goal: 'general'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete();
  };

  const handleGoalChange = (goal: string) => {
    setFormData(prev => ({ ...prev, goal }));
  };

  const handleGenderChange = (gender: string) => {
    setFormData(prev => ({ ...prev, gender }));
  };

  return (
    <div className="additional-info-modal-overlay">
      <div className="additional-info-modal">
        <div className="modal-header">
          <h3>추가 정보 입력</h3>
          <p>더 나은 서비스를 위해 몇 가지 정보를 입력해주세요</p>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>나이 *</label>
            <input 
              type="number" 
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              min="13" 
              max="100"
              required 
            />
          </div>
          
          <div className="form-group">
            <label>성별 *</label>
            <select 
              value={formData.gender}
              onChange={(e) => handleGenderChange(e.target.value)}
              required
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>운동 목표 (선택)</label>
            <div className="goal-buttons">
              <button
                type="button"
                className={`goal-btn ${formData.goal === 'general' ? 'active' : ''}`}
                onClick={() => handleGoalChange('general')}
              >
                일반 건강
              </button>
              <button
                type="button"
                className={`goal-btn ${formData.goal === 'weight_loss' ? 'active' : ''}`}
                onClick={() => handleGoalChange('weight_loss')}
              >
                체중 감량
              </button>
              <button
                type="button"
                className={`goal-btn ${formData.goal === 'muscle_gain' ? 'active' : ''}`}
                onClick={() => handleGoalChange('muscle_gain')}
              >
                근육 증가
              </button>
              <button
                type="button"
                className={`goal-btn ${formData.goal === 'strength' ? 'active' : ''}`}
                onClick={() => handleGoalChange('strength')}
              >
                근력 향상
              </button>
              <button
                type="button"
                className={`goal-btn ${formData.goal === 'endurance' ? 'active' : ''}`}
                onClick={() => handleGoalChange('endurance')}
              >
                지구력 향상
              </button>
            </div>
          </div>
        </form>
        
        <div className="modal-footer">
          <button onClick={handleSubmit} className="complete-btn">
            완료
          </button>
          <button onClick={onSkip} className="skip-btn">
            나중에 입력하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default OAuth2Callback; 