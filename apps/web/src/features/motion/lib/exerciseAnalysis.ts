export type ExerciseType =
  | 'squat'
  | 'lunge'
  | 'pushup'
  | 'plank'
  | 'calf_raise'
  | 'bicep_curl'
  | 'shoulder_press'
  | 'lateral_raise'
  | 'front_raise'
  | 'jumping_jack'
  | 'high_knee'
  | 'mountain_climber'
  | 'situp'
  | 'crunch'
  | 'deadlift'
  | 'glute_bridge'
  | 'tricep_dip';

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squat: '스쿼트',
  lunge: '런지',
  pushup: '푸시업',
  plank: '플랭크',
  calf_raise: '카프 레이즈',
  bicep_curl: '바이셉 컬',
  shoulder_press: '숄더 프레스',
  lateral_raise: '사이드 레터럴 레이즈',
  front_raise: '프론트 레이즈',
  jumping_jack: '점핑 잭',
  high_knee: '하이 니',
  mountain_climber: '마운틴 클라이머',
  situp: '싯업',
  crunch: '크런치',
  deadlift: '데드리프트',
  glute_bridge: '글루트 브릿지',
  tricep_dip: '트라이셉 딥',
};

export const EXERCISE_OPTIONS: Array<{ value: ExerciseType; label: string }> =
  Object.entries(EXERCISE_LABELS).map(([value, label]) => ({
    value: value as ExerciseType,
    label,
  }));

export interface PoseLandmark {
  x: number;
  y: number;
  visibility?: number;
  score?: number;
}

export interface ExerciseAnalysis {
  exerciseType: ExerciseType | null;
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

const requiredPoints = (
  landmarks: PoseLandmark[],
  indices: Array<(typeof POSE_INDICES)[keyof typeof POSE_INDICES]>,
) => {
  const points = indices.map((index) => landmarks[index]);
  return hasRequiredPoints(points) ? points : null;
};

const avg = (left: number, right: number) => (left + right) / 2;
const avgY = (...points: PoseLandmark[]) =>
  points.reduce((sum, point) => sum + point.y, 0) / points.length;

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

const resetIncompleteRep = (state: ExerciseState) => {
  state.phase = 'up';
  state.repEligible = false;
};

const countDownToUp = (state: ExerciseState, isDown: boolean, isUp: boolean) => {
  if (state.phase === 'up' && isDown) {
    state.phase = 'down';
  } else if (state.phase === 'down' && isUp) {
    state.phase = 'up';
    state.count += 1;
  }
};

const analyzeSquat = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('squat', state);
  }

  const kneeAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = kneeAngle <= 110;
  const isUp = kneeAngle >= 155;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'squat',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isDown ? '좋아요, 아래 구간' : '위 구간',
    confidence: getConfidence(points),
  };
};

const analyzeLunge = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('lunge', state);
  }

  const frontKneeAngle = Math.min(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = frontKneeAngle <= 105;
  const isUp = frontKneeAngle >= 155;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'lunge',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isDown ? '하강 구간' : '상승 구간',
    confidence: getConfidence(points),
  };
};

const analyzePushup = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_ELBOW,
    POSE_INDICES.RIGHT_ELBOW,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
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
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_ELBOW,
    POSE_INDICES.RIGHT_ELBOW,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
  ]);

  if (!points) {
    resetIncompleteRep(state);
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
    feedback: isPlank ? '좋아요, 유지하세요' : '팔 각도 90도 근처 유지',
    confidence: getConfidence(points),
  };
};

const analyzeCalfRaise = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
    POSE_INDICES.LEFT_FOOT_INDEX,
    POSE_INDICES.RIGHT_FOOT_INDEX,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('calf_raise', state);
  }

  const lift = avg(points[0].y - points[2].y, points[1].y - points[3].y);
  const isUp = lift > 0.03;
  const isDown = lift < 0.01;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'calf_raise',
    currentCount: state.count,
    isCorrectForm: true,
    feedback: isUp ? '상승' : '하강',
    confidence: getConfidence(points),
  };
};

const analyzeBicepCurl = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_ELBOW,
    POSE_INDICES.RIGHT_ELBOW,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('bicep_curl', state);
  }

  const elbowAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = elbowAngle >= 150;
  const isUp = elbowAngle <= 65;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'bicep_curl',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '팔꿈치를 접었습니다' : '팔을 끝까지 펴세요',
    confidence: getConfidence(points),
  };
};

const analyzeShoulderPress = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_ELBOW,
    POSE_INDICES.RIGHT_ELBOW,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('shoulder_press', state);
  }

  const shoulderY = avgY(points[0], points[1]);
  const wristY = avgY(points[4], points[5]);
  const elbowAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = wristY >= shoulderY - 0.02 && elbowAngle <= 135;
  const isUp = wristY <= shoulderY - 0.16 && elbowAngle >= 145;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'shoulder_press',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '머리 위로 완전히 밀었습니다' : '어깨 높이까지 내리세요',
    confidence: getConfidence(points),
  };
};

const analyzeLateralRaise = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('lateral_raise', state);
  }

  const shoulderY = avgY(points[0], points[1]);
  const hipY = avgY(points[4], points[5]);
  const wristY = avgY(points[2], points[3]);
  const shoulderWidth = Math.abs(points[0].x - points[1].x);
  const wristWidth = Math.abs(points[2].x - points[3].x);
  const isDown = wristY >= hipY - 0.05;
  const isUp = Math.abs(wristY - shoulderY) <= 0.12 && wristWidth >= shoulderWidth * 1.45;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'lateral_raise',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '어깨 높이 유지' : '팔을 옆으로 들어 올리세요',
    confidence: getConfidence(points),
  };
};

const analyzeFrontRaise = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('front_raise', state);
  }

  const shoulderY = avgY(points[0], points[1]);
  const hipY = avgY(points[4], points[5]);
  const wristY = avgY(points[2], points[3]);
  const isDown = wristY >= hipY - 0.05;
  const isUp = wristY <= shoulderY + 0.08;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'front_raise',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '어깨 높이까지 올렸습니다' : '팔을 앞으로 들어 올리세요',
    confidence: getConfidence(points),
  };
};

const analyzeJumpingJack = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('jumping_jack', state);
  }

  const shoulderY = avgY(points[0], points[1]);
  const shoulderWidth = Math.abs(points[0].x - points[1].x);
  const feetWidth = Math.abs(points[4].x - points[5].x);
  const wristY = avgY(points[2], points[3]);
  const isDown = wristY > shoulderY + 0.16 && feetWidth <= shoulderWidth * 0.9;
  const isUp = wristY < shoulderY - 0.1 && feetWidth >= shoulderWidth * 1.35;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'jumping_jack',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '팔과 다리를 크게 벌렸습니다' : '준비 자세로 모으세요',
    confidence: getConfidence(points),
  };
};

const analyzeHighKnee = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('high_knee', state);
  }

  const hipY = avgY(points[0], points[1]);
  const lowestKneeY = Math.min(points[2].y, points[3].y);
  const highestKneeY = Math.max(points[2].y, points[3].y);
  const isDown = lowestKneeY >= hipY + 0.12;
  const isUp = highestKneeY >= hipY + 0.08 && lowestKneeY <= hipY + 0.02;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'high_knee',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '무릎을 충분히 올렸습니다' : '무릎을 더 높이 올리세요',
    confidence: getConfidence(points),
  };
};

const analyzeMountainClimber = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('mountain_climber', state);
  }

  const hipY = avgY(points[2], points[3]);
  const bodyAngle = avg(
    calculateAngle(points[0], points[2], points[6]),
    calculateAngle(points[1], points[3], points[7]),
  );
  const goodPlank = bodyAngle >= 145;
  const kneesExtended = points[4].y >= hipY + 0.08 && points[5].y >= hipY + 0.08;
  const kneeDrive = goodPlank && Math.min(points[4].y, points[5].y) <= hipY + 0.02;

  countDownToUp(state, kneesExtended, kneeDrive);

  return {
    exerciseType: 'mountain_climber',
    currentCount: state.count,
    isCorrectForm: goodPlank,
    feedback: goodPlank ? (kneeDrive ? '무릎 당기기' : '플랭크 유지') : '몸통을 일직선으로 유지',
    confidence: getConfidence(points),
  };
};

const analyzeSitup = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('situp', state);
  }

  const torsoAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = torsoAngle >= 145;
  const isUp = torsoAngle <= 105;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'situp',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '상체를 충분히 올렸습니다' : '천천히 내려가세요',
    confidence: getConfidence(points),
  };
};

const analyzeCrunch = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('crunch', state);
  }

  const torsoAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = torsoAngle >= 155;
  const isUp = torsoAngle <= 130;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'crunch',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '복부 수축' : '목에 힘을 빼고 내려가세요',
    confidence: getConfidence(points),
  };
};

const analyzeDeadlift = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
    POSE_INDICES.LEFT_ANKLE,
    POSE_INDICES.RIGHT_ANKLE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('deadlift', state);
  }

  const hipHingeAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const kneeAngle = avg(
    calculateAngle(points[2], points[4], points[6]),
    calculateAngle(points[3], points[5], points[7]),
  );
  const kneesStable = kneeAngle >= 125;
  const isDown = hipHingeAngle <= 125 && kneesStable;
  const isUp = hipHingeAngle >= 160 && kneesStable;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'deadlift',
    currentCount: state.count,
    isCorrectForm: kneesStable,
    feedback: kneesStable ? (isDown ? '힙 힌지 구간' : '상체를 세우세요') : '무릎을 과하게 접지 마세요',
    confidence: getConfidence(points),
  };
};

const analyzeGluteBridge = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_HIP,
    POSE_INDICES.RIGHT_HIP,
    POSE_INDICES.LEFT_KNEE,
    POSE_INDICES.RIGHT_KNEE,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('glute_bridge', state);
  }

  const shoulderY = avgY(points[0], points[1]);
  const hipY = avgY(points[2], points[3]);
  const kneeY = avgY(points[4], points[5]);
  const targetLineY = avg(shoulderY, kneeY);
  const isDown = hipY >= targetLineY - 0.01;
  const isUp = hipY <= targetLineY - 0.06;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'glute_bridge',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '엉덩이를 충분히 올렸습니다' : '엉덩이를 더 들어 올리세요',
    confidence: getConfidence(points),
  };
};

const analyzeTricepDip = (landmarks: PoseLandmark[], state: ExerciseState): ExerciseAnalysis => {
  const points = requiredPoints(landmarks, [
    POSE_INDICES.LEFT_SHOULDER,
    POSE_INDICES.RIGHT_SHOULDER,
    POSE_INDICES.LEFT_ELBOW,
    POSE_INDICES.RIGHT_ELBOW,
    POSE_INDICES.LEFT_WRIST,
    POSE_INDICES.RIGHT_WRIST,
  ]);

  if (!points) {
    resetIncompleteRep(state);
    return baseNA('tricep_dip', state);
  }

  const elbowAngle = avg(
    calculateAngle(points[0], points[2], points[4]),
    calculateAngle(points[1], points[3], points[5]),
  );
  const isDown = elbowAngle <= 95;
  const isUp = elbowAngle >= 155;

  countDownToUp(state, isDown, isUp);

  return {
    exerciseType: 'tricep_dip',
    currentCount: state.count,
    isCorrectForm: isDown || isUp,
    feedback: isUp ? '팔을 끝까지 밀었습니다' : '팔꿈치를 천천히 접으세요',
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
    case 'bicep_curl':
      return analyzeBicepCurl(landmarks, state);
    case 'shoulder_press':
      return analyzeShoulderPress(landmarks, state);
    case 'lateral_raise':
      return analyzeLateralRaise(landmarks, state);
    case 'front_raise':
      return analyzeFrontRaise(landmarks, state);
    case 'jumping_jack':
      return analyzeJumpingJack(landmarks, state);
    case 'high_knee':
      return analyzeHighKnee(landmarks, state);
    case 'mountain_climber':
      return analyzeMountainClimber(landmarks, state);
    case 'situp':
      return analyzeSitup(landmarks, state);
    case 'crunch':
      return analyzeCrunch(landmarks, state);
    case 'deadlift':
      return analyzeDeadlift(landmarks, state);
    case 'glute_bridge':
      return analyzeGluteBridge(landmarks, state);
    case 'tricep_dip':
      return analyzeTricepDip(landmarks, state);
  }
};
