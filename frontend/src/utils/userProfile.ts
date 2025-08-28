import { apiClient } from './axiosConfig';

export interface UserProfile {
  id: number;
  goal?: string;
  experience?: string;
  weight?: string;
  height?: string;
  age?: string;
  gender?: string;
  phoneNumber?: string;
}

export interface WorkoutFeedback {
  avgSatisfaction: number;
  avgDifficulty: number;
  avgCompletionRate: number;
  recentSessionCount: number;
  wouldRepeatRatio: number;
  bestPerformingExercise?: string;
}

/**
 * 백엔드에서 사용자 프로필을 가져오는 함수
 * @returns 사용자 프로필 또는 null (실패 시)
 */
export const fetchUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('토큰이 없습니다.');
      return null;
    }
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.log('사용자 ID를 찾을 수 없습니다.');
      return null;
    }
    
    // 백엔드에서 사용자 프로필 조회
    const response = await apiClient.get(`/api/users/${userId}/profile`);
    
    if (response.data.success) {
      console.log('✅ 사용자 프로필 조회 성공:', response.data.user);
      return response.data.user;
    } else {
      console.log('❌ 사용자 프로필 조회 실패:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('사용자 프로필 조회 중 오류:', error);
    return null;
  }
};

/**
 * 최근 운동 피드백 데이터 조회
 * @returns 최근 피드백 데이터 또는 null (실패 시)
 */
export const fetchWorkoutFeedback = async (): Promise<WorkoutFeedback | null> => {
  try {
    const userId = getUserIdFromToken();
    if (!userId) return null;
    
    const response = await apiClient.get(`/api/users/${userId}/workout-feedback?days=14`);
    
    if (response.data.success) {
      console.log('✅ 운동 피드백 조회 성공:', response.data.feedback);
      return response.data.feedback;
    } else {
      console.log('❌ 운동 피드백 조회 실패:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('운동 피드백 조회 중 오류:', error);
    return null;
  }
};

/**
 * 사용자 데이터를 우선순위에 따라 가져오는 함수 - 피드백 기반 경험 레벨 조정 포함
 * 1순위: 백엔드 데이터 + 피드백 분석
 * 2순위: localStorage (폴백)
 * 3순위: 기본값
 */
export const getUserData = async () => {
  const serverProfile = await fetchUserProfile();
  const workoutFeedback = await fetchWorkoutFeedback();
  
  // 기본 사용자 데이터
  let adjustedExperience = serverProfile?.experience || localStorage.getItem('userExperience') || 'beginner';
  
  // 피드백 기반 경험 레벨 자동 조정
  if (workoutFeedback && workoutFeedback.recentSessionCount >= 3) {
    if (workoutFeedback.avgDifficulty <= 2.0 && workoutFeedback.avgCompletionRate > 0.9) {
      // 운동이 너무 쉽고 완주율이 높으면 레벨업
      adjustedExperience = adjustedExperience === 'beginner' ? 'intermediate' : 
                           adjustedExperience === 'intermediate' ? 'advanced' : adjustedExperience;
    } else if (workoutFeedback.avgDifficulty >= 4.0 && workoutFeedback.avgCompletionRate < 0.7) {
      // 운동이 너무 어렵고 완주율이 낮으면 레벨다운
      adjustedExperience = adjustedExperience === 'advanced' ? 'intermediate' : 
                           adjustedExperience === 'intermediate' ? 'beginner' : adjustedExperience;
    }
  }
  
  const userData = {
    goal: serverProfile?.goal || localStorage.getItem('userGoal') || 'fitness',
    experience: adjustedExperience,
    weight: serverProfile?.weight || localStorage.getItem('userWeight') || '70',
    height: serverProfile?.height || localStorage.getItem('userHeight') || '170',
    age: serverProfile?.age || localStorage.getItem('userAge') || '25',
    workoutFeedback: workoutFeedback
  };
  
  console.log('📊 최종 사용자 데이터 (피드백 반영):', userData);
  return userData;
};

/**
 * 사용자 ID를 토큰에서 추출하는 함수
 */
export const getUserIdFromToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (error) {
    console.error('토큰에서 사용자 ID 추출 실패:', error);
    return null;
  }
};
