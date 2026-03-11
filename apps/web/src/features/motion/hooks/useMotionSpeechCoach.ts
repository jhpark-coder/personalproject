import { useEffect, useMemo, useRef, useState } from 'react';

import type { ExerciseAnalysis, ExerciseType } from '../lib/exerciseAnalysis';
import {
  choosePreferredKoreanVoice,
  createBrowserSpeechEngine,
  SpeechQueueController,
  type SpeechTask,
} from '../lib/speechQueue';

interface UseMotionSpeechCoachOptions {
  analysis: ExerciseAnalysis;
  exerciseType: ExerciseType;
  isDetecting: boolean;
}

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squat: '스쿼트',
  lunge: '런지',
  pushup: '푸시업',
  plank: '플랭크',
  calf_raise: '카프 레이즈',
};

const createCountMessage = (exerciseType: ExerciseType, count: number) =>
  `${EXERCISE_LABELS[exerciseType]} ${count}회`;

export const useMotionSpeechCoach = ({
  analysis,
  exerciseType,
  isDetecting,
}: UseMotionSpeechCoachOptions) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState<string>('음성 엔진 확인 중');

  const controllerRef = useRef<SpeechQueueController | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCountRef = useRef(analysis.currentCount);
  const previousFeedbackRef = useRef(analysis.feedback);
  const previousExerciseRef = useRef(exerciseType);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceLabel('브라우저 음성 미지원');
      return undefined;
    }

    const speech = window.speechSynthesis;
    const engine = createBrowserSpeechEngine(speech);
    controllerRef.current = new SpeechQueueController(engine);
    setIsSupported(true);
    setIsEnabled(true);

    const refreshVoiceLabel = () => {
      const selectedVoice = choosePreferredKoreanVoice(engine.getVoices?.() ?? []);
      setVoiceLabel(selectedVoice?.name ?? '기본 한국어 음성');
    };

    refreshVoiceLabel();
    speech.addEventListener?.('voiceschanged', refreshVoiceLabel);

    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      controllerRef.current?.stop();
      speech.removeEventListener?.('voiceschanged', refreshVoiceLabel);
    };
  }, []);

  useEffect(() => {
    if (previousExerciseRef.current !== exerciseType) {
      previousExerciseRef.current = exerciseType;
      previousCountRef.current = 0;
      previousFeedbackRef.current = analysis.feedback;
      controllerRef.current?.stop();
    }
  }, [analysis.feedback, exerciseType]);

  useEffect(() => {
    if (!isEnabled || !isDetecting) {
      controllerRef.current?.stop();
    }
  }, [isDetecting, isEnabled]);

  useEffect(() => {
    if (!isEnabled || !isDetecting) {
      previousCountRef.current = analysis.currentCount;
      previousFeedbackRef.current = analysis.feedback;
      return;
    }

    if (analysis.currentCount > previousCountRef.current) {
      controllerRef.current?.enqueue({
        text: createCountMessage(exerciseType, analysis.currentCount),
        channel: 'count',
      });
    }
    previousCountRef.current = analysis.currentCount;
  }, [analysis.currentCount, analysis.feedback, exerciseType, isDetecting, isEnabled]);

  useEffect(() => {
    if (!isEnabled || !isDetecting || analysis.confidence < 0.5) {
      previousFeedbackRef.current = analysis.feedback;
      return;
    }

    if (analysis.feedback === previousFeedbackRef.current) {
      return;
    }
    previousFeedbackRef.current = analysis.feedback;

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = setTimeout(() => {
      controllerRef.current?.enqueue({
        text: analysis.feedback,
        channel: 'feedback',
        dedupeMs: 1500,
        replacePending: true,
      });
    }, 700);

    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [analysis.confidence, analysis.feedback, isDetecting, isEnabled]);

  const controls = useMemo(
    () => ({
      isEnabled,
      isSupported,
      voiceLabel,
      setIsEnabled,
      stop: () => controllerRef.current?.stop(),
      enqueue: (task: SpeechTask) => controllerRef.current?.enqueue(task) ?? false,
    }),
    [isEnabled, isSupported, voiceLabel],
  );

  return controls;
};
