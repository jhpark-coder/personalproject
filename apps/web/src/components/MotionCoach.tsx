import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pose } from '@mediapipe/pose';
import './MotionCoach.css';
import './pose-detection/PoseDetector.css';
import {
  analyzeExercise,
  createExerciseState,
  POSE_INDICES,
  type ExerciseAnalysis,
  type ExerciseState,
  type ExerciseType,
  type PoseLandmark,
} from '../features/motion/lib/exerciseAnalysis';
import { useMotionSpeechCoach } from '../features/motion/hooks/useMotionSpeechCoach';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';
const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [POSE_INDICES.LEFT_SHOULDER, POSE_INDICES.RIGHT_SHOULDER],
  [POSE_INDICES.LEFT_SHOULDER, POSE_INDICES.LEFT_ELBOW],
  [POSE_INDICES.RIGHT_SHOULDER, POSE_INDICES.RIGHT_ELBOW],
  [POSE_INDICES.LEFT_ELBOW, POSE_INDICES.LEFT_WRIST],
  [POSE_INDICES.RIGHT_ELBOW, POSE_INDICES.RIGHT_WRIST],
  [POSE_INDICES.LEFT_SHOULDER, POSE_INDICES.LEFT_HIP],
  [POSE_INDICES.RIGHT_SHOULDER, POSE_INDICES.RIGHT_HIP],
  [POSE_INDICES.LEFT_HIP, POSE_INDICES.RIGHT_HIP],
  [POSE_INDICES.LEFT_HIP, POSE_INDICES.LEFT_KNEE],
  [POSE_INDICES.RIGHT_HIP, POSE_INDICES.RIGHT_KNEE],
  [POSE_INDICES.LEFT_KNEE, POSE_INDICES.LEFT_ANKLE],
  [POSE_INDICES.RIGHT_KNEE, POSE_INDICES.RIGHT_ANKLE],
];

interface PoseResults {
  poseLandmarks?: PoseLandmark[];
}

interface MediaErrorLike {
  message?: string;
  name?: string;
}

interface MotionCoachProps {
  exerciseType?: ExerciseType;
}

const MotionCoach: React.FC<MotionCoachProps> = ({ exerciseType = 'squat' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);

  const [isDetecting, setIsDetecting] = useState(false);
  const [pose, setPose] = useState<Pose | null>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: exerciseType,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // 운동별 상태(히스테리시스)
  const stateRef = useRef<ExerciseState>(createExerciseState());

  // 디버그 로그 패널 상태
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const addLog = useCallback((msg: string, data?: unknown) => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(line);
    setLogs(prev => [...prev.slice(-300), line]);
  }, []);
  const speechCoach = useMotionSpeechCoach({
    analysis: exerciseAnalysis,
    exerciseType,
    isDetecting,
  });

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = useCallback((landmarks: PoseLandmark[]) => {
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

    SKELETON_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (
        startPoint &&
        endPoint &&
        (startPoint.visibility || 0) > visibilityThreshold &&
        (endPoint.visibility || 0) > visibilityThreshold
      ) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });
  }, []);

  // MediaPipe 결과 처리
  const onResults = useCallback((results: PoseResults) => {
    if (results.poseLandmarks && results.poseLandmarks.length) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출', { points: results.poseLandmarks.length });
        firstDetectionLogged.current = true;
      }
      const landmarks = results.poseLandmarks;
      const analysis = analyzeExercise(landmarks, exerciseType, stateRef.current);
      setExerciseAnalysis(analysis);
      drawPoseOnCanvas(landmarks);
    } else {
      if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 포즈 미검출(프레임)');
      }
    }
  }, [addLog, drawPoseOnCanvas, exerciseType]);

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
      setPose(instance);
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
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'camera' } as PermissionDescriptor);
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
      const cams = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({ label: device.label, deviceId: device.deviceId }));
      addLog('비디오 장치', cams);
    } catch (e) {
      addLog('장치 열거 실패', { error: String(e) });
    }
  }, [addLog]);

  // getUserMedia 에러 해석
  const handleGumError = useCallback((err: unknown, facingModeTried: string) => {
    const mediaError = err as MediaErrorLike;
    const name = mediaError.name || 'UnknownError';
    const msg = mediaError.message || String(err);
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
    addLog('보안 컨텍스트', { isSecureContext: window.isSecureContext, protocol: window.location.protocol });

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
        stateRef.current = createExerciseState();
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

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Pose 재초기화(에러 복구)
  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 시도');
    const instance = createPose();
    setPose(instance);
  }, [addLog, createPose]);

  // RAF 기반 감지 루프
  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!pose || !video || !isDetecting) {
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
        await pose.send({ image: video });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        const msg = String(message);
        addLog('포즈 처리 에러', { error: msg });
        if (msg.includes('memory access out of bounds')) {
          resetPose();
        }
      } finally {
        processingRef.current = false;
      }
    }
    rafId.current = requestAnimationFrame(() => loop());
  }, [pose, isDetecting, addLog, resetPose]);

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: window.location.href
    });
    initializeMediaPipe();
    // RAF 루프 시작
    rafId.current = requestAnimationFrame(() => loop());
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [initializeMediaPipe, addLog, loop]);

  // 뷰포트 변경 시 캔버스 재동기화
  useEffect(() => {
    const onResize = () => syncCanvasToVideo();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasToVideo]);

  // 운동 선택 변경 시 상태 초기화
  useEffect(() => {
    stateRef.current = createExerciseState();
    setExerciseAnalysis((prev) => ({ ...prev, exerciseType, currentCount: 0 }));
  }, [exerciseType]);

  return (
    <div className="motion-coach">
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
        <button 
          onClick={startCamera}
          className="start-button"
          disabled={isDetecting}
        >
          {isDetecting ? '감지 중...' : '카메라 시작'}
        </button>
      </div>

      <div className="analysis-panel">
        <h3>운동 분석</h3>
        <div className="speech-controls">
          <button
            type="button"
            className="speech-toggle"
            onClick={() => speechCoach.setIsEnabled((prev) => !prev)}
            disabled={!speechCoach.isSupported}
          >
            {speechCoach.isEnabled ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
          </button>
          <button
            type="button"
            className="speech-stop"
            onClick={speechCoach.stop}
            disabled={!speechCoach.isSupported}
          >
            음성 정지
          </button>
          <div className="speech-status">
            {speechCoach.isSupported ? `음성: ${speechCoach.voiceLabel}` : '브라우저 음성 미지원'}
          </div>
        </div>
        <div className="analysis-content">
          <p><strong>운동 유형:</strong> {exerciseAnalysis.exerciseType || '없음'}</p>
          <p><strong>카운트:</strong> {exerciseAnalysis.currentCount}</p>
          <p><strong>자세:</strong> {exerciseAnalysis.isCorrectForm ? '올바름' : '수정 필요'}</p>
          <p><strong>신뢰도:</strong> {(exerciseAnalysis.confidence * 100).toFixed(1)}%</p>
          <p><strong>피드백:</strong> {exerciseAnalysis.feedback}</p>
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

export default MotionCoach; 
