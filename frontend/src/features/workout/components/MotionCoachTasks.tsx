import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import './MotionCoach.css';
import type { ExerciseAnalysis, ExerciseAnalyzer } from '../../pose-detection/analyzers/base/BaseAnalyzer';
import { LungeAnalyzer } from '../../pose-detection/analyzers/lowerBody/LungeAnalyzer';
import { PushupAnalyzer } from '../../pose-detection/analyzers/upperBody/PushupAnalyzer';
import { PlankAnalyzer } from '../../pose-detection/analyzers/core/PlankAnalyzer';
import { CalfRaiseAnalyzer } from '../../pose-detection/analyzers/lowerBody/CalfRaiseAnalyzer';
import { BurpeeAnalyzer } from '../../pose-detection/analyzers/cardio/BurpeeAnalyzer';
import { MountainClimberAnalyzer } from '../../pose-detection/analyzers/cardio/MountainClimberAnalyzer';
import { SquatAnalyzer } from '../../pose-detection/analyzers/lowerBody/SquatAnalyzer';
import { BridgeAnalyzer } from '../../pose-detection/analyzers/lowerBody/BridgeAnalyzer';
import { SitupAnalyzer } from '../../pose-detection/analyzers/core/SitupAnalyzer';
import { CrunchAnalyzer } from '../../pose-detection/analyzers/core/CrunchAnalyzer';

// 운동 타입 (기존과 호환)
type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise' | 'burpee' | 'mountain_climber' | 'bridge' | 'situp' | 'crunch';

interface MotionCoachTasksProps {
  exerciseType?: ExerciseType;
}

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const MotionCoachTasks: React.FC<MotionCoachTasksProps> = ({ exerciseType = 'squat' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // 운동별 분석기 인스턴스
  const analyzerRef = useRef<ExerciseAnalyzer>(new SquatAnalyzer());
  const lastAnalysisRef = useRef<ExerciseAnalysis | null>(null);

  const draw = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    // 실제 화면에 표시되는 비디오 영역 크기 기준으로 동기화
    const rect = video.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));

    if (canvas.width !== cssW || canvas.height !== cssH) {
      canvas.width = cssW;   // 버퍼도 CSS 픽셀과 동일 (DPR 스케일 미사용)
      canvas.height = cssH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    }

    // 변환 초기화 후 CSS 픽셀 기준으로 그리기
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!results || !results.landmarks || results.landmarks.length === 0) {
      return;
    }

    const lm = results.landmarks[0];

    // 1) 랜드마크 드로잉 (DrawingUtils는 정규화 좌표를 캔버스 크기에 맞게 처리)
    const drawingUtils = new DrawingUtils(ctx);
    drawingUtils.drawLandmarks(lm, { radius: () => 3 });
    // @ts-ignore
    if ((PoseLandmarker as any).POSE_CONNECTIONS) {
      // @ts-ignore
      drawingUtils.drawConnectors(lm, (PoseLandmarker as any).POSE_CONNECTIONS);
    }

    // 2) 간단 분석 (스쿼트 등)
    try {
      const analysis = analyzerRef.current.analyze(lm);
      lastAnalysisRef.current = analysis;

      // 3) HUD 텍스트 오버레이 (좌상단)
      const hudLines = [
        `운동: ${analysis.exerciseType}`,
        `횟수: ${analysis.currentCount}`,
        `정확도(가시성): ${(analysis.confidence * 100).toFixed(0)}%`,
        `폼: ${analysis.isCorrectForm ? '좋음' : '교정 필요'}`
      ];
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(8, 8, 200, 80);
      ctx.fillStyle = '#00FF88';
      ctx.font = '14px sans-serif';
      let y = 30;
      for (const line of hudLines) {
        ctx.fillText(line, 16, y);
        y += 18;
      }
    } catch (e) {
      // 분석 실패는 무시하고 드로잉만 유지
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  // 운동 타입 변경 시 분석기 교체
  useEffect(() => {
    switch (exerciseType) {
      case 'squat':
        analyzerRef.current = new SquatAnalyzer();
        break;
      case 'lunge':
        analyzerRef.current = new LungeAnalyzer();
        break;
      case 'pushup':
        analyzerRef.current = new PushupAnalyzer();
        break;
      case 'plank':
        analyzerRef.current = new PlankAnalyzer();
        break;
      case 'calf_raise':
        analyzerRef.current = new CalfRaiseAnalyzer();
        break;
      case 'burpee':
        analyzerRef.current = new BurpeeAnalyzer();
        break;
      case 'mountain_climber':
        analyzerRef.current = new MountainClimberAnalyzer();
        break;
      case 'bridge':
        analyzerRef.current = new BridgeAnalyzer();
        break;
      case 'situp':
        analyzerRef.current = new SitupAnalyzer();
        break;
      case 'crunch':
        analyzerRef.current = new CrunchAnalyzer();
        break;
      // 아직 미구현 분석기는 기본 스쿼트 분석기로 폴백
      default:
        analyzerRef.current = new SquatAnalyzer();
        break;
    }
  }, [exerciseType]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;

    // 비디오/레이아웃 준비 상태 확인 (ROI=0, texImage2D 에러 방지)
    const rect = video.getBoundingClientRect();
    const hasLayout = rect.width > 1 && rect.height > 1;
    const hasPixels = (video.videoWidth || 0) > 0 && (video.videoHeight || 0) > 0;
    const hasData = video.readyState >= 2 && !video.paused && !video.ended;

    if (!hasLayout || !hasPixels || !hasData) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();
    try {
      landmarker.detectForVideo(video, now, (result) => {
        draw(result);
      });
    } catch (e) {
      // WASM 내부 오류가 발생하면 다음 프레임에서 재시도
      // console.warn('detectForVideo error (ignored this frame):', e);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const initPose = useCallback(async () => {
    if (landmarkerRef.current) return true;
    try {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      return true;
    } catch (e) {
      console.error('PoseLandmarker 초기화 실패:', e);
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await video.play();
      setIsDetecting(true);
    } catch (e) {
      console.error('카메라 시작 실패:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await initPose();
      if (!ok) return;
      await startCamera();
    })();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = (videoRef.current?.srcObject as MediaStream) || null;
      stream?.getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [initPose, startCamera]);

  useEffect(() => {
    const onLoaded = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('playing', onLoaded);
    }
    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('playing', onLoaded);
      }
    };
  }, [loop]);

  return (
    <div className="motion-coach">
      <div className="camera-container">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <canvas ref={canvasRef} className="pose-canvas" width={640} height={480} />
        <div className="camera-controls">
          <button onClick={startCamera} className="start-button" disabled={isDetecting}>
            {isDetecting ? '감지 중...' : '카메라 시작'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotionCoachTasks; 