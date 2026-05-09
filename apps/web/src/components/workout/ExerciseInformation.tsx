import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, ChevronLeft, ChevronRight, Dumbbell, Flame, Search, Zap } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import { calculateCaloriesPerMinute } from '../../utils/calorieCalculator';
import Modal from '../Modal';
import { searchExerciseByName, getExerciseById } from '../../services/exerciseDb';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ErrorState, LoadingState } from '../ui/feedback';
import { Input } from '../ui/input';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

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
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const res = await authFetch(`${API_ENDPOINTS.EXERCISES}/categories`, { headers });
      if (!res.ok) throw new Error('카테고리 불러오기 실패');
      const data: string[] = await res.json();
      // 공백/중복 제거 후 정렬
      const unique = Array.from(new Set((data || []).map((s) => s?.trim()).filter(Boolean)));
      setBodyParts(unique);
    } catch (e) {
      logger.error(e);
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

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

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
      const response = await authFetch(url, { headers });

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
      logger.error('추가 데이터 로드 실패:', err);
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

  const escapeHtml = (text: string): string =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

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

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      const response = await authFetch(`${API_ENDPOINTS.EXERCISES}/load-data`, {
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

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      // MET 값이 있는 운동들만 조회
      const response = await authFetch(`${API_ENDPOINTS.EXERCISES}?page=0&size=10`, { headers });
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

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

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
      const response = await authFetch(url, { headers });

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
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      const response = await authFetch(`${API_ENDPOINTS.EXERCISES}/muscles`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMuscles(data);
        // 카테고리 목록은 별도 API에서 로드
      }
    } catch (err) {
      logger.error('근육 목록 로드 실패:', err);
    }
  };

  const handleExerciseClick = async (exercise: Exercise) => {
    // 로컬 DB에서 운동 상세 정보를 가져와서 모달로 표시
    setDetailTitle(exercise.name);
    setDetailContent('로딩 중...');
    setDetailActions([]);
    setDetailOpen(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      // 로컬 API에서 상세 정보 가져오기
      const response = await authFetch(`${API_ENDPOINTS.EXERCISES}/${exercise.id}`, { headers });
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
        ? `<ol style="margin:0;padding-left:1.25rem;line-height:1.75;color:#334155;">${cleanedSteps.map((s: string) => `<li style="margin-bottom:.5rem;">${escapeHtml(s)}</li>`).join('')}</ol>`
        : '<p style="margin:0;color:#64748b;line-height:1.75;">운동 지침 정보가 없습니다.</p>';

      // 코치 코멘트는 description에서 [운동 방법] 이전 부분만 사용
      const rawDesc = (detail.description || '').trim();
      const descOnly = rawDesc.split('\n\n[운동 방법]')[0]; // [운동 방법] 이전 부분만 사용
      const descHtml = descOnly
        ? `<section style="margin-top:1rem;border-top:1px solid #e2e8f0;padding-top:1rem;"><h4 style="margin:0 0 .5rem;font-size:.95rem;font-weight:700;color:#0f172a;">코치의 코멘트</h4><p style="margin:0;color:#475569;line-height:1.75;">${escapeHtml(descOnly).replace(/\n/g, '<br/>')}</p></section>`
        : '';

      const chip = (text: string, tone: 'blue' | 'slate' | 'emerald' = 'slate') => {
        const colors = {
          blue: 'background:#dbeafe;color:#1e40af;border-color:#bfdbfe;',
          slate: 'background:#f1f5f9;color:#334155;border-color:#e2e8f0;',
          emerald: 'background:#d1fae5;color:#065f46;border-color:#a7f3d0;',
        };
        return `<span style="display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:.2rem .55rem;font-size:.78rem;font-weight:600;${colors[tone]}">${escapeHtml(text)}</span>`;
      };

      const metaRow = (label: string, values: string[], tone: 'blue' | 'slate' | 'emerald' = 'slate') =>
        values.length
          ? `<div style="display:grid;gap:.45rem;"><div style="font-size:.78rem;font-weight:700;color:#64748b;">${label}</div><div style="display:flex;flex-wrap:wrap;gap:.35rem;">${values.map((value) => chip(value, tone)).join('')}</div></div>`
          : '';

      const metaHtml = (musclesKo.length || secKo.length || eqKo.length || detail.mets)
        ? [
            '<section style="display:grid;gap:.8rem;margin-top:1rem;">',
            metaRow('주요 근육', musclesKo, 'blue'),
            metaRow('보조 근육', secKo, 'slate'),
            metaRow('장비', eqKo, 'emerald'),
            detail.mets ? metaRow('운동 강도', [`MET: ${detail.mets}`, detail.intensity === 'LOW' ? '낮음' : detail.intensity === 'MEDIUM' ? '보통' : '높음'], 'emerald') : '',
            '</section>',
          ].join('')
        : '';

      // ExerciseDB에서 GIF 이미지 시도해보기 (선택사항)
      let gifHtml = '';
      try {
        const found = await searchExerciseByName(exercise.name);
        if (found) {
          const externalDetail = await getExerciseById(found.exerciseId);
          if (externalDetail && externalDetail.gifUrl) {
            gifHtml = `<img style="width:100%;max-height:320px;object-fit:contain;border-radius:.5rem;background:#f8fafc;margin-bottom:1rem;" src="${escapeHtml(externalDetail.gifUrl)}" alt="${escapeHtml(exercise.name)}" />`;
          }
        }
      } catch (e) {
        // GIF 로드 실패해도 계속 진행
        logger.debug('GIF 이미지 로드 실패 (무시됨):', e);
      }

      const html = [
        gifHtml,
        '<div style="display:grid;gap:1rem;">',
        '<section><h4 style="margin:0 0 .6rem;font-size:.95rem;font-weight:700;color:#0f172a;">운동 가이드</h4>',
        instrHtml,
        '</section>',
        metaHtml,
        descHtml,
        '</div>'
      ].join('');
      setDetailContent(html);

    } catch (e) {
      logger.error('운동 상세 정보 로드 실패:', e);
      setDetailContent('운동 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'strength':
        return <Dumbbell size={18} strokeWidth={2.2} />;
      case 'cardio':
        return <Activity size={18} strokeWidth={2.2} />;
      case 'stretching':
        return <Activity size={18} strokeWidth={2.2} />;
      case 'yoga':
        return <Activity size={18} strokeWidth={2.2} />;
      case 'sports':
        return <Activity size={18} strokeWidth={2.2} />;
      default:
        return <Dumbbell size={18} strokeWidth={2.2} />;
    }
  };

  const selectClassName = 'h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const intensityLabel = (value?: string) => value === 'LOW' ? '낮음' : value === 'MEDIUM' ? '보통' : value === 'HIGH' ? '높음' : value;

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="flex-col items-stretch gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-950">운동 정보</h1>
            <p className="text-sm text-muted-foreground">칼로리 계산이 가능한 운동들의 상세 정보를 확인하세요.</p>
          </div>

          <Card className="border-white/80 bg-white shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="text"
                  placeholder="운동 이름을 검색하세요."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="sm:flex-1"
                />
                <Button type="button" onClick={handleSearch}>
                  <Search className="size-4" />
                  검색
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  검색 모드
                  <select value={searchMode} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSearchMode(e.target.value as ExerciseSearchMode)} className={selectClassName}>
                    <option value="name">이름</option>
                    <option value="muscle">근육(주/보조)</option>
                    <option value="name+muscle">이름+근육</option>
                    <option value="intensity">강도</option>
                  </select>
                </label>

                {(searchMode === 'muscle' || searchMode === 'name+muscle') && (
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    근육 선택
                    <select value={selectedMuscle} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMuscle(e.target.value)} className={selectClassName}>
                      <option value="">전체</option>
                      {muscles.map((muscle: string) => <option key={muscle} value={muscle}>{muscle}</option>)}
                    </select>
                  </label>
                )}

                {searchMode === 'intensity' && (
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    강도
                    <select value={intensity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIntensity(e.target.value)} className={selectClassName}>
                      <option value="">전체</option>
                      <option value="HIGH">높음</option>
                      <option value="MEDIUM">보통</option>
                      <option value="LOW">낮음</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">부위</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => scrollFilter('left')} aria-label="이전 부위">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => scrollFilter('right')} aria-label="다음 부위">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
                <div ref={filterContainerRef as React.MutableRefObject<HTMLDivElement | null>} className="flex gap-2 overflow-x-auto pb-1">
                  <Button type="button" size="sm" variant={selectedBodyPart === '' ? 'default' : 'outline'} onClick={() => setSelectedBodyPart('')}>전체</Button>
                  {bodyParts.map((bodyPart: string) => (
                    <Button key={bodyPart} type="button" size="sm" variant={selectedBodyPart === bodyPart ? 'default' : 'outline'} onClick={() => setSelectedBodyPart(bodyPart)} className="shrink-0">
                      {bodyPart}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="space-y-4">
        {loading && <LoadingState title="운동 정보를 불러오는 중입니다." />}

        {!loading && error && <ErrorState message={error} onRetry={loadExercises} />}

        {!loading && !error && (!exercises || exercises.length === 0) && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <Search className="size-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">검색 결과가 없습니다.</p>
              <p className="text-sm">다른 키워드로 검색해보세요.</p>
              {!dataLoaded && (
                <Button type="button" onClick={loadExerciseData}>
                  운동 데이터 로드
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !error && exercises && exercises.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="rounded-lg border border-white/80 bg-white p-0 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void handleExerciseClick(exercise)}
              >
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary" className="gap-2">
                      {getCategoryIcon(exercise.category)}
                      {translateCategoryToKorean(exercise.category) || '기타'}
                    </Badge>
                    {exercise.intensity && (
                      <Badge variant={exercise.intensity === 'HIGH' ? 'default' : exercise.intensity === 'MEDIUM' ? 'success' : 'secondary'}>
                        {intensityLabel(exercise.intensity)}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h2 className="line-clamp-2 text-base font-bold text-slate-950">{exercise.name}</h2>
                    {exercise.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {exercise.description.length > 100 ? `${exercise.description.substring(0, 100)}...` : exercise.description}
                      </p>
                    )}
                  </div>

                  {exercise.equipment && exercise.equipment.length > 0 && (
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold">장비: </span>
                      {exercise.equipment.map(translateEquipmentToKorean).join(', ')}
                    </div>
                  )}

                  {exercise.muscles && exercise.muscles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700">주요 근육</div>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.muscles.map((muscle, index) => (
                          <Badge key={`${muscle}-${index}`} variant="outline" className="bg-blue-50 text-blue-700">
                            {translateMuscleToKorean(muscle)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {exercise.musclesSecondary && exercise.musclesSecondary.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700">보조 근육</div>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.musclesSecondary.map((muscle, index) => (
                          <Badge key={`${muscle}-${index}`} variant="outline" className="bg-slate-50 text-slate-700">
                            {translateMuscleToKorean(muscle)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-700">운동 강도</div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {exercise.mets && (
                        <span className="inline-flex items-center gap-1">
                          <Flame className="size-4 text-orange-500" />
                          MET: {exercise.mets}
                        </span>
                      )}
                      {exercise.mets && user && (
                        <span className="inline-flex items-center gap-1">
                          <Zap className="size-4 text-yellow-500" />
                          분당 {calculateCaloriesPerMinute(exercise.mets, {
                            weight: parseFloat(user.weight || '70'),
                            height: parseFloat(user.height || '170'),
                            age: parseInt(user.age || '25'),
                            gender: user.gender as 'male' | 'female',
                          })} kcal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {isLoadingMore && (
              <Card className="border-white/80 bg-white shadow-sm md:col-span-2 xl:col-span-3">
                <CardContent className="p-5">
                  <LoadingState title="추가 운동 정보를 불러오는 중입니다." />
                </CardContent>
              </Card>
            )}

            {!isLoadingMore && exercises && exercises.length > 0 && (
              <div className="md:col-span-2 xl:col-span-3">
                <Card className="border-white/80 bg-white shadow-sm">
                  <CardContent className="flex flex-col items-center gap-1 p-4 text-sm text-muted-foreground">
                    <p>총 {totalElements}개의 운동 중 {exercises?.length || 0}개 표시</p>
                    {!hasNext && exercises && exercises.length > 0 && <p className="font-medium text-slate-700">모든 운동을 불러왔습니다.</p>}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </PageMain>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detailTitle} message={detailContent} isHtml actions={detailActions} />
      <NavigationBar />
      <ChatButton />
    </Page>
  );
};

export default ExerciseInformation;
