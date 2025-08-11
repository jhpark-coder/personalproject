// ExerciseDB(Open Source) API client
// 베이스 URL: 기본값으로 공개 v1 사용. 필요시 .env로 대체
const BASE_URL = (import.meta.env.VITE_EXDB_BASE_URL || 'https://www.exercisedb.dev/api/v1').replace(/\/$/, '');
const APP_API_BASE = '';

// 간단 한글→영문 검색어 매핑
const koToEnMap: Record<string, string> = {
  '스쿼트': 'squat',
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
    const res = await fetch(`/api/exercises/instructions/${encodeURIComponent(exerciseId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

// 서버 저장
export async function saveKoInstructions(exerciseId: string, instructionsKo: string[], nameKo?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/exercises/instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, nameKo, instructionsKo })
    });
    return res.ok;
  } catch {
    return false;
  }
}

function toSearchQuery(name: string): string {
  const trimmed = name.trim();
  return koToEnMap[trimmed] || trimmed;
}

export async function searchExerciseByName(name: string): Promise<ExdbExerciseSummary | null> {
  const q = encodeURIComponent(toSearchQuery(name));
  const url = `${BASE_URL}/exercises/search?q=${q}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.[0] || null;
}

export async function getExerciseById(id: string): Promise<ExdbExerciseDetail | null> {
  const res = await fetch(`${BASE_URL}/exercises/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
} 