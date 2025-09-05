import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import mediaPipeManager from '../services/mediapipeManager';
import streamManager from '../services/streamManager';
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
  const timestampRef = useRef<number>(0);
  const autoStartProcessedRef = useRef<boolean>(false);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(exerciseType || 'squat');

  const [isDetecting, setIsDetecting] = useState(false);
  const isDetectingRef = useRef(false); // RAF 루프에서 사용할 ref 추가
  const [pose, setPose] = useState<any>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: 'squat',
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // 운동별 상태(히스테리시스)
  const stateRef = useRef<{ phase: 'up' | 'down'; count: number; side?: 'left' | 'right' }>({ phase: 'up', count: 0 });

  // 디버그 로그 패널 상태
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const addLog = useCallback((msg: string, data?: any) => {
    // 내장 모드에서는 로그 축소로 렌더/메모리 오버헤드 절감
    if (embedded) return;
    const time = formatKoreaTimeOnly(new Date());
    const line = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    if (import.meta.env.DEV) console.log(line);
    // 성능 최적화: 로그 배열 업데이트 주기 감소
    if (Math.random() < 0.1) { // 10% 확률로만 업데이트
      setLogs(prev => [...prev.slice(-100), line]);
    }
  }, [embedded]);


  // MediaPipe Manager를 통해 Pose 인스턴스 가져오기 (싱글톤)
  const getPoseInstance = useCallback(async () => {
    try {
      const instance = await mediaPipeManager.getPoseLandmarker();
      return instance;
    } catch (error) {
      console.error('Pose 인스턴스 가져오기 실패:', error);
      throw error;
    }
  }, []);

  // MediaPipe 초기화 (매니저 사용으로 중복 방지)
  const initializeMediaPipe = useCallback(async () => {
    try {
      if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 초기화 요청');
      addLog('MediaPipe Pose 모델 로드 시작', { version: MEDIAPIPE_VERSION });
      
      // 매니저를 통해 인스턴스 가져오기 (중복 생성 방지)
      const instance = await getPoseInstance();
      setPose(instance);
      
      if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 로드 성공');
      addLog('✅ MediaPipe Pose 모델 로드 완료');
    } catch (error) {
      const msg = String((error as any)?.message || error);
      if (msg.includes('Too frequent')) {
        console.warn('MediaPipe 초기화 빈도 제한');
        return;
      }
      if (!embedded && import.meta.env.DEV) console.error('📱 [모바일 디버그] MediaPipe 로드 실패:', msg);
      addLog('❌ MediaPipe 모델 로드 실패', { error: msg });
    }
  }, [addLog, getPoseInstance, embedded]);

  // 캔버스 크기를 비디오 해상도와 동기화
  const syncCanvasToVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    // 비디오가 준비될 때까지 대기
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('📷 비디오 크기 아직 0, 100ms 후 재시도');
      setTimeout(() => syncCanvasToVideo(), 100);
      return;
    }
    
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    
    // 비디오의 실제 표시 크기 가져오기
    const videoRect = video.getBoundingClientRect();
    const containerWidth = videoRect.width;
    const containerHeight = videoRect.height;
    
    // 비디오의 종횡비
    const videoAspectRatio = vw / vh;
    // 컨테이너의 종횡비
    const containerAspectRatio = containerWidth / containerHeight;
    
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;
    
    // object-fit: cover를 고려한 스케일 계산
    if (videoAspectRatio > containerAspectRatio) {
      // 비디오가 더 넓음 - 세로에 맞추고 가로를 자름
      scaleY = containerHeight / vh;
      scaleX = scaleY;
      const scaledWidth = vw * scaleX;
      offsetX = (containerWidth - scaledWidth) / 2;
    } else {
      // 비디오가 더 좁음 - 가로에 맞추고 세로를 자름
      scaleX = containerWidth / vw;
      scaleY = scaleX;
      const scaledHeight = vh * scaleY;
      offsetY = (containerHeight - scaledHeight) / 2;
    }
    
    // 캔버스 실제 크기는 컨테이너 크기로 설정
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // 캔버스 스타일 설정
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';
    
    // 스케일 정보를 저장 (drawPoseOnCanvas에서 사용)
    canvas.dataset.scaleX = String(scaleX);
    canvas.dataset.scaleY = String(scaleY);
    canvas.dataset.offsetX = String(offsetX);
    canvas.dataset.offsetY = String(offsetY);
    
    // console.log('📷 캔버스 동기화 완료', { 
    //   videoSize: `${vw}x${vh}`, 
    //   displaySize: `${videoRect.width}x${videoRect.height}`,
    //   canvasSize: `${canvas.width}x${canvas.height}`,
    //   canvasStyle: {
    //     width: canvas.style.width,
    //     height: canvas.style.height,
    //     position: canvas.style.position
    //   }
    // });
    
    addLog('캔버스 동기화', { 
      videoWidth: vw, 
      videoHeight: vh, 
      displayWidth: videoRect.width,
      displayHeight: videoRect.height
    });
  }, [addLog]);

  // 권한 상태 확인
  const checkPermissions = useCallback(async () => {
    try {
      // @ts-ignore
      if (navigator.permissions && navigator.permissions.query) {
        // @ts-ignore
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        addLog('카메라 권한 상태', { state: status.state });
        
        // 권한이 거부된 경우 경고
        if (status.state === 'denied') {
          console.error('🚫 [모바일] 카메라 권한이 거부됨');
          setCameraError('카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
        }
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

  // 카메라 정지 함수
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera');
    
    // RAF 중단
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    
    // 비디오 스트림 정지
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    // 상태 리셋
    setIsDetecting(false);
    isDetectingRef.current = false;
    rafStartedRef.current = false;
    stateRef.current = { phase: 'up', count: 0 };
    
    // Canvas 클리어
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    console.log('✅ Camera stopped');
  }, []);
  
  // 웹캠 시작 (전면 → 실패 시 후면 폴백)
  const startCamera = useCallback(async () => {
    console.log('🎥 startCamera 호출됨 - isDetecting:', isDetecting, 'embedded:', embedded);
    
    // 이미 감지 중이면 무시
    if (isDetecting) {
      console.log('📷 이미 카메라가 실행 중');
      return Promise.resolve(); // Promise 반환 명시
    }
    
    await checkPermissions();
    await logDevices();
    addLog('보안 컨텍스트', { isSecureContext: window.isSecureContext, protocol: location.protocol });

    const tryOpen = async (facingMode: 'user' | 'environment' | 'default') => {
      addLog('카메라 시도', { facingMode });
      console.log(`📷 카메라 열기 시도: ${facingMode}`);
      
      // 모바일 환경 체크
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      let constraints: MediaStreamConstraints;
      
      if (facingMode === 'default') {
        // 가장 기본적인 constraints - PC에서 fallback
        constraints = {
          video: true,
          audio: false
        };
      } else if (isMobile) {
        // 모바일에서는 facingMode만 설정
        constraints = {
          video: { facingMode },
          audio: false
        };
      } else {
        // PC에서는 더 높은 해상도로 정확도 향상
        constraints = {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, max: 30 },
            facingMode
          },
          audio: false
        };
      }
      
      console.log('📷 Constraints:', JSON.stringify(constraints));
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📷 Stream 획득 성공:', stream.id);
      return stream;
    };

    try {
      let stream: MediaStream | null = null;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      try {
        // StreamManager를 통해 스트림 획득 (재사용 가능)
        stream = await streamManager.getStream('user');
        console.log('📷 StreamManager로 스트림 획득 성공');
      } catch (e1) {
        console.error('📷 StreamManager 스트림 획득 실패:', e1);
        handleGumError(e1, 'user');
        
        // 폴백: 직접 getUserMedia 시도
        try {
          // 두 번째 시도
          if (isMobile) {
            // 모바일: 후면 카메라
            stream = await tryOpen('environment');
          } else {
            // PC: 기본 카메라 설정
            stream = await tryOpen('default');
          }
        } catch (e2) {
          console.error('📷 두 번째 시도도 실패:', e2);
          handleGumError(e2, isMobile ? 'environment' : 'default');
          
          // 모두 실패 시
          if (isMobile) {
            // 모바일: 에러 메시지
            const errorMsg = '카메라 권한 거부 또는 사용 불가';
            addLog('❌ ' + errorMsg);
            setCameraError(errorMsg);
            alert('카메라 권한을 허용해주세요. 브라우저 설정에서 카메라 권한을 확인하세요.');
          } else {
            // PC: 시뮬레이터 폴백
            console.log('🎮 [PC] 카메라 사용 불가, 시뮬레이터 모드로 전환');
            addLog('카메라 최종 실패, 시뮬레이터 폴백');
            startSimulatorRef.current();
          }
          return;
        }
      }

      if (videoRef.current && stream) {
        console.log('📷 비디오에 스트림 연결 시작');
        const video = videoRef.current;
        
        // 이전 스트림이 있으면 연결만 해제 (stop 하지 않음 - StreamManager가 관리)
        if (video.srcObject) {
          console.log('📷 기존 스트림 연결 해제');
          video.srcObject = null; // 연결만 해제
        }
        
        // 스트림 설정 전 짧은 지연 (일부 브라우저에서 필요)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        video.srcObject = stream;
        
        // 모바일에서 중요한 속성 설정 (스트림 설정 후에 재설정)
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true; // 속성과 프로퍼티 둘 다 설정
        
        // 비디오 메타데이터 로드 대기 (타임아웃 추가)
        const metadataPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('📷 메타데이터 타임아웃, 강제 진행');
            resolve(true); // reject 대신 resolve로 진행
          }, 5000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log('📷 메타데이터 로드 완료');
            syncCanvasToVideo();
            addLog('📐 비디오 메타데이터 로드, 캔버스 동기화');
            resolve(true);
          };
          
          // 바로 메타데이터가 로드된 경우 처리
          if (video.readyState >= 1) {
            clearTimeout(timeout);
            console.log('📷 메타데이터 이미 준비됨');
            syncCanvasToVideo();
            resolve(true);
          }
        });
        
        try {
          await metadataPromise;
          
          // 모바일에서는 사용자 제스처로 재생을 시도
          const playVideo = async () => {
            try {
              // muted 상태 확인
              video.muted = true;
              await video.play();
              console.log('📷 비디오 재생 시작');
              return true;
            } catch (error) {
              console.warn('📷 자동 재생 실패, 사용자 제스처 필요:', error);
              return false;
            }
          };
          
          const playSuccess = await playVideo();
          
          if (!playSuccess) {
            // 자동 재생 실패 시 사용자 상호작용 대기
            console.log('📷 사용자 터치로 재생 시도');
            
            // 모바일에서는 자동 재생을 강제하지 않고 사용자 상호작용 대기
            // 카메라 버튼 클릭 시 재생되도록 함
            const userInteraction = new Promise((resolve) => {
              const handleInteraction = async () => {
                try {
                  video.muted = true; // 확실히 muted 상태로
                  await video.play();
                  console.log('📷 사용자 상호작용으로 재생 성공');
                  resolve(true);
                } catch (e) {
                  console.warn('터치 재생 실패:', e);
                  resolve(false);
                }
              };
              
              // 카메라 버튼 클릭 시 자동으로 재생되도록 설정
              // 타임아웃 짧게 설정 (3초)
              setTimeout(() => {
                console.log('📷 재생 대기 타임아웃');
                resolve(false);
              }, 3000);
            });
            
            const interactionResult = await userInteraction;
            if (!interactionResult) {
              console.log('📷 대기 중 - 카메라 버튼을 클릭하면 시작됩니다');
            }
          }
          
          const track = stream.getVideoTracks()[0];
          addLog('스트림 시작', { label: track?.label, settings: track?.getSettings?.() });
          
          // 즉시 한번 동기화 시도
          syncCanvasToVideo();
          console.log('📷 setIsDetecting(true) 호출');
          setIsDetecting(true);
          isDetectingRef.current = true; // ref도 함께 업데이트
          stateRef.current = { phase: 'up', count: 0 };
          firstDetectionLogged.current = false;
          addLog('✅ 웹캠 시작 완료');
          console.log('📷 카메라 시작 완료, isDetecting이 true로 설정됨');
          
          // RAF 루프 시작 확인 (pose가 준비된 경우에만)
          if (!rafStartedRef.current && pose && loopRef.current) {
            console.log('🎬 포즈 감지 루프 시작 (카메라 시작 시점)');
            rafStartedRef.current = true;
            rafId.current = requestAnimationFrame(loopRef.current);
          } else if (!rafStartedRef.current) {
            console.log('⏳ RAF 루프는 pose 준비 후 시작됨');
            // pose가 준비되면 자동으로 시작되도록 useEffect 추가
          }
        } catch (playError) {
          console.error('📷 비디오 재생 실패:', playError);
          addLog('❌ 비디오 재생 실패', { error: String(playError) });
          setCameraError(String(playError));
        }
      }
    } catch (error) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.error('📷 전체 에러:', error);
      addLog('❌ 웹캠 시작 최종 실패', { error: String(error) });
      
      // PC에서만 시뮬레이터 사용
      if (!isMobile) {
        console.log('🎮 [PC] 시뮬레이터 모드로 전환');
        startSimulatorRef.current();
      }
    }
  }, [checkPermissions, logDevices, handleGumError, syncCanvasToVideo, addLog, isDetecting, embedded, pose]);

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
    if (!canvas || !ctx) {
      console.log('❌ Canvas or context not available');
      return;
    }


    // 항상 캔버스를 먼저 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // landmarks가 없거나 비어있으면 대기 메시지만 표시
    if (!landmarks || landmarks.length === 0) {
      return;
    }
    
    // PC에서는 더 낮은 threshold로 더 많은 포인트 표시
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // 카메라 거리 체크 (PC용)
    if (!isMobile && landmarks.length >= 33) {
      // 몸통 높이 계산 (어깨에서 엉덩이까지)
      const leftShoulder = landmarks[LEFT_SHOULDER];
      const rightShoulder = landmarks[RIGHT_SHOULDER];
      const leftHip = landmarks[LEFT_HIP];
      const rightHip = landmarks[RIGHT_HIP];
      
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipY = (leftHip.y + rightHip.y) / 2;
        const torsoHeight = Math.abs(hipY - shoulderY);
        
        // 몸통이 화면의 20% 미만이면 너무 멀리 있음
        if (torsoHeight < 0.2) {
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.fillText('카메라에 더 가까이 오세요', canvas.width / 2 - 100, 50);
        }
        // 몸통이 화면의 60% 이상이면 너무 가까이 있음
        else if (torsoHeight > 0.6) {
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.fillText('카메라에서 조금 멀어지세요', canvas.width / 2 - 100, 50);
        }
      }
    }
    
    // 굵고 밝은 색상으로 변경하여 잘 보이도록
    ctx.fillStyle = '#00FF00';  // 밝은 초록색
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 4;  // 더 굵게

    // 스케일 정보 가져오기
    const scaleX = parseFloat(canvas.dataset.scaleX || '1');
    const scaleY = parseFloat(canvas.dataset.scaleY || '1');
    const offsetX = parseFloat(canvas.dataset.offsetX || '0');
    const offsetY = parseFloat(canvas.dataset.offsetY || '0');
    const visibilityThreshold = isMobile ? 0.3 : 0.2;  // PC는 0.2로 더 관대하게
    let visiblePoints = 0;
    landmarks.forEach((landmark, idx) => {
      if ((landmark.visibility || 0) > visibilityThreshold) {
        visiblePoints++;
        // MediaPipe는 0-1 범위의 정규화된 좌표를 반환
        // 캔버스 크기에 맞게 변환 (캔버스는 이미 화면 크기로 조정됨)
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);  // 적절한 크기로 조정
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
        // 캔버스가 이미 화면 크기로 조정되었으므로 직접 변환
        const x1 = startPoint.x * canvas.width;
        const y1 = startPoint.y * canvas.height;
        const x2 = endPoint.x * canvas.width;
        const y2 = endPoint.y * canvas.height;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
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
      isDetectingRef.current = true;  // ref도 업데이트
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
  }, [analyzeExercise, selectedExercise, onPose, addLog]);
  // ref로 노출해 선언 순서 문제 회피
  useEffect(() => { startSimulatorRef.current = () => { startSimulator(); }; }, [startSimulator]);

  // Pose 재초기화(에러 복구)
  const resetPose = useCallback(async () => {
    addLog('Pose 재초기화 시도');
    try {
      // 매니저가 자동으로 재초기화를 처리
      const instance = await getPoseInstance();
      setPose(instance);
      addLog('Pose 재초기화 성공');
    } catch (error) {
      addLog('Pose 재초기화 실패', { error: String(error) });
    }
  }, [addLog, getPoseInstance]);

  // RAF 기반 감지 루프
  const frameSkipRef = useRef(0);
  const lastProcessTime = useRef(0);
  const loopCounter = useRef(0);
  const lastErrorTime = useRef(0);
  const errorCount = useRef(0);
  
  // loop 함수를 ref로 관리하여 순환 의존성 해결
  const loopRef = useRef<() => void>();
  
  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // 무한 루프 방지: 프레임 카운터 및 에러 제한
    loopCounter.current++;
    const now = performance.now();
    
    // 프레임 스킵으로 성능 최적화 (모바일: 3프레임마다, PC: 매 프레임 처리)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const skipFrames = isMobile ? 3 : 1;  // PC는 프레임 스킵 안함
    frameSkipRef.current++;
    if (frameSkipRef.current % skipFrames !== 0) {
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    
    // 최소 처리 시간 간격 보장 (33ms = 30fps)
    if (now - lastProcessTime.current < 33) {
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    lastProcessTime.current = now;
    
    // 에러가 연속으로 발생하는 경우 경고만 표시 (루프는 계속)
    if (errorCount.current > 50 && (now - lastErrorTime.current) < 5000) {
      console.warn('⚠️ 많은 에러 발생 중, 복구 시도...');
      errorCount.current = 0; // 에러 카운트 리셋
      lastErrorTime.current = now;
      // 루프는 계속 진행
    }
    
    // 루프가 명시적으로 중단된 경우만 return
    if (!rafStartedRef.current) {
      return;
    }
    
    // 필수 요소가 준비되지 않았으면 대기
    if (!pose || !video) {
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }

    // 성능 최적화: 이미 위에서 프레임 스킵 처리함
    const currentTime = performance.now();

    // 카메라가 아직 시작되지 않았으면 대기 (ref 사용)
    if (!isDetectingRef.current) {
      // 100프레임마다 한 번씩만 로그
      if (loopCounter.current % 100 === 0) {
        console.log('⏳ 카메라 대기 중...');
      }
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    
    if (!video.videoWidth || !video.videoHeight) {
      // 비디오가 아직 준비 안됨
      if (video.paused && video.srcObject) {
        video.play().catch(e => {
          if (loopCounter.current % 30 === 0) {
            console.log('📷 비디오 재생 대기 중...');
          }
        });
      }
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    
    // 비디오가 실제로 재생 중인지 확인
    if (video.paused || video.ended) {
      // 로그를 너무 자주 출력하지 않도록
      if (loopCounter.current % 60 === 0) {
        console.log('⚠️ 비디오가 일시정지 상태');
      }
      // 모바일에서 자동 재생 시도
      if (isMobile && video.paused) {
        video.play().catch(e => {
          if (loopCounter.current % 60 === 0) {
            console.warn('Auto-play failed:', e);
          }
        });
      }
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    
    // 캔버스 크기가 비디오와 맞지 않으면 재동기화
    if (canvas) {
      // 매 프레임마다 비디오와 캔버스 크기 확인
      const videoRect = video.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      
      // 캔버스 표시 크기가 비디오와 다르면 재동기화
      if (Math.abs(canvasRect.width - videoRect.width) > 1 || 
          Math.abs(canvasRect.height - videoRect.height) > 1 ||
          canvas.width !== video.videoWidth || 
          canvas.height !== video.videoHeight) {
        syncCanvasToVideo();
      }
    }

    // 이미 처리 중이면 건너뛰기
    if (processingRef.current) {
      rafId.current = requestAnimationFrame(loopRef.current || loop);
      return;
    }
    
    processingRef.current = true;
    
    try {
        // timestamp 이슈 해결: 항상 증가하는 타임스탬프 사용
        // performance.now()는 페이지 로드 후 경과 시간(밀리초)
        // MediaPipe는 마이크로초를 기대하므로 * 1000
        const currentTime = performance.now();
        const timestamp = Math.floor(currentTime * 1000);
        
        // 타임스탬프는 항상 현재 시간 사용 (단조 증가 보장)
        timestampRef.current = timestamp;
        
        // detectForVideo 존재 여부 확인
        if (!pose || typeof pose.detectForVideo !== 'function') {
          if (loopCounter.current % 30 === 0) {
            console.warn('⚠️ Pose detector not ready yet');
          }
          processingRef.current = false;
          rafId.current = requestAnimationFrame(loopRef.current || loop);
          return;
        }
        
        let results;
        try {
          results = pose.detectForVideo(video, timestampRef.current);
          // 성공 시 에러 카운트 리셋
          if (errorCount.current > 0) {
            errorCount.current = Math.max(0, errorCount.current - 1);
          }
        } catch (detectionError: any) {
          const msg = String(detectionError?.message || detectionError);
          errorCount.current++;
          lastErrorTime.current = currentTime;
          
          if (msg.includes('timestamp mismatch') || msg.includes('Current minimum expected timestamp')) {
            console.log('⚠️ Timestamp mismatch detected, continuing with current time...');
            // 현재 시간으로 계속 진행
            processingRef.current = false;
            rafId.current = requestAnimationFrame(loopRef.current || loop);
            return;
          } else if (msg.includes('memory access out of bounds')) {
            console.warn('🔄 [모바일] Memory error detected, resetting pose...');
            processingRef.current = false;
            
            // 메모리 에러는 심각하므로 초기화 후 잠시 대기
            setTimeout(async () => {
              await initializeMediaPipe();
              rafId.current = requestAnimationFrame(loopRef.current || loop);
            }, 2000);
            return;
          } else {
            console.error('😨 [모바일] Pose detection error:', detectionError);
            processingRef.current = false;
            
            // 일반 에러는 조금 대기 후 재시도
            setTimeout(() => {
              rafId.current = requestAnimationFrame(loopRef.current || loop);
            }, 100);
            return;
          }
        }
        
        // 디버그 로깅 최소화 (개발 모드에서만, 100프레임마다)
        if (import.meta.env.DEV && loopCounter.current % 100 === 0) {
          console.log('🎬 Pose detection status:', {
            timestamp: timestampRef.current,
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
          
          // 성능 최적화: 상태 업데이트 최소화
          // 분석 결과가 실제로 변경되었을 때만 업데이트
          if (analysis.currentCount !== exerciseAnalysis.currentCount ||
              analysis.isCorrectForm !== exerciseAnalysis.isCorrectForm ||
              analysis.feedback !== exerciseAnalysis.feedback) {
            setExerciseAnalysis(analysis);
          }
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
    
    // 다음 프레임 예약
    rafId.current = requestAnimationFrame(loopRef.current || loop);
  }, [pose, addLog, resetPose, onPose, selectedExercise, embedded]); // isDetecting 제거 (ref 사용)

  // loopRef에 loop 함수 할당
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // 컴포넌트 마운트 시 초기화 + 환경 로그
  useEffect(() => {
    let mounted = true; // 마운트 상태 추적
    let cleanupPose: PoseLandmarker | null = null; // 정리할 pose 인스턴스 추적
    
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
    
    // MediaPipe 초기화 (비동기)
    const initPose = async () => {
      if (!mounted) return; // 언마운트된 경우 중단
      
      try {
        if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 초기화 시작');
        addLog('MediaPipe Pose 모델 로드 시작', { version: MEDIAPIPE_VERSION });
        
        // 매니저를 통해 인스턴스 가져오기 (중복 생성 방지)
        const instance = await mediaPipeManager.getPoseLandmarker();
        
        if (!mounted) {
          // 언마운트된 경우 매니저가 관리하므로 별도 정리 불필요
          return;
        }
        
        cleanupPose = instance; // 참조만 보관 (매니저가 실제 관리)
        setPose(instance);
        if (!embedded && import.meta.env.DEV) console.log('📱 [모바일 디버그] MediaPipe 로드 성공');
        addLog('✅ MediaPipe Pose 모델 로드 완료');
      } catch (error) {
        if (!mounted) return;
        const msg = String((error as any)?.message || error);
        if (msg.includes('Too frequent')) {
          console.warn('MediaPipe 초기화 빈도 제한');
          return;
        }
        if (!embedded && import.meta.env.DEV) console.error('📱 [모바일 디버그] MediaPipe 로드 실패:', msg);
        addLog('❌ MediaPipe 모델 로드 실패', { error: msg });
      }
    };
    
    // 초기화 실행
    initPose();
    
    // 외부에서 운동 타입을 지정한 경우 동기화
    if (exerciseType) setSelectedExercise(exerciseType);
    
    // RAF 루프 시작: pose가 준비된 후에만 시작
    const startLoopTimer = setTimeout(() => {
      if (mounted && !rafStartedRef.current && pose && loopRef.current) {
        console.log('🎬 초기 루프 시작 (pose 준비됨)');
        rafStartedRef.current = true;
        rafId.current = requestAnimationFrame(loopRef.current);
      } else if (mounted && !rafStartedRef.current) {
        console.log('⏳ RAF 루프 대기 중 (pose 아직 준비 안됨)');
      }
    }, 500); // 지연 시간 증가
    
    return () => {
      mounted = false; // 언마운트 상태로 변경
      clearTimeout(startLoopTimer);
      // 카메라 정지
      stopCamera();
      
      // 루프 중단 플래그 설정
      rafStartedRef.current = false;
      
      // 루프 정리
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (simRafId.current) {
        cancelAnimationFrame(simRafId.current);
        simRafId.current = null;
      };
      processingRef.current = false;
      loopCounter.current = 0;
      errorCount.current = 0;
      
      // MediaPipe 매니저에 사용자 해제 알림
      mediaPipeManager.releaseUser();
      cleanupPose = null;
      
      // StreamManager에 사용자 해제 알림 (스트림은 유지됨)
      streamManager.releaseUser();
      
      // 비디오 엘리먼트에서 스트림 분리만 수행 (스트림 자체는 StreamManager가 관리)
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
      
      if (restoreConsole) restoreConsole();
    };
  }, [addLog, exerciseType, embedded, pose]); // loop 제거하고 pose 추가

  // 내장 모드 + 자동 시작이면 마운트 후 카메라 자동 시작
  // startCameraRef를 사용하여 최신 startCamera 함수 참조
  const startCameraRef = useRef(startCamera);
  useEffect(() => {
    startCameraRef.current = startCamera;
  }, [startCamera]);
  
  useEffect(() => {
    console.log('🚀 AutoStart Effect - autoStart:', autoStart, 'embedded:', embedded, 'processed:', autoStartProcessedRef.current);
    
    // autoStart가 false면 처리 플래그 리셋
    if (!autoStart) {
      autoStartProcessedRef.current = false;
      return;
    }
    
    // 이미 처리했으면 무시
    if (autoStartProcessedRef.current) {
      console.log('⚠️ AutoStart already processed, skipping');
      return;
    }
    
    autoStartProcessedRef.current = true;
    
    let mounted = true;
    let startAttempts = 0;
    const maxAttempts = 3;
    
    const tryStartCamera = async () => {
      if (!mounted) {
        console.log('❌ Component unmounted, canceling auto-start');
        return;
      }
      
      // 이미 감지 중이면 무시
      if (isDetectingRef.current) {
        console.log('✅ Already detecting, skipping auto-start');
        return;
      }
      
      if (startAttempts >= maxAttempts) {
        console.log('❌ Max attempts reached, giving up');
        return;
      }
      
      startAttempts++;
      console.log(`🎥 Auto-start attempt ${startAttempts}/${maxAttempts}`);
      
      // pose가 준비될 때까지 대기 (최대 3초로 증가)
      let waitTime = 0;
      const checkInterval = 100;
      const maxWaitTime = 3000;
      
      while (waitTime < maxWaitTime && mounted) {
        // pose가 준비되었는지 확인
        const poseReady = mediaPipeManager.isReady();
        if (poseReady) {
          console.log('✅ Pose is ready, proceeding with camera start');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
      }
      
      if (mounted) {
        console.log('📷 Calling startCamera from auto-start');
        // ref를 통해 최신 startCamera 함수 호출
        await startCameraRef.current();
        
        // 잠시 대기 후 상태 확인
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 재시도가 필요한지 확인 (여전히 카메라가 시작되지 않은 경우)
        const video = videoRef.current;
        if (!video?.srcObject && startAttempts < maxAttempts) {
          console.log('⏰ Camera not started, scheduling retry in 2 seconds');
          setTimeout(() => tryStartCamera(), 2000);
        } else if (video?.srcObject) {
          console.log('✅ Camera started successfully');
        }
      }
    };
    
    // 초기 시도를 약간 지연
    console.log('⏰ Scheduling initial auto-start in 1000ms');
    const timer = setTimeout(() => tryStartCamera(), 1000);
    
    return () => {
      console.log('🧹 Cleaning up auto-start effect');
      mounted = false;
      clearTimeout(timer);
    };
  }, [autoStart, embedded]); // 의존성 최소화

  // pose가 준비되면 RAF 루프 시작 (autoStart이고 카메라가 켜진 경우)
  useEffect(() => {
    if (!pose || !loopRef.current) return;
    
    // isDetectingRef는 ref이므로 변경을 감지하려면 주기적으로 체크
    const checkInterval = setInterval(() => {
      if (isDetectingRef.current && !rafStartedRef.current) {
        console.log('🎬 [Pose Ready] RAF 루프 시작 (pose 준비 완료, 카메라 활성)');
        rafStartedRef.current = true;
        rafId.current = requestAnimationFrame(loopRef.current);
        clearInterval(checkInterval);
      }
    }, 100);
    
    // 5초 후에는 자동으로 정리
    const timeout = setTimeout(() => clearInterval(checkInterval), 5000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [pose]); // pose가 변경될 때마다 체크 시작

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
    // 타임스탬프는 performance.now() 기반이므로 별도 리셋 불필요
    console.log('🔄 Exercise changed');
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

      <div className="video-container" 
        onClick={(e) => { 
          // 버튼이 클릭된 경우 컨테이너 클릭 무시
          if (e.target !== e.currentTarget) return;
          if (!isDetecting && isMobile) {
            console.log('📱 [모바일] 비디오 컨테이너 클릭됨');
            startCamera();
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          data-webkit-playsinline="true"
          data-x5-playsinline="true"
          data-x5-video-player-type="h5"
          data-x5-video-player-fullscreen="true"
          className="pose-video"
          style={{ 
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            position: 'relative',
            zIndex: 1
          }}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            console.log('📷 [모바일] onLoadedMetadata 이벤트:', {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState
            });
          }}
          onCanPlay={(e) => {
            console.log('📷 [모바일] onCanPlay 이벤트 발생');
          }}
          onPlay={(e) => {
            console.log('📷 [모바일] onPlay 이벤트 발생');
          }}
          onError={(e) => {
            const video = e.currentTarget;
            console.error('📷 [모바일] 비디오 에러:', video.error);
            setCameraError(`비디오 에러: ${video.error?.message || 'Unknown'}`);
          }}
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
            onTouchEnd={(e) => {
              console.log('📱 [모버일] 카메라 버튼 터치!');
              e.preventDefault();
              e.stopPropagation();
              // 터치 이벤트에서도 startCamera 호출
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