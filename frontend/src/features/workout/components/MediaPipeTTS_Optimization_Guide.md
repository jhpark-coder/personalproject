# MediaPipe + 음성 합성 성능 최적화 가이드

## 🚨 주요 문제점

### 1. 과도한 리렌더링
- MediaPipe가 매 프레임마다 생성하는 데이터를 React state에 저장하면 심각한 성능 저하 발생
- 매 프레임마다 컴포넌트가 리렌더링되어 UI가 버벅임

### 2. 부적절한 생명주기 관리
- useEffect를 잘못 사용하면 MediaPipe 인스턴스나 웹캠 스트림이 중복 생성
- 메모리 누수로 인한 페이지 불안정성

### 3. 메인 스레드 차단
- MediaPipe의 복잡한 연산과 음성 합성이 메인 스레드에서 실행되어 UI 렌더링 방해

### 4. 비동기 작업 충돌
- 이전 음성 출력이 끝나기 전에 새로운 호출이 쌓여 음성이 겹치거나 큐가 밀림

## ✅ 해결 방안

### 1. 생명주기 관리 최적화

```typescript
// ❌ 잘못된 방법
const [pose, setPose] = useState<any>(null);
const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

// ✅ 올바른 방법
const poseRef = useRef<any>(null);
const videoStreamRef = useRef<MediaStream | null>(null);

useEffect(() => {
  // 초기화 로직
  const initializeMediaPipe = async () => {
    const instance = new Pose({...});
    poseRef.current = instance;
  };
  
  initializeMediaPipe();
  
  // 클린업 함수
  return () => {
    if (poseRef.current) {
      poseRef.current.close();
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };
}, []); // 의존성 배열이 비어 있음
```

### 2. 렌더링 루프 분리

```typescript
// ❌ 잘못된 방법 - 매 프레임마다 state 업데이트
const onResults = (results: any) => {
  setPoseLandmarks(results.poseLandmarks); // 매 프레임마다 리렌더링!
};

// ✅ 올바른 방법 - 캔버스에 직접 그리기
const onResults = (results: any) => {
  if (results.poseLandmarks) {
    drawPoseOnCanvas(results.poseLandmarks); // React state 업데이트 없음
  }
};

const drawPoseOnCanvas = (landmarks: any[]) => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  
  // 캔버스에 직접 그리기
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ... 그리기 로직
};
```

### 3. 음성 합성 호출 제어

```typescript
// ❌ 잘못된 방법 - 매 프레임마다 음성 호출
const onResults = (results: any) => {
  if (detectSmile(results)) {
    speak("미소가 감지되었습니다!"); // 매 프레임마다 호출!
  }
};

// ✅ 올바른 방법 - 상태 기반 음성 호출
const [detectedExpression, setDetectedExpression] = useState<string | null>(null);
const [isSpeaking, setIsSpeaking] = useState(false);

const onResults = (results: any) => {
  const newExpression = detectSmile(results);
  if (newExpression && detectedExpression !== newExpression) {
    setDetectedExpression(newExpression); // 상태가 변경될 때만
  }
};

useEffect(() => {
  if (detectedExpression && !isSpeaking) {
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(detectedExpression);
    utterance.onend = () => {
      setIsSpeaking(false);
      setDetectedExpression(null);
    };
    
    speechSynthesis.speak(utterance);
  }
}, [detectedExpression, isSpeaking]);
```

### 4. requestAnimationFrame 사용

```typescript
// ✅ 성능 최적화된 감지 루프
const loop = useCallback(async () => {
  if (!poseRef.current || !videoRef.current || !isDetecting) {
    rafId.current = requestAnimationFrame(() => loop());
    return;
  }

  if (!processingRef.current) {
    processingRef.current = true;
    try {
      await poseRef.current.send({ image: videoRef.current });
    } catch (error) {
      console.error('Pose 처리 오류:', error);
    } finally {
      processingRef.current = false;
    }
  }
  
  rafId.current = requestAnimationFrame(() => loop());
}, [isDetecting]);

useEffect(() => {
  if (isDetecting) {
    loop();
  }
  
  return () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
  };
}, [isDetecting, loop]);
```

### 5. 메모리 누수 방지

```typescript
useEffect(() => {
  return () => {
    // 웹캠 스트림 정리
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // MediaPipe 인스턴스 정리
    if (poseRef.current) {
      poseRef.current.close();
    }
    
    // RAF 정리
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    // 오디오 정리
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // 전역 음성 합성 정리
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
}, []);
```

## 🔧 추가 최적화 팁

### 1. MediaPipe 설정 최적화
```typescript
const createPose = () => {
  const instance = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${VERSION}/${file}`
  });
  
  instance.setOptions({
    modelComplexity: 0,        // 0: 빠름, 1: 중간, 2: 정확
    smoothLandmarks: true,     // 랜드마크 스무딩
    enableSegmentation: false, // 세그멘테이션 비활성화 (성능 향상)
    minDetectionConfidence: 0.3,  // 낮을수록 빠름
    minTrackingConfidence: 0.3    // 낮을수록 빠름
  });
  
  return instance;
};
```

### 2. 웹캠 해상도 최적화
```typescript
const startCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640, min: 480 },    // 너무 높은 해상도 피하기
      height: { ideal: 360, min: 360 },
      frameRate: { ideal: 24, max: 30 }   // 30fps 이상은 불필요
    }
  });
  
  videoRef.current.srcObject = stream;
};
```

### 3. 디바운싱/쓰로틀링
```typescript
// 음성 호출 쓰로틀링
const throttledSpeak = useCallback(
  throttle((message: string) => {
    if (!isSpeaking) {
      speak(message);
    }
  }, 2000), // 2초 간격
  [isSpeaking]
);
```

## 📋 체크리스트

- [ ] MediaPipe 인스턴스와 웹캠 스트림을 useRef로 관리하고 있는가?
- [ ] useEffect의 의존성 배열이 올바르게 설정되어 있는가?
- [ ] 클린업 함수가 모든 리소스를 정리하고 있는가?
- [ ] 매 프레임마다 React state를 업데이트하지 않고 있는가?
- [ ] requestAnimationFrame을 사용하여 감지 루프를 최적화했는가?
- [ ] 음성 합성을 상태 변화에만 반응하도록 분리했는가?
- [ ] 중복 음성 호출을 방지하는 장치가 있는가?
- [ ] MediaPipe 설정을 성능에 맞게 조정했는가?

## 🚀 성능 모니터링

```typescript
// 성능 측정
const measurePerformance = () => {
  const start = performance.now();
  
  // MediaPipe 처리
  
  const end = performance.now();
  console.log(`처리 시간: ${end - start}ms`);
};

// 프레임 레이트 모니터링
let frameCount = 0;
let lastTime = performance.now();

const monitorFPS = () => {
  frameCount++;
  const currentTime = performance.now();
  
  if (currentTime - lastTime >= 1000) {
    const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
    console.log(`FPS: ${fps}`);
    frameCount = 0;
    lastTime = currentTime;
  }
};
```

이 가이드를 따라 최적화하면 MediaPipe와 음성 합성을 함께 사용할 때 발생하는 성능 문제를 크게 개선할 수 있습니다.
