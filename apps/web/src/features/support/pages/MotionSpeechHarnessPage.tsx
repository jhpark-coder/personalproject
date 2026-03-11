import { useState } from 'react';

import { useMotionSpeechCoach } from '../../../features/motion/hooks/useMotionSpeechCoach';
import type {
  ExerciseAnalysis,
  ExerciseType,
} from '../../../features/motion/lib/exerciseAnalysis';

const createAnalysis = (exerciseType: ExerciseType): ExerciseAnalysis => ({
  exerciseType,
  currentCount: 0,
  isCorrectForm: true,
  feedback: '준비 완료',
  confidence: 1,
});

export default function MotionSpeechHarnessPage() {
  const [exerciseType, setExerciseType] = useState<ExerciseType>('squat');
  const [analysis, setAnalysis] = useState<ExerciseAnalysis>(() => createAnalysis('squat'));
  const [isDetecting, setIsDetecting] = useState(false);
  const speechCoach = useMotionSpeechCoach({
    analysis,
    exerciseType,
    isDetecting,
  });

  const setExercise = (nextExercise: ExerciseType) => {
    setExerciseType(nextExercise);
    setAnalysis(createAnalysis(nextExercise));
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Motion Speech Harness</h1>
      <p>Browser E2E only.</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button type="button" onClick={() => setIsDetecting(true)}>
          Start Detection
        </button>
        <button type="button" onClick={() => setIsDetecting(false)}>
          Stop Detection
        </button>
        <button
          type="button"
          onClick={() =>
            setAnalysis((prev) => ({
              ...prev,
              currentCount: prev.currentCount + 1,
              confidence: 1,
            }))
          }
        >
          Count Up
        </button>
        <button
          type="button"
          onClick={() =>
            setAnalysis((prev) => ({
              ...prev,
              feedback: '무릎을 더 펴세요',
              confidence: 1,
            }))
          }
        >
          Feedback Knee
        </button>
        <button
          type="button"
          onClick={() =>
            setAnalysis((prev) => ({
              ...prev,
              feedback: '허리를 곧게 유지하세요',
              confidence: 1,
            }))
          }
        >
          Feedback Back
        </button>
        <button type="button" onClick={() => setExercise('lunge')}>
          Switch To Lunge
        </button>
        <button type="button" onClick={() => speechCoach.stop()}>
          Stop Speech
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div data-testid="exercise-type">exercise: {exerciseType}</div>
        <div data-testid="count">count: {analysis.currentCount}</div>
        <div data-testid="feedback">feedback: {analysis.feedback}</div>
        <div data-testid="detecting">detecting: {String(isDetecting)}</div>
        <div data-testid="speech-supported">supported: {String(speechCoach.isSupported)}</div>
        <div data-testid="speech-enabled">enabled: {String(speechCoach.isEnabled)}</div>
        <div data-testid="voice-label">voice: {speechCoach.voiceLabel}</div>
      </div>
    </main>
  );
}
