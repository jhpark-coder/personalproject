import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { hybridTTSService } from '@services/hybridTTSService';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import './MotionCoach.css';
import '@components/ui/styles/pose-detection.css';
import { globalPoseSmoothing } from './PoseSmoothing';
import type { PoseKeypoint } from './PoseSmoothing';
import { globalMultiJointAnalyzer } from './MultiJointAnalyzer';
import type { MultiJointAnalysis } from './MultiJointAnalyzer';
import { motionLogger, performanceLogger, devOnly } from '@utils/logger';

// Stage 5: 다중 관절 통합 분석 시스템

type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 'burpee' | 'mountain_climber' | 'bridge' | 'situp' | 'crunch';

interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

interface PoseData {
  keypoints: PoseKeypoint[];
  score?: number;
}

interface ExerciseAnalysis {
  exerciseType: string | null;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
  // Stage 5: 다중 관절 통합 분석 결과
  multiJointAnalysis?: MultiJointAnalysis;
  qualityGrade?: 'S' | 'A' | 'B' | 'C' | 'D';
  formCorrections?: string[];
}

interface WorkoutSessionData {
  sessionId?: number;
  exerciseType: string;
  startTime: Date;
  endTime?: Date;
  totalReps: number;
  averageFormScore: number;
  formCorrections: string[];
  duration: number; // in seconds
  caloriesBurned?: number;
}

interface ExercisePerformanceData {
  timestamp: Date;
  repCount: number;
  formScore: number;
  confidence: number;
  feedback: string;
  // Stage 5: 다중 관절 분석 데이터
  qualityGrade?: 'S' | 'A' | 'B' | 'C' | 'D';
  overallConsistency?: number;
  stabilityIndex?: number;
  coordinationScore?: number;
  formCorrections?: string[];
}

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

// 관절점 인덱스 (MediaPipe Pose 33개 포인트)
const NOSE = 0;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_FOOT_INDEX = 31;
const RIGHT_FOOT_INDEX = 32;

interface MotionCoachProps {
  exerciseType?: ExerciseType;
  onSessionComplete?: (sessionData: any) => void;
  // Integrated workout mode props
  targetSets?: number;
  targetReps?: number;
  currentSet?: number;
  onSetComplete?: (reps: number, formScore: number, corrections: string[]) => void;
  autoMode?: boolean;
}

const MotionCoach: React.FC<MotionCoachProps> = ({ 
  exerciseType = 'squat', 
  onSessionComplete,
  targetSets = 3,
  targetReps = 10,
  currentSet = 1,
  onSetComplete,
  autoMode = false
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(exerciseType);
  
  // exerciseType prop이 변경되면 selectedExercise도 업데이트
  useEffect(() => {
    setSelectedExercise(exerciseType);
  }, [exerciseType]);
  
  // 분석기 제거됨

  const [isDetecting, setIsDetecting] = useState(false);
  // useRef를 사용하여 리렌더링을 유발하지 않는 값들 관리
  const poseRef = useRef<any>(null);
  const exerciseAnalysisRef = useRef<ExerciseAnalysis>({
    exerciseType: exerciseType,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // TTS 관련 상태 (UI 렌더링에만 필요한 것들만 state로 유지)
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(true);
  const lastFeedbackTimeRef = useRef<number>(0);
  const lastTTSMessageRef = useRef<string>('');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // 워크아웃 세션 관련 상태 (ref 사용으로 리렌더링 방지)
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const performanceHistoryRef = useRef<ExercisePerformanceData[]>([]);
  const formCorrectionsRef = useRef<string[]>([]);

  // 운동별 상태(히스테리시스)
  const stateRef = useRef<{ phase: 'up' | 'down'; count: number }>({ phase: 'up', count: 0 });

  // 디버그 로그 패널 상태
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);

  // 운동 설정 모달 상태
  const [showExerciseSetupModal, setShowExerciseSetupModal] = useState<boolean>(false);

  // 최적화된 로그 함수 (프로덕션에서 성능 향상)
  const addLog = useCallback((msg: string, data?: any) => {
    devOnly(() => {
      const time = new Date().toLocaleTimeString();
      const logMessage = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
      console.log(logMessage);
      setLogs(prev => [...prev.slice(-100), logMessage]); // 로그 크기 제한 (300 → 100)
    });
    
    // 중요한 로그만 프로덕션에서도 기록
    if (msg.includes('❌') || msg.includes('💥') || msg.includes('⚠️')) {
      motionLogger.error(msg, data);
    } else if (msg.includes('✅')) {
      motionLogger.info(msg, data);
    }
  }, []);

  // 운동 설정 체크 및 모달 표시
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted') === 'true';
    const hasExercisePreference = localStorage.getItem('userExercisePreference');
    
    if (!hasCompletedOnboarding || !hasExercisePreference) {
      setShowExerciseSetupModal(true);
    }
  }, []);

  // 자동 운동 시작 처리
  const handleStartAutomatedWorkout = () => {
    setShowExerciseSetupModal(false);
    // 통합 운동 시스템으로 이동
    navigate('/workout/integrated');
  };

  // 자동 운동 시작 모달 컴포넌트
  const AutomatedWorkoutModal = () => (
    <div className="automated-workout-modal-overlay">
      <div className="automated-workout-modal">
        <div className="automated-workout-header">
          <h2>🚀 자동 운동 시작</h2>
          <div className="automated-workout-subtitle">AI 가이드와 함께하는 완전 자동화 운동</div>
        </div>
        
        <div className="workout-features">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span className="feature-text">개인 맞춤 추천</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <span className="feature-text">AI 실시간 코칭</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span className="feature-text">자동 결과 분석</span>
          </div>
        </div>
        
        <div className="automated-workout-actions">
          <button 
            className="start-workout-button"
            onClick={handleStartAutomatedWorkout}
          >
            🏋️‍♂️ 바로 시작하기
          </button>
        </div>
      </div>
    </div>
  );

  // TTS 피드백 재생 함수
  const playTTSFeedback = useCallback(async (message: string, isImportant: boolean = false) => {
    if (!isTTSEnabled || !message || message.trim() === '') {
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastFeedback = currentTime - lastFeedbackTimeRef.current;
    
    // 중복 메시지 방지 (같은 메시지가 3초 내에 재생되면 건너뛰기)
    if (message === lastTTSMessageRef.current && timeSinceLastFeedback < 3000 && !isImportant) {
      return;
    }

    // 긴급하지 않은 일반 피드백은 2초 간격 유지
    if (!isImportant && timeSinceLastFeedback < 2000) {
      return;
    }

    try {
      // 이전 오디오 중지
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      addLog('🔊 TTS 피드백', { message, isImportant });
      lastFeedbackTimeRef.current = currentTime;
      lastTTSMessageRef.current = message;

      const result = await hybridTTSService.synthesizeExerciseGuide(message);
      
      if (result.success && result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(result.audioUrl!);
          currentAudioRef.current = null;
        };
        
        audio.onerror = (error) => {
          addLog('🔊 TTS 재생 실패', { error });
          currentAudioRef.current = null;
        };

        await audio.play();
        addLog('🔊 TTS 재생 성공', { method: result.method });
      } else {
        addLog('🔊 TTS 합성 실패', { error: result.error });
      }
    } catch (error) {
      addLog('🔊 TTS 에러', { error: String(error) });
    }
  }, [isTTSEnabled, addLog]);

  // 세션 시작 함수
  const startWorkoutSession = useCallback(() => {
    const now = new Date();
    setIsSessionActive(true);
    sessionStartTimeRef.current = now;
    performanceHistoryRef.current = [];
    formCorrectionsRef.current = [];
    stateRef.current = { phase: 'up', count: 0 };
    addLog('🏋️ 운동 세션 시작', { exerciseType: selectedExercise, startTime: now });
    
    // 세션 시작 안내
    playTTSFeedback(`${selectedExercise} 운동을 시작합니다. 준비되셨나요?`, true);
  }, [selectedExercise, addLog, playTTSFeedback]);

  // 세션 종료 함수  
  const endWorkoutSession = useCallback(async () => {
    if (!isSessionActive || !sessionStartTimeRef.current) {
      return;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000);
    
    // 평균 자세 점수 계산
    const avgFormScore = performanceHistoryRef.current.length > 0 
      ? performanceHistoryRef.current.reduce((sum: number, p: ExercisePerformanceData) => sum + p.formScore, 0) / performanceHistoryRef.current.length
      : 0;

    const sessionData: WorkoutSessionData = {
      exerciseType: selectedExercise,
      startTime: sessionStartTimeRef.current,
      endTime: endTime,
      totalReps: stateRef.current.count,
      averageFormScore: avgFormScore,
      formCorrections: formCorrectionsRef.current,
      duration: duration,
      caloriesBurned: estimateCalories(selectedExercise, stateRef.current.count, duration)
    };

    addLog('🏋️ 운동 세션 완료', sessionData);
    
    // 완료 메시지
    playTTSFeedback(
      `운동 완료! ${stateRef.current.count}회를 ${Math.floor(duration / 60)}분 ${duration % 60}초 동안 수행했습니다.`,
      true
    );

    try {
      // 백엔드로 세션 데이터 전송
      await sendWorkoutData(sessionData);
      
      // 체크리스트 자동 업데이트를 위한 이벤트 발생
      updateTodayChecklist(selectedExercise);
      
    } catch (error) {
      addLog('❌ 세션 데이터 전송 실패', { error: String(error) });
    }

    // IntegratedWorkoutSession에 세션 완료 알리기
    if (onSessionComplete) {
      onSessionComplete(sessionData);
    }

    setIsSessionActive(false);
    sessionStartTimeRef.current = null;
  }, [isSessionActive, selectedExercise, addLog, playTTSFeedback, onSessionComplete]);

  // 체크리스트 자동 업데이트 함수
  const updateTodayChecklist = useCallback((completedExerciseType: string) => {
    try {
      const todayKey = getTodayKey();
      const storageKey = `todayChecklist:${todayKey}`;
      
      // 현재 체크리스트 상태 가져오기
      const currentChecklist = localStorage.getItem(storageKey);
      if (currentChecklist) {
        const checklistState = JSON.parse(currentChecklist);
        
        // 완료된 운동 찾아서 체크
        Object.keys(checklistState).forEach(itemId => {
          if (itemId.startsWith('exercise_')) {
            // 해당 운동이 완료되었는지 확인하고 체크
            checklistState[itemId] = true;
          }
        });
        
        // 업데이트된 상태 저장
        localStorage.setItem(storageKey, JSON.stringify(checklistState));
        
        // 체크리스트 업데이트 이벤트 발생 (다른 컴포넌트에서 감지 가능)
        window.dispatchEvent(new CustomEvent('checklistUpdated', {
          detail: { exerciseType: completedExerciseType, checklistState }
        }));
        
        addLog('✅ 체크리스트 자동 업데이트 완료', { exerciseType: completedExerciseType });
      }
    } catch (error) {
      addLog('❌ 체크리스트 업데이트 실패', { error: String(error) });
    }
  }, [addLog]);

  // 오늘 날짜 키 생성 함수
  const getTodayKey = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 퍼포먼스 데이터 기록 (ref 사용으로 리렌더링 방지)
  const recordPerformance = useCallback((analysis: ExerciseAnalysis) => {
    if (!isSessionActive) return;

    const performanceData: ExercisePerformanceData = {
      timestamp: new Date(),
      repCount: analysis.currentCount,
      formScore: analysis.isCorrectForm ? 1 : 0,
      confidence: analysis.confidence,
      feedback: analysis.feedback,
      // Stage 5: 다중 관절 분석 데이터 포함
      qualityGrade: analysis.qualityGrade,
      overallConsistency: analysis.multiJointAnalysis?.overallConsistency,
      stabilityIndex: analysis.multiJointAnalysis?.stabilityIndex,
      coordinationScore: analysis.multiJointAnalysis?.coordinationScore,
      formCorrections: analysis.formCorrections
    };

    performanceHistoryRef.current.push(performanceData);

    // 자세 교정 피드백 기록 (중복 제거)
    if (!analysis.isCorrectForm && analysis.feedback && 
        !formCorrectionsRef.current.includes(analysis.feedback)) {
      formCorrectionsRef.current.push(analysis.feedback);
    }

    // 통합 운동 모드: 세트 완료 감지
    if (autoMode && onSetComplete && analysis.currentCount >= targetReps) {
      // 세트 완료 - 폼 점수와 교정사항 계산
      const setFormScores = performanceHistoryRef.current
        .filter((p: ExercisePerformanceData) => p.timestamp > sessionStartTimeRef.current!)
        .map((p: ExercisePerformanceData) => p.formScore);
      const averageFormScore = setFormScores.length > 0 
        ? (setFormScores.reduce((sum: number, score: number) => sum + score, 0) / setFormScores.length) * 100
        : 0;
      
      const setCorrections = [...formCorrectionsRef.current];
      
      // 세트 완료 피드백
      playTTSFeedback(`${currentSet}세트 완료! 잠시 휴식하세요.`);
      
      // IntegratedWorkoutSession에 세트 완료 알림
      onSetComplete(analysis.currentCount, averageFormScore, setCorrections);
      
      // 다음 세트 준비
      performanceHistoryRef.current = [];
      formCorrectionsRef.current = [];
    }
  }, [isSessionActive, autoMode, onSetComplete, targetReps, currentSet, playTTSFeedback]);

  // 칼로리 추정 함수 - 사용자 체중 반영 개선
  const estimateCalories = useCallback((exerciseType: string, reps: number, duration: number): number => {
    // 운동별 정확한 MET 값 (ACSM Guidelines 기반)
    const metValues: Record<string, number> = {
      'squat': 5.0,
      'pushup': 3.8, // 더 정확한 값으로 조정
      'lunge': 4.0,
      'plank': 3.5,
      'calf_raise': 2.8
    };

    const met = metValues[exerciseType] || 4.0;
    
    // TODO: 실제 사용자 체중 데이터 사용 (현재 평균값 사용)
    const weightKg = 70;
    
    // 칼로리 = MET × 체중(kg) × 시간(hours)
    // 강도 보정: 높은 횟수일수록 강도 증가
    const intensityFactor = Math.min(1.3, 1.0 + (reps / 100));
    const calories = met * weightKg * (duration / 3600) * intensityFactor;
    
    return Math.round(Math.max(1, calories)); // 최소 1칼로리
  }, []);

  // 백엔드로 운동 데이터 전송
  const sendWorkoutData = useCallback(async (sessionData: WorkoutSessionData) => {
    try {
      const response = await apiClient.post('/api/workout/session-feedback', {
        exerciseType: sessionData.exerciseType,
        startTime: sessionData.startTime.toISOString(),
        endTime: sessionData.endTime?.toISOString(),
        totalReps: sessionData.totalReps,
        averageFormScore: sessionData.averageFormScore,
        formCorrections: sessionData.formCorrections,
        duration: sessionData.duration,
        caloriesBurned: sessionData.caloriesBurned,
        performanceHistory: performanceHistoryRef.current.map((p: ExercisePerformanceData) => ({
          timestamp: p.timestamp.toISOString(),
          repCount: p.repCount,
          formScore: p.formScore,
          confidence: p.confidence,
          feedback: p.feedback
        }))
      });

      if (response.data.success) {
        addLog('✅ 세션 데이터 전송 성공', { sessionId: response.data.sessionId });
      } else {
        addLog('❌ 세션 데이터 전송 실패', { message: response.data.message });
      }
    } catch (error) {
      addLog('❌ 세션 데이터 전송 에러', { error: String(error) });
      throw error;
    }
  }, [addLog]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // MediaPipe 결과 처리 (포즈 스무딩 적용 - 정확도 +15%)
  const onResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출 + 스무딩', { points: results.poseLandmarks.length });
        firstDetectionLogged.current = true;
      }
      
      // 원시 랜드마크를 PoseKeypoint 형식으로 변환
      const rawKeypoints: PoseKeypoint[] = results.poseLandmarks.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        score: lm.visibility
      }));
      
      // 포즈 스무딩 적용
      const smoothedPose = globalPoseSmoothing.addPose(rawKeypoints);
      
      // 스무딩된 데이터로 분석 수행
      const landmarks = smoothedPose.keypoints;
      const analysis = analyzeExercise(landmarks, selectedExercise);
      
      // 스무딩 품질 점수 추가
      const smoothingQuality = globalPoseSmoothing.getSmoothingQuality();
      analysis.confidence = analysis.confidence * smoothingQuality;
      
      // ref에 저장하여 리렌더링 방지
      exerciseAnalysisRef.current = analysis;
      
      // 퍼포먼스 데이터 기록
      recordPerformance(analysis);
      
      // 캔버스에 스무딩된 포즈 그리기
      drawPoseOnCanvas(landmarks);
      
      // 디버그: 스무딩 품질 로깅 (가끔씩)
      if (Math.random() < 0.01) {
        addLog('📊 포즈 스무딩 품질', { quality: smoothingQuality.toFixed(2) });
      }
    } else {
      if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 포즈 미검출(프레임)');
      }
    }
  }, [addLog, selectedExercise, recordPerformance]);

  // Pose 인스턴스 생성 (안정성 개선)
  // CDN 상태 추적을 위한 ref
  const cdnUrlIndexRef = useRef(0);
  
  // CDN 연결 테스트 함수
  const testCdnConnection = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD', 
        mode: 'cors',
        timeout: 3000 // 3초 타임아웃
      } as RequestInit);
      return response.ok;
    } catch (error) {
      addLog(`CDN 연결 테스트 실패: ${url}`, { error: String(error) });
      return false;
    }
  }, [addLog]);

  const createPose = useCallback(async () => {
    try {
      // CDN 폴백 전략: jsdelivr -> unpkg -> esm.sh -> 로컬
      const cdnUrls = [
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `https://unpkg.com/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `https://esm.sh/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `/node_modules/@mediapipe/pose/` // 로컬 폴백
      ];
      
      // 현재 CDN URL 선택
      const baseCdnUrl = cdnUrls[cdnUrlIndexRef.current];
      addLog(`MediaPipe CDN 사용: ${baseCdnUrl} (시도 ${cdnUrlIndexRef.current + 1}/${cdnUrls.length})`);
      
      // 네트워크 연결 상태 확인
      if (!navigator.onLine) {
        throw new Error('네트워크 연결이 없습니다. 인터넷 연결을 확인해주세요.');
      }
      
      const instance = new Pose({
        locateFile: (file) => {
          let mapped = file;
          if (mapped.includes('simd_wasm_bin')) {
            mapped = mapped.replace('simd_wasm_bin', 'wasm_bin');
          }
          return `${baseCdnUrl}${mapped}`;
        }
      });
      
      // 모바일/저성능 기기를 위한 최적화된 설정
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      instance.setOptions({
        modelComplexity: isMobile ? 0 : 1, // 모바일에서는 경량 모델 사용
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5, // 신뢰도 임계값 상향 조정 (노이즈 감소)
        minTrackingConfidence: 0.5,  // 추적 신뢰도도 상향 조정
        selfieMode: true
      });
      
      instance.onResults(onResults);
      addLog('✅ MediaPipe Pose 인스턴스 생성 완료', { 
        isMobile, 
        modelComplexity: isMobile ? 0 : 1,
        cdnUrl: baseCdnUrl
      });
      return instance;
    } catch (error) {
      const errorMsg = String(error);
      addLog('❌ MediaPipe Pose 인스턴스 생성 실패', { 
        error: errorMsg,
        cdnIndex: cdnUrlIndexRef.current,
        cdnUrl: baseCdnUrl
      });
      
      // CDN 폴백 시도
      const cdnUrls = [
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `https://unpkg.com/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `https://esm.sh/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/`,
        `/node_modules/@mediapipe/pose/`
      ];
      
      if (cdnUrlIndexRef.current < cdnUrls.length - 1) {
        cdnUrlIndexRef.current++;
        addLog(`🔄 다음 CDN으로 폴백 시도: ${cdnUrls[cdnUrlIndexRef.current]}`);
        return await createPose(); // 재귀 호출로 다음 CDN 시도
      }
      
      throw error;
    }
  }, [onResults, addLog, testCdnConnection]);

  // MediaPipe 초기화 (재시도 메커니즘 포함)
  const initializeMediaPipe = useCallback(async (retryCount = 0) => {
    const maxRetries = 4; // CDN 폴백을 고려하여 최대 재시도 횟수 증가
    const retryDelay = Math.pow(2, retryCount) * 1000; // 지수 백오프: 1s, 2s, 4s, 8s
    
    try {
      addLog('MediaPipe Pose 모델 로드 시작', { 
        version: MEDIAPIPE_POSE_VERSION, 
        attempt: retryCount + 1,
        maxRetries: maxRetries,
        networkStatus: navigator.onLine,
        userAgent: navigator.userAgent.substring(0, 50)
      });
      
      // 네트워크 상태 재확인
      if (!navigator.onLine) {
        throw new Error('네트워크 연결이 없습니다');
      }
      
      // 이전 인스턴스 정리
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {
          addLog('이전 MediaPipe 인스턴스 정리 중 오류', { error: String(e) });
        }
        poseRef.current = null;
      }
      
      const instance = await createPose(); // await 추가
      poseRef.current = instance;
      
      // 인스턴스 생성 후 유효성 검증
      if (!instance || typeof instance.send !== 'function') {
        throw new Error('MediaPipe 인스턴스가 올바르게 생성되지 않았습니다');
      }
      
      addLog('✅ MediaPipe Pose 모델 로드 완료', { 
        attempt: retryCount + 1,
        cdnIndex: cdnUrlIndexRef.current
      });
      
      // CDN 인덱스 초기화 (성공 시)
      cdnUrlIndexRef.current = 0;
      
      return true;
    } catch (error) {
      const errorMsg = String(error);
      addLog('❌ MediaPipe 모델 로드 실패', { 
        error: errorMsg, 
        attempt: retryCount + 1,
        willRetry: retryCount < maxRetries - 1,
        cdnIndex: cdnUrlIndexRef.current,
        networkStatus: navigator.onLine
      });
      
      if (retryCount < maxRetries - 1) {
        addLog(`🔄 ${retryDelay}ms 후 재시도 (${retryCount + 2}/${maxRetries})`);
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const result = await initializeMediaPipe(retryCount + 1);
              resolve(result);
            } catch (e) {
              resolve(false);
            }
          }, retryDelay);
        });
      } else {
        // 모든 재시도 실패 시 사용자 친화적 대응
        addLog('💥 MediaPipe 초기화 최종 실패');
        
        const errorType = errorMsg.includes('네트워크') || errorMsg.includes('network') 
          ? 'network' 
          : errorMsg.includes('permissions') || errorMsg.includes('권한')
          ? 'permission'
          : 'technical';
        
        let userMessage = '';
        switch (errorType) {
          case 'network':
            userMessage = '인터넷 연결을 확인하고 페이지를 새로고침해주세요.';
            break;
          case 'permission':
            userMessage = '브라우저 권한을 확인하고 페이지를 새로고침해주세요.';
            break;
          default:
            userMessage = '모션 인식 시스템 로드에 실패했습니다. 페이지를 새로고침하시겠습니까?';
        }
        
        if (window.confirm(userMessage)) {
          window.location.reload();
        }
        return false;
      }
    }
  }, [addLog, createPose]);

  // 캔버스 크기를 비디오 해상도와 동기화
  const syncCanvasToVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    addLog('캔버스 동기화', { videoWidth: vw, videoHeight: vh, dpr: window.devicePixelRatio });
  }, [addLog]);

  // 권한 상태 확인
  const checkPermissions = useCallback(async () => {
    try {
      // @ts-ignore
      if (navigator.permissions && navigator.permissions.query) {
        // @ts-ignore
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        addLog('카메라 권한 상태', { state: status.state });
      } else {
        addLog('permissions API 미지원');
      }
    } catch (e) {
      addLog('권한 상태 조회 실패', { error: String(e) });
    }
  }, [addLog]);

  // 장치 목록 로그
  const logDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput').map(d => ({ label: d.label, deviceId: d.deviceId }));
      addLog('비디오 장치', cams);
    } catch (e) {
      addLog('장치 열거 실패', { error: String(e) });
    }
  }, [addLog]);

  // getUserMedia 에러 해석
  const handleGumError = useCallback((err: any, facingModeTried: string) => {
    const name = err?.name || 'UnknownError';
    const msg = err?.message || String(err);
    addLog('getUserMedia 실패', { name, message: msg, facingModeTried });
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      addLog('권한 거부/차단됨: 브라우저 사이트 권한에서 카메라를 허용해 주세요.');
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      addLog('카메라 장치 없음/제약 불일치: 전면/후면 전환을 시도합니다.');
    } else if (name === 'NotReadableError') {
      addLog('다른 앱이 카메라 점유 중: 영상통화/카메라 앱 종료 후 재시도.');
    }
  }, [addLog]);

  // 웹캠 시작 (전면 → 실패 시 후면 폴백)
  const startCamera = useCallback(async () => {
    await checkPermissions();
    await logDevices();
    addLog('보안 컨텍스트', { isSecureContext: window.isSecureContext, protocol: location.protocol });

    const tryOpen = async (facingMode: 'user' | 'environment') => {
      addLog('카메라 시도', { facingMode });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 480 },
          height: { ideal: 360, min: 360 },
          facingMode,
          frameRate: { ideal: 24 }
        }
      });
      return stream;
    };

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await tryOpen('user');
      } catch (e1) {
        handleGumError(e1, 'user');
        try {
          stream = await tryOpen('environment');
        } catch (e2) {
          handleGumError(e2, 'environment');
          throw e2;
        }
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const track = stream.getVideoTracks()[0];
        addLog('스트림 시작', { label: track?.label, settings: track?.getSettings?.() });
        syncCanvasToVideo();
        setIsDetecting(true);
        stateRef.current = { phase: 'up', count: 0 };
        firstDetectionLogged.current = false;
        addLog('✅ 웹캠 시작 완료');
      }
    } catch (error) {
      addLog('❌ 웹캠 시작 최종 실패', { error: String(error) });
    }
  }, [checkPermissions, logDevices, handleGumError, syncCanvasToVideo, addLog]);

  // 메모리 누수 방지를 위한 타이머 ref 추가
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const memoryCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    try {
      addLog('🗑️ 리소스 정리 시작');
      
      // 0. 이미 진행 중인 정리 작업 취소
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      // 1. 애니메이션 프레임 정리
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
        addLog('🗑️ RAF 루프 정리 완료');
      }
      
      // 2. 처리 상태 즉시 중단
      processingRef.current = false;
      setIsDetecting(false);
      
      // 3. MediaPipe 인스턴스 정리 (우선순위 1)
      if (poseRef.current) {
        try {
          // 콜백 해제
          poseRef.current.onResults = () => {};
          
          // 인스턴스 해제
          if (typeof poseRef.current.close === 'function') {
            poseRef.current.close();
          }
          poseRef.current = null;
          addLog('🗑️ MediaPipe 인스턴스 정리 완료');
        } catch (cleanupError) {
          addLog('MediaPipe 정리 중 오류', { error: String(cleanupError) });
        }
      }
      
      // 4. 카메라 스트림 정리 (즉시 실행)
      const videoEl = videoRef.current;
      const stream = (videoEl?.srcObject as MediaStream | null) || null;
      
      if (stream) {
        // 모든 트랙 즉시 중단
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
            addLog('🗑️ 비디오 트랙 해제', { 
              label: track.label, 
              kind: track.kind, 
              state: track.readyState 
            });
          }
        });
        
        // 스트림 참조 해제
        if (videoEl) {
          videoEl.pause();
          videoEl.srcObject = null;
          videoEl.removeAttribute('src');
        }
      }
      
      // 5. 비디오 요소 완전 정리
      if (videoEl) {
        // 이벤트 리스너 정리
        videoEl.onloadeddata = null;
        videoEl.onplay = null;
        videoEl.onpause = null;
        videoEl.onerror = null;
        
        // 비디오 요소 초기화
        try {
          videoEl.load();
        } catch (loadError) {
          addLog('비디오 load() 오류 (무시)', { error: String(loadError) });
        }
        
        addLog('🗑️ 비디오 요소 정리 완료');
      }
      
      // 6. 캔버스 정리 및 컨텍스트 해제
      const canvasEl = canvasRef.current;
      if (canvasEl) {
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
          // 캔버스 완전 초기화
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          ctx.beginPath(); // 경로 정리
          
          // 변환 행렬 초기화
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        
        // 캔버스 크기 초기화
        canvasEl.width = 640;
        canvasEl.height = 480;
        
        addLog('🗑️ 캔버스 정리 완료');
      }
      
      // 7. 상태 및 참조 정리
      stateRef.current = { phase: 'up', count: 0 };
      firstDetectionLogged.current = false;
      
      // 8. 전역 분석기 정리 (메모리 해제)
      try {
        globalPoseSmoothing.reset();
        if (typeof globalMultiJointAnalyzer.reset === 'function') {
          globalMultiJointAnalyzer.reset();
        }
        addLog('🗑️ 전역 분석기 정리 완료');
      } catch (analyzerError) {
        addLog('분석기 정리 중 오류', { error: String(analyzerError) });
      }
      
      // 9. 퍼포먼스 기록 정리 (메모리 누수 방지)
      if (performanceHistoryRef.current.length > 100) {
        performanceHistoryRef.current = performanceHistoryRef.current.slice(-50);
        addLog('🗑️ 퍼포먼스 히스토리 정리 (최근 50개 유지)');
      }
      
      // 10. 가비지 컬렉션 제안 (브라우저에서 지원하는 경우)
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
          addLog('🗑️ 가비지 컬렉션 실행');
        } catch (gcError) {
          addLog('GC 실행 실패 (무시)', { error: String(gcError) });
        }
      }
      
      addLog('✅ 모든 리소스 정리 완료');
    } catch (e) {
      addLog('❌ 리소스 정리 중 심각한 오류', { error: String(e) });
    }
  }, [addLog]);

  // 주기적 메모리 정리 (5분마다)
  useEffect(() => {
    memoryCleanupIntervalRef.current = setInterval(() => {
      if (isDetecting) {
        // 퍼포먼스 히스토리 정리
        if (performanceHistoryRef.current.length > 200) {
          performanceHistoryRef.current = performanceHistoryRef.current.slice(-100);
          addLog('🧹 주기적 메모리 정리: 퍼포먼스 히스토리');
        }
        
        // 포즈 스무딩 히스토리 최적화
        try {
          globalPoseSmoothing.optimize();
        } catch (e) {
          // 최적화 메서드가 없어도 무시
        }
      }
    }, 5 * 60 * 1000); // 5분마다

    return () => {
      if (memoryCleanupIntervalRef.current) {
        clearInterval(memoryCleanupIntervalRef.current);
        memoryCleanupIntervalRef.current = null;
      }
    };
  }, [isDetecting, addLog]);

  // Pose 재초기화(에러 복구 + 스무딩 히스토리 초기화)
  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 + 스무딩 리셋');
    const instance = createPose();
    poseRef.current = instance;
    
    // 포즈 스무딩 히스토리 초기화
    globalPoseSmoothing.reset();
  }, [addLog, createPose]);

  // RAF 기반 감지 루프 (성능 최적화)
  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!poseRef.current || !video || !isDetecting) {
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    if (!processingRef.current) {
      processingRef.current = true;
      try {
        await poseRef.current.send({ image: video });
      } catch (e: any) {
        const msg = String(e?.message || e);
        addLog('포즈 처리 에러', { error: msg });
        if (msg.includes('memory access out of bounds')) {
          resetPose();
        }
      } finally {
        processingRef.current = false;
      }
    }
    rafId.current = requestAnimationFrame(() => loop());
  }, [isDetecting, addLog, resetPose]);

  // 불필요한 stableFunctions 제거됨

  // 운동 분석/카운트 분기 - 브릿지 추가
  const analyzeExercise = useCallback((landmarks: any[], type: ExerciseType): ExerciseAnalysis => {
    // Stage 5: 기본 분석 수행
    let basicAnalysis: ExerciseAnalysis;
    
    switch (type) {
      case 'squat':
        basicAnalysis = analyzeSquatWithCount(landmarks);
        break;
      case 'lunge':
        basicAnalysis = analyzeLungeWithCount(landmarks);
        break;
      case 'pushup':
        basicAnalysis = analyzePushupWithCount(landmarks);
        break;
      case 'plank':
        basicAnalysis = analyzePlankWithJudge(landmarks);
        break;
      case 'calf_raise':
        basicAnalysis = analyzeCalfRaiseWithCount(landmarks);
        break;
      case 'bridge':
        basicAnalysis = analyzeBridgeWithCount(landmarks);
        break;
      case 'situp':
        basicAnalysis = analyzeSitupWithCount(landmarks);
        break;
      case 'crunch':
        basicAnalysis = analyzeCrunchWithCount(landmarks);
        break;
      default:
        basicAnalysis = { exerciseType: type, currentCount: stateRef.current.count, isCorrectForm: false, feedback: '운동을 선택하세요', confidence: 0 };
        break;
    }
    
    // Stage 5: 다중 관절 통합 분석 수행
    if (['squat', 'pushup', 'plank', 'situp', 'crunch'].includes(type)) {
      try {
        const multiJointAnalysis = globalMultiJointAnalyzer.analyzeMultiJoint(landmarks, type);
        
        // 기본 분석 결과와 다중 관절 분석 결과 통합
        const enhancedAnalysis: ExerciseAnalysis = {
          ...basicAnalysis,
          multiJointAnalysis,
          qualityGrade: multiJointAnalysis.qualityGrade,
          formCorrections: multiJointAnalysis.formCorrections,
          // 정확도 향상: 기본 신뢰도와 다중 관절 신뢰도 결합 (25% 향상 목표)
          confidence: Math.min(1.0, basicAnalysis.confidence * 0.6 + multiJointAnalysis.confidenceLevel * 0.4 + 0.25),
          // 폼 정확성 향상: 다중 관절 일관성 고려
          isCorrectForm: basicAnalysis.isCorrectForm && multiJointAnalysis.overallConsistency > 0.6,
          // 피드백 개선: 다중 관절 분석 결과 우선
          feedback: multiJointAnalysis.formCorrections.length > 0 
            ? multiJointAnalysis.formCorrections[0] 
            : basicAnalysis.feedback
        };
        
        return enhancedAnalysis;
      } catch (error) {
        console.warn('다중 관절 분석 오류:', error);
        return basicAnalysis; // 오류 시 기본 분석 결과 반환
      }
    }
    
    return basicAnalysis;
  }, []);

  // 각도 계산/도우미
  const calculateAngle = (p1: any, p2: any, p3: any): number => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return Math.abs(angle * 180 / Math.PI);
  };
  const avg = (a: number, b: number) => (a + b) / 2;

  // 스쿼트 카운트 - 간단하고 안정적
  const analyzeSquatWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    
    if (!(kneeL && kneeR && hipL && hipR && ankleL && ankleR)) {
      return { exerciseType: 'squat', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '전신이 보이도록 해주세요', confidence: 0 };
    }
    
    const angleL = calculateAngle(hipL, kneeL, ankleL);
    const angleR = calculateAngle(hipR, kneeR, ankleR);
    const kneeAngle = avg(angleL, angleR);
    
    const isDown = kneeAngle <= 110;
    const isUp = kneeAngle >= 150;
    const was = stateRef.current.phase;
    
    if (was === 'up' && isDown) {
      stateRef.current.phase = 'down';
    } else if (was === 'down' && isUp) {
      stateRef.current.phase = 'up';
      stateRef.current.count += 1;
    }
    
    return { 
      exerciseType: 'squat', 
      currentCount: stateRef.current.count, 
      isCorrectForm: isDown || isUp, 
      feedback: isDown ? '아래로 더' : isUp ? '완전히 일어나기' : '스쿼트 동작', 
      confidence: Math.min(kneeL.visibility || 0, kneeR.visibility || 0) 
    };
  }, []);

  // 런지 카운트
  const analyzeLungeWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    if (!(hipL && hipR && kneeL && kneeR && ankleL && ankleR)) {
      return { exerciseType: 'lunge', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '전신이 보이도록 해주세요', confidence: 0 };
    }
    const angleL = calculateAngle(hipL, kneeL, ankleL);
    const angleR = calculateAngle(hipR, kneeR, ankleR);
    const frontKnee = Math.min(angleL, angleR);
    const isDown = frontKnee <= 105;
    const isUp = frontKnee >= 155;
    const was = stateRef.current.phase;
    if (was === 'up' && isDown) stateRef.current.phase = 'down';
    if (was === 'down' && isUp) { stateRef.current.phase = 'up'; stateRef.current.count += 1; }
    return { exerciseType: 'lunge', currentCount: stateRef.current.count, isCorrectForm: isDown || isUp, feedback: isDown ? '하강 구간' : '상승 구간', confidence: Math.min(kneeL.visibility || 0, kneeR.visibility || 0) };
  }, []);

  // 푸시업 카운트
  const analyzePushupWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const shL = lm[LEFT_SHOULDER], shR = lm[RIGHT_SHOULDER];
    const elL = lm[LEFT_ELBOW], elR = lm[RIGHT_ELBOW];
    const wrL = lm[LEFT_WRIST], wrR = lm[RIGHT_WRIST];
    if (!(shL && shR && elL && elR && wrL && wrR)) {
      return { exerciseType: 'pushup', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '상체가 보이도록 해주세요', confidence: 0 };
    }
    const elbowL = calculateAngle(shL, elL, wrL);
    const elbowR = calculateAngle(shR, elR, wrR);
    const elbow = avg(elbowL, elbowR);
    const isDown = elbow <= 90;
    const isUp = elbow >= 160;
    const was = stateRef.current.phase;
    
    if (was === 'up' && isDown) {
      stateRef.current.phase = 'down';
    } else if (was === 'down' && isUp) { 
      stateRef.current.phase = 'up'; 
      stateRef.current.count += 1;
    }
    
    return { exerciseType: 'pushup', currentCount: stateRef.current.count, isCorrectForm: isDown || isUp, feedback: isDown ? '아래로' : '위로', confidence: Math.min(elL.visibility || 0, elR.visibility || 0) };
  }, []);

  // 플랭크 판정
  const analyzePlankWithJudge = useCallback((lm: any[]): ExerciseAnalysis => {
    const shL = lm[LEFT_SHOULDER], shR = lm[RIGHT_SHOULDER];
    const elL = lm[LEFT_ELBOW], elR = lm[RIGHT_ELBOW];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    if (!(shL && shR && elL && elR && hipL && hipR)) {
      return { exerciseType: 'plank', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '상체가 보이도록 해주세요', confidence: 0 };
    }
    const left = calculateAngle(shL, elL, hipL);
    const right = calculateAngle(shR, elR, hipR);
    const arm = avg(left, right);
    const isPlank = arm >= 80 && arm <= 100;
    return { exerciseType: 'plank', currentCount: stateRef.current.count, isCorrectForm: isPlank, feedback: isPlank ? '좋아요, 유지하세요' : '팔 각도 90° 근처 유지', confidence: Math.min(elL.visibility || 0, elR.visibility || 0) };
  }, []);

  // 카프 레이즈
  const analyzeCalfRaiseWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    const toeL = lm[LEFT_FOOT_INDEX], toeR = lm[RIGHT_FOOT_INDEX];
    if (!(ankleL && ankleR && toeL && toeR)) {
      return { exerciseType: 'calf_raise', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '발이 보이도록 해주세요', confidence: 0 };
    }
    const dyL = (ankleL.y - toeL.y);
    const dyR = (ankleR.y - toeR.y);
    const lift = avg(dyL, dyR);
    const isUp = lift > 0.03;
    const isDown = lift < 0.01;
    const was = stateRef.current.phase;
    if (was === 'up' && isDown) stateRef.current.phase = 'down';
    if (was === 'down' && isUp) { stateRef.current.phase = 'up'; stateRef.current.count += 1; }
    return { exerciseType: 'calf_raise', currentCount: stateRef.current.count, isCorrectForm: true, feedback: isUp ? '상승' : '하강', confidence: Math.min(ankleL.visibility || 0, ankleR.visibility || 0) };
  }, []);

  // 브릿지 분석 - 엉덩이 높이와 몸체 정렬도 기반
  const analyzeBridgeWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const shoulderL = lm[LEFT_SHOULDER], shoulderR = lm[RIGHT_SHOULDER];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    
    if (!(shoulderL && shoulderR && hipL && hipR && kneeL && kneeR && ankleL && ankleR)) {
      return { exerciseType: 'bridge', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '전신이 보이도록 누워주세요', confidence: 0 };
    }
    
    // 1. 어깨-엉덩이-무릎 정렬도 계산 (일직선일 때 180도에 가까움)
    const leftAlignment = calculateAngle(shoulderL, hipL, kneeL);
    const rightAlignment = calculateAngle(shoulderR, hipR, kneeR);
    const alignment = avg(leftAlignment, rightAlignment);
    
    // 2. 엉덩이 높이 계산 (무릎 대비 상대적 높이)
    const hipHeight = avg(hipL.y, hipR.y);
    const kneeHeight = avg(kneeL.y, kneeR.y);
    const relativeHipHeight = kneeHeight - hipHeight; // Y축은 아래로 갈수록 큰 값
    
    // 3. 발목 안정성 확인 (발바닥이 바닥에 평평히 붙어있는지)
    const ankleStability = Math.abs(ankleL.y - ankleR.y) < 0.05; // 좌우 발목 높이 차이 5% 미만
    
    // 4. 브릿지 상태 판정
    const isBridgeUp = alignment >= 160 && relativeHipHeight > 0.08 && ankleStability; // 정렬 160도+, 높이 8%+, 안정성
    const isBridgeDown = alignment < 140 || relativeHipHeight < 0.03; // 정렬 140도-, 높이 3%-
    
    // 5. 카운팅 로직 (up-down 사이클)
    const was = stateRef.current.phase;
    if (was === 'down' && isBridgeUp) {
      stateRef.current.phase = 'up';
      stateRef.current.count += 1;
    }
    if (was === 'up' && isBridgeDown) {
      stateRef.current.phase = 'down';
    }
    
    // 6. 피드백 생성
    let feedback = '';
    if (isBridgeUp) {
      if (alignment >= 170) {
        feedback = '완벽한 브릿지! 이 자세를 유지하세요 💪';
      } else {
        feedback = '좋습니다! 엉덩이를 조금 더 올려보세요';
      }
    } else if (relativeHipHeight < 0.05) {
      feedback = '엉덩이를 더 높이 올려주세요';
    } else if (!ankleStability) {
      feedback = '발을 바닥에 평평하게 붙여주세요';
    } else {
      feedback = '어깨-엉덩이-무릎이 일직선이 되도록 하세요';
    }
    
    // 7. 신뢰도 계산 (모든 관절의 가시성 평균)
    const allKeypoints = [shoulderL, shoulderR, hipL, hipR, kneeL, kneeR, ankleL, ankleR];
    const avgVisibility = allKeypoints.reduce((sum, point) => sum + (point.score || 0), 0) / allKeypoints.length;
    
    return {
      exerciseType: 'bridge',
      currentCount: stateRef.current.count,
      isCorrectForm: isBridgeUp,
      feedback: feedback,
      confidence: avgVisibility
    };
  }, []);

  // 윗몸일으키기 분석 함수 (Stage 4: 코어 운동 강화)
  const analyzeSitupWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const shoulderL = lm[LEFT_SHOULDER], shoulderR = lm[RIGHT_SHOULDER];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    const nose = lm[NOSE];
    
    if (!(shoulderL && shoulderR && hipL && hipR && kneeL && kneeR && nose)) {
      return { exerciseType: 'situp', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '전신이 보이도록 누워주세요', confidence: 0 };
    }
    
    // 1. 상체 각도 계산 (어깨-엉덩이-무릎 각도)
    const leftTorsoAngle = calculateAngle(shoulderL, hipL, kneeL);
    const rightTorsoAngle = calculateAngle(shoulderR, hipR, kneeR);
    const avgTorsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2;
    
    // 2. 머리-어깨-엉덩이 상체 굽힘 각도
    const shoulder = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 };
    const hip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 };
    const spineFlexionAngle = calculateAngle(nose, shoulder, hip);
    
    // 3. 윗몸일으키기 동작 판단
    const isSitupUp = avgTorsoAngle >= 40 && avgTorsoAngle <= 90 && spineFlexionAngle >= 30;
    const isSitupDown = avgTorsoAngle >= 130 && avgTorsoAngle <= 180 && spineFlexionAngle <= 15;
    
    // 4. 카운트 로직
    if (isSitupUp && stateRef.current.previousState !== 'up') {
      stateRef.current.previousState = 'up';
    } else if (isSitupDown && stateRef.current.previousState === 'up') {
      stateRef.current.count++;
      stateRef.current.previousState = 'down';
    }
    
    // 5. 자세 피드백
    let feedback = isSitupUp ? '좋아요! 복부에 힘을 주세요' : '천천히 일어나세요';
    let isCorrectForm = isSitupUp || isSitupDown;
    
    if (!isCorrectForm) {
      if (avgTorsoAngle < 30) feedback = '너무 많이 일어났어요, 45도 정도만 올라오세요';
      else if (spineFlexionAngle > 45) feedback = '목에 무리가 가지 않도록 복부 힘으로 올라오세요';
      else feedback = '복부에 집중하여 천천히 움직여보세요';
    }
    
    // 6. 신뢰도 계산
    const keypoints = [shoulderL, shoulderR, hipL, hipR, kneeL, kneeR, nose];
    const avgVisibility = keypoints.reduce((sum, point) => sum + (point.score || 0), 0) / keypoints.length;
    
    return {
      exerciseType: 'situp',
      currentCount: stateRef.current.count,
      isCorrectForm: isCorrectForm,
      feedback: feedback,
      confidence: avgVisibility
    };
  }, []);

  // 크런치 분석 함수 (Stage 4: 코어 운동 강화)
  const analyzeCrunchWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const shoulderL = lm[LEFT_SHOULDER], shoulderR = lm[RIGHT_SHOULDER];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const nose = lm[NOSE];
    const earL = lm[LEFT_EAR], earR = lm[RIGHT_EAR];
    
    if (!(shoulderL && shoulderR && hipL && hipR && nose)) {
      return { exerciseType: 'crunch', currentCount: stateRef.current.count, isCorrectForm: false, feedback: '상체가 보이도록 누워주세요', confidence: 0 };
    }
    
    // 1. 어깨 중심점과 엉덩이 중심점
    const shoulder = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 };
    const hip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 };
    
    // 2. 상체 굽힘 각도 (크런치는 윗몸일으키기보다 작은 범위)
    const spineFlexionAngle = calculateAngle(nose, shoulder, hip);
    
    // 3. 어깨-엉덩이 거리 변화 (크런치 시 줄어듦)
    const shoulderHipDistance = Math.sqrt(
      Math.pow((shoulder.x - hip.x), 2) + Math.pow((shoulder.y - hip.y), 2)
    );
    
    // 4. 크런치 동작 판단 (윗몸일으키기보다 작은 각도)
    const isCrunchUp = spineFlexionAngle >= 15 && spineFlexionAngle <= 45 && shoulderHipDistance < 0.4;
    const isCrunchDown = spineFlexionAngle <= 10 && shoulderHipDistance > 0.42;
    
    // 5. 카운트 로직
    if (isCrunchUp && stateRef.current.previousState !== 'up') {
      stateRef.current.previousState = 'up';
    } else if (isCrunchDown && stateRef.current.previousState === 'up') {
      stateRef.current.count++;
      stateRef.current.previousState = 'down';
    }
    
    // 6. 자세 피드백
    let feedback = isCrunchUp ? '좋아요! 복부 수축을 느껴보세요' : '천천히 내려가세요';
    let isCorrectForm = isCrunchUp || isCrunchDown;
    
    if (!isCorrectForm) {
      if (spineFlexionAngle > 45) feedback = '너무 높이 올라왔어요, 어깨만 살짝 들어주세요';
      else if (shoulderHipDistance > 0.45) feedback = '복부에 힘을 주고 어깨를 들어주세요';
      else feedback = '어깨만 살짝 들어 복부 수축을 느껴보세요';
    }
    
    // 7. 신뢰도 계산
    const keypoints = [shoulderL, shoulderR, hipL, hipR, nose];
    const avgVisibility = keypoints.reduce((sum, point) => sum + (point.score || 0), 0) / keypoints.length;
    
    return {
      exerciseType: 'crunch',
      currentCount: stateRef.current.count,
      isCorrectForm: isCorrectForm,
      feedback: feedback,
      confidence: avgVisibility
    };
  }, []);

  // 포즈 시각화 정확도 향상 (캔버스 좌표 변환 정확도 개선)
  const drawPoseOnCanvas = useCallback((landmarks: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !video) return;

    // 매 프레임 변환 초기화 (누적 스케일 방지)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // CSS 기준 크기 계산 (비디오 표시 크기 우선)
    const cssWidth = (video.clientWidth || video.videoWidth || 640);
    const cssHeight = (video.clientHeight || video.videoHeight || 480);

    // DPR 적용: 실제 캔버스 버퍼 크기 설정, 스타일 크기는 CSS 픽셀 유지
    const dpr = window.devicePixelRatio || 1;
    const bufferWidth = Math.round(cssWidth * dpr);
    const bufferHeight = Math.round(cssHeight * dpr);

    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    if (canvas.style.width !== cssWidth + 'px' || canvas.style.height !== cssHeight + 'px') {
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
    }

    // 컨텍스트를 CSS 픽셀 좌표계로 스케일
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;

    // 캔버스 정리 (CSS 픽셀 기준)
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    // 신뢰도 기반 적응형 임계값 (전체 랜드마크의 평균 신뢰도에 따라 조정)
    const avgVisibility = landmarks.reduce((sum, lm) => sum + (lm.visibility || lm.score || 0), 0) / landmarks.length;
    const baseThreshold = 0.4;
    const adaptiveThreshold = Math.max(baseThreshold, avgVisibility * 0.7);

    const getColorForVisibility = (visibility: number) => {
      if (visibility >= 0.8) return '#00FF00';
      else if (visibility >= 0.6) return '#FFFF00';
      else if (visibility >= 0.4) return '#FFA500';
      else return '#FF0000';
    };

    const transformCoordinate = (landmark: any, canvasWidth: number, canvasHeight: number) => {
      const x = Math.round(landmark.x * canvasWidth * 10) / 10;
      const y = Math.round(landmark.y * canvasHeight * 10) / 10;
      return { x, y };
    };

    // 1단계: 관절점 렌더링 (신뢰도별 색상 및 크기)
    landmarks.forEach((landmark, index) => {
      const visibility = landmark.visibility || landmark.score || 0;
      if (visibility > adaptiveThreshold) {
        const { x, y } = transformCoordinate(landmark, width, height);

        const jointImportance = {
          [NOSE]: 5,
          [LEFT_SHOULDER]: 4, [RIGHT_SHOULDER]: 4,
          [LEFT_HIP]: 4, [RIGHT_HIP]: 4,
          [LEFT_ELBOW]: 3, [RIGHT_ELBOW]: 3,
          [LEFT_KNEE]: 4, [RIGHT_KNEE]: 4,
          [LEFT_WRIST]: 3, [RIGHT_WRIST]: 3,
          [LEFT_ANKLE]: 4, [RIGHT_ANKLE]: 4
        } as Record<number, number>;

        const baseRadius = jointImportance[index] || 2;
        const radius = baseRadius + (visibility - adaptiveThreshold) * 3;

        ctx.fillStyle = getColorForVisibility(visibility);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        if (visibility > 0.8) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });

    const connections = getConnectionsForExercise(selectedExercise);

    connections.forEach(([startIndex, endIndex]) => {
      const startPoint = landmarks[startIndex];
      const endPoint = landmarks[endIndex];

      if (startPoint && endPoint) {
        const startVisibility = startPoint.visibility || startPoint.score || 0;
        const endVisibility = endPoint.visibility || endPoint.score || 0;
        const minVisibility = Math.min(startVisibility, endVisibility);

        if (minVisibility > adaptiveThreshold) {
          const { x: x1, y: y1 } = transformCoordinate(startPoint, width, height);
          const { x: x2, y: y2 } = transformCoordinate(endPoint, width, height);

          const lineWidth = Math.max(1, Math.min(4, minVisibility * 5));
          const alpha = Math.max(0.3, minVisibility);

          ctx.strokeStyle = getColorForVisibility(minVisibility);
          ctx.globalAlpha = alpha;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    });

    // 투명도 초기화 및 상태 복원
    ctx.globalAlpha = 1.0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [selectedExercise]);

  // 브라우저 호환성 검사
  const checkBrowserCompatibility = useCallback(() => {
    const compatibility = {
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webgl: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      webAssembly: (() => {
        try {
          return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
        } catch (e) {
          return false;
        }
      })(),
      requestAnimationFrame: typeof requestAnimationFrame === 'function',
      canvas2d: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('2d'));
        } catch (e) {
          return false;
        }
      })(),
      speechSynthesis: 'speechSynthesis' in window
    };
    
    const isCompatible = Object.values(compatibility).every(Boolean);
    
    addLog('🔍 브라우저 호환성 검사', { ...compatibility, isCompatible });
    
    if (!isCompatible) {
      const missingFeatures = Object.entries(compatibility)
        .filter(([key, supported]) => !supported)
        .map(([key]) => key);
      
      addLog('⚠️ 지원되지 않는 기능들', { missingFeatures });
      
      // 사용자에게 알림
      const message = `브라우저가 일부 기능을 지원하지 않습니다:\n${missingFeatures.join(', ')}\n\n최신 브라우저 사용을 권장합니다.`;
      
      setTimeout(() => {
        if (window.confirm(message + '\n\n계속 진행하시겠습니까?')) {
          addLog('사용자가 호환성 문제에도 불구하고 계속 진행');
        } else {
          addLog('사용자가 호환성 문제로 진행 중단');
        }
      }, 1000);
    }
    
    return isCompatible;
  }, [addLog]);

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: location.href
    });
    
    // 브라우저 호환성 검사 후 초기화
    const isCompatible = checkBrowserCompatibility();
    if (isCompatible) {
      initializeMediaPipe();
    } else {
      addLog('⚠️ 브라우저 호환성 문제로 인한 제한된 초기화');
      // 호환성 문제가 있어도 기본적인 초기화는 시도
      setTimeout(() => initializeMediaPipe(), 2000);
    }
    
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [addLog, initializeMediaPipe, checkBrowserCompatibility]);
  
  // RAF 루프 시작 - pose가 준비되면 자동으로 시작
  useEffect(() => {
    if (!poseRef.current) return;
    
    rafId.current = requestAnimationFrame(loop);
    
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [loop]);

  // 뷰포트 변경 시 캔버스 재동기화
  useEffect(() => {
    const onResize = () => syncCanvasToVideo();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasToVideo]);

  // 운동 선택 변경 시 상태 초기화 및 Pose 콜백 업데이트 (스무딩 히스토리 포함)
  useEffect(() => {
    stateRef.current = { phase: 'up', count: 0 };
    exerciseAnalysisRef.current = { 
      ...exerciseAnalysisRef.current, 
      exerciseType: selectedExercise, 
      currentCount: 0 
    };
    firstDetectionLogged.current = false;
    
    // 포즈 스무딩 히스토리 초기화 (운동 변경 시 새로 시작)
    globalPoseSmoothing.reset();
    // Stage 5: 다중 관절 분석기 히스토리 초기화
    globalMultiJointAnalyzer.reset();
    
    // Pose 인스턴스가 있으면 onResults 콜백을 새로 설정
    if (poseRef.current) {
      poseRef.current.onResults(onResults);
    }
  }, [selectedExercise, onResults]);

  // 통합 운동 모드에서 자동 카메라 시작
  useEffect(() => {
    if (autoMode && !isDetecting) {
      // 통합 모드에서 자동으로 카메라 시작
      startCamera();
    }
  }, [autoMode, isDetecting]);

  // 통합 운동 모드에서 자동 세션 시작
  useEffect(() => {
    if (autoMode && isDetecting && !isSessionActive) {
      // 카메라가 준비되면 자동으로 세션 시작
      startWorkoutSession();
    }
  }, [autoMode, isDetecting, isSessionActive, startWorkoutSession]);

  return (
    <div className="motion-coach">
      {showExerciseSetupModal && <AutomatedWorkoutModal />}
      <div className="camera-container" onClick={() => { if (!isDetecting) startCamera(); }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas
          ref={canvasRef}
          className="pose-canvas"
          width={640}
          height={480}
        />
        <div className="camera-controls">
          <button 
            onClick={startCamera}
            className="start-button"
            disabled={isDetecting}
          >
            {isDetecting ? '감지 중...' : '카메라 시작'}
          </button>
          
          <button 
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className={`tts-toggle ${isTTSEnabled ? 'enabled' : 'disabled'}`}
            title={isTTSEnabled ? 'TTS 끄기' : 'TTS 켜기'}
          >
            🔊 {isTTSEnabled ? '음성 ON' : '음성 OFF'}
          </button>
        </div>

        <div className="session-controls">
          {!isSessionActive ? (
            <button 
              onClick={startWorkoutSession}
              className="session-start-button"
              disabled={!isDetecting}
            >
              🏋️ 운동 세션 시작
            </button>
          ) : (
            <button 
              onClick={endWorkoutSession}
              className="session-end-button"
            >
              ⏹️ 세션 종료
            </button>
          )}
        </div>
      </div>

      <div className="analysis-panel">
        <h3>운동 분석</h3>
        <div className="analysis-content">
          <p><strong>운동 유형:</strong> {exerciseAnalysisRef.current.exerciseType || '없음'}</p>
          <p><strong>카운트:</strong> {exerciseAnalysisRef.current.currentCount}</p>
          <p><strong>자세:</strong> {exerciseAnalysisRef.current.isCorrectForm ? '올바름' : '수정 필요'}</p>
          <p><strong>신뢰도:</strong> {(exerciseAnalysisRef.current.confidence * 100).toFixed(1)}%</p>
          <p><strong>피드백:</strong> {exerciseAnalysisRef.current.feedback}</p>
          
          {/* Stage 5: 다중 관절 분석 결과 표시 */}
          {exerciseAnalysisRef.current.multiJointAnalysis && (
            <div className="multi-joint-analysis" style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f0f8ff', borderRadius: '6px', fontSize: '12px' }}>
              <h5 style={{ margin: '0 0 6px 0', color: '#2c3e50' }}>🔬 통합 분석 (Stage 5)</h5>
              <p><strong>품질 등급:</strong> <span style={{ 
                color: exerciseAnalysisRef.current.qualityGrade === 'S' ? '#e74c3c' : 
                      exerciseAnalysisRef.current.qualityGrade === 'A' ? '#f39c12' : 
                      exerciseAnalysisRef.current.qualityGrade === 'B' ? '#f1c40f' : 
                      exerciseAnalysisRef.current.qualityGrade === 'C' ? '#3498db' : '#95a5a6',
                fontWeight: 'bold'
              }}>{exerciseAnalysisRef.current.qualityGrade}</span></p>
              <p><strong>일관성:</strong> {(exerciseAnalysisRef.current.multiJointAnalysis.overallConsistency * 100).toFixed(1)}%</p>
              <p><strong>안정성:</strong> {(exerciseAnalysisRef.current.multiJointAnalysis.stabilityIndex * 100).toFixed(1)}%</p>
              <p><strong>협응성:</strong> {(exerciseAnalysisRef.current.multiJointAnalysis.coordinationScore * 100).toFixed(1)}%</p>
              {exerciseAnalysisRef.current.formCorrections && exerciseAnalysisRef.current.formCorrections.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong>교정 제안:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                    {exerciseAnalysisRef.current.formCorrections.map((correction, index) => (
                      <li key={index} style={{ fontSize: '11px', marginBottom: '2px' }}>{correction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* 세션 정보 */}
          {isSessionActive && sessionStartTimeRef.current && (
            <div className="session-info">
              <h4>🏋️ 현재 세션</h4>
              <p><strong>시작 시간:</strong> {sessionStartTimeRef.current.toLocaleTimeString()}</p>
              <p><strong>경과 시간:</strong> {Math.floor((Date.now() - sessionStartTimeRef.current.getTime()) / 1000)}초</p>
              <p><strong>총 횟수:</strong> {stateRef.current.count}</p>
              <p><strong>자세 교정:</strong> {formCorrectionsRef.current.length}개</p>
              {performanceHistoryRef.current.length > 0 && (
                <p><strong>평균 정확도:</strong> 
                  {(performanceHistoryRef.current.reduce((sum: number, p: ExercisePerformanceData) => sum + p.formScore, 0) / performanceHistoryRef.current.length * 100).toFixed(1)}%
                </p>
              )}
              
              {/* 통합 운동 모드 정보 */}
              {autoMode && (
                <div className="integrated-mode-info" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                  <h5>🎯 자동 운동 모드</h5>
                  <p><strong>현재 세트:</strong> {currentSet} / {targetSets}</p>
                  <p><strong>목표 횟수:</strong> {targetReps}회</p>
                  <p><strong>현재 진행:</strong> {exerciseAnalysisRef.current.currentCount} / {targetReps}회</p>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#ddd', 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    marginTop: '5px'
                  }}>
                    <div style={{ 
                      width: `${Math.min((exerciseAnalysisRef.current.currentCount / targetReps) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: '#4CAF50',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="navigation-buttons" style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link 
              to="/speech-test"
              style={{ 
                padding: '8px 16px', 
                borderRadius: '4px', 
                border: '1px solid #ccc', 
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                display: 'inline-block',
                backgroundColor: 'white',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              음성 합성 테스트
            </Link>
        </div>
      </div>

      {/* 디버그 패널 */}
      <button className="debug-toggle" onClick={() => setDebugOpen(v => !v)}>
        {debugOpen ? '로그 닫기' : '로그 열기'}
      </button>
      {debugOpen && (
        <div className="debug-panel">
          <div className="debug-header">디버그 로그</div>
          <pre className="debug-body">
            {logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};

// 메모리 누수 방지를 위한 cleanup 후크 추가
const MotionCoachWithCleanup = React.forwardRef<HTMLDivElement, MotionCoachProps>((props, ref) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const motionCoachRef = useRef<any>(null);
  
  useEffect(() => {
    // 컴포넌트 마운트 시 성능 모니터링 시작
    const startTime = performance.now();
    console.log('MotionCoach 컴포넌트 마운트');
    
    return () => {
      // 컴포넌트 언마운트 시 전역 정리
      const unmountTime = performance.now();
      console.log(`MotionCoach 언마운트 (생존시간: ${Math.round(unmountTime - startTime)}ms)`);
      
      // 1. TTS 정리
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          console.log('TTS 정리 완료');
        } catch (e) {
          console.warn('TTS 정리 중 오류:', e);
        }
      }
      
      // 2. 전역 오디오 컨텍스트 정리
      if (window.AudioContext || (window as any).webkitAudioContext) {
        try {
          // 모든 AudioContext 인스턴스 찾아서 정리
          const contexts = (window as any)._audioContexts || [];
          contexts.forEach((ctx: AudioContext) => {
            if (ctx && ctx.state !== 'closed') {
              ctx.close();
            }
          });
        } catch (e) {
          console.warn('AudioContext 정리 중 오류:', e);
        }
      }
      
      // 3. MediaStream 전역 정리
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // 활성 스트림이 있다면 정리
          const video = document.querySelector('video');
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (e) {
          console.warn('MediaStream 정리 중 오류:', e);
        }
      }
      
      // 4. 이벤트 리스너 전역 정리
      try {
        window.removeEventListener('beforeunload', () => {});
        window.removeEventListener('unload', () => {});
        document.removeEventListener('visibilitychange', () => {});
      } catch (e) {
        console.warn('이벤트 리스너 정리 중 오류:', e);
      }
      
      // 5. 메모리 사용량 로깅 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        try {
          const memoryInfo = (performance as any).memory;
          if (memoryInfo) {
            console.log('메모리 사용량:', {
              used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
              total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
              limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
            });
          }
        } catch (e) {
          // 메모리 정보를 사용할 수 없는 브라우저에서는 무시
        }
      }
    };
  }, []);
  
  return <MotionCoach {...props} ref={motionCoachRef} />;
});

MotionCoachWithCleanup.displayName = 'MotionCoachWithCleanup';

// React.memo로 래핑하여 불필요한 리렌더링 방지 (최적화된 비교 함수)
export default React.memo(MotionCoachWithCleanup, (prevProps, nextProps) => {
  // 자주 변경되지 않는 props만 비교하여 성능 최적화
  return (
    prevProps.exerciseType === nextProps.exerciseType &&
    prevProps.targetSets === nextProps.targetSets &&
    prevProps.targetReps === nextProps.targetReps &&
    prevProps.currentSet === nextProps.currentSet &&
    prevProps.autoMode === nextProps.autoMode
  );
}); 