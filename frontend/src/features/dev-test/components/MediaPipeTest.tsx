import React, { useState, useRef, useEffect } from 'react';
import { mediaLoader, MediaPipeLoader } from '../../workout/components/MediaPipeLoader';
import { cameraManager } from '../../workout/components/CameraManager';
import { compatibilityChecker } from '../../workout/components/BrowserCompatibility';

const MediaPipeTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<any>(null);
  const [poseStatus, setPoseStatus] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const logMessage = `[${time}] ${msg}${data !== undefined ? ` | ${JSON.stringify(data)}` : ''}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-50), logMessage]);
  };

  // 브라우저 호환성 테스트
  const testCompatibility = () => {
    addLog('=== 브라우저 호환성 테스트 시작 ===');
    
    const compatibility = compatibilityChecker.checkCompatibility();
    const mediaPipeCompat = compatibilityChecker.checkMediaPipeCompatibility();
    
    addLog('전체 호환성', compatibility);
    addLog('MediaPipe 호환성', mediaPipeCompat);
    
    if (!compatibility.isCompatible) {
      addLog('❌ 호환성 문제 발견', compatibility.warnings);
    } else {
      addLog('✅ 호환성 검사 통과');
    }
  };

  // MediaPipe 로딩 테스트
  const testMediaPipe = async () => {
    setIsLoading(true);
    addLog('=== MediaPipe 로딩 테스트 시작 ===');
    
    try {
      const deviceCapability = MediaPipeLoader.detectDeviceCapability();
      const config = MediaPipeLoader.getOptimalConfig(deviceCapability);
      
      addLog('디바이스 성능', deviceCapability);
      addLog('MediaPipe 설정', config);
      
      const pose = await mediaLoader.loadPose(config, {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 15000
      });
      
      if (pose) {
        setPoseStatus({ isLoaded: true, instance: !!pose });
        addLog('✅ MediaPipe 로딩 성공');
        
        // 간단한 테스트 실행
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'red';
          ctx.fillRect(0, 0, 10, 10);
          
          pose.onResults((results: any) => {
            addLog('🎯 MediaPipe 테스트 결과', { 
              hasLandmarks: !!(results.poseLandmarks && results.poseLandmarks.length),
              landmarkCount: results.poseLandmarks?.length || 0
            });
          });
          
          await pose.send({ image: canvas });
        }
      }
    } catch (error) {
      setPoseStatus({ isLoaded: false, error: String(error) });
      addLog('❌ MediaPipe 로딩 실패', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // 카메라 테스트
  const testCamera = async () => {
    if (!videoRef.current) {
      addLog('❌ 비디오 요소가 없습니다');
      return;
    }
    
    setIsLoading(true);
    addLog('=== 카메라 테스트 시작 ===');
    
    try {
      // 권한 확인
      const permission = await cameraManager.checkPermissions();
      addLog('카메라 권한', permission);
      
      if (permission.state === 'denied') {
        throw new Error('카메라 권한이 거부되었습니다');
      }
      
      // 사용 가능한 디바이스 확인
      const devices = await cameraManager.getAvailableDevices();
      addLog('사용 가능한 카메라', devices.length);
      
      // 카메라 시작
      const config = cameraManager.getOptimalConfig('balanced');
      const status = await cameraManager.startCamera(videoRef.current, config);
      
      setCameraStatus(status);
      
      if (status.isActive) {
        addLog('✅ 카메라 시작 성공', status.deviceInfo);
        
        // 비디오 상태 모니터링
        const checkVideoStatus = () => {
          const video = videoRef.current;
          if (video) {
            addLog('비디오 상태', {
              readyState: video.readyState,
              width: video.videoWidth,
              height: video.videoHeight,
              currentTime: video.currentTime
            });
          }
        };
        
        // 1초 후 상태 확인
        setTimeout(checkVideoStatus, 1000);
      } else {
        throw new Error(`카메라 시작 실패: ${status.error}`);
      }
    } catch (error) {
      setCameraStatus({ isActive: false, error: String(error) });
      addLog('❌ 카메라 테스트 실패', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // 전체 테스트 실행
  const runAllTests = async () => {
    addLog('🚀 전체 테스트 시작');
    await testCompatibility();
    await testMediaPipe();
    await testCamera();
    addLog('🏁 전체 테스트 완료');
  };

  // 정리
  useEffect(() => {
    return () => {
      if (cameraStatus?.isActive) {
        cameraManager.stopCamera();
      }
    };
  }, [cameraStatus]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>MediaPipe & 카메라 테스트</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests} 
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          {isLoading ? '테스트 중...' : '전체 테스트 실행'}
        </button>
        <button onClick={testCompatibility} style={{ marginRight: '10px', padding: '10px 20px' }}>
          호환성 테스트
        </button>
        <button onClick={testMediaPipe} style={{ marginRight: '10px', padding: '10px 20px' }}>
          MediaPipe 테스트
        </button>
        <button onClick={testCamera} style={{ padding: '10px 20px' }}>
          카메라 테스트
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>상태</h3>
          <div>
            <strong>MediaPipe:</strong> {poseStatus?.isLoaded ? '✅ 로드됨' : '❌ 로드 안됨'}
            {poseStatus?.error && <div style={{ color: 'red' }}>오류: {poseStatus.error}</div>}
          </div>
          <div>
            <strong>카메라:</strong> {cameraStatus?.isActive ? '✅ 활성' : '❌ 비활성'}
            {cameraStatus?.error && <div style={{ color: 'red' }}>오류: {cameraStatus.error}</div>}
          </div>
        </div>
        
        <div>
          <h3>비디오 미리보기</h3>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxWidth: '320px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      <div>
        <h3>로그</h3>
        <div style={{ 
          height: '300px', 
          overflowY: 'auto', 
          border: '1px solid #ccc', 
          padding: '10px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MediaPipeTest; 