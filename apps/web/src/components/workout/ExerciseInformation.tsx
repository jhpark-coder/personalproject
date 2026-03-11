import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import { calculateCaloriesPerMinute } from '../../utils/calorieCalculator';
import './ExerciseInformation.css';
import Modal from '../Modal';
import { searchExerciseByName, getExerciseById } from '../../services/exerciseDb';

interface Exercise {
  id: number;
  name: string;
  description: string;
  category: string;
  equipment: string[];
  muscles: string[];
  musclesSecondary: string[];
  mets?: number;
  intensity?: string;
}

interface PaginationData {
  content: Exercise[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

type ExerciseSearchMode = 'name' | 'muscle' | 'name+muscle' | 'intensity';

const ExerciseInformation: React.FC = () => {
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [muscles, setMuscles] = useState<string[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [searchMode, setSearchMode] = useState<ExerciseSearchMode>('name');
  const [intensity, setIntensity] = useState<string>('');

  // 상세 모달 상태
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailContent, setDetailContent] = useState('');
  const [detailActions, setDetailActions] = useState<{ label: string; onClick: () => void }[]>([]);

  // 무한스크롤 관련 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  
  const { user } = useUser();

  // 시드 기반 카테고리(=target_areas 1차) 목록 로드
  const loadCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_ENDPOINTS.EXERCISES}/categories`, { headers });
      if (!res.ok) throw new Error('카테고리 불러오기 실패');
      const data: string[] = await res.json();
      // 공백/중복 제거 후 정렬
      const unique = Array.from(new Set((data || []).map((s) => s?.trim()).filter(Boolean)));
      setBodyParts(unique);
    } catch (e) {
      console.error(e);
      setBodyParts([]);
    }
  }, []);

  // 장비 한글 변환
  const translateEquipmentToKorean = (eq: string): string => {
    const map: Record<string, string> = {
      'barbell': '바벨',
      'dumbbell': '덤벨',
      'kettlebell': '케틀벨',
      'machine': '머신',
      'cable': '케이블',
      'band': '밴드',
      'body weight': '맨몸',
      'smith machine': '스미스 머신',
      'bench': '벤치',
      'rope': '로프',
    };
    const key = (eq || '').toLowerCase();
    return map[key] || eq;
  };

  // 무한스크롤 스크롤 감지 함수
  const loadMoreExercises = useCallback(async () => {
    if (isLoadingMore || loading || !hasNext) return;

    try {
      setIsLoadingMore(true);

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 검색 파라미터 구성
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('keyword', searchTerm);
      }
      if (selectedBodyPart) {
        // 백엔드 카테고리 필터 사용
        params.append('category', selectedBodyPart);
      }
      params.append('page', (currentPage + 1).toString());
      params.append('size', '10');

      const url = `${API_ENDPOINTS.EXERCISES}?${params.toString()}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error('추가 데이터 로드에 실패했습니다.');
      }

      const data: PaginationData = await response.json();
      setExercises(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const merged: Exercise[] = [...prev];
        for (const ex of data.content) {
          if (!existingIds.has(ex.id)) merged.push(ex);
        }
        return merged;
      });
      setCurrentPage(data.currentPage);
      setHasNext(data.hasNext);
      setTotalElements(data.totalElements);
    } catch (err) {
      console.error('추가 데이터 로드 실패:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNext, isLoadingMore, loading, searchTerm, selectedBodyPart]);

  const handleScroll = useCallback(() => {
    if (isLoadingMore || loading || !hasNext) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 100) {
      loadMoreExercises();
    }
  }, [hasNext, isLoadingMore, loading, loadMoreExercises]);

  // 스크롤 이벤트 리스너 등록/해제
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 백엔드에서 받은 카테고리를 그대로 사용 (이미 한글로 저장되어 있음)
  const translateCategoryToKorean = (category: string): string => {
    return category || '기타';
  };

  // 운동 부위 한글 번역 함수
  const translateMuscleToKorean = (muscle: string): string => {
    const muscleTranslations: { [key: string]: string } = {
      // 주요 근육 그룹
      'Biceps brachii': '이두근',
      'Triceps brachii': '삼두근',
      'Deltoids': '삼각근',
      'Pectoralis major': '대흉근',
      'Latissimus dorsi': '광배근',
      'Trapezius': '승모근',
      'Rhomboids': '능형근',
      'Serratus anterior': '전거근',
      'Rectus abdominis': '복직근',
      'Obliques': '복사근',
      'Transverse abdominis': '횡복근',
      'Quadriceps': '대퇴사두근',
      'Hamstrings': '대퇴이두근',
      'Gluteus maximus': '대둔근',
      'Gluteus medius': '중둔근',
      'Gluteus minimus': '소둔근',
      'Soleus': '비복근',
      'Gastrocnemius': '가자미근',
      'Tibialis anterior': '전경골근',
      'Peroneals': '비골근',

      // 세부 근육 (발췌)
      'Rectus femoris': '대퇴직근',
      'Vastus lateralis': '대퇴외측광근',
      'Vastus medialis': '대퇴내측광근',
      'Vastus intermedius': '대퇴중간광근',
      'Biceps femoris': '대퇴이두근',
      'Semitendinosus': '반건양근',
      'Semimembranosus': '반막양근',

      // ExerciseDB 일반 소문자 표기 매핑
      'glutes': '둔근',
      'quadriceps': '대퇴사두근',
      'quads': '대퇴사두근',
      'quad': '대퇴사두근',
      'hamstrings': '햄스트링',
      'calves': '종아리근',
      'deltoids': '삼각근',
      'delts': '삼각근',
      'shoulders': '어깨',
      'biceps': '이두근',
      'triceps': '삼두근',
      'lats': '광배근',
      'traps': '승모근',
      'pectorals': '대흉근',
      'upper chest': '상부 대흉근',
      'chest': '가슴근육',
      'abs': '복근',
      'core': '코어',
      'forearms': '전완근',
      'lower back': '하부 등',
      'hip flexors': '고관절 굴곡근',
      'adductors': '내전근',
      'abductors': '외전근',
      'cardiovascular system': '심혈관계',
      'obliques': '복사근',
      'rectus abdominis': '복직근',
      'transverse abdominis': '횡복근',
    };
    
    return muscleTranslations[muscle] || muscle;
  };

  // 지침 텍스트에서 선행 번호/단계 표기를 제거
  const sanitizeInstruction = (text: string): string => {
    let t = (text || '').trim();
    t = t.replace(/^\s*\d+\s*[.)]\s*/i, ''); // 1. 또는 1)
    t = t.replace(/^\s*\d+\s*(?:단계|번)\s*[:.)-]?\s*/i, ''); // 1단계:, 1 단계 - 등
    t = t.replace(/^\s*(?:step)\s*\d+\s*[:.)-]?\s*/i, ''); // step 1:
    t = t.replace(/^\s*(?:단계)\s*\d+\s*[:.)-]?\s*/i, ''); // 단계 1:
    return t.trim();
  };

  useEffect(() => {
    loadExercises();
    loadMuscles();
    loadCategories();
    // Initial catalog bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBodyPart === '' && searchTerm.trim() === '') {
      loadExercises();
    } else {
      searchExercises();
    }
    // Body-part toggles auto-refresh; text searches are user-triggered by submit/Enter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBodyPart]);

  const handleSearch = () => {
    if (searchTerm.trim() === '' && selectedBodyPart === '' && selectedMuscle === '' && intensity === '') {
      loadExercises();
    } else {
      searchExercises();
    }
  };

  const scrollFilter = (direction: 'left' | 'right') => {
    if (filterContainerRef.current) {
      const container = filterContainerRef.current;
      const scrollAmount = 200; // 한 번에 스크롤할 픽셀 수
      
      if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
      } else {
        container.scrollLeft += scrollAmount;
      }
    }
  };

  const loadExerciseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.EXERCISES}/load-data`, { 
        method: 'POST',
        headers 
      });
      
      if (!response.ok) {
        throw new Error('운동 데이터 로드에 실패했습니다.');
      }
      
      const data = await response.json();
      if (data.success) {
        setDataLoaded(true);
        await loadExercises(); // 데이터 로드 후 운동 목록 다시 가져오기
      } else {
        throw new Error(data.message || '운동 데이터 로드에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '운동 데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 페이지네이션 상태 리셋
      setCurrentPage(0);
      setHasNext(true);
      setTotalElements(0);
      
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // MET 값이 있는 운동들만 조회
      const response = await fetch(`${API_ENDPOINTS.EXERCISES}?page=0&size=10`, { headers });
      if (!response.ok) {
        throw new Error('운동 정보를 불러오는데 실패했습니다.');
      }
      const data: PaginationData = await response.json();
      setExercises(data.content);
      setCurrentPage(data.currentPage);
      setHasNext(data.hasNext);
      setTotalElements(data.totalElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const searchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 페이지네이션 상태 리셋
      setCurrentPage(0);
      setHasNext(true);
      setTotalElements(0);
      
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 검색 파라미터 구성
      const params = new URLSearchParams();
      if (searchMode === 'name' && searchTerm.trim()) params.append('keyword', searchTerm);
      if (searchMode === 'muscle' && selectedMuscle) params.append('muscle', selectedMuscle);
      if (searchMode === 'name+muscle') {
        if (searchTerm.trim()) params.append('keyword', searchTerm);
        if (selectedMuscle) params.append('muscle', selectedMuscle);
      }
      if (searchMode === 'intensity' && intensity) params.append('intensity', intensity);
      if (selectedBodyPart) params.append('category', selectedBodyPart);
      params.append('page', '0');
      params.append('size', '10');
      
      const url = `${API_ENDPOINTS.EXERCISES}?${params.toString()}`;
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error('검색에 실패했습니다.');
      }
      const data: PaginationData = await response.json();
      setExercises(data.content);
      setCurrentPage(data.currentPage);
      setHasNext(data.hasNext);
      setTotalElements(data.totalElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadMuscles = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.EXERCISES}/muscles`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMuscles(data);
        // 카테고리 목록은 별도 API에서 로드
      }
    } catch (err) {
      console.error('근육 목록 로드 실패:', err);
    }
  };

  const handleExerciseClick = async (exercise: Exercise) => {
    // 로컬 DB에서 운동 상세 정보를 가져와서 모달로 표시
    setDetailTitle(exercise.name);
    setDetailContent('로딩 중...');
    setDetailActions([]);
    setDetailOpen(true);
    
    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 로컬 API에서 상세 정보 가져오기
      const response = await fetch(`${API_ENDPOINTS.EXERCISES}/${exercise.id}`, { headers });
      if (!response.ok) {
        throw new Error('운동 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const detail = await response.json();
      
      // 근육 정보 한글 변환
      const musclesKo = (detail.muscles || []).map(translateMuscleToKorean);
      const secKo = (detail.musclesSecondary || []).map(translateMuscleToKorean);
      const eqKo = (detail.equipment || []).map(translateEquipmentToKorean);

      // CSV에서 가져온 한국어 지침 사용
      const instructionsKo = detail.instructionsKo || [];
      const cleanedSteps = instructionsKo.map(sanitizeInstruction).filter(Boolean);
      const instrHtml = cleanedSteps.length
        ? `<ol class="instruction-list">${cleanedSteps.map((s: string) => `<li>${s}</li>`).join('')}</ol>`
        : '<p class="ex-desc">운동 지침 정보가 없습니다.</p>';

      // 코치 코멘트는 description에서 [운동 방법] 이전 부분만 사용
      const rawDesc = (detail.description || '').trim();
      const descOnly = rawDesc.split('\n\n[운동 방법]')[0]; // [운동 방법] 이전 부분만 사용
      const descHtml = descOnly
        ? `<div class="section"><div class="section-title">코치의 코멘트</div><p class="ex-desc">${descOnly.replace(/\n/g, '<br/>')}</p></div>`
        : '';

      const metaHtml = (musclesKo.length || secKo.length || eqKo.length || detail.mets) ? [
        '<div class="ex-meta">',
        musclesKo.length ? `<div class="ex-meta-row"><span class="label">주요 근육</span><div class="chips">${musclesKo.map((m: string) => `<span class="chip chip--muscle">${m}</span>`).join('')}</div></div>` : '',
        secKo.length ? `<div class="ex-meta-row"><span class="label">보조 근육</span><div class="chips">${secKo.map((m: string) => `<span class="chip">${m}</span>`).join('')}</div></div>` : '',
        eqKo.length ? `<div class="ex-meta-row"><span class="label">장비</span><div class="chips">${eqKo.map((e: string) => `<span class="chip chip--equip">${e}</span>`).join('')}</div></div>` : '',
        detail.mets ? `<div class="ex-meta-row"><span class="label">운동 강도</span><div class="chips"><span class="chip chip--mets">MET: ${detail.mets}</span><span class="chip chip--intensity">${detail.intensity === 'LOW' ? '낮음' : detail.intensity === 'MEDIUM' ? '보통' : '높음'}</span></div></div>` : '',
        '</div>'
      ].join('') : '';

      const tabPrefix = `exercise-${exercise.id}`;
      const tabGuideId = `${tabPrefix}-tab-guide`;
      const tabInfoId = `${tabPrefix}-tab-info`;

      const tabsHtml = [
        '<div class="ex-tabs">',
        `<input type="radio" id="${tabGuideId}" name="${tabPrefix}-tabset" checked />`,
        `<input type="radio" id="${tabInfoId}" name="${tabPrefix}-tabset" />`,
        '<div class="tab-labels">',
        `<label class="tab" for="${tabGuideId}">운동 가이드</label>`,
        `<label class="tab" for="${tabInfoId}">정보</label>`,
        '</div>',
        '<div class="panels">',
        `<section class="panel panel-guide">${instrHtml}</section>`,
        `<section class="panel panel-info">${metaHtml}${descHtml}</section>`,
        '</div>',
        '</div>'
      ].join('');

      // ExerciseDB에서 GIF 이미지 시도해보기 (선택사항)
      let gifHtml = '';
      try {
        const found = await searchExerciseByName(exercise.name);
        if (found) {
          const externalDetail = await getExerciseById(found.exerciseId);
          if (externalDetail && externalDetail.gifUrl) {
            gifHtml = `<img class="ex-image" src="${externalDetail.gifUrl}" alt="${exercise.name}" />`;
          }
        }
      } catch (e) {
        // GIF 로드 실패해도 계속 진행
        console.log('GIF 이미지 로드 실패 (무시됨):', e);
      }

      const html = [
        gifHtml,
        '<div class="ex-detail">',
        tabsHtml,
        '</div>'
      ].join('');
      setDetailContent(html);
      
    } catch (e) {
      console.error('운동 상세 정보 로드 실패:', e);
      setDetailContent('운동 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'strength':
        return '💪';
      case 'cardio':
        return '❤️';
      case 'stretching':
        return '🧘';
      case 'yoga':
        return '🧘‍♀️';
      case 'sports':
        return '⚽';
      default:
        return '🏋️';
    }
  };

  return (
    <div className="exercise-information-container">
      <div className="header">
        <div className="header-content">
          <div></div>
          <div className="header-title">운동 정보</div>
          <div></div>
        </div>
      </div>
      <div className="header-subtitle">
        <p>칼로리 계산이 가능한 운동들의 상세 정보를 확인하세요</p>
      </div>

      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="운동 이름을 검색하세요..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); }}
            className="search-input"
          />
          <button className="search-button" onClick={handleSearch}>
            🔍
          </button>
        </div>
        
        <div className="filter-section">
          {/* 첫 번째 줄: 검색 모드 및 필터 옵션 */}
          <div className="search-filters">
            <div className="filter-item">
              <label>검색 모드</label>
              <select value={searchMode} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSearchMode(e.target.value as ExerciseSearchMode)}>
                <option value="name">이름</option>
                <option value="muscle">근육(주/보조)</option>
                <option value="name+muscle">이름+근육</option>
                <option value="intensity">강도</option>
              </select>
            </div>
            
            {(searchMode === 'muscle' || searchMode === 'name+muscle') && (
              <div className="filter-item">
                <label>근육 선택</label>
                <select value={selectedMuscle} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMuscle(e.target.value)}>
                  <option value="">전체</option>
                  {muscles.map((m: string) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
            )}
            
            {searchMode === 'intensity' && (
              <div className="filter-item">
                <label>강도</label>
                <select value={intensity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIntensity(e.target.value)}>
                  <option value="">전체</option>
                  <option value="HIGH">높음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="LOW">낮음</option>
                </select>
              </div>
            )}
          </div>

          {/* 두 번째 줄: 부위 태그 */}
          <div className="body-parts-section">
            <label>부위</label>
            <div className="filter-container" ref={filterContainerRef as React.MutableRefObject<HTMLDivElement | null>}>
              <button className="scroll-button left" onClick={() => scrollFilter('left')}>◀</button>
              <div className="filter-buttons-container">
                <button className={`filter-button ${selectedBodyPart === '' ? 'active' : ''}`} onClick={() => setSelectedBodyPart('')}>전체</button>
                {bodyParts.map((bp: string) => (
                  <button key={bp} className={`filter-button ${selectedBodyPart === bp ? 'active' : ''}`} onClick={() => setSelectedBodyPart(bp)}>{bp}</button>
                ))}
              </div>
              <button className="scroll-button right" onClick={() => scrollFilter('right')}>▶</button>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>운동 정보를 불러오는 중...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>❌ {error}</p>
            <button onClick={loadExercises} className="retry-button">
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && (!exercises || exercises.length === 0) && (
          <div className="no-results">
            <p>🔍 검색 결과가 없습니다.</p>
            <p>다른 키워드로 검색해보세요.</p>
            {!dataLoaded && (
              <div className="load-data-section">
                <p>운동 데이터가 없습니다. 데이터를 로드해보세요.</p>
                <button onClick={loadExerciseData} className="load-data-button">
                  운동 데이터 로드
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && exercises && exercises.length > 0 && (
          <div className="exercises-grid">
            {exercises.map((exercise) => (
              <div 
                key={exercise.id} 
                className="exercise-card" 
                onClick={() => handleExerciseClick(exercise)}
              >
                <div className="exercise-header">
                  <span className="category-icon">
                    {getCategoryIcon(exercise.category)}
                  </span>
                  <span className="category-name">{translateCategoryToKorean(exercise.category) || '기타'}</span>
                </div>
                
                <h3 className="exercise-name">{exercise.name}</h3>
                
                {exercise.description && (
                  <p className="exercise-description">
                    {exercise.description.length > 100 
                      ? `${exercise.description.substring(0, 100)}...` 
                      : exercise.description}
                  </p>
                )}
                
                {exercise.equipment && exercise.equipment.length > 0 && (
                  <div className="exercise-equipment">
                    <strong>장비:</strong> {exercise.equipment.join(', ')}
                  </div>
                )}
                
                {exercise.muscles && exercise.muscles.length > 0 && (
                  <div className="exercise-muscles">
                    <strong>주요 근육:</strong> 
                    <div className="muscle-tags">
                      {exercise.muscles.map((muscle, index) => (
                        <span key={index} className="muscle-tag">
                          {translateMuscleToKorean(muscle)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {exercise.musclesSecondary && exercise.musclesSecondary.length > 0 && (
                  <div className="exercise-muscles secondary">
                    <strong>보조 근육:</strong>
                    <div className="muscle-tags">
                      {exercise.musclesSecondary.map((muscle, index) => (
                        <span key={index} className="muscle-tag secondary">
                          {translateMuscleToKorean(muscle)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* MET 정보 */}
                <div className="exercise-calories">
                  <strong>운동 강도 (MET):</strong>
                  <div className="calories-info">
                    {exercise.mets && (
                      <span className="calorie-item">
                        🔥 MET: {exercise.mets}
                      </span>
                    )}
                    {exercise.mets && user && (
                      <span className="calorie-item">
                        ⚡ 분당 {calculateCaloriesPerMinute(exercise.mets, {
                          weight: parseFloat(user.weight || '70'),
                          height: parseFloat(user.height || '170'),
                          age: parseInt(user.age || '25'),
                          gender: user.gender as 'male' | 'female'
                        })} kcal
                      </span>
                    )}
                    {exercise.intensity && (
                      <span className={`intensity-badge intensity-${exercise.intensity.toLowerCase()}`}>
                        {exercise.intensity === 'LOW' ? '낮음' : 
                         exercise.intensity === 'MEDIUM' ? '보통' : '높음'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 추가 로딩 상태 */}
            {isLoadingMore && (
              <div className="loading-more">
                <div className="spinner"></div>
                <p>추가 운동 정보를 불러오는 중...</p>
              </div>
            )}
            
            {/* 총 개수 표시 */}
            {!isLoadingMore && exercises && exercises.length > 0 && (
              <div className="exercise-count">
                <p>총 {totalElements}개의 운동 중 {exercises?.length || 0}개 표시</p>
                                  {!hasNext && exercises && exercises.length > 0 && (
                  <p className="no-more-data">모든 운동을 불러왔습니다.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detailTitle} message={detailContent} isHtml actions={detailActions} />
      <NavigationBar />
      <ChatButton />
    </div>
  );
};

export default ExerciseInformation; 
