import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bug, Camera, Mic, MicOff, RotateCcw, Square } from 'lucide-react';
import { Pose } from '@mediapipe/pose';
import {
  analyzeExercise,
  createExerciseState,
  EXERCISE_LABELS,
  POSE_INDICES,
  type ExerciseAnalysis,
  type ExerciseState,
  type ExerciseType,
  type PoseLandmark,
} from '../features/motion/lib/exerciseAnalysis';
import { useMotionSpeechCoach } from '../features/motion/hooks/useMotionSpeechCoach';
import { logger } from '../shared/lib/logger';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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

const initialAnalysis = (exerciseType: ExerciseType): ExerciseAnalysis => ({
  exerciseType,
  currentCount: 0,
  isCorrectForm: false,
  feedback: '카메라를 켜고 운동을 시작하세요.',
  confidence: 0,
});

const MotionCoach: React.FC<MotionCoachProps> = ({ exerciseType = 'squat' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef(false);
  const firstDetectionLogged = useRef(false);
  const stateRef = useRef<ExerciseState>(createExerciseState());

  const [isDetecting, setIsDetecting] = useState(false);
  const [pose, setPose] = useState<Pose | null>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>(initialAnalysis(exerciseType));
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);

  const addLog = useCallback((msg: string, data?: unknown) => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    logger.debug(line);
    setLogs((prev) => [...prev.slice(-300), line]);
  }, []);

  const speechCoach = useMotionSpeechCoach({
    analysis: exerciseAnalysis,
    exerciseType,
    isDetecting,
  });
  const exerciseLabel = exerciseAnalysis.exerciseType
    ? EXERCISE_LABELS[exerciseAnalysis.exerciseType]
    : '없음';

  const drawPoseOnCanvas = useCallback((landmarks: PoseLandmark[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;

    const visibilityThreshold = 0.3;
    landmarks.forEach((landmark) => {
      if ((landmark.visibility || 0) > visibilityThreshold) {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
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

  const onResults = useCallback(
    (results: PoseResults) => {
      if (results.poseLandmarks && results.poseLandmarks.length) {
        if (!firstDetectionLogged.current) {
          addLog('첫 자세 감지', { points: results.poseLandmarks.length });
          firstDetectionLogged.current = true;
        }
        const analysis = analyzeExercise(results.poseLandmarks, exerciseType, stateRef.current);
        setExerciseAnalysis(analysis);
        drawPoseOnCanvas(results.poseLandmarks);
      } else if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 자세가 감지되지 않았습니다.');
      }
    },
    [addLog, drawPoseOnCanvas, exerciseType],
  );

  const createPose = useCallback(() => {
    const instance = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`,
    });
    instance.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.3,
      selfieMode: true,
    });
    instance.onResults(onResults);
    return instance;
  }, [onResults]);

  const initializeMediaPipe = useCallback(async () => {
    try {
      addLog('MediaPipe Pose 모델 로드 시작', { version: MEDIAPIPE_POSE_VERSION });
      setPose(createPose());
      addLog('MediaPipe Pose 모델 로드 완료');
    } catch (error) {
      addLog('MediaPipe 모델 로드 실패', { error: String(error) });
    }
  }, [addLog, createPose]);

  const syncCanvasToVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    addLog('캔버스 동기화', { videoWidth: width, videoHeight: height, dpr: window.devicePixelRatio });
  }, [addLog]);

  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'camera' } as PermissionDescriptor);
        addLog('카메라 권한 상태', { state: status.state });
      } else {
        addLog('permissions API 미지원');
      }
    } catch (error) {
      addLog('권한 상태 조회 실패', { error: String(error) });
    }
  }, [addLog]);

  const logDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({ label: device.label, deviceId: device.deviceId }));
      addLog('비디오 장치', cameras);
    } catch (error) {
      addLog('장치 열거 실패', { error: String(error) });
    }
  }, [addLog]);

  const handleGumError = useCallback(
    (err: unknown, facingModeTried: string) => {
      const mediaError = err as MediaErrorLike;
      const name = mediaError.name || 'UnknownError';
      const message = mediaError.message || String(err);
      addLog('getUserMedia 실패', { name, message, facingModeTried });
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        addLog('카메라 권한이 거부되었습니다. 브라우저 사이트 권한에서 카메라를 허용하세요.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        addLog('카메라 장치를 찾지 못했습니다. 다른 카메라 방향을 시도합니다.');
      } else if (name === 'NotReadableError') {
        addLog('다른 앱이 카메라를 사용 중일 수 있습니다.');
      }
    },
    [addLog],
  );

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      addLog('브라우저가 카메라 API를 지원하지 않습니다.');
      return;
    }

    await checkPermissions();
    await logDevices();
    addLog('보안 컨텍스트', { isSecureContext: window.isSecureContext, protocol: window.location.protocol });

    const tryOpen = async (facingMode: 'user' | 'environment') => {
      addLog('카메라 시작 시도', { facingMode });
      return navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 480 },
          height: { ideal: 360, min: 360 },
          facingMode,
          frameRate: { ideal: 24 },
        },
      });
    };

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await tryOpen('user');
      } catch (firstError) {
        handleGumError(firstError, 'user');
        try {
          stream = await tryOpen('environment');
        } catch (secondError) {
          handleGumError(secondError, 'environment');
          throw secondError;
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
        addLog('카메라 시작 완료');
      }
    } catch (error) {
      addLog('카메라 시작 최종 실패', { error: String(error) });
    }
  }, [addLog, checkPermissions, handleGumError, logDevices, syncCanvasToVideo]);

  const stopCamera = useCallback(() => {
    const videoEl = videoRef.current;
    const stream = (videoEl?.srcObject as MediaStream | null) || null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (videoEl) videoEl.srcObject = null;
    setIsDetecting(false);
    addLog('카메라 정지');
  }, [addLog]);

  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 시도');
    setPose(createPose());
  }, [addLog, createPose]);

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!pose || !video || !isDetecting) return;

    if (!video.videoWidth || !video.videoHeight) {
      rafId.current = requestAnimationFrame(() => {
        void loop();
      });
      return;
    }

    if (!processingRef.current) {
      processingRef.current = true;
      try {
        await pose.send({ image: video });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        addLog('자세 처리 오류', { error: message });
        if (message.includes('memory access out of bounds')) resetPose();
      } finally {
        processingRef.current = false;
      }
    }
    rafId.current = requestAnimationFrame(() => {
      void loop();
    });
  }, [addLog, isDetecting, pose, resetPose]);

  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: window.location.href,
    });
  }, [addLog]);

  useEffect(() => {
    void initializeMediaPipe();
  }, [initializeMediaPipe]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(() => {
      void loop();
    });
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [loop]);

  useEffect(() => {
    const onResize = () => syncCanvasToVideo();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasToVideo]);

  useEffect(() => {
    stateRef.current = createExerciseState();
    setExerciseAnalysis((prev) => ({ ...prev, exerciseType, currentCount: 0 }));
  }, [exerciseType]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden border-white/80 bg-slate-950 text-white shadow-sm">
        <div className="relative aspect-video bg-slate-900" onClick={() => { if (!isDetecting) void startCamera(); }}>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" onLoadedMetadata={syncCanvasToVideo} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" width={640} height={480} />
          {!isDetecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/75 text-center">
              <Camera className="size-9" />
              <Button type="button" onClick={() => void startCamera()}>
                카메라 시작
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950 p-3">
          <Badge variant={isDetecting ? 'success' : 'secondary'}>{isDetecting ? '감지 중' : '대기 중'}</Badge>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void startCamera()} disabled={isDetecting}>
              <Camera className="size-4" />
              시작
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={stopCamera} disabled={!isDetecting}>
              <Square className="size-4" />
              정지
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>운동 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">운동 유형</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{exerciseLabel}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">카운트</div>
                <div className="mt-1 text-lg font-bold text-primary">{exerciseAnalysis.currentCount}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">자세</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{exerciseAnalysis.isCorrectForm ? '올바름' : '수정 필요'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">신뢰도</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{(exerciseAnalysis.confidence * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm leading-6 text-slate-700">{exerciseAnalysis.feedback}</div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>음성 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => speechCoach.setIsEnabled((prev) => !prev)} disabled={!speechCoach.isSupported}>
                {speechCoach.isEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {speechCoach.isEnabled ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
              </Button>
              <Button type="button" variant="secondary" onClick={speechCoach.stop} disabled={!speechCoach.isSupported}>
                <Square className="size-4" />
                음성 정지
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {speechCoach.isSupported ? `음성: ${speechCoach.voiceLabel}` : '브라우저가 음성 안내를 지원하지 않습니다.'}
            </p>
          </CardContent>
        </Card>

        <Button type="button" variant="outline" className="w-full" onClick={() => setDebugOpen((prev) => !prev)}>
          <Bug className="size-4" />
          {debugOpen ? '로그 닫기' : '로그 열기'}
        </Button>
        {debugOpen && (
          <Card className="border-slate-200 bg-slate-950 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <RotateCcw className="size-4" />
                디버그 로그
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5">{logs.join('\n')}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default MotionCoach;
