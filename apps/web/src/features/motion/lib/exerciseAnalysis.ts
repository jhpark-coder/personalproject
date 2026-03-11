export type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 'calf_raise';

export interface PoseLandmark {
  x: number;
  y: number;
  visibility?: number;
  score?: number;
}

export interface ExerciseAnalysis {
  exerciseType: string | null;
  currentCount: number;
  isCorrectForm: boolean;
  feedback: string;
  confidence: number;
}

export interface ExerciseState {
  phase: 'up' | 'down';
  count: number;
  repEligible: boolean;
}

export const POSE_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

const MIN_VISIBILITY = 0.35;

export const createExerciseState = (): ExerciseState => ({
  phase: 'up',
  count: 0,
  repEligible: false,
});

const pointConfidence = (point?: PoseLandmark) => point?.visibility ?? point?.score ?? 1;

const getConfidence = (points: PoseLandmark[]) =>
  Math.min(...points.map((point) => pointConfidence(point)));

const hasRequiredPoints = (points: Array<PoseLandmark | undefined>): points is PoseLandmark[] =>
  points.every(Boolean) && points.every((point) => pointConfidence(point) >= MIN_VISIBILITY);

const avg = (left: number, right: number) => (left + right) / 2;

export const calculateAngle = (p1: PoseLandmark, p2: PoseLandmark, p3: PoseLandmark): number => {
  const radians =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const rawAngle = Math.abs((radians * 180) / Math.PI);
  return rawAngle > 180 ? 360 - rawAngle : rawAngle;
};

const baseNA = (type: ExerciseType, state: ExerciseState): ExerciseAnalysis => ({
  exerciseType: type,
  currentCount: state.count,
  isCorrectForm: false,
  feedback: '랜드마크 부족',
  confidence: 0,
});

const analyzeSquat = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = [
    landmarks[POSE_INDICES.LEFT_HIP],
    landmarks[POSE_INDICES.RIGHT_HIP],
    landmarks[POSE_INDICES.LEFT_KNEE],
    landmarks[POSE_INDICES.RIGHT_KNEE],
    landmarks[POSE_INDICES.LEFT_ANKLE],
    landmarks[POSE_INDICES.RIGHT_ANKLE],
  ];

  if (!hasRequiredPoints(points)) {
    return baseNA('squat', state);
  }

  const kneeAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = kneeAngle <= 110;
  const isUp = kneeAngle >= 155;

  if (state.phase === 'up' && isDown) {
    state.phase = 'down';
  } else if (state.phase === 'down' && isUp) {
    state.phase = 'up';
    state.count += 1;
  }

  return {
    exerciseType: 'squat',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isDown ? '좋아요, 아래 구간' : '위 구간',
    confidence: getConfidence(points),
  };
};

const analyzeLunge = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = [
    landmarks[POSE_INDICES.LEFT_HIP],
    landmarks[POSE_INDICES.RIGHT_HIP],
    landmarks[POSE_INDICES.LEFT_KNEE],
    landmarks[POSE_INDICES.RIGHT_KNEE],
    landmarks[POSE_INDICES.LEFT_ANKLE],
    landmarks[POSE_INDICES.RIGHT_ANKLE],
  ];

  if (!hasRequiredPoints(points)) {
    return baseNA('lunge', state);
  }

  const frontKneeAngle = Math.min(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = frontKneeAngle <= 105;
  const isUp = frontKneeAngle >= 155;

  if (state.phase === 'up' && isDown) {
    state.phase = 'down';
  } else if (state.phase === 'down' && isUp) {
    state.phase = 'up';
    state.count += 1;
  }

  return {
    exerciseType: 'lunge',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isDown ? '하강 구간' : '상승 구간',
    confidence: getConfidence(points),
  };
};

const analyzePushup = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = [
    landmarks[POSE_INDICES.LEFT_SHOULDER],
    landmarks[POSE_INDICES.RIGHT_SHOULDER],
    landmarks[POSE_INDICES.LEFT_ELBOW],
    landmarks[POSE_INDICES.RIGHT_ELBOW],
    landmarks[POSE_INDICES.LEFT_WRIST],
    landmarks[POSE_INDICES.RIGHT_WRIST],
    landmarks[POSE_INDICES.LEFT_HIP],
    landmarks[POSE_INDICES.RIGHT_HIP],
    landmarks[POSE_INDICES.LEFT_ANKLE],
    landmarks[POSE_INDICES.RIGHT_ANKLE],
  ];

  if (!hasRequiredPoints(points)) {
    state.repEligible = false;
    return baseNA('pushup', state);
  }

  const elbowAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const bodyAngle = avg(
    calculateAngle(points[0], points[6], points[8]),
    calculateAngle(points[1], points[7], points[9]),
  );
  const isDown = elbowAngle <= 90;
  const isUp = elbowAngle >= 160;
  const goodForm = bodyAngle >= 160;

  if (state.phase === 'up' && isDown) {
    state.phase = 'down';
    state.repEligible = goodForm;
  } else if (state.phase === 'down') {
    if (!goodForm) {
      state.repEligible = false;
    }
    if (isUp) {
      if (state.repEligible && goodForm) {
        state.count += 1;
      }
      state.phase = 'up';
      state.repEligible = false;
    }
  }

  return {
    exerciseType: 'pushup',
    currentCount: state.count,
    isCorrectForm: goodForm,
    feedback: goodForm ? (isDown ? '바닥 근처' : '완전 펴기') : '몸통을 일직선으로 유지',
    confidence: getConfidence(points),
  };
};

const analyzePlank = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = [
    landmarks[POSE_INDICES.LEFT_SHOULDER],
    landmarks[POSE_INDICES.RIGHT_SHOULDER],
    landmarks[POSE_INDICES.LEFT_ELBOW],
    landmarks[POSE_INDICES.RIGHT_ELBOW],
    landmarks[POSE_INDICES.LEFT_HIP],
    landmarks[POSE_INDICES.RIGHT_HIP],
  ];

  if (!hasRequiredPoints(points)) {
    return baseNA('plank', state);
  }

  const armAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isPlank = armAngle >= 80 && armAngle <= 100;

  return {
    exerciseType: 'plank',
    currentCount: state.count,
    isCorrectForm: isPlank,
    feedback: isPlank ? '좋아요, 유지하세요' : '팔 각도 90° 근처 유지',
    confidence: getConfidence(points),
  };
};

const analyzeCalfRaise = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = [
    landmarks[POSE_INDICES.LEFT_ANKLE],
    landmarks[POSE_INDICES.RIGHT_ANKLE],
    landmarks[POSE_INDICES.LEFT_FOOT_INDEX],
    landmarks[POSE_INDICES.RIGHT_FOOT_INDEX],
  ];

  if (!hasRequiredPoints(points)) {
    return baseNA('calf_raise', state);
  }

  const lift = avg(points[0].y - points[2].y, points[1].y - points[3].y);
  const isUp = lift > 0.03;
  const isDown = lift < 0.01;

  if (state.phase === 'up' && isDown) {
    state.phase = 'down';
  } else if (state.phase === 'down' && isUp) {
    state.phase = 'up';
    state.count += 1;
  }

  return {
    exerciseType: 'calf_raise',
    currentCount: state.count,
    isCorrectForm: true,
    feedback: isUp ? '상승' : '하강',
    confidence: getConfidence(points),
  };
};

export const analyzeExercise = (
  landmarks: PoseLandmark[],
  type: ExerciseType,
  state: ExerciseState,
): ExerciseAnalysis => {
  switch (type) {
    case 'squat':
      return analyzeSquat(landmarks, state);
    case 'lunge':
      return analyzeLunge(landmarks, state);
    case 'pushup':
      return analyzePushup(landmarks, state);
    case 'plank':
      return analyzePlank(landmarks, state);
    case 'calf_raise':
      return analyzeCalfRaise(landmarks, state);
    default:
      return {
        exerciseType: type,
        currentCount: state.count,
        isCorrectForm: false,
        feedback: '운동을 선택하세요',
        confidence: 0,
      };
  }
};
