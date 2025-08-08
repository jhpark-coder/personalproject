// MET 기반 칼로리 계산 유틸리티

interface UserInfo {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
}

/**
 * MET 값을 사용하여 칼로리 소모량을 계산합니다.
 * @param mets MET 값
 * @param duration 운동 시간 (분)
 * @param userInfo 사용자 정보
 * @returns 소모된 칼로리 (kcal)
 */
export const calculateCaloriesFromMets = (
  mets: number,
  duration: number,
  userInfo: UserInfo
): number => {
  // BMR 계산 (Mifflin-St Jeor 공식)
  let bmr: number;
  if (userInfo.gender === 'male') {
    bmr = 10 * userInfo.weight + 6.25 * userInfo.height - 5 * userInfo.age + 5;
  } else {
    bmr = 10 * userInfo.weight + 6.25 * userInfo.height - 5 * userInfo.age - 161;
  }

  // MET 기반 칼로리 계산
  // 칼로리 = (MET × 체중(kg) × 운동시간(시간)) / 24
  const calories = (mets * userInfo.weight * (duration / 60)) / 24;
  
  return Math.round(calories);
};

/**
 * 분당 칼로리 소모량을 계산합니다.
 * @param mets MET 값
 * @param userInfo 사용자 정보
 * @returns 분당 칼로리 소모량 (kcal/min)
 */
export const calculateCaloriesPerMinute = (
  mets: number,
  userInfo: UserInfo
): number => {
  const caloriesPerMinute = (mets * userInfo.weight) / (24 * 60);
  return Math.round(caloriesPerMinute * 10) / 10; // 소수점 첫째자리까지
};

/**
 * 운동 강도에 따른 MET 값 범위를 반환합니다.
 * @param intensity 운동 강도
 * @returns MET 값 범위
 */
export const getMetsRangeByIntensity = (intensity: string): { min: number; max: number } => {
  switch (intensity.toLowerCase()) {
    case 'low':
      return { min: 1.0, max: 3.0 };
    case 'medium':
      return { min: 3.0, max: 6.0 };
    case 'high':
      return { min: 6.0, max: 12.0 };
    default:
      return { min: 3.0, max: 6.0 };
  }
};

/**
 * MET 값을 운동 강도로 변환합니다.
 * @param mets MET 값
 * @returns 운동 강도
 */
export const getIntensityFromMets = (mets: number): string => {
  if (mets < 3.0) return 'LOW';
  if (mets < 6.0) return 'MEDIUM';
  return 'HIGH';
}; 