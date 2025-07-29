import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import './PoseDetector.css';

interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
}

interface Pose {
  keypoints: PoseKeypoint[];
  score?: number;
}

interface ExerciseAnalysis {
  exerciseType: 'squat' | 'plank' | 'pushup' | null;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
}

// 관절점 인덱스 (MoveNet 17개 포인트)
const LEFT_HIP = 11;
const RIGHT_HIP = 12;
const LEFT_KNEE = 13;
const RIGHT_KNEE = 14;
const LEFT_ANKLE = 15;
const RIGHT_ANKLE = 16;
const LEFT_SHOULDER = 5;
const RIGHT_SHOULDER = 6;
const LEFT_ELBOW = 7;
const RIGHT_ELBOW = 8;

const PoseDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis>({
    exerciseType: null,
    currentCount: 0,
    isCorrectForm: false,
    feedback: '카메라를 켜고 운동을 시작하세요',
    confidence: 0
  });

  // MoveNet 모델 초기화
  const initializeDetector = useCallback(async () => {
    try {
      await tf.ready();
      
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig: poseDetection.MoveNetModelConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // 더 정확한 모델로 변경
        enableSmoothing: true
      };
      
      const detector = await poseDetection.createDetector(model, detectorConfig);
      setDetector(detector);
      console.log('✅ MoveNet THUNDER 모델 로드 완료');
    } catch (error) {
      console.error('❌ MoveNet 모델 로드 실패:', error);
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
          // 더 넓은 시야각을 위한 설정
          aspectRatio: { ideal: 16/9 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsDetecting(true);
        console.log('✅ 웹캠 시작 완료 (전신 트래킹용)');
      }
    } catch (error) {
      console.error('❌ 웹캠 시작 실패:', error);
    }
  }, []);

  // 포즈 감지 및 분석
  const detectPose = useCallback(async () => {
    if (!detector || !videoRef.current || !canvasRef.current) return;

    try {
      const poses = await detector.estimatePoses(videoRef.current);
      
      console.log('감지된 포즈 수:', poses.length);
      
      if (poses.length > 0) {
        const pose = poses[0];
        console.log('포즈 키포인트 수:', pose.keypoints.length);
        console.log('포즈 신뢰도:', pose.score);
        
        // 운동 자세 분석
        const analysis = analyzeExerciseForm(pose);
        setExerciseAnalysis(analysis);
        
        // 캔버스에 포즈 그리기
        drawPoseOnCanvas(pose);
      } else {
        console.log('포즈가 감지되지 않음');
        // 캔버스 초기화
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (error) {
      console.error('❌ 포즈 감지 실패:', error);
    }
  }, [detector]);

  // 운동 자세 분석
  const analyzeExerciseForm = (pose: Pose): ExerciseAnalysis => {
    const keypoints = pose.keypoints;

    // 스쿼트 분석
    const squatAnalysis = analyzeSquat(keypoints);
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
    const plankAnalysis = analyzePlank(keypoints);
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

  // 스쿼트 분석
  const analyzeSquat = (keypoints: PoseKeypoint[]) => {
    const leftHip = keypoints[LEFT_HIP];
    const rightHip = keypoints[RIGHT_HIP];
    const leftKnee = keypoints[LEFT_KNEE];
    const rightKnee = keypoints[RIGHT_KNEE];
    const leftAnkle = keypoints[LEFT_ANKLE];
    const rightAnkle = keypoints[RIGHT_ANKLE];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return { isCorrectForm: false, count: 0, confidence: 0 };
    }

    // 무릎 각도 계산
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // 스쿼트 자세 판단 (무릎 각도 90도 이하)
    const isSquatting = avgKneeAngle < 90;
    const confidence = Math.min(leftKnee.score || 0, rightKnee.score || 0);

    return {
      isCorrectForm: isSquatting,
      count: isSquatting ? 1 : 0,
      confidence
    };
  };

  // 플랭크 분석
  const analyzePlank = (keypoints: PoseKeypoint[]) => {
    const leftShoulder = keypoints[LEFT_SHOULDER];
    const rightShoulder = keypoints[RIGHT_SHOULDER];
    const leftElbow = keypoints[LEFT_ELBOW];
    const rightElbow = keypoints[RIGHT_ELBOW];
    const leftHip = keypoints[LEFT_HIP];
    const rightHip = keypoints[RIGHT_HIP];

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftHip || !rightHip) {
      return { isCorrectForm: false, count: 0, confidence: 0 };
    }

    // 어깨-팔꿈치-힙 각도 계산
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftHip);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightHip);
    
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    
    // 플랭크 자세 판단 (팔 각도 80-100도)
    const isPlanking = avgArmAngle >= 80 && avgArmAngle <= 100;
    const confidence = Math.min(leftElbow.score || 0, rightElbow.score || 0);

    return {
      isCorrectForm: isPlanking,
      count: isPlanking ? 1 : 0,
      confidence
    };
  };

  // 각도 계산
  const calculateAngle = (point1: PoseKeypoint, point2: PoseKeypoint, point3: PoseKeypoint): number => {
    const angle = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                  Math.atan2(point1.y - point2.y, point1.x - point2.x);
    return Math.abs(angle * 180 / Math.PI);
  };

  // 캔버스에 포즈 그리기
  const drawPoseOnCanvas = (pose: Pose) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const video = videoRef.current;
    
    if (!canvas || !ctx || !video) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 비디오와 캔버스 크기 가져오기
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    console.log('비디오 크기:', videoWidth, 'x', videoHeight);
    console.log('캔버스 크기:', canvasWidth, 'x', canvasHeight);

    // 좌표 변환 함수 - 비디오 크기에 맞게 스케일링
    const transformCoordinates = (x: number, y: number) => {
      // MoveNet은 비디오 크기 기준 좌표를 반환
      // 캔버스 크기에 맞게 스케일링
      const scaleX = canvasWidth / videoWidth;
      const scaleY = canvasHeight / videoHeight;
      
      const canvasX = x * scaleX;
      const canvasY = y * scaleY;
      
      console.log(`원본 좌표: (${x}, ${y}), 스케일: (${scaleX}, ${scaleY}), 변환된 좌표: (${canvasX}, ${canvasY})`);
      
      return { x: canvasX, y: canvasY };
    };

    console.log('포즈 그리기 시작, 키포인트 수:', pose.keypoints.length);

    // 관절점 그리기
    pose.keypoints.forEach((keypoint, index) => {
      console.log(`키포인트 ${index}:`, keypoint);
      
      // 임계값을 0.3으로 낮춤 (더 많은 포인트 표시)
      if (keypoint.score && keypoint.score > 0.3) {
        // 좌표 변환
        const transformedCoords = transformCoordinates(keypoint.x, keypoint.y);
        
        console.log(`키포인트 ${index} 그리기: (${transformedCoords.x}, ${transformedCoords.y})`);
        
        // 관절점 원 그리기
        ctx.beginPath();
        ctx.arc(transformedCoords.x, transformedCoords.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0000'; // 빨간색으로 변경 (더 잘 보이게)
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 관절점 번호 표시
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(index.toString(), transformedCoords.x + 15, transformedCoords.y - 15);
        
        // 신뢰도 표시
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px Arial';
        ctx.fillText(keypoint.score.toFixed(2), transformedCoords.x + 15, transformedCoords.y + 25);
      }
    });

    // 관절 연결선 그리기
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4], // 얼굴
      [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], // 팔
      [5, 11], [6, 12], [11, 12], // 몸통
      [11, 13], [12, 14], [13, 15], [14, 16] // 다리
    ];

    connections.forEach(([start, end]) => {
      const startPoint = pose.keypoints[start];
      const endPoint = pose.keypoints[end];
      
      // 임계값을 0.3으로 낮춤
      if (startPoint.score && endPoint.score && 
          startPoint.score > 0.3 && endPoint.score > 0.3) {
        
        // 좌표 변환
        const startCoords = transformCoordinates(startPoint.x, startPoint.y);
        const endCoords = transformCoordinates(endPoint.x, endPoint.y);
        
        console.log(`연결선 그리기: ${start} -> ${end}`);
        
        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });

    // 운동 자세에 따른 추가 시각적 피드백
    if (exerciseAnalysis.exerciseType === 'squat') {
      // 스쿼트 자세 강조
      const leftKnee = pose.keypoints[LEFT_KNEE];
      const rightKnee = pose.keypoints[RIGHT_KNEE];
      
      if (leftKnee && rightKnee && leftKnee.score && rightKnee.score) {
        // 무릎 각도 표시
        const leftHip = pose.keypoints[LEFT_HIP];
        const leftAnkle = pose.keypoints[LEFT_ANKLE];
        const rightHip = pose.keypoints[RIGHT_HIP];
        const rightAnkle = pose.keypoints[RIGHT_ANKLE];
        
        if (leftHip && leftAnkle && rightHip && rightAnkle) {
          const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
          const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
          
          // 좌표 변환
          const leftKneeCoords = transformCoordinates(leftKnee.x, leftKnee.y);
          const rightKneeCoords = transformCoordinates(rightKnee.x, rightKnee.y);
          
          // 각도 텍스트 표시
          ctx.fillStyle = exerciseAnalysis.isCorrectForm ? '#00ff00' : '#ff0000';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(`L: ${leftAngle.toFixed(1)}°`, leftKneeCoords.x + 15, leftKneeCoords.y - 15);
          ctx.fillText(`R: ${rightAngle.toFixed(1)}°`, rightKneeCoords.x + 15, rightKneeCoords.y - 15);
        }
      }
    } else if (exerciseAnalysis.exerciseType === 'plank') {
      // 플랭크 자세 강조
      const leftElbow = pose.keypoints[LEFT_ELBOW];
      const rightElbow = pose.keypoints[RIGHT_ELBOW];
      
      if (leftElbow && rightElbow && leftElbow.score && rightElbow.score) {
        // 팔꿈치 각도 표시
        const leftShoulder = pose.keypoints[LEFT_SHOULDER];
        const leftHip = pose.keypoints[LEFT_HIP];
        const rightShoulder = pose.keypoints[RIGHT_SHOULDER];
        const rightHip = pose.keypoints[RIGHT_HIP];
        
        if (leftShoulder && leftHip && rightShoulder && rightHip) {
          const leftAngle = calculateAngle(leftShoulder, leftElbow, leftHip);
          const rightAngle = calculateAngle(rightShoulder, rightElbow, rightHip);
          
          // 좌표 변환
          const leftElbowCoords = transformCoordinates(leftElbow.x, leftElbow.y);
          const rightElbowCoords = transformCoordinates(rightElbow.x, rightElbow.y);
          
          // 각도 텍스트 표시
          ctx.fillStyle = exerciseAnalysis.isCorrectForm ? '#00ff00' : '#ff0000';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(`L: ${leftAngle.toFixed(1)}°`, leftElbowCoords.x + 15, leftElbowCoords.y - 15);
          ctx.fillText(`R: ${rightAngle.toFixed(1)}°`, rightElbowCoords.x + 15, rightElbowCoords.y - 15);
        }
      }
    }

    // 자세 상태 표시
    if (exerciseAnalysis.exerciseType) {
      ctx.fillStyle = exerciseAnalysis.isCorrectForm ? '#00ff00' : '#ff0000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(
        exerciseAnalysis.isCorrectForm ? '✅ 올바른 자세' : '❌ 자세 교정 필요',
        20, 40
      );
    }
  };

  // 포즈 감지 루프
  useEffect(() => {
    if (isDetecting && detector) {
      const interval = setInterval(detectPose, 100); // 10fps로 변경 (더 빠른 반응)
      return () => clearInterval(interval);
    }
  }, [isDetecting, detector, detectPose]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initializeDetector();
  }, [initializeDetector]);

  return (
    <div className="pose-detector">
      <div className="pose-detector-header">
        <h2>🏃‍♂️ 실시간 운동 자세 교정</h2>
        <button 
          onClick={startCamera}
          disabled={isDetecting}
          className="start-camera-btn"
        >
          {isDetecting ? '카메라 실행 중...' : '카메라 시작'}
        </button>
      </div>

      <div className="pose-detector-content">
        <div className="video-container">
          <video
            ref={videoRef}
            width="800"
            height="600"
            className="pose-video"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width="800"
            height="600"
            className="pose-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none'
            }}
          />
        </div>

        <div className="analysis-panel">
          <div className="exercise-info">
            <h3>📊 운동 분석</h3>
            <div className="info-item">
              <span>운동 종류:</span>
              <span className={exerciseAnalysis.exerciseType ? 'active' : 'inactive'}>
                {exerciseAnalysis.exerciseType ? 
                  (exerciseAnalysis.exerciseType === 'squat' ? '스쿼트' : '플랭크') : 
                  '대기 중'}
              </span>
            </div>
            <div className="info-item">
              <span>자세 정확도:</span>
              <span className={exerciseAnalysis.isCorrectForm ? 'correct' : 'incorrect'}>
                {exerciseAnalysis.isCorrectForm ? '올바름' : '교정 필요'}
              </span>
            </div>
            <div className="info-item">
              <span>신뢰도:</span>
              <span>{(exerciseAnalysis.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="feedback">
            <h4>💡 피드백</h4>
            <p>{exerciseAnalysis.feedback}</p>
          </div>

          <div className="instructions">
            <h4>📋 사용법</h4>
            <ul>
              <li>카메라 시작 버튼을 클릭하세요</li>
              <li><strong>전신이 보이도록 카메라를 멀리 두세요</strong></li>
              <li>스쿼트: 무릎을 90도 이하로 구부리세요</li>
              <li>플랭크: 팔꿈치를 90도로 유지하세요</li>
              <li>실시간으로 자세가 분석됩니다</li>
            </ul>
            <div className="camera-tips">
              <h5>📹 카메라 설정 팁</h5>
              <ul>
                <li>카메라를 2-3m 거리에 두세요</li>
                <li>전신이 화면에 들어오도록 조정하세요</li>
                <li>밝은 조명에서 사용하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoseDetector;