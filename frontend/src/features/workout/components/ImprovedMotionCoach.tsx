/**
 * 개선된 MotionCoach - 안정성 및 성능 최적화
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hybridTTSService } from '@services/hybridTTSService';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import './MotionCoach.css';
import '@components/ui/styles/pose-detection.css';

// 개선된 유틸리티 import
import { mediaLoader, MediaPipeLoader } from './MediaPipeLoader';
import type { MediaPipeConfig } from './MediaPipeLoader';
import { cameraManager } from './CameraManager';
import type { CameraConfig } from './CameraManager';
import { PoseRenderer, PoseRendererFactory } from './PoseRenderer';
import { globalPoseSmoothing } from './PoseSmoothing';
import type { PoseKeypoint } from './PoseSmoothing';
import { globalAdaptiveAnalyzer } from './AdaptiveMultiJointAnalyzer';
import type { UserProfile, AnalysisContext } from './AdaptiveMultiJointAnalyzer';
import { memoryManager } from './MemoryManager';
import { compatibilityChecker } from './BrowserCompatibility';

type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 'burpee' | 'mountain_climber' | 'bridge' | 'situp' | 'crunch';

interface ExerciseAnalysis {
  exerciseType: string | null;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
  multiJointAnalysis?: any;
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
  duration: number;
  caloriesBurned?: number;
}

interface MotionCoachProps {
  exerciseType?: ExerciseType;
  onSessionComplete?: (sessionData: any) => void;
  targetSets?: number;
  targetReps?: number;
  currentSet?: number;
  onSetComplete?: (reps: number, formScore: number, corrections: string[]) => void;
  autoMode?: boolean;
}

const ImprovedMotionCoach: React.FC<MotionCoachProps> = ({ 
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
  const poseRendererRef = useRef<PoseRenderer | null>(null);
  const rafId = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  
  // 상태 관리
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(exerciseType);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(true);
  const [compatibilityStatus, setCompatibilityStatus] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  
  // 에러 상태
  const [error, setError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Refs for performance
  const exerciseAnalysisRef = useRef<ExerciseAnalysis>({
    exerciseType: exerciseType,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '시스템을 초기화하는 중입니다...',
    confidence: 0
  });
  
  const sessionStartTimeRef = useRef<Date | null>(null);
  const performanceHistoryRef = useRef<any[]>([]);
  const formCorrectionsRef = useRef<string[]>([]);
  const stateRef = useRef<{ phase: 'up' | 'down'; count: number }>({ phase: 'up', count: 0 });
  
  // 로깅
  const [logs, setLogs] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);

  const addLog = useCallback((msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const logMessage = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-200), logMessage]); // 로그 크기 제한
  }, []);

  /**
   * 초기화 및 호환성 검사
   */
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        addLog('시스템 초기화 시작');
        
        // 브라우저 호환성 검사
        const compatibility = compatibilityChecker.checkCompatibility();
        const mediaPipeCompat = compatibilityChecker.checkMediaPipeCompatibility();
        
        setCompatibilityStatus({ ...compatibility, mediaipe: mediaPipeCompat });
        
        if (!compatibility.isCompatible) {
          const errorInfo = compatibilityChecker.getUserFriendlyErrorMessage('호환성 문제');
          throw new Error(errorInfo.message);
        }
        
        // 사용자 프로필 설정
        const userProfile: UserProfile = {
          experience: 'intermediate', // 실제로는 사용자 설정에서 가져와야 함
          preferredAnalysisDepth: 'standard'
        };
        globalAdaptiveAnalyzer.setUserProfile(userProfile);
        
        // MediaPipe 초기화 - 더 자세한 로깅 추가
        const deviceCapability = MediaPipeLoader.detectDeviceCapability();
        const mediaPipeConfig = MediaPipeLoader.getOptimalConfig(deviceCapability);
        
        addLog('MediaPipe 초기화 시작', { deviceCapability, config: mediaPipeConfig });
        
        // MediaPipe 로딩 상태 모니터링
        const pose = await mediaLoader.loadPose(mediaPipeConfig, {
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 30000
        });
        
        // Pose 인스턴스 검증
        if (!pose) {
          throw new Error('MediaPipe Pose 인스턴스 생성 실패');
        }
        
        // Pose 설정 확인
        addLog('Pose 설정 확인', { 
          instance: !!pose,
          config: mediaPipeConfig
        });
        
        setIsInitialized(true);
        addLog('✅ 시스템 초기화 완료');
        
      } catch (error) {
        const errorInfo = compatibilityChecker.getUserFriendlyErrorMessage(error as Error);
        setError(errorInfo.message);
        addLog('❌ 초기화 실패', { error: String(error), stack: (error as Error).stack });
      }
    };

    initializeSystem();
    
    return () => {
      // 정리
      stopCamera();
      memoryManager.cleanup();
    };
  }, [addLog]);

  /**
   * 카메라 시작
   */
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !isInitialized) {
      addLog('카메라 시작 조건 미충족', { 
        hasVideoRef: !!videoRef.current, 
        isInitialized 
      });
      return;
    }

    try {
      setError(null);
      addLog('카메라 시작 시도');
      
      // MediaPipe Pose 인스턴스 확인
      const pose = mediaLoader.getCurrentPose();
      if (!pose) {
        throw new Error('MediaPipe Pose 인스턴스가 없습니다. 시스템을 다시 초기화해주세요.');
      }
      
      const cameraConfig: CameraConfig = cameraManager.getOptimalConfig('balanced');
      addLog('카메라 설정', cameraConfig);
      
      const status = await cameraManager.startCamera(videoRef.current, cameraConfig);
      
      if (status.isActive) {
        addLog('✅ 카메라 스트림 시작 성공', status.deviceInfo);
        
        // 비디오 요소 상태 확인
        const video = videoRef.current;
        if (video.videoWidth && video.videoHeight) {
          addLog('비디오 해상도 확인', { 
            width: video.videoWidth, 
            height: video.videoHeight,
            readyState: video.readyState
          });
        } else {
          addLog('⚠️ 비디오 해상도 아직 준비되지 않음', { readyState: video.readyState });
        }
        
        // 캔버스 초기화
        if (canvasRef.current) {
          poseRendererRef.current = PoseRendererFactory.createOptimizedRenderer(
            canvasRef.current, 
            selectedExercise
          );
          
          // 캔버스 크기 동기화
          if (video.videoWidth && video.videoHeight) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            addLog('캔버스 크기 동기화 완료', { 
              width: canvasRef.current.width, 
              height: canvasRef.current.height 
            });
          }
        }
        
        setIsDetecting(true);
        
        // 메모리 관리 등록
        memoryManager.registerMediaStream(status.deviceInfo as any, 'main-camera');
        
        // 포즈 검출 시작
        startPoseDetection();
        
        addLog('✅ 카메라 시작 완료', status.deviceInfo);
      } else {
        throw new Error(`카메라 시작 실패: ${status.error}`);
      }
    } catch (error) {
      const errorInfo = compatibilityChecker.getUserFriendlyErrorMessage(error as Error);
      setError(errorInfo.message);
      addLog('❌ 카메라 시작 실패', { error: String(error), stack: (error as Error).stack });
    }
  }, [isInitialized, selectedExercise, addLog]);

  /**
   * 포즈 검출 시작
   */
  const startPoseDetection = useCallback(() => {
    const pose = mediaLoader.getCurrentPose();
    if (!pose) {
      addLog('❌ Pose 인스턴스가 없음');
      return;
    }

    addLog('포즈 검출 시작', { poseInstance: !!pose });

    // 결과 핸들러 설정
    pose.onResults((results: any) => {
      if (results.poseLandmarks && results.poseLandmarks.length) {
        addLog('🎯 포즈 검출됨', { 
          landmarks: results.poseLandmarks.length,
          timestamp: Date.now()
        });
        
        // 스무딩된 랜드마크로 분석
        const rawKeypoints: PoseKeypoint[] = results.poseLandmarks.map((lm: any) => ({
          x: lm.x,
          y: lm.y,
          score: lm.visibility
        }));
        
        const smoothedPose = globalPoseSmoothing.addPose(rawKeypoints);
        const analysis = analyzeExercise(smoothedPose.keypoints, selectedExercise);
        
        // 분석 결과 업데이트
        exerciseAnalysisRef.current = analysis;
        recordPerformance(analysis);
        
        // 렌더링
        if (poseRendererRef.current) {
          poseRendererRef.current.renderPose(smoothedPose.keypoints);
        }
      } else {
        // 포즈가 검출되지 않았을 때 로깅 (빈도 제한)
        if (Math.random() < 0.01) { // 1% 확률로만 로깅
          addLog('⚠️ 포즈 미검출', { 
            timestamp: Date.now(),
            hasResults: !!results,
            resultsKeys: results ? Object.keys(results) : []
          });
        }
      }
    });

    // 검출 루프 시작
    const detectLoop = async () => {
      const video = videoRef.current;
      if (!video || !isDetecting || processingRef.current) {
        rafId.current = memoryManager.registerAnimationFrame(detectLoop);
        return;
      }

      if (video.videoWidth && video.videoHeight) {
        processingRef.current = true;
        try {
          await pose.send({ image: video });
        } catch (error) {
          addLog('❌ 포즈 검출 오류', { error: String(error), stack: (error as Error).stack });
        } finally {
          processingRef.current = false;
        }
      } else {
        // 비디오 해상도가 준비되지 않은 경우 로깅
        if (Math.random() < 0.1) { // 10% 확률로만 로깅
          addLog('⚠️ 비디오 해상도 미준비', { 
            width: video.videoWidth, 
            height: video.videoHeight,
            readyState: video.readyState
          });
        }
      }

      rafId.current = memoryManager.registerAnimationFrame(detectLoop);
    };

    rafId.current = memoryManager.registerAnimationFrame(detectLoop);
    addLog('✅ 포즈 검출 루프 시작');
  }, [isDetecting, selectedExercise, addLog]);

  /**
   * 카메라 중지
   */
  const stopCamera = useCallback(() => {
    try {
      setIsDetecting(false);
      cameraManager.stopCamera();
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      
      if (poseRendererRef.current) {
        poseRendererRef.current.dispose();
        poseRendererRef.current = null;
      }
      
      addLog('⏹️ 카메라 정지 완료');
    } catch (error) {
      addLog('카메라 정지 오류', { error: String(error) });
    }
  }, [addLog]);

  /**
   * 운동 분석
   */
  const analyzeExercise = useCallback((landmarks: PoseKeypoint[], type: ExerciseType): ExerciseAnalysis => {
    try {
      // 기본 분석
      const basicAnalysis = performBasicAnalysis(landmarks, type);
      
      // 적응형 다중 관절 분석
      const context: AnalysisContext = {
        exerciseType: type,
        sessionDuration: sessionStartTimeRef.current 
          ? (Date.now() - sessionStartTimeRef.current.getTime()) / 1000 
          : 0,
        currentSet: currentSet,
        totalSets: targetSets,
        fatigueLevel: Math.min(1, (Date.now() - (sessionStartTimeRef.current?.getTime() || Date.now())) / 300000) // 5분 기준
      };
      
      const multiJointAnalysis = globalAdaptiveAnalyzer.analyzeMultiJoint(landmarks, type, context);
      
      // 결합된 분석 결과
      return {
        ...basicAnalysis,
        multiJointAnalysis,
        qualityGrade: multiJointAnalysis.qualityGrade,
        formCorrections: multiJointAnalysis.formCorrections,
        confidence: Math.min(1.0, basicAnalysis.confidence * 0.6 + multiJointAnalysis.confidenceLevel * 0.4)
      };
    } catch (error) {
      addLog('운동 분석 오류', { error: String(error) });
      return {
        exerciseType: type,
        currentCount: stateRef.current.count,
        isCorrectForm: false,
        feedback: '분석 중 오류가 발생했습니다',
        confidence: 0
      };
    }
  }, [currentSet, targetSets, addLog]);

  /**
   * 기본 운동 분석
   */
  const performBasicAnalysis = (landmarks: PoseKeypoint[], type: ExerciseType): ExerciseAnalysis => {
    // 기존 분석 로직 (간소화)
    switch (type) {
      case 'squat':
        return analyzeSquat(landmarks);
      case 'pushup':
        return analyzePushup(landmarks);
      default:
        return {
          exerciseType: type,
          currentCount: stateRef.current.count,
          isCorrectForm: false,
          feedback: '운동을 선택하세요',
          confidence: 0
        };
    }
  };

  // 간소화된 분석 함수들
  const analyzeSquat = (landmarks: PoseKeypoint[]): ExerciseAnalysis => {
    // 간단한 스쿼트 분석 로직
    return {
      exerciseType: 'squat',
      currentCount: stateRef.current.count,
      isCorrectForm: true,
      feedback: '스쿼트 동작 중',
      confidence: 0.8
    };
  };

  const analyzePushup = (landmarks: PoseKeypoint[]): ExerciseAnalysis => {
    // 간단한 푸시업 분석 로직
    return {
      exerciseType: 'pushup',
      currentCount: stateRef.current.count,
      isCorrectForm: true,
      feedback: '푸시업 동작 중',
      confidence: 0.8
    };
  };

  /**
   * 퍼포먼스 데이터 기록
   */
  const recordPerformance = useCallback((analysis: ExerciseAnalysis) => {
    if (!isSessionActive) return;

    const performanceData = {
      timestamp: new Date(),
      repCount: analysis.currentCount,
      formScore: analysis.isCorrectForm ? 1 : 0,
      confidence: analysis.confidence,
      feedback: analysis.feedback,
      qualityGrade: analysis.qualityGrade
    };

    performanceHistoryRef.current.push(performanceData);

    // 자세 교정 피드백 기록
    if (!analysis.isCorrectForm && analysis.feedback) {
      if (!formCorrectionsRef.current.includes(analysis.feedback)) {
        formCorrectionsRef.current.push(analysis.feedback);
      }
    }
  }, [isSessionActive]);

  /**
   * 세션 시작
   */
  const startWorkoutSession = useCallback(() => {
    const now = new Date();
    setIsSessionActive(true);
    sessionStartTimeRef.current = now;
    performanceHistoryRef.current = [];
    formCorrectionsRef.current = [];
    stateRef.current = { phase: 'up', count: 0 };
    
    addLog('🏋️ 운동 세션 시작', { exerciseType: selectedExercise, startTime: now });
    
    if (isTTSEnabled) {
      hybridTTSService.synthesizeExerciseGuide(`${selectedExercise} 운동을 시작합니다`);
    }
  }, [selectedExercise, isTTSEnabled, addLog]);

  /**
   * 세션 종료
   */
  const endWorkoutSession = useCallback(async () => {
    if (!isSessionActive || !sessionStartTimeRef.current) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000);
    
    const sessionData: WorkoutSessionData = {
      exerciseType: selectedExercise,
      startTime: sessionStartTimeRef.current,
      endTime: endTime,
      totalReps: stateRef.current.count,
      averageFormScore: performanceHistoryRef.current.length > 0 
        ? performanceHistoryRef.current.reduce((sum: number, p: any) => sum + p.formScore, 0) / performanceHistoryRef.current.length
        : 0,
      formCorrections: formCorrectionsRef.current,
      duration: duration,
      caloriesBurned: Math.round(duration * 0.1) // 간단한 칼로리 계산
    };

    addLog('🏋️ 운동 세션 완료', sessionData);
    
    if (isTTSEnabled) {
      hybridTTSService.synthesizeExerciseGuide(`운동 완료! ${stateRef.current.count}회 수행했습니다`);
    }

    if (onSessionComplete) {
      onSessionComplete(sessionData);
    }

    setIsSessionActive(false);
    sessionStartTimeRef.current = null;
  }, [isSessionActive, selectedExercise, isTTSEnabled, onSessionComplete, addLog]);

  /**
   * 성능 메트릭 업데이트
   */
  useEffect(() => {
    const updateMetrics = () => {
      const metrics = memoryManager.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    };

    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 자동 모드 처리
   */
  useEffect(() => {
    if (autoMode && !isDetecting && isInitialized) {
      startCamera();
    }
  }, [autoMode, isDetecting, isInitialized, startCamera]);

  useEffect(() => {
    if (autoMode && isDetecting && !isSessionActive) {
      startWorkoutSession();
    }
  }, [autoMode, isDetecting, isSessionActive, startWorkoutSession]);

  // 에러 복구 시도
  const handleRetry = useCallback(() => {
    setError(null);
    setIsRecovering(true);
    
    setTimeout(() => {
      setIsRecovering(false);
      if (!isDetecting) {
        startCamera();
      }
    }, 1000);
  }, [isDetecting, startCamera]);

  return (
    <div className="motion-coach">
      {/* 호환성 경고 */}
      {compatibilityStatus && !compatibilityStatus.isCompatible && (
        <div className="compatibility-warning">
          <h3>⚠️ 브라우저 호환성 문제</h3>
          <p>일부 기능이 제한될 수 있습니다.</p>
          <details>
            <summary>자세한 정보</summary>
            <pre>{compatibilityChecker.generateCompatibilityReport()}</pre>
          </details>
        </div>
      )}

      {/* 문제 해결 가이드 */}
      {error && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🔧 문제 해결 가이드</h4>
          <div style={{ fontSize: '14px', color: '#856404' }}>
            <p><strong>현재 문제:</strong> {error}</p>
            <div style={{ marginTop: '10px' }}>
              <strong>해결 방법:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>브라우저를 새로고침해보세요</li>
                <li>카메라 권한을 확인해주세요</li>
                <li>HTTPS 환경에서 실행 중인지 확인해주세요</li>
                <li>최신 브라우저를 사용해주세요</li>
                <li>인터넷 연결을 확인해주세요</li>
              </ul>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button 
                onClick={() => window.location.href = '/mediapipe-test'} 
                style={{ 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                🧪 MediaPipe 테스트 실행
              </button>
              <button 
                onClick={() => window.location.reload()} 
                style={{ 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                🔄 페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 카메라 영역 */}
      <div className="camera-container" onClick={() => { if (!isDetecting && isInitialized) startCamera(); }}>
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
            disabled={isDetecting || !isInitialized}
          >
            {!isInitialized ? '초기화 중...' : isDetecting ? '감지 중...' : '카메라 시작'}
          </button>
          
          <button 
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className={`tts-toggle ${isTTSEnabled ? 'enabled' : 'disabled'}`}
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

      {/* 분석 패널 */}
      <div className="analysis-panel">
        <h3>운동 분석</h3>
        <div className="analysis-content">
          <p><strong>운동 유형:</strong> {exerciseAnalysisRef.current.exerciseType || '없음'}</p>
          <p><strong>카운트:</strong> {exerciseAnalysisRef.current.currentCount}</p>
          <p><strong>자세:</strong> {exerciseAnalysisRef.current.isCorrectForm ? '올바름' : '수정 필요'}</p>
          <p><strong>신뢰도:</strong> {(exerciseAnalysisRef.current.confidence * 100).toFixed(1)}%</p>
          <p><strong>피드백:</strong> {exerciseAnalysisRef.current.feedback}</p>
          
          {/* 다중 관절 분석 결과 */}
          {exerciseAnalysisRef.current.multiJointAnalysis && (
            <div className="multi-joint-analysis">
              <h5>🔬 통합 분석</h5>
              <p><strong>품질 등급:</strong> {exerciseAnalysisRef.current.qualityGrade}</p>
              <p><strong>일관성:</strong> {(exerciseAnalysisRef.current.multiJointAnalysis.overallConsistency * 100).toFixed(1)}%</p>
              {exerciseAnalysisRef.current.formCorrections && exerciseAnalysisRef.current.formCorrections.length > 0 && (
                <div>
                  <strong>교정 제안:</strong>
                  <ul>
                    {exerciseAnalysisRef.current.formCorrections.map((correction, index) => (
                      <li key={index}>{correction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* 성능 메트릭 */}
          {performanceMetrics && (
            <div className="performance-metrics">
              <h5>📊 성능 지표</h5>
              <p>FPS: {performanceMetrics.fps}</p>
              <p>메모리: {performanceMetrics.memoryUsage.memoryUsagePercent.toFixed(1)}%</p>
              <p>활성 리소스: {performanceMetrics.activeTasks}</p>
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
          <button onClick={() => setLogs([])}>로그 지우기</button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ImprovedMotionCoach);