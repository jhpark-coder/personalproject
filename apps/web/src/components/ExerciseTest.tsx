import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import './ExerciseTest.css';

interface ExerciseData {
  id: number;
  name: string;
  category?: number;
  muscles?: number[];
  equipment?: number[];
  description?: string;
  recommendationData?: {
    baseScore: number;
    bodyCondition: Record<string, number>;
    goalSuitability: Record<string, number>;
  };
}

interface MuscleData {
  id: number;
  name: string;
}

interface EquipmentData {
  id: number;
  name: string;
}

interface ApiEntity {
  id?: number;
  name?: string;
}

interface ApiExercise extends ApiEntity {
  category?: number | null;
  muscles?: number[];
  equipment?: number[];
  description?: string;
  recommendationData?: ExerciseData['recommendationData'] | null;
}

const ExerciseTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [muscles, setMuscles] = useState<MuscleData[]>([]);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [recommendations, setRecommendations] = useState<ExerciseData[]>([]);
  const [message, setMessage] = useState<string>('');

  // API 테스트
  const testApiConnection = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/test`);
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message} (근육 수: ${data.muscleCount})`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ API 연결 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 근육 정보 가져오기
  const loadMuscles = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/muscles`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.results) {
        const muscleResults = Array.isArray(data.data.results) ? data.data.results as ApiEntity[] : [];
        const safeMuscles = muscleResults.map((muscle) => ({
          id: muscle.id || 0,
          name: muscle.name || 'Unknown Muscle'
        }));
        
        setMuscles(safeMuscles);
        setMessage(`✅ 근육 정보 로드 완료 (${safeMuscles.length}개)`);
      } else {
        setMessage(`❌ 근육 정보 로드 실패: ${data.message || '데이터 구조 오류'}`);
      }
    } catch (error) {
      setMessage(`❌ 근육 정보 로드 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 장비 정보 가져오기
  const loadEquipment = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/equipment`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.results) {
        const equipmentResults = Array.isArray(data.data.results) ? data.data.results as ApiEntity[] : [];
        const safeEquipment = equipmentResults.map((eq) => ({
          id: eq.id || 0,
          name: eq.name || 'Unknown Equipment'
        }));
        
        setEquipment(safeEquipment);
        setMessage(`✅ 장비 정보 로드 완료 (${safeEquipment.length}개)`);
      } else {
        setMessage(`❌ 장비 정보 로드 실패: ${data.message || '데이터 구조 오류'}`);
      }
    } catch (error) {
      setMessage(`❌ 장비 정보 로드 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 운동 목록 가져오기
  const loadExercises = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/all`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.results) {
        // 데이터 구조 확인 및 안전한 처리
        const exerciseResults = Array.isArray(data.data.results) ? data.data.results as ApiExercise[] : [];
        const safeExercises = exerciseResults.slice(0, 10).map((exercise) => ({
          id: exercise.id || 0,
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || null,
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          description: exercise.description || ''
        }));
        
        setExercises(safeExercises);
        setMessage(`✅ 운동 목록 로드 완료 (총 ${data.data.count || exerciseResults.length}개 중 10개 표시)`);
      } else {
        setMessage(`❌ 운동 목록 로드 실패: ${data.message || '데이터 구조 오류'}`);
      }
    } catch (error) {
      setMessage(`❌ 운동 목록 로드 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 운동 추천
  const getRecommendations = async () => {
    if (!selectedMuscle && !selectedEquipment) {
      setMessage('❌ 근육이나 장비를 선택해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (selectedMuscle) params.append('muscleId', selectedMuscle);
      if (selectedEquipment) params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/recommend?${params}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.results) {
        const recommendationResults = Array.isArray(data.data.results) ? data.data.results as ApiExercise[] : [];
        const safeRecommendations = recommendationResults.map((exercise) => ({
          id: exercise.id || 0,
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || null,
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          description: exercise.description || '',
          recommendationData: exercise.recommendationData || null
        }));
        
        setRecommendations(safeRecommendations);
        setMessage(`✅ 운동 추천 완료 (${safeRecommendations.length}개 추천)`);
      } else {
        setMessage(`❌ 운동 추천 실패: ${data.message || '데이터 구조 오류'}`);
      }
    } catch (error) {
      setMessage(`❌ 운동 추천 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exercise-test-container">
      <h2>🏋️ 운동 API 테스트</h2>
      
      {/* API 연결 테스트 */}
      <div className="test-section">
        <h3>1. API 연결 테스트</h3>
        <button 
          onClick={testApiConnection} 
          disabled={loading}
          className="test-button"
        >
          {loading ? '테스트 중...' : 'API 연결 테스트'}
        </button>
      </div>

      {/* 기본 데이터 로드 */}
      <div className="test-section">
        <h3>2. 기본 데이터 로드</h3>
        <div className="button-group">
          <button 
            onClick={loadMuscles} 
            disabled={loading}
            className="test-button"
          >
            근육 정보 로드
          </button>
          <button 
            onClick={loadEquipment} 
            disabled={loading}
            className="test-button"
          >
            장비 정보 로드
          </button>
          <button 
            onClick={loadExercises} 
            disabled={loading}
            className="test-button"
          >
            운동 목록 로드
          </button>
        </div>
      </div>

      {/* 운동 추천 테스트 */}
      <div className="test-section">
        <h3>3. 운동 추천 테스트</h3>
        <div className="recommendation-form">
          <div className="form-group">
            <label>근육 선택:</label>
            <select 
              value={selectedMuscle} 
              onChange={(e) => setSelectedMuscle(e.target.value)}
              disabled={muscles.length === 0}
            >
              <option value="">근육을 선택하세요</option>
              {muscles.map(muscle => (
                <option key={muscle.id} value={muscle.id}>
                  {muscle.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>장비 선택:</label>
            <select 
              value={selectedEquipment} 
              onChange={(e) => setSelectedEquipment(e.target.value)}
              disabled={equipment.length === 0}
            >
              <option value="">장비를 선택하세요</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={getRecommendations} 
            disabled={loading || (!selectedMuscle && !selectedEquipment)}
            className="test-button"
          >
            {loading ? '추천 중...' : '운동 추천'}
          </button>
        </div>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* 결과 표시 */}
      {exercises.length > 0 && (
        <div className="results-section">
          <h3>운동 목록 (처음 10개)</h3>
          <div className="exercise-list">
            {exercises.map(exercise => (
              <div key={exercise.id} className="exercise-item">
                <strong>{exercise.name}</strong>
                <div>ID: {exercise.id}</div>
                {exercise.category && <div>카테고리: {typeof exercise.category === 'number' ? exercise.category : 'N/A'}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="results-section">
          <h3>추천 운동</h3>
          <div className="exercise-list">
            {recommendations.map(exercise => (
              <div key={exercise.id} className="exercise-item">
                <strong>{exercise.name}</strong>
                <div>ID: {exercise.id}</div>
                {exercise.category && <div>카테고리: {typeof exercise.category === 'number' ? exercise.category : 'N/A'}</div>}
                {exercise.recommendationData && (
                  <div className="recommendation-data">
                    <div>기본 점수: {typeof exercise.recommendationData.baseScore === 'number' 
                      ? exercise.recommendationData.baseScore 
                      : 'N/A'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseTest; 
