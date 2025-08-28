import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { Pose } from '@mediapipe/pose';
import { hybridTTSService } from '@services/hybridTTSService';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import './MotionCoach.css';
import '@components/ui/styles/pose-detection.css';

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
  duration: number;
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

interface OptimizedMotionCoachProps {
  exerciseType?: ExerciseType;
  onSessionComplete?: (sessionData: any) => void;
  targetSets?: number;
  targetReps?: number;
  currentSet?: number;
  onSetComplete?: (reps: number, formScore: number, corrections: string[]) => void;
  autoMode?: boolean;
}

const OptimizedMotionCoach: React.FC<OptimizedMotionCoachProps> = ({ 
  exerciseType = 'squat', 
  onSessionComplete,
  targetSets = 3,
  targetReps = 10,
  currentSet = 1,
  onSetComplete,
  autoMode = false
}) => {
  const navigate = useNavigate();
  
  // 1. useRef를 사용하여 리렌더링을 유발하지 않는 값들 관리
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);
  const poseRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastFeedbackTimeRef = useRef<number>(0);
  const lastTTSMessageRef = useRef<string>('');
  const stateRef = useRef<{ phase: 'up' | 'down'; count: number }>({ phase: 'up', count: 0 });
  const performanceHistoryRef = useRef<ExercisePerformanceData[]>([]);
  const formCorrectionsRef = useRef<string[]>([]);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // 2. 상태는 최소한으로 유지 (UI 렌더링에만 필요한 것들)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(exerciseType);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);

  // 3. 디버그 로그 함수 (성능 최적화)
  const addLog = useCallback((msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(line);
    
    // 로그 상태 업데이트를 배치로 처리하여 리렌더링 최소화
    setLogs(prev => {
      const newLogs = [...prev.slice(-299), line];
      return newLogs;
    });
  }, []);

  // 4. TTS 피드백 최적화 (중복 호출 방지 및 큐 관리)
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

  // 5. 세션 시작 함수
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

  // 6. 세션 종료 함수
  const endWorkoutSession = useCallback(async () => {
    if (!isSessionActive || !sessionStartTimeRef.current) {
      return;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000);
    
    // 평균 자세 점수 계산
    const avgFormScore = performanceHistoryRef.current.length > 0 
      ? performanceHistoryRef.current.reduce((sum, p) => sum + p.formScore, 0) / performanceHistoryRef.current.length
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

  // 7. 퍼포먼스 데이터 기록 (ref 사용으로 리렌더링 방지)
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
        .filter(p => p.timestamp > sessionStartTimeRef.current!)
        .map(p => p.formScore);
      const averageFormScore = setFormScores.length > 0 
        ? (setFormScores.reduce((sum, score) => sum + score, 0) / setFormScores.length) * 100
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

  // 8. 칼로리 추정 함수
  const estimateCalories = useCallback((exerciseType: string, reps: number, duration: number): number => {
    const metValues: Record<string, number> = {
      'squat': 5.0,
      'pushup': 3.8,
      'lunge': 4.0,
      'plank': 3.5,
      'calf_raise': 2.8
    };

    const met = metValues[exerciseType] || 4.0;
    const weightKg = 70;
    const intensityFactor = Math.min(1.3, 1.0 + (reps / 100));
    const calories = met * weightKg * (duration / 3600) * intensityFactor;
    
    return Math.round(Math.max(1, calories));
  }, []);

  // 9. 백엔드로 운동 데이터 전송
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
        performanceHistory: performanceHistoryRef.current.map(p => ({
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

  // 10. 웹캠 시작 (전면 → 실패 시 후면 폴백)
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 480 },
          height: { ideal: 360, min: 360 },
          facingMode: 'user',
          frameRate: { ideal: 24 }
        }
      });

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        syncCanvasToVideo();
        setIsDetecting(true);
        stateRef.current = { phase: 'up', count: 0 };
        firstDetectionLogged.current = false;
        addLog('✅ 웹캠 시작 완료');
      }
    } catch (error) {
      addLog('❌ 웹캠 시작 실패', { error: String(error) });
    }
  }, [addLog]);

  // 11. 웹캠 정지
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

  // 12. Pose 재초기화(에러 복구)
  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 시도');
    const instance = createPose();
    poseRef.current = instance;
  }, [addLog]);

  // 13. RAF 기반 감지 루프 (성능 최적화)
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

  // 14. 운동 분석/카운트 분기
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

  // 15. 각도 계산/도우미
  const calculateAngle = (p1: any, p2: any, p3: any): number => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return Math.abs(angle * 180 / Math.PI);
  };
  const avg = (a: number, b: number) => (a + b) / 2;

  // 16. 스쿼트 카운트
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

  // 17. 런지 카운트
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

  // 18. 푸시업 카운트
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

  // 19. 플랭크 판정
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

  // 20. 카프 레이즈
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

  // 21. 캔버스에 포즈 그리기 (React state 업데이트 없이 직접 그리기)
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
      [RIGHT_KNEE, RIGHT_ANKLE],
      [LEFT_ANKLE, LEFT_FOOT_INDEX],
      [RIGHT_ANKLE, RIGHT_FOOT_INDEX]
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

  // 22. Pose 인스턴스 생성
  const createPose = useCallback(() => {
    const instance = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`
    });
    instance.setOptions({
      modelComplexity: 0, // 성능 최적화를 위해 낮은 복잡도 사용
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.3,
      selfieMode: true
    });
    instance.onResults(onResults);
    return instance;
  }, []);

  // 23. MediaPipe 초기화
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

  // 24. 캔버스 크기를 비디오 해상도와 동기화
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

  // 25. MediaPipe 결과 처리 (성능 최적화)
  const onResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출', { points: results.poseLandmarks.length });
        firstDetectionLogged.current = true;
      }
      const landmarks = results.poseLandmarks;
      const analysis = analyzeExercise(landmarks, selectedExercise);
      
      // 퍼포먼스 데이터 기록 (ref 사용으로 리렌더링 방지)
      recordPerformance(analysis);
      
      // 캔버스에 직접 그리기 (React state 업데이트 없음)
      drawPoseOnCanvas(landmarks);
    } else {
      if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 포즈 미검출(프레임)');
      }
    }
  }, [addLog, selectedExercise, recordPerformance, analyzeExercise, drawPoseOnCanvas]);

  // 26. useEffect를 사용한 생명주기 관리 (최적화)
  useEffect(() => {
    // 컴포넌트 마운트 시 한 번만 실행
    startCamera();
    initializeMediaPipe();
    
    // 클린업 함수: 컴포넌트 언마운트 시 실행
    return () => {
      console.log("Cleaning up OptimizedMotionCoach resources...");
      
      // 웹캠 스트림 정리
      stopCamera();
      
      // MediaPipe 인스턴스 정리
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      
      // RAF 정리
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      
      // 오디오 정리
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      // 전역 음성 합성 정리
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // 의존성 배열이 비어 있으므로 한 번만 실행

  // 27. 웹캠 상태 변경 시 감지 루프 시작/정지
  useEffect(() => {
    if (isDetecting && poseRef.current) {
      loop();
    } else if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, [isDetecting, loop]);

  // 28. 운동 타입 변경 시 상태 초기화
  useEffect(() => {
    setSelectedExercise(exerciseType);
    stateRef.current = { phase: 'up', count: 0 };
    firstDetectionLogged.current = false;
  }, [exerciseType]);

  return (
    <div className="motion-coach">
      <div className="header">
        <h2>AI 모션 코치 - {selectedExercise}</h2>
        <div className="controls">
          <button onClick={startWorkoutSession} disabled={isSessionActive}>
            운동 시작
          </button>
          <button onClick={endWorkoutSession} disabled={!isSessionActive}>
            운동 종료
          </button>
          <button onClick={() => setDebugOpen(!debugOpen)}>
            {debugOpen ? '로그 숨기기' : '로그 보기'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="video-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ display: 'none' }}
          />
          <canvas 
            ref={canvasRef} 
            className="pose-canvas"
            style={{ 
              width: '100%', 
              height: 'auto',
              maxWidth: '640px',
              border: '2px solid #00FF00'
            }}
          />
        </div>

        <div className="workout-info">
          <div className="count-display">
            <h3>현재 횟수: {stateRef.current.count}</h3>
            <p>목표: {targetReps}회</p>
            <p>현재 세트: {currentSet}/{targetSets}</p>
          </div>
          
          <div className="session-status">
            <p>세션 상태: {isSessionActive ? '진행 중' : '대기 중'}</p>
            <p>감지 상태: {isDetecting ? '활성' : '비활성'}</p>
          </div>
        </div>

        {debugOpen && (
          <div className="debug-panel">
            <h4>디버그 로그</h4>
            <div className="logs">
              {logs.map((log, index) => (
                <div key={index} className="log-line">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 29. 메모리 누수 방지를 위한 cleanup 후크 추가
const OptimizedMotionCoachWithCleanup = React.forwardRef<HTMLDivElement, OptimizedMotionCoachProps>((props, ref) => {
  const componentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 전역 정리
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return <OptimizedMotionCoach {...props} />;
});

OptimizedMotionCoachWithCleanup.displayName = 'OptimizedMotionCoachWithCleanup';

// 30. React.memo로 래핑하여 불필요한 리렌더링 방지
export default React.memo(OptimizedMotionCoachWithCleanup);
