// ExerciseDB(Open Source) API client
// 베이스 URL: 기본값으로 공개 v1 사용. 필요시 .env로 대체
const BASE_URL = (import.meta.env.VITE_EXDB_BASE_URL || 'https://www.exercisedb.dev/api/v1').replace(/\/$/, '');
const APP_API_BASE = '';

import { apiClient, handleApiError } from '../utils/axiosConfig';

// 부정확한 검색 결과를 수동으로 보정하기 위한 특별 검색어 매핑
const specialSearchMap: Record<string, string> = {
  '스쿼트': 'potty squat', // 기본 스쿼트가 potty squat으로 잘못 등록되어 있음
};

// 간단 한글→영문 검색어 매핑
const koToEnMap: Record<string, string> = {
  '점프 스쿼트': 'jump squat',
  '와이드 스쿼트': 'wide squat',
  '런지': 'lunge',
  '푸시업': 'push up',
  '플랭크': 'plank',
  '카프 레이즈': 'calf raise',
  '윗몸일으키기': 'sit up',
  '크런치': 'crunch',
  '브릿지': 'glute bridge',
  '벤치 프레스': 'bench press',
  '데드리프트': 'deadlift',
  '바벨 로우': 'barbell row',
  '숄더프레스': 'shoulder press',
  '덤벨 숄더프레스': 'dumbbell shoulder press',
  '마운틴 클라이머': 'mountain climber',
  '버피 테스트': 'burpee',
  '점프잭': 'jumping jack',
};

export interface ExdbExerciseSummary {
  exerciseId: string;
  name: string;
  gifUrl?: string;
  targetMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
}

export interface ExdbExerciseDetail extends ExdbExerciseSummary {
  secondaryMuscles?: string[];
  instructions?: string[];
}

// 서버 캐시 조회
export async function getKoInstructions(exerciseId: string): Promise<string[] | null> {
  try {
    const response = await apiClient.get(`/api/exercises/instructions/${encodeURIComponent(exerciseId)}`);
    return response.data?.data || null;
  } catch {
    return null;
  }
}

// 서버 저장
export async function saveKoInstructions(exerciseId: string, instructionsKo: string[], nameKo?: string): Promise<boolean> {
  try {
    const response = await apiClient.post(`/api/exercises/instructions`, {
      exerciseId,
      nameKo,
      instructionsKo
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

function toSearchQuery(name: string): string {
  const trimmed = name.trim();
  // 특별 매핑을 우선적으로 확인
  if (specialSearchMap[trimmed]) {
    return specialSearchMap[trimmed];
  }
  // 일반 매핑 또는 원본 이름 사용
  return koToEnMap[trimmed] || trimmed;
}

export async function searchExerciseByName(name: string): Promise<ExdbExerciseSummary | null> {
  const searchQuery = toSearchQuery(name);
  const q = encodeURIComponent(searchQuery);
  const url = `${BASE_URL}/exercises/search?q=${q}&limit=5`;
  // 외부 API이므로 네이티브 fetch 사용 (CORS 문제 방지)
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  const results: ExdbExerciseSummary[] = json?.data || [];

  if (results.length === 0) {
    return null;
  }

  // 1. 이름이 정확히 일치하는 항목 찾기
  const exactMatch = results.find(ex => ex.name.toLowerCase() === searchQuery.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  // 2. 단어가 정확히 일치하는 항목 찾기 (예: "squat"가 "curtsey squat"보다 우선)
  const wordMatch = results.find(ex => {
    const words = ex.name.toLowerCase().split(' ');
    return words.includes(searchQuery.toLowerCase());
  });
  if (wordMatch) {
    return wordMatch;
  }

  // 3. 가장 짧은 이름의 항목 찾기 (가장 기본적인 운동일 가능성이 높음)
  const shortestMatch = results.reduce((shortest, current) => 
    current.name.length < shortest.name.length ? current : shortest
  );
  
  return shortestMatch;
}

export async function getExerciseById(id: string): Promise<ExdbExerciseDetail | null> {
  // 외부 API이므로 네이티브 fetch 사용 (CORS 문제 방지)
  const res = await fetch(`${BASE_URL}/exercises/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
} 