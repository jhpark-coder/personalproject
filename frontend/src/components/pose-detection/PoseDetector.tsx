import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pose } from '@mediapipe/pose';
import './PoseDetector.css';

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

const PoseDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pose, setPose] = useState<any>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: null,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // MediaPipe 초기화
  const initializeMediaPipe = useCallback(async () => {
    try {
      // MediaPipe Pose 모델 로드
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onResults);
      setPose(pose);
      console.log('✅ MediaPipe Pose 모델 로드 완료');
    } catch (error) {
      console.error('❌ MediaPipe 모델 로드 실패:', error);
    }
  }, []);

  // MediaPipe 결과 처리
  const onResults = useCallback((results: any) => {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      
      // 운동 자세 분석
      const analysis = analyzeExerciseForm(landmarks);
      setExerciseAnalysis(analysis);
      
      // 캔버스에 포즈 그리기
      drawPoseOnCanvas(landmarks);
    }
  }, []);

  // 웹캠 시작
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
          aspectRatio: { ideal: 16/9 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsDetecting(true);
        console.log('✅ 웹캠 시작 완료 (MediaPipe용)');
      }
    } catch (error) {
      console.error('❌ 웹캠 시작 실패:', error);
    }
  }, []);

  // 실시간 포즈 감지
  const detectPose = useCallback(async () => {
    if (!pose || !videoRef.current) return;

    try {
      await pose.send({ image: videoRef.current });
    } catch (error) {
      console.error('❌ 포즈 감지 실패:', error);
    }
  }, [pose]);

  // 운동 자세 분석
  const analyzeExerciseForm = (landmarks: any[]) => {
    // 스쿼트 분석
    const squatAnalysis = analyzeSquat(landmarks);
    if (squatAnalysis.isCorrectForm) {
      return {
        exerciseType: 'squat',
        currentCount: squatAnalysis.count,
        isCorrectForm: true,
        feedback: '좋은 스쿼트 자세입니다!',
        confidence: squatAnalysis.confidence
      };
    }

    // 플랭크 분석
    const plankAnalysis = analyzePlank(landmarks);
    if (plankAnalysis.isCorrectForm) {
      return {
        exerciseType: 'plank',
        currentCount: plankAnalysis.count,
        isCorrectForm: true,
        feedback: '올바른 플랭크 자세입니다!',
        confidence: plankAnalysis.confidence
      };
    }

    return {
      exerciseType: null,
      currentCount: 0,
      isCorrectForm: false,
      feedback: '운동 자세를 취해주세요',
      confidence: 0
    };
  };

  // 스쿼트 분석 (MediaPipe landmarks 사용)
  const analyzeSquat = (landmarks: any[]) => {
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return { isCorrectForm: false, count: 0, confidence: 0 };
    }

    // 무릎 각도 계산
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // 스쿼트 자세 판단 (무릎 각도 90-120도)
    const isSquatting = avgKneeAngle >= 90 && avgKneeAngle <= 120;
    const confidence = Math.min(leftKnee.visibility || 0, rightKnee.visibility || 0);

    return {
      isCorrectForm: isSquatting,
      count: isSquatting ? 1 : 0,
      confidence
    };
  };

  // 플랭크 분석 (MediaPipe landmarks 사용)
  const analyzePlank = (landmarks: any[]) => {
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftElbow = landmarks[LEFT_ELBOW];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftHip || !rightHip) {
      return { isCorrectForm: false, count: 0, confidence: 0 };
    }

    // 어깨-팔꿈치-힙 각도 계산
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftHip);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightHip);
    
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    
    // 플랭크 자세 판단 (팔 각도 80-100도)
    const isPlanking = avgArmAngle >= 80 && avgArmAngle <= 100;
    const confidence = Math.min(leftElbow.visibility || 0, rightElbow.visibility || 0);

    return {
      isCorrectForm: isPlanking,
      count: isPlanking ? 1 : 0,
      confidence
    };
  };

  // 각도 계산
  const calculateAngle = (point1: any, point2: any, point3: any): number => {
    const angle = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                  Math.atan2(point1.y - point2.y, point1.x - point2.x);
    return Math.abs(angle * 180 / Math.PI);
  };

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    // 관절점 그리기
    landmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // 관절 연결선 그리기
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
          startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initializeMediaPipe();
  }, [initializeMediaPipe]);

  // 실시간 감지 시작
  useEffect(() => {
    if (isDetecting && pose) {
      const interval = setInterval(detectPose, 33); // 30fps
      return () => clearInterval(interval);
    }
  }, [isDetecting, pose, detectPose]);

  return (
    <div className="pose-detector">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-element"
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
    </div>
  );
};

export default PoseDetector;