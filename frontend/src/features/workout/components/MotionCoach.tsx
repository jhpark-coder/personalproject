import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pose } from '@mediapipe/pose';
import './MotionCoach.css';
import '@components/ui/styles/pose-detection.css';

type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise';

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
}

const MotionCoach: React.FC<MotionCoachProps> = ({ exerciseType = 'squat' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(exerciseType);

  const [isDetecting, setIsDetecting] = useState(false);
  const [pose, setPose] = useState<any>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: exerciseType,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // 운동별 상태(히스테리시스)
  const stateRef = useRef<{ phase: 'up' | 'down'; count: number }>({ phase: 'up', count: 0 });

  // 디버그 로그 패널 상태
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const addLog = useCallback((msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(line);
    setLogs(prev => [...prev.slice(-300), line]);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // MediaPipe 결과 처리 (선 선언)
  const onResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출', { points: results.poseLandmarks.length });
        firstDetectionLogged.current = true;
      }
      const landmarks = results.poseLandmarks;
      const analysis = analyzeExercise(landmarks, selectedExercise);
      setExerciseAnalysis(analysis);
      drawPoseOnCanvas(landmarks);
    } else {
      if (!firstDetectionLogged.current && Math.random() < 0.1) {
        addLog('아직 포즈 미검출(프레임)');
      }
    }
  }, [addLog, selectedExercise]);

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
  }, [pose, isDetecting, addLog, resetPose]);

  // 운동 분석/카운트 분기
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

  // 스쿼트 카운트
  const analyzeSquatWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    if (!(kneeL && kneeR && hipL && hipR && ankleL && ankleR)) return baseNA('squat');
    const angleL = calculateAngle(hipL, kneeL, ankleL);
    const angleR = calculateAngle(hipR, kneeR, ankleR);
    const kneeAngle = avg(angleL, angleR);
    const isDown = kneeAngle <= 110;
    const isUp = kneeAngle >= 155;
    const was = stateRef.current.phase;
    if (was === 'up' && isDown) stateRef.current.phase = 'down';
    if (was === 'down' && isUp) { stateRef.current.phase = 'up'; stateRef.current.count += 1; }
    return { exerciseType: 'squat', currentCount: stateRef.current.count, isCorrectForm: isDown || isUp, feedback: isDown ? '좋아요, 아래 구간' : '위 구간', confidence: Math.min(kneeL.visibility || 0, kneeR.visibility || 0) };
  }, []);

  // 런지 카운트(전/후 다리 최소 무릎각 기준)
  const analyzeLungeWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const kneeL = lm[LEFT_KNEE], kneeR = lm[RIGHT_KNEE];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    if (!(hipL && hipR && kneeL && kneeR && ankleL && ankleR)) return baseNA('lunge');
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

  // 푸시업 카운트(팔꿈치 각도)
  const analyzePushupWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const shL = lm[LEFT_SHOULDER], shR = lm[RIGHT_SHOULDER];
    const elL = lm[LEFT_ELBOW], elR = lm[RIGHT_ELBOW];
    const wrL = lm[LEFT_WRIST], wrR = lm[RIGHT_WRIST];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    if (!(shL && shR && elL && elR && wrL && wrR && hipL && hipR && ankleL && ankleR)) return baseNA('pushup');
    const elbowL = calculateAngle(shL, elL, wrL);
    const elbowR = calculateAngle(shR, elR, wrR);
    const elbow = avg(elbowL, elbowR);
    const bodyL = calculateAngle(shL, hipL, ankleL);
    const bodyR = calculateAngle(shR, hipR, ankleR);
    const bodyStraight = avg(bodyL, bodyR);
    const isDown = elbow <= 90;
    const isUp = elbow >= 160;
    const goodForm = bodyStraight >= 160;
    const was = stateRef.current.phase;
    if (was === 'up' && isDown) stateRef.current.phase = 'down';
    if (was === 'down' && isUp) { stateRef.current.phase = 'up'; stateRef.current.count += 1; }
    return { exerciseType: 'pushup', currentCount: stateRef.current.count, isCorrectForm: goodForm, feedback: goodForm ? (isDown ? '바닥 근처' : '완전 펴기') : '몸통을 일직선으로 유지', confidence: Math.min(elL.visibility || 0, elR.visibility || 0) };
  }, []);

  // 플랭크 판정(정적)
  const analyzePlankWithJudge = useCallback((lm: any[]): ExerciseAnalysis => {
    const shL = lm[LEFT_SHOULDER], shR = lm[RIGHT_SHOULDER];
    const elL = lm[LEFT_ELBOW], elR = lm[RIGHT_ELBOW];
    const hipL = lm[LEFT_HIP], hipR = lm[RIGHT_HIP];
    if (!(shL && shR && elL && elR && hipL && hipR)) return baseNA('plank');
    const left = calculateAngle(shL, elL, hipL);
    const right = calculateAngle(shR, elR, hipR);
    const arm = avg(left, right);
    const isPlank = arm >= 80 && arm <= 100;
    return { exerciseType: 'plank', currentCount: stateRef.current.count, isCorrectForm: isPlank, feedback: isPlank ? '좋아요, 유지하세요' : '팔 각도 90° 근처 유지', confidence: Math.min(elL.visibility || 0, elR.visibility || 0) };
  }, []);

  // 카프 레이즈(발끝-발목 y차 증가)
  const analyzeCalfRaiseWithCount = useCallback((lm: any[]): ExerciseAnalysis => {
    const ankleL = lm[LEFT_ANKLE], ankleR = lm[RIGHT_ANKLE];
    const toeL = lm[LEFT_FOOT_INDEX], toeR = lm[RIGHT_FOOT_INDEX];
    if (!(ankleL && ankleR && toeL && toeR)) return baseNA('calf_raise');
    const dyL = (ankleL.y - toeL.y);
    const dyR = (ankleR.y - toeR.y);
    const lift = avg(dyL, dyR);
    const isUp = lift > 0.03; // 발뒤꿈치가 발끝보다 올라옴(상대 좌표)
    const isDown = lift < 0.01;
    const was = stateRef.current.phase;
    if (was === 'up' && isDown) stateRef.current.phase = 'down';
    if (was === 'down' && isUp) { stateRef.current.phase = 'up'; stateRef.current.count += 1; }
    return { exerciseType: 'calf_raise', currentCount: stateRef.current.count, isCorrectForm: true, feedback: isUp ? '상승' : '하강', confidence: Math.min(ankleL.visibility || 0, ankleR.visibility || 0) };
  }, []);

  const baseNA = useCallback((type: string): ExerciseAnalysis => ({ exerciseType: type, currentCount: stateRef.current.count, isCorrectForm: false, feedback: '랜드마크 부족', confidence: 0 }), []);

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
    stateRef.current = { phase: 'up', count: 0 };
    setExerciseAnalysis(a => ({ ...a, exerciseType: selectedExercise, currentCount: 0 }));
  }, [selectedExercise]);

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
        <div className="analysis-content">
          <p><strong>운동 유형:</strong> {exerciseAnalysis.exerciseType || '없음'}</p>
          <p><strong>카운트:</strong> {exerciseAnalysis.currentCount}</p>
          <p><strong>자세:</strong> {exerciseAnalysis.isCorrectForm ? '올바름' : '수정 필요'}</p>
          <p><strong>신뢰도:</strong> {(exerciseAnalysis.confidence * 100).toFixed(1)}%</p>
          <p><strong>피드백:</strong> {exerciseAnalysis.feedback}</p>
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

export default MotionCoach; 