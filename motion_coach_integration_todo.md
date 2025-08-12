# MotionCoach-PoseDetector 통합 TO-DO 리스트

## 1. 목표

`PoseDetector.tsx`의 핵심 모션 인식 및 분석 기능을 `MotionCoach.tsx`에 통합하여, 사용자가 `MotionCoach` 페이지에서 실시간으로 웹캠 영상 위에 자세 분석 결과(관절점, 카운트, 피드백 등)를 확인할 수 있도록 합니다.

## 2. 남은 작업 상세

### 파일: `frontend/src/components/MotionCoach.tsx`

- **작업:** 현재 `MotionCoach.tsx` 파일의 `return (` 블록 전체를 아래의 새로운 JSX 구조로 교체해야 합니다.

- **새로운 JSX 구조:**

```jsx
<div className="motion-coach">
  <div className="camera-container" onClick={() => { if (!isDetecting) startCamera(); }}>
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
</div>
```

## 3. 참고 사항

- 이 작업은 `MotionCoach.tsx` 파일의 `return (` 문 바로 뒤부터 컴포넌트의 끝까지의 JSX 내용을 위 코드로 완전히 교체하는 것을 의미합니다.
- 이전에 `PoseDetector.tsx`에서 `MotionCoach.tsx`로 핵심 로직(MediaPipe 설정, 분석 함수 등)이 이미 이동되었으므로, 이 JSX 교체만으로 통합이 완료됩니다.
