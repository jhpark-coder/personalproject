import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { loadVisionFileset } from '../../../utils/mediapipe';
import { useUser } from '@context/UserContext';
import NavigationBar from '@components/ui/NavigationBar';
import ChatButton from '@features/chat/components/ChatButton';
import { formatKoreaTimeOnly } from '../../../utils/dateUtils';
import { POSE_CONSTANTS } from '../utils/pose-constants';
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
  JumpingJackAnalyzer,
  JumpSquatAnalyzer,
  PullupAnalyzer,
  DeadliftAnalyzer,
  WallSitAnalyzer,
  HighKneesAnalyzer,
  SidePlankAnalyzer,
  BridgeAnalyzer,
  SitupAnalyzer,
  CrunchAnalyzer,
  type ExerciseAnalysis
} from '../analyzers';

const MEDIAPIPE_VERSION = '0.10.22';

import type { ExerciseType } from '../../../types/exercise';

interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

interface PoseData {
  keypoints: PoseKeypoint[];
  score?: number;
}

// 외부에서 내장 모드로 사용할 수 있도록 props 추가
interface PoseDetectorProps {
  embedded?: boolean;
  autoStart?: boolean;
  exerciseType?: ExerciseType;
  onPose?: (landmarks: any[], analysis: ExerciseAnalysis) => void;
}

// ExerciseAnalysis는 이제 분석기에서 import됨

// POSE_CONSTANTS에서 관절점 인덱스 구조 분해 할당
const {
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_ELBOW,
  RIGHT_ELBOW,
  LEFT_WRIST,
  RIGHT_WRIST,
  LEFT_FOOT_INDEX,
  RIGHT_FOOT_INDEX
} = POSE_CONSTANTS;

const PoseDetector: React.FC<PoseDetectorProps> = ({ embedded = false, autoStart = false, exerciseType, onPose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const simRafId = useRef<number | null>(null);
  const simulatorRef = useRef<any>(null);
  const poseInitRef = useRef<boolean>(false);
  const rafStartedRef = useRef<boolean>(false);
  const processingRef = useRef<boolean>(false);
  const firstDetectionLogged = useRef<boolean>(false);
  const startSimulatorRef = useRef<() => void>(() => {});

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');

  const [isDetecting, setIsDetecting] = useState(false);
  const [pose, setPose] = useState<any>(null);
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
    // 내장 모드에서는 로그 축소로 렌더/메모리 오버헤드 절감
    if (embedded) return;
    const time = formatKoreaTimeOnly(new Date());
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(line);
    setLogs(prev => [...prev.slice(-300), line]);
  }, [embedded]);


  // Pose 인스턴스 생성 (tasks-vision 사용)
  const createPose = useCallback(async () => {
    const vision = await loadVisionFileset();
    
    // 모바일 환경 체크
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const instance = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        // 모바일에서는 CPU 사용 (GPU 이슈 회피)
        delegate: isMobile ? "CPU" : "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1,
      // 모바일에서는 신뢰도 임계값을 낮춤
      minPoseDetectionConfidence: isMobile ? 0.2 : 0.3,
      minPosePresenceConfidence: isMobile ? 0.2 : 0.3,
      minTrackingConfidence: isMobile ? 0.2 : 0.3
    });
    
    return instance;
  }, []);

  // MediaPipe 초기화 (tasks-vision 사용)
  const initializeMediaPipe = useCallback(async () => {
    try {
      if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 초기화 시작');
      addLog('MediaPipe Pose 모델 로드 시작', { version: MEDIAPIPE_VERSION });
      const instance = await createPose();
      setPose(instance);
      if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 로드 성공');
      addLog('✅ MediaPipe Pose 모델 로드 완료');
    } catch (error) {
      const msg = String((error as any)?.message || error);
      if (!embedded && import.meta.env.DEV) console.error('📱 [모바일 디버그] MediaPipe 로드 실패:', msg);
      addLog('❌ MediaPipe 모델 로드 실패', { error: msg });
    }
  }, [addLog, createPose, embedded]);

  // 캔버스 크기를 비디오 해상도와 동기화
  const syncCanvasToVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    // 비디오가 준비될 때까지 대기
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(() => syncCanvasToVideo(), 100);
      return;
    }
    
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    
    // 모바일에서 캔버스 스타일 조정
    const container = canvas.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      canvas.style.width = `${containerRect.width}px`;
      canvas.style.height = `${containerRect.height}px`;
    }
    
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
    console.log('🎥 [모바일] startCamera 호출됨');
    await checkPermissions();
    await logDevices();
    addLog('보안 컨텍스트', { isSecureContext: window.isSecureContext, protocol: location.protocol });

    const tryOpen = async (facingMode: 'user' | 'environment') => {
      addLog('카메라 시도', { facingMode });
      console.log(`📷 [모바일] 카메라 열기 시도: ${facingMode}`);
      
      // 모바일 환경 체크
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // 모바일에서는 더 간단한 constraints 사용
      const constraints = isMobile ? {
        video: {
          facingMode: { ideal: facingMode }  // exact 대신 ideal 사용
        },
        audio: false
      } : {
        video: {
          width: { ideal: 640, min: 480 },
          height: { ideal: 480, min: 360 },
          facingMode,
          frameRate: { ideal: 24 }
        }
      };
      
      console.log('📷 [모바일] Constraints:', JSON.stringify(constraints));
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📷 [모바일] Stream 획득 성공:', stream.id);
      return stream;
    };

    try {
      let stream: MediaStream | null = null;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      try {
        stream = await tryOpen('user');
      } catch (e1) {
        console.error('📷 [모바일] 전면 카메라 실패:', e1);
        handleGumError(e1, 'user');
        
        // 모바일에서는 후면 카메라로 재시도
        if (isMobile) {
          try {
            stream = await tryOpen('environment');
          } catch (e2) {
            console.error('📷 [모바일] 후면 카메라도 실패:', e2);
            handleGumError(e2, 'environment');
            
            // 모바일에서는 시뮬레이터 대신 에러 표시
            const errorMsg = '카메라 권한 거부 또는 사용 불가';
            addLog('❌ ' + errorMsg);
            setCameraError(errorMsg);
            alert('카메라 권한을 허용해주세요. 브라우저 설정에서 카메라 권한을 확인하세요.');
            return;
          }
        } else {
          // 데스크톱에서만 시뮬레이터 폴백
          addLog('카메라 최종 실패, 시뮬레이터 폴백');
          startSimulatorRef.current();
          return;
        }
      }

      if (videoRef.current && stream) {
        console.log('📷 [모바일] 비디오에 스트림 연결 시작');
        videoRef.current.srcObject = stream;
        
        // 비디오 메타데이터 로드 대기 (타임아웃 추가)
        const metadataPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject('메타데이터 로드 타임아웃'), 5000);
          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeout);
            syncCanvasToVideo();
            addLog('📐 비디오 메타데이터 로드, 캔버스 동기화');
            resolve(true);
          };
        });
        
        try {
          await metadataPromise;
          await videoRef.current.play();
          console.log('📷 [모바일] 비디오 재생 시작');
          
          const track = stream.getVideoTracks()[0];
          addLog('스트림 시작', { label: track?.label, settings: track?.getSettings?.() });
          
          // 즉시 한번 동기화 시도
          syncCanvasToVideo();
          setIsDetecting(true);
          stateRef.current = { phase: 'up', count: 0 };
          firstDetectionLogged.current = false;
          addLog('✅ 웹캠 시작 완료');
        } catch (playError) {
          console.error('📷 [모바일] 비디오 재생 실패:', playError);
          addLog('❌ 비디오 재생 실패', { error: String(playError) });
        }
      }
    } catch (error) {
      console.error('📷 [모바일] 전체 에러:', error);
      addLog('❌ 웹캠 시작 최종 실패', { error: String(error) });
      
      // 모바일에서는 시뮬레이터 사용하지 않음
      if (!isMobile) {
        startSimulatorRef.current();
      }
    }
  }, [checkPermissions, logDevices, handleGumError, syncCanvasToVideo, addLog]);

  // 분석기 인스턴스들을 카테고리별로 그룹화
  const analyzers = useMemo(() => {
    const squat = new SquatAnalyzer();
    squat.setExternalState(stateRef); // 외부 상태 연결
    
    const jumpingJack = new JumpingJackAnalyzer();
    if (jumpingJack.setExternalState) jumpingJack.setExternalState(stateRef);
    
    const jumpSquat = new JumpSquatAnalyzer();
    if (jumpSquat.setExternalState) jumpSquat.setExternalState(stateRef);
    
    const pullup = new PullupAnalyzer();
    if (pullup.setExternalState) pullup.setExternalState(stateRef);
    
    const deadlift = new DeadliftAnalyzer();
    if (deadlift.setExternalState) deadlift.setExternalState(stateRef);
    
    const wallSit = new WallSitAnalyzer();
    if (wallSit.setExternalState) wallSit.setExternalState(stateRef);
    
    const highKnees = new HighKneesAnalyzer();
    if (highKnees.setExternalState) highKnees.setExternalState(stateRef);
    
    const sidePlank = new SidePlankAnalyzer();
    if (sidePlank.setExternalState) sidePlank.setExternalState(stateRef);
    
    return {
      squat,
      lunge: new LungeAnalyzer(),
      pushup: new PushupAnalyzer(),
      plank: new PlankAnalyzer(),
      calf_raise: new CalfRaiseAnalyzer(),
      burpee: new BurpeeAnalyzer(),
      mountain_climber: new MountainClimberAnalyzer(),
      bridge: new BridgeAnalyzer(),
      situp: new SitupAnalyzer(),
      crunch: new CrunchAnalyzer(),
      jumping_jack: jumpingJack,
      jump_squat: jumpSquat,
      pullup: pullup,
      deadlift: deadlift,
      wall_sit: wallSit,
      high_knees: highKnees,
      side_plank: sidePlank
    };
  }, []);

  // 운동 분석 함수 단순화
  const analyzeExercise = (landmarks: any[], type: ExerciseType): ExerciseAnalysis => {
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
  };

  // 각도 계산/도우미
  const calculateAngle = (p1: any, p2: any, p3: any): number => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return Math.abs(angle * 180 / Math.PI);
  };
  const avg = (a: number, b: number) => (a + b) / 2;

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 항상 캔버스를 먼저 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // landmarks가 없거나 비어있으면 대기 메시지만 표시
    if (!landmarks || landmarks.length === 0) {
      if (embedded) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('포즈 감지 중...', canvas.width / 2, canvas.height / 2);
      }
      return;
    }
    
    // 내장 모드에서도 가독성 높은 흰색 적용
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
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
  };

  // 시뮬레이터 폴백: 카메라 없이도 분석 루프를 동일하게 구동
  const startSimulator = useCallback(async () => {
    if (simulatorRef.current) return;
    try {
      const mod = await import('../components/PoseSimulator');
      simulatorRef.current = mod.createSquatSimulator();
      addLog('🧪 시뮬레이터 시작');
      setIsDetecting(true);  // 시뮬레이터도 detecting 상태로 설정
      const tick = () => {
        const sim = simulatorRef.current;
        if (!sim) return;
        const landmarks = sim.next(1/30);
        const analysis = analyzeExercise(landmarks, selectedExercise);
        setExerciseAnalysis(analysis);
        if (onPose) onPose(landmarks, analysis);
        drawPoseOnCanvas(landmarks);
        simRafId.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      addLog('시뮬레이터 시작 실패', { error: String(e) });
    }
  }, [analyzeExercise, selectedExercise, onPose]);
  // ref로 노출해 선언 순서 문제 회피
  useEffect(() => { startSimulatorRef.current = () => { startSimulator(); }; }, [startSimulator]);

  // Pose 재초기화(에러 복구)
  const resetPose = useCallback(() => {
    addLog('Pose 재초기화 시도');
    const instance = createPose();
    setPose(instance);
  }, [addLog, createPose]);

  // RAF 기반 감지 루프
  const frameSkipRef = useRef(0);
  const lastProcessTime = useRef(0);
  const loop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!pose || !video || !isDetecting) {
      // 디버그: 초기화 상태 확인
      if (!firstDetectionLogged.current && Math.random() < 0.02) {
        console.log('🔄 Loop waiting - pose:', !!pose, 'video:', !!video, 'detecting:', isDetecting);
      }
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    // 모바일에서는 프레임 레이트 제한을 더 관대하게 설정
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const targetFPS = isMobile ? 15 : 30; // 모바일은 15fps, 데스크톱은 30fps
    const frameInterval = 1000 / targetFPS;
    const now = performance.now();
    
    if (now - lastProcessTime.current < frameInterval) {
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }
    lastProcessTime.current = now;

    if (!video.videoWidth || !video.videoHeight) {
      // 모바일에서 비디오 크기가 늦게 설정될 수 있음
      if (isMobile && canvas) {
        // 캔버스에 대기 메시지 표시
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('카메라 준비 중...', canvas.width / 2, canvas.height / 2);
        }
      }
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }
    
    // 비디오가 실제로 재생 중인지 확인
    if (video.paused || video.ended) {
      addLog('⚠️ 비디오가 일시정지 또는 종료됨');
      // 모바일에서 자동 재생 시도
      if (isMobile && video.paused) {
        video.play().catch(e => console.warn('Auto-play failed:', e));
      }
      rafId.current = requestAnimationFrame(() => loop());
      return;
    }

    if (!processingRef.current) {
      processingRef.current = true;
      try {
        // 모바일에서 timestamp 이슈 해결
        const timestamp = video.currentTime * 1000; // performance.now() 대신 video.currentTime 사용
        
        // 모바일에서 detectForVideo가 동기적으로 작동하도록 처리
        let results;
        try {
          results = pose.detectForVideo(video, timestamp);
        } catch (detectionError: any) {
          // 모바일에서 발생할 수 있는 타이밍 이슈 처리
          console.warn('Detection error, retrying with adjusted timestamp:', detectionError);
          results = pose.detectForVideo(video, performance.now());
        }
        
        // 디버그: 10프레임마다 상태 로깅
        if (Math.random() < 0.05) {
          console.log('🎬 Pose detection attempt:', {
            timestamp,
            videoTime: video.currentTime,
            videoReady: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            hasResults: !!results,
            landmarksCount: results?.landmarks?.length || 0,
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          });
        }
        
        // 직접 결과 처리 (onResults 콜백 대신)
        if (results?.landmarks && results.landmarks.length > 0) {
          if (!firstDetectionLogged.current) {
            addLog('🎯 첫 포즈 검출', { points: results.landmarks.length });
            firstDetectionLogged.current = true;
          }
          const landmarks = results.landmarks[0];
          const analysis = analyzeExercise(landmarks, selectedExercise);
          
          // 스쿼트 분석 결과를 터미널에 로깅 (카운트 포함)
          if (!embedded && import.meta.env.DEV && selectedExercise === 'squat') {
            addLog(`[SQUAT] 분석결과`, {
              confidence: analysis.confidence,
              isCorrectForm: analysis.isCorrectForm,
              feedback: analysis.feedback,
              count: analysis.currentCount,
              phase: stateRef.current?.phase
            });
          }
          
          // 모바일에서 카운트 변화를 콘솔에도 표시
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile && analysis.currentCount > 0) {
            console.log(`🔢 [모바일] 카운트: ${analysis.currentCount}, 자세: ${analysis.isCorrectForm ? 'OK' : 'NG'}`);
          }
          
          // 프레임 카운터 증가
          setDetectionCount(prev => prev + 1);
          
          setExerciseAnalysis(analysis);
          // 외부 콜백으로 전달 (내장 사용 시 MotionCoach 연동)
          if (onPose) onPose(landmarks, analysis);
          drawPoseOnCanvas(landmarks);
        } else {
          // 포즈가 감지되지 않아도 캔버스는 업데이트 (이전 프레임 지우기)
          drawPoseOnCanvas([]);
          if (!firstDetectionLogged.current && Math.random() < 0.1) {
            addLog('아직 포즈 미검출(프레임)');
          }
        }
      } catch (e: any) {
        const msg = String(e?.message || e);
        addLog('포즈 처리 에러', { error: msg });
        console.error('🚨 [모바일] Pose detection error:', e);
        
        if (msg.includes('memory access out of bounds')) {
          console.warn('🔄 [모바일] Memory error detected, resetting pose...');
          resetPose();
        }
        // 모바일에서 발생할 수 있는 추가 에러 처리
        if (msg.includes('timestamp') || msg.includes('Invalid')) {
          console.warn('Mobile timing issue detected, continuing...');
        }
        // WebAssembly 메모리 이슈 처리
        if (msg.includes('wasm') || msg.includes('RuntimeError')) {
          console.warn('🔄 [모바일] WASM error detected, attempting recovery...');
          setTimeout(() => {
            resetPose();
          }, 1000);
        }
      } finally {
        processingRef.current = false;
      }
    }
    rafId.current = requestAnimationFrame(() => loop());
  }, [pose, isDetecting, addLog, resetPose, onPose, selectedExercise, embedded]);

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    addLog('페이지 진입', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      secure: window.isSecureContext,
      href: location.href
    });
    // 임베디드 모드에서는 Mediapipe 내부 디버그 로그를 부분적으로 억제
    let restoreConsole: null | (() => void) = null;
    if (embedded) {
      const suppressed = [
        /vision_wasm_internal/i,
        /Graph successfully started running/i,
        /OpenGL error checking is disabled/i,
        /gl_context\.cc/i
      ];
      const orig = { log: console.log, info: console.info, debug: console.debug } as const;
      const shouldSuppress = (firstArg: any) => {
        const s = typeof firstArg === 'string' ? firstArg : (firstArg && firstArg.toString ? firstArg.toString() : '');
        return suppressed.some((r) => r.test(s));
      };
      console.log = (...args: any[]) => { if (!shouldSuppress(args[0])) orig.log.apply(console, args as any); };
      console.info = (...args: any[]) => { if (!shouldSuppress(args[0])) orig.info.apply(console, args as any); };
      console.debug = (...args: any[]) => { if (!shouldSuppress(args[0])) orig.debug.apply(console, args as any); };
      restoreConsole = () => { console.log = orig.log; console.info = orig.info; console.debug = orig.debug; };
    }
    // 초기화: 마운트당 1회만 실행
    if (!poseInitRef.current) {
      initializeMediaPipe();
      poseInitRef.current = true;
    }
    // 외부에서 운동 타입을 지정한 경우 동기화
    if (exerciseType) setSelectedExercise(exerciseType);
    // RAF 루프 시작: 중복 방지
    if (!rafStartedRef.current) {
      rafId.current = requestAnimationFrame(() => loop());
      rafStartedRef.current = true;
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (simRafId.current) cancelAnimationFrame(simRafId.current);
      rafStartedRef.current = false;
      if (restoreConsole) restoreConsole();
    };
  }, [initializeMediaPipe, addLog, exerciseType, loop]);

  // 내장 모드 + 자동 시작이면 마운트 후 카메라 자동 시작
  useEffect(() => {
    if (autoStart && !isDetecting && pose) {
      console.log('🎥 Auto-starting camera - embedded:', embedded, 'autoStart:', autoStart, 'pose ready:', !!pose);
      // 약간의 딜레이 후 시작 (모바일 대응)
      const timer = setTimeout(() => {
        startCamera();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isDetecting, startCamera, embedded, pose]);

  // 카메라 자동 재시도(최대 3회) - 일부 환경에서 최초 호출이 무시되는 문제 보완
  useEffect(() => {
    if (!autoStart) return;
    let tries = 0;
    const id = setInterval(() => {
      if (isDetecting || tries >= 3) {
        clearInterval(id);
        return;
      }
      tries += 1;
      startCamera();
    }, 2000);
    return () => clearInterval(id);
  }, [autoStart, isDetecting, startCamera]);

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

  // 개발용 Shift+S 시뮬레이터 토글
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 's') {
        console.log('🎮 PoseDetector: Shift+S detected, starting simulator');
        startSimulator();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startSimulator]);

  // 모바일 디버그 정보
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [mobileDebugInfo, setMobileDebugInfo] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [detectionCount, setDetectionCount] = useState<number>(0);
  
  useEffect(() => {
    if (isMobile) {
      const interval = setInterval(() => {
        const video = videoRef.current;
        if (video && isDetecting) {
          const info = `📹 ${video.videoWidth}x${video.videoHeight} | ⏱️ ${video.currentTime.toFixed(1)}s | ${pose ? '✅ ML Ready' : '❌ ML Loading'} | 🎯 Count: ${stateRef.current.count} | 🔍 Frames: ${detectionCount}`;
          setMobileDebugInfo(info);
        } else if (!isDetecting) {
          const protocol = window.location.protocol;
          const isSecure = window.isSecureContext;
          setMobileDebugInfo(`⚠️ 대기중 | ${protocol} | Secure: ${isSecure} | Camera: ${cameraError || '준비 중'}`);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isMobile, isDetecting, pose, cameraError, detectionCount]);

  return (
    <div className={`pose-detector ${embedded ? 'embedded' : ''}`}>
      {/* 운동 선택 (내장 모드에서는 숨김) */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value as ExerciseType)}>
            <option value="squat">스쿼트</option>
            <option value="lunge">런지</option>
            <option value="pushup">푸시업</option>
            <option value="plank">플랭크</option>
            <option value="calf_raise">카프 레이즈</option>
            <option value="burpee">버피</option>
            <option value="mountain_climber">마운틴 클라이머</option>
            <option value="bridge">브릿지</option>
            <option value="situp">윗몸일으키기</option>
            <option value="crunch">크런치</option>
            <option value="jumping_jack">제자리 뛰기</option>
            <option value="jump_squat">점프 스쿼트</option>
            <option value="pullup">턱걸이</option>
            <option value="deadlift">데드리프트</option>
            <option value="wall_sit">월 시트</option>
            <option value="high_knees">하이 니즈</option>
            <option value="side_plank">사이드 플랭크</option>
          </select>
        </div>
      )}

      <div className="video-container" onClick={(e) => { 
        // 버튼이 클릭된 경우 컨테이너 클릭 무시
        if (e.target !== e.currentTarget) return;
        if (!isDetecting) {
          console.log('📱 [모바일] 비디오 컨테이너 클릭됨');
          startCamera();
        }
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
          className="pose-video"
          style={{ objectFit: 'cover' }}
        />
        <canvas
          ref={canvasRef}
          className="pose-canvas"
        />
        {/* 모바일 디버그 오버레이 - 항상 표시 */}
        {isMobile && mobileDebugInfo && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: isDetecting ? '#00ff00' : '#ffff00',
            padding: '8px',
            borderRadius: '5px',
            fontSize: '11px',
            fontFamily: 'monospace',
            zIndex: 1000,
            whiteSpace: 'normal',
            wordBreak: 'break-all'
          }}>
            {mobileDebugInfo}
          </div>
        )}
        {/* 카메라 시작 버튼 - embedded 모드에서도 표시 */}
        {!isDetecting && (
          <button 
            onClick={(e) => {
              console.log('📱 [모바일] 카메라 버튼 클릭됨!');
              e.preventDefault();
              e.stopPropagation();
              startCamera();
            }}
            onTouchStart={(e) => {
              console.log('📱 [모바일] 카메라 버튼 터치 시작!');
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              console.log('📱 [모바일] 카메라 버튼 터치 끝!');
              e.preventDefault();
              startCamera();
            }}
            className="camera-start-button"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '20px 40px',
              fontSize: '20px',
              background: 'rgba(76, 175, 80, 0.95)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '12px',
              cursor: 'pointer',
              zIndex: 1000,
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            📷 카메라 시작
          </button>
        )}
        {!embedded && isDetecting && (
          <button 
            onClick={startCamera}
            className="start-button"
            disabled={isDetecting}
          >
            감지 중...
          </button>
        )}
      </div>

      {/* 분석/디버그 패널 (내장 모드에서는 숨김) */}
      {!embedded && (
        <>
          <div className="analysis-panel">
            <h3>운동 분석</h3>
            <div className="analysis-content">
              <p><strong>운동 유형:</strong> {exerciseAnalysis.exerciseType || '없음'}</p>
              <p><strong>카운트:</strong> {exerciseAnalysis.currentCount}</p>
              <p><strong>자세:</strong> {exerciseAnalysis.isCorrectForm ? '올바름' : '수정 필요'}</p>
              <p><strong>신뢰도:</strong> {(exerciseAnalysis.confidence * 100).toFixed(1)}%</p>
              <p><strong>피드백:</strong> {exerciseAnalysis.feedback}</p>
              {pose && (
                <div style={{fontSize: '12px', marginTop: '10px', border: '1px solid #ccc', padding: '5px'}}>
                  <p><strong>디버그 정보:</strong></p>
                  <p>MediaPipe: {pose ? '로드됨' : '로드안됨'}</p>
                  <p>검출상태: {isDetecting ? '활성' : '비활성'}</p>
                </div>
              )}
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
        </>
      )}
    </div>
  );
};

export default PoseDetector;