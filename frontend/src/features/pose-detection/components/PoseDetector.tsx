/* eslint-disable @typescript-eslint/no-use-before-define, no-use-before-define */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { useUser } from '@context/UserContext';
import NavigationBar from '@components/ui/NavigationBar';
import ChatButton from '@features/chat/components/ChatButton';
import '@components/ui/styles/pose-detection.css';

// 새로운 분석기 시스템 import
import {
  SquatAnalyzer,
  LungeAnalyzer,
  PushupAnalyzer,
  PlankAnalyzer,
  CalfRaiseAnalyzer,
  BurpeeAnalyzer,
  MountainClimberAnalyzer,
  type ExerciseAnalysis
} from '../analyzers';

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// 운동 타입 확장
type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 
                   'burpee' | 'mountain_climber';

interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

interface PoseData {
  keypoints: PoseKeypoint[];
  score?: number;
}

// ExerciseAnalysis는 이제 분석기에서 import됨

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

const PoseDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);
  const sendCountRef = useRef<number>(0);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');

  const [isDetecting, setIsDetecting] = useState(false);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [vision, setVision] = useState<any>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: 'squat',
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

  // 분석기 인스턴스들을 카테고리별로 그룹화
  const analyzers = useMemo(() => ({
    squat: new SquatAnalyzer(),
    lunge: new LungeAnalyzer(),
    pushup: new PushupAnalyzer(),
    plank: new PlankAnalyzer(),
    calf_raise: new CalfRaiseAnalyzer(),
    burpee: new BurpeeAnalyzer(),
    mountain_climber: new MountainClimberAnalyzer()
  }), []);

  // 운동 분석 함수 단순화
  const analyzeExercise = useCallback((landmarks: any[], type: ExerciseType): ExerciseAnalysis => {
    const analyzer = analyzers[type];
    if (analyzer) {
      return analyzer.analyze(landmarks);
    }
    
    return {
      exerciseType: type,
      currentCount: stateRef.current.count,
      isCorrectForm: false,
      feedback: '분석기를 찾을 수 없습니다',
      confidence: 0
    };
  }, [analyzers]);

  // 각도 계산/도우미
  const calculateAngle = (p1: any, p2: any, p3: any): number => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return Math.abs(angle * 180 / Math.PI);
  };
  const avg = (a: number, b: number) => (a + b) / 2;

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = useCallback((landmarks: any[]) => {
    addLog('캔버스 그리기 시도', { numLandmarks: landmarks.length });
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      addLog('캔버스 또는 컨텍스트 없음', { hasCanvas: !!canvas, hasCtx: !!ctx });
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    const visibilityThreshold = 0.1;
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

  // MediaPipe 결과 처리 (강화된 진단)
  const onResults = useCallback((results: any) => {
    addLog('onResults 호출됨', {
      hasResults: !!results,
      hasLandmarks: !!(results?.poseLandmarks),
      landmarkCount: results?.poseLandmarks?.length || 0
    });

    if (results?.poseLandmarks && results.poseLandmarks.length > 0) {
      if (!firstDetectionLogged.current) {
        addLog('🎯 첫 포즈 검출 성공!', {
          points: results.poseLandmarks.length,
          firstPoint: results.poseLandmarks[0]
        });
        firstDetectionLogged.current = true;
      }

      const landmarks = results.poseLandmarks;
      try {
        const analysis = analyzeExercise(landmarks, selectedExercise);
        addLog('분석 완료', { count: analysis.currentCount, confidence: analysis.confidence });
        setExerciseAnalysis(analysis);
        drawPoseOnCanvas(landmarks);
      } catch (analysisError) {
        addLog('분석 오류', { error: String(analysisError) });
      }
    } else {
      // 더 자세한 진단 정보
      addLog('포즈 미검출', {
        resultsType: typeof results,
        hasResults: !!results,
        hasLandmarks: !!(results?.poseLandmarks),
        landmarkCount: results?.poseLandmarks?.length || 0
      });
    }
  }, [addLog, selectedExercise, analyzeExercise, drawPoseOnCanvas]);

  // PoseLandmarker 인스턴스 생성 (새로운 공식 API)
  const createPose = useCallback(async () => {
    try {
      addLog('MediaPipe Tasks Vision 초기화 시작');
      
      // FilesetResolver로 WASM 파일 로딩
      const visionInstance = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      setVision(visionInstance);
      addLog('WASM 파일 로딩 완료');
      
      // PoseLandmarker 생성
      const poseLandmarkerInstance = await PoseLandmarker.createFromOptions(
        visionInstance,
        {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        }
      );
      
      setPoseLandmarker(poseLandmarkerInstance);
      addLog('✅ PoseLandmarker 초기화 완료');
      
      return poseLandmarkerInstance;
    } catch (error) {
      addLog('❌ PoseLandmarker 초기화 실패', { error: String(error) });
      console.error('MediaPipe 초기화 오류:', error);
      return null;
    }
  }, [addLog]);


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

  // PoseLandmarker 재초기화(에러 복구)
  const resetPose = useCallback(async () => {
    addLog('PoseLandmarker 재초기화 시도');
    try {
      const instance = await createPose();
      addLog('✅ PoseLandmarker 재초기화 성공');
    } catch (error) {
      addLog('❌ PoseLandmarker 재초기화 실패', { error: String(error) });
    }
  }, [addLog, createPose]);

  // RAF 기반 감지 루프 (강화된 진단)
  const loop = useCallback(async () => {
    const video = videoRef.current;
    
    // PoseLandmarker 인스턴스 확인
    if (!poseLandmarker) {
      addLog('루프: poseLandmarker 인스턴스 없음');
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }
    
    if (!video) {
      addLog('루프: video 엘리먼트 없음');
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }
    
    if (!isDetecting) {
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      addLog('루프: 비디오 크기 정보 없음', { 
        width: video.videoWidth, 
        height: video.videoHeight,
        readyState: video.readyState 
      });
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    if (!processingRef.current) {
      processingRef.current = true;
      try {
        // 첫 5회만 로깅 (성능 최적화)
        if (sendCountRef.current < 5) {
          addLog('PoseLandmarker 검출 시도', { 
            count: ++sendCountRef.current,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            currentTime: video.currentTime 
          });
        }
        
        // 새로운 API 사용
        const startTimeMs = performance.now();
        const results = poseLandmarker.detectForVideo(video, startTimeMs);
        
        // 결과를 기존 onResults 함수로 전달 (호환성 유지)
        if (results && results.landmarks && results.landmarks.length > 0) {
          onResults({
            poseLandmarks: results.landmarks[0],
            poseWorldLandmarks: results.worldLandmarks?.[0] || null,
            segmentationMask: null
          });
        } else {
          onResults({ poseLandmarks: null, poseWorldLandmarks: null, segmentationMask: null });
        }
        
        if (sendCountRef.current === 5) {
          addLog('PoseLandmarker 검출 완료 (이후 로깅 생략)');
        }
      } catch (e: any) {
        const msg = String(e?.message || e);
        addLog('포즈 처리 에러', { 
          error: msg,
          errorType: e?.constructor?.name,
          videoState: video.readyState
        });
      } finally {
        processingRef.current = false;
      }
    }
    rafId.current = requestAnimationFrame(() => loop());
  }, [poseLandmarker, isDetecting, addLog, onResults]);

  // 불필요한 stableFunctions 제거됨

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: location.href
    });
    
    createPose();
    
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [addLog, createPose]);
  
  // RAF 루프 시작 - poseLandmarker가 준비되면 자동으로 시작
  useEffect(() => {
    if (!poseLandmarker) return;
    
    rafId.current = requestAnimationFrame(loop);
    
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [poseLandmarker, loop]);

  // 뷰포트 변경 시 캔버스 재동기화
  useEffect(() => {
    const onResize = () => syncCanvasToVideo();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasToVideo]);

  // 운동 선택 변경 시 상태 초기화 및 Pose 콜백 업데이트
  useEffect(() => {
    stateRef.current = { phase: 'up', count: 0 };
    setExerciseAnalysis(a => ({ ...a, exerciseType: selectedExercise, currentCount: 0 }));
    firstDetectionLogged.current = false;
    
    // Pose 인스턴스가 있으면 onResults 콜백을 새로 설정
    if (pose) {
      pose.onResults(onResults);
    }
  }, [selectedExercise, pose, onResults]);

  return (
    <div className="pose-detector">
      {/* 운동 선택 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value as ExerciseType)}>
          <option value="squat">스쿼트</option>
          <option value="lunge">런지</option>
          <option value="pushup">푸시업</option>
          <option value="plank">플랭크</option>
          <option value="calf_raise">카프 레이즈</option>
          <option value="burpee">버피</option>
          <option value="mountain_climber">마운틴 클라이머</option>
        </select>
      </div>

      <div className="video-container" onClick={() => { if (!isDetecting) startCamera(); }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="pose-video"
        />
        <canvas
          ref={canvasRef}
          className="pose-canvas"
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

export default PoseDetector;