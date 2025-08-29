import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pose } from '@mediapipe/pose';
import { hybridTTSService } from '@services/hybridTTSService';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import './MotionCoach.css';
import '@components/ui/styles/pose-detection.css';

// 분석기 import 제거 - 기본 분석 사용

type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 'burpee' | 'mountain_climber';

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
}

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

// 관절점 인덱스 (MediaPipe Pose 33개 포인트)
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

  const addLog = useCallback((msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const logMessage = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-300), logMessage]);
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
      feedback: analysis.feedback
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

  // MediaPipe 결과 처리 (성능 최적화 - React state 업데이트 없음)
  const onResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출', { points: results.poseLandmarks.length });
        firstDetectionLogged.current = true;
      }
      const landmarks = results.poseLandmarks;
      const analysis = analyzeExercise(landmarks, selectedExercise);
      
      // ref에 저장하여 리렌더링 방지
      exerciseAnalysisRef.current = analysis;
      
      // 퍼포먼스 데이터 기록
      recordPerformance(analysis);
      
      // 캔버스에 직접 그리기 (React state 업데이트 없음)
      drawPoseOnCanvas(landmarks);
    } else {
      if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 포즈 미검출(프레임)');
      }
    }
  }, [addLog, selectedExercise, recordPerformance]);

  // Pose 인스턴스 생성
  const createPose = useCallback(() => {
    const instance = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`
    });
    instance.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.3,
      selfieMode: true
    });
    instance.onResults(onResults);
    return instance;
  }, [onResults]);

  // MediaPipe 초기화
  const initializeMediaPipe = useCallback(async () => {
    try {
      addLog('MediaPipe Pose 모델 로드 시작', { version: MEDIAPIPE_POSE_VERSION });
      const instance = createPose();
      poseRef.current = instance;
      addLog('✅ MediaPipe Pose 모델 로드 완료');
    } catch (error) {
      addLog('❌ MediaPipe 모델 로드 실패', { error: String(error) });
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

  const stopCamera = useCallback(() => {
    try {
      const videoEl = videoRef.current;
      const stream = (videoEl?.srcObject as MediaStream | null) || null;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
      setIsDetecting(false);
      addLog('⏹️ 웹캠 정지');
    } catch (e) {
      addLog('웹캠 정지 오류', { error: String(e) });
    }
  }, [addLog]);

  // Pose 재초기화(에러 복구)
  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 시도');
    const instance = createPose();
    poseRef.current = instance;
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

  // 운동 분석/카운트 분기 - 기본 버전으로 복원
  const analyzeExercise = useCallback((landmarks: any[], type: ExerciseType): ExerciseAnalysis => {
    switch (type) {
      case 'squat':
        return analyzeSquatWithCount(landmarks);
      case 'lunge':
        return analyzeLungeWithCount(landmarks);
      case 'pushup':
        return analyzePushupWithCount(landmarks);
      case 'plank':
        return analyzePlankWithJudge(landmarks);
      case 'calf_raise':
        return analyzeCalfRaiseWithCount(landmarks);
      default:
        return { exerciseType: type, currentCount: stateRef.current.count, isCorrectForm: false, feedback: '운동을 선택하세요', confidence: 0 };
    }
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

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = useCallback((landmarks: any[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    const visibilityThreshold = 0.3;
    landmarks.forEach((landmark) => {
      if ((landmark.visibility || 0) > visibilityThreshold) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    const connections = [
      [LEFT_SHOULDER, RIGHT_SHOULDER],
      [LEFT_SHOULDER, LEFT_ELBOW],
      [RIGHT_SHOULDER, RIGHT_ELBOW],
      [LEFT_ELBOW, LEFT_WRIST],
      [RIGHT_ELBOW, RIGHT_WRIST],
      [LEFT_SHOULDER, LEFT_HIP],
      [RIGHT_SHOULDER, RIGHT_HIP],
      [LEFT_HIP, RIGHT_HIP],
      [LEFT_HIP, LEFT_KNEE],
      [RIGHT_HIP, RIGHT_KNEE],
      [LEFT_KNEE, LEFT_ANKLE],
      [RIGHT_KNEE, RIGHT_ANKLE]
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (startPoint && endPoint &&
          (startPoint.visibility || 0) > visibilityThreshold &&
          (endPoint.visibility || 0) > visibilityThreshold) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });
  }, []);

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: location.href
    });
    
    initializeMediaPipe();
    
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [addLog, initializeMediaPipe]);
  
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

  // 운동 선택 변경 시 상태 초기화 및 Pose 콜백 업데이트
  useEffect(() => {
    stateRef.current = { phase: 'up', count: 0 };
    exerciseAnalysisRef.current = { 
      ...exerciseAnalysisRef.current, 
      exerciseType: selectedExercise, 
      currentCount: 0 
    };
    firstDetectionLogged.current = false;
    
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
  
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 전역 정리
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return <MotionCoach {...props} />;
});

MotionCoachWithCleanup.displayName = 'MotionCoachWithCleanup';

// React.memo로 래핑하여 불필요한 리렌더링 방지
export default React.memo(MotionCoachWithCleanup); 