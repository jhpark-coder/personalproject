import { FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * MediaPipe Tasks Vision WASM 로더
 * - 여러 CDN과 버전을 순차적으로 시도하여 네트워크/버전 이슈에 강건하게 로드
 */
const VERSION_CANDIDATES: string[] = [
  // 로컬 자산 폴백을 우선 사용하므로 CDN은 백업으로만 사용
  '0.10.22',
  '0.10.20',
  '0.10.22-rc.20250304'
];

const CDN_TEMPLATES: Array<(v: string) => string> = [
  (v) => `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${v}/wasm`,
  (v) => `https://unpkg.com/@mediapipe/tasks-vision@${v}/wasm`
];

// 로컬 정적 자산 기본 경로 (public/mediapipe/wasm 로 복사됨)
const LOCAL_WASM_BASE = '/mediapipe/wasm';

export async function loadVisionFileset(): Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> {
  const errors: string[] = [];

  // 1) 로컬 정적 자산 먼저 시도 (권장)
  try {
    return await FilesetResolver.forVisionTasks(LOCAL_WASM_BASE);
  } catch (e: any) {
    errors.push(`${LOCAL_WASM_BASE} -> ${e?.message || e}`);
  }

  // 2) CDN 백업 경로들 순회 시도
  for (const version of VERSION_CANDIDATES) {
    for (const template of CDN_TEMPLATES) {
      const baseUrl = template(version);
      try {
        const vision = await FilesetResolver.forVisionTasks(baseUrl);
        return vision;
      } catch (e: any) {
        errors.push(`${baseUrl} -> ${e?.message || e}`);
      }
    }
  }

  throw new Error(`Failed to load MediaPipe Tasks Vision WASM. Tried: ${errors.join(' | ')}`);
}


