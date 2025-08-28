import React, { useRef, useEffect, useState } from 'react';
import { PoseSmoothing, PoseKeypoint } from './PoseSmoothing';

/**
 * 포즈 스무딩 효과를 시연하는 데모 컴포넌트
 * 개발 환경에서만 사용 - 정확도 개선 검증용
 */
const PoseSmoothingDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smootherRef = useRef(new PoseSmoothing(5, 0.7));
  const [isRunning, setIsRunning] = useState(false);
  const [smoothingQuality, setSmoothingQuality] = useState(0);
  const animationRef = useRef<number>();

  // 시뮬레이션된 노이즈가 있는 포즈 데이터 생성
  const generateNoisyPose = (frame: number): PoseKeypoint[] => {
    const baseKeypoints: PoseKeypoint[] = [];
    
    // 33개 MediaPipe 포즈 포인트 시뮬레이션
    for (let i = 0; i < 33; i++) {
      const baseX = 0.3 + (i % 5) * 0.1; // 기본 X 위치
      const baseY = 0.2 + Math.floor(i / 5) * 0.1; // 기본 Y 위치
      
      // 자연스러운 움직임 시뮬레이션
      const naturalMovement = {
        x: Math.sin(frame * 0.1 + i) * 0.02,
        y: Math.cos(frame * 0.08 + i) * 0.01
      };
      
      // 노이즈 추가 (MediaPipe 떨림 현상 시뮬레이션)
      const noise = {
        x: (Math.random() - 0.5) * 0.02, // ±1% 노이즈
        y: (Math.random() - 0.5) * 0.02
      };
      
      baseKeypoints.push({
        x: Math.max(0, Math.min(1, baseX + naturalMovement.x + noise.x)),
        y: Math.max(0, Math.min(1, baseY + naturalMovement.y + noise.y)),
        score: 0.8 + Math.random() * 0.2 // 80-100% 신뢰도
      });
    }
    
    return baseKeypoints;
  };

  // 캔버스에 포즈 포인트 그리기
  const drawPose = (keypoints: PoseKeypoint[], color: string, offsetX: number = 0) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = color;
    keypoints.forEach((point, i) => {
      if (point && point.score && point.score > 0.5) {
        const x = (point.x * 200) + offsetX; // 200px 너비로 스케일링
        const y = point.y * 300; // 300px 높이로 스케일링
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // 포인트 번호 표시 (디버깅용)
        if (i < 10) {
          ctx.fillText(i.toString(), x + 3, y - 3);
        }
      }
    });
  };

  // 애니메이션 루프
  const animate = () => {
    if (!isRunning) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '12px Arial';

    // 프레임 카운터
    const frame = Date.now() / 100;
    
    // 노이즈가 있는 원시 포즈 생성
    const noisyPose = generateNoisyPose(frame);
    
    // 스무딩된 포즈 생성
    const smoothedPose = smootherRef.current.addPose(noisyPose);
    const quality = smootherRef.current.getSmoothingQuality();
    
    // 캔버스에 그리기
    ctx.fillStyle = 'red';
    ctx.fillText('원시 포즈 (노이즈)', 10, 20);
    drawPose(noisyPose, 'red', 10);
    
    ctx.fillStyle = 'blue';
    ctx.fillText('스무딩된 포즈', 250, 20);
    drawPose(smoothedPose.keypoints, 'blue', 250);
    
    // 품질 정보 표시
    ctx.fillStyle = 'black';
    ctx.fillText(`스무딩 품질: ${(quality * 100).toFixed(1)}%`, 10, 350);
    ctx.fillText(`신뢰도: ${(smoothedPose.confidence * 100).toFixed(1)}%`, 10, 370);
    
    setSmoothingQuality(quality);
    animationRef.current = requestAnimationFrame(animate);
  };

  // 시작/중지
  const toggleDemo = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      smootherRef.current.reset();
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  // 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null; // 프로덕션에서는 숨김
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>🔧 포즈 스무딩 데모 (개발용)</h3>
      <button onClick={toggleDemo}>
        {isRunning ? '중지' : '시작'}
      </button>
      
      <div style={{ marginTop: '10px' }}>
        <strong>스무딩 품질:</strong> {(smoothingQuality * 100).toFixed(1)}%
      </div>
      
      <canvas 
        ref={canvasRef}
        width={500}
        height={400}
        style={{ 
          border: '1px solid #000', 
          marginTop: '10px',
          backgroundColor: '#f5f5f5'
        }}
      />
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>• 빨간점: 원시 포즈 데이터 (노이즈 포함)</p>
        <p>• 파란점: 스무딩 적용된 포즈 데이터</p>
        <p>• 스무딩으로 떨림 현상이 줄어드는 것을 확인할 수 있습니다.</p>
      </div>
    </div>
  );
};

export default PoseSmoothingDemo;