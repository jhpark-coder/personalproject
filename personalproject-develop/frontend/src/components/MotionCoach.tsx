import React, { useRef, useEffect, useState } from 'react';
import './MotionCoach.css';

interface MotionCoachProps {
  exerciseType?: 'squat' | 'pushup' | 'plank';
}

const MotionCoach: React.FC<MotionCoachProps> = ({ exerciseType = 'squat' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('웹캠 접근 오류:', err);
      setError('웹캠에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreamActive(false);
    }
  };

  return (
    <div className="motion-coach">
      <div className="camera-container">
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
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      <div className="controls">
        <button 
          onClick={isStreamActive ? stopCamera : startCamera}
          className="camera-toggle"
        >
          {isStreamActive ? '카메라 끄기' : '카메라 켜기'}
        </button>
      </div>

      <div className="exercise-info">
        <h3>현재 운동: {exerciseType === 'squat' ? '스쿼트' : 
                        exerciseType === 'pushup' ? '푸시업' : '플랭크'}</h3>
      </div>
    </div>
  );
};

export default MotionCoach; 