import { describe, expect, it } from 'vitest';

import {
  analyzeExercise,
  calculateAngle,
  createExerciseState,
  EXERCISE_OPTIONS,
  POSE_INDICES,
  type ExerciseType,
  type PoseLandmark,
} from './exerciseAnalysis';

const createLandmarks = (): PoseLandmark[] =>
  Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 1 }));

const setPoint = (
  landmarks: PoseLandmark[],
  index: number,
  x: number,
  y: number,
  visibility = 1,
) => {
  landmarks[index] = { x, y, visibility };
};

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const pointAtAngle = (
  originX: number,
  originY: number,
  referenceX: number,
  referenceY: number,
  angle: number,
  length = 1,
) => {
  const baseAngle = Math.atan2(referenceY - originY, referenceX - originX);
  const targetAngle = baseAngle + degreesToRadians(angle);
  return {
    x: originX + Math.cos(targetAngle) * length,
    y: originY + Math.sin(targetAngle) * length,
  };
};

const setBilateralKneeAngles = (landmarks: PoseLandmark[], angle: number, visibility = 1) => {
  const radians = degreesToRadians(angle);

  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 1, 0, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_KNEE, 0, 0, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, Math.cos(radians), Math.sin(radians), visibility);

  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 4, 0, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_KNEE, 3, 0, visibility);
  setPoint(
    landmarks,
    POSE_INDICES.RIGHT_ANKLE,
    3 + Math.cos(radians),
    Math.sin(radians),
    visibility,
  );
};

const setPushupPose = (
  landmarks: PoseLandmark[],
  elbowAngle: number,
  bodyAngle: number,
  visibility = 1,
) => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 1, 1, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_ELBOW, 0, 1, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 0, -1, visibility);
  const leftWrist = pointAtAngle(0, 1, 1, 1, elbowAngle);
  const leftAnkle = pointAtAngle(0, -1, 1, 1, bodyAngle, 1.5);
  setPoint(landmarks, POSE_INDICES.LEFT_WRIST, leftWrist.x, leftWrist.y, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, leftAnkle.x, leftAnkle.y, visibility);

  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 4, 1, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_ELBOW, 3, 1, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 3, -1, visibility);
  const rightWrist = pointAtAngle(3, 1, 4, 1, elbowAngle);
  const rightAnkle = pointAtAngle(3, -1, 4, 1, bodyAngle, 1.5);
  setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, rightWrist.x, rightWrist.y, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, rightAnkle.x, rightAnkle.y, visibility);
};

const setCalfRaisePose = (
  landmarks: PoseLandmark[],
  ankleY: number,
  toeY: number,
  visibility = 1,
) => {
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 0, ankleY, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_FOOT_INDEX, 0, toeY, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 1, ankleY, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_FOOT_INDEX, 1, toeY, visibility);
};

const setBilateralElbowAngles = (landmarks: PoseLandmark[], angle: number, visibility = 1) => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 1, 1, visibility);
  setPoint(landmarks, POSE_INDICES.LEFT_ELBOW, 0, 1, visibility);
  const leftWrist = pointAtAngle(0, 1, 1, 1, angle);
  setPoint(landmarks, POSE_INDICES.LEFT_WRIST, leftWrist.x, leftWrist.y, visibility);

  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 4, 1, visibility);
  setPoint(landmarks, POSE_INDICES.RIGHT_ELBOW, 3, 1, visibility);
  const rightWrist = pointAtAngle(3, 1, 4, 1, angle);
  setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, rightWrist.x, rightWrist.y, visibility);
};

const setShoulderPressPose = (landmarks: PoseLandmark[], phase: 'down' | 'up') => {
  if (phase === 'down') {
    setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0, 0.4);
    setPoint(landmarks, POSE_INDICES.LEFT_ELBOW, 0, 0.55);
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0.1, 0.45);
    setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 1, 0.4);
    setPoint(landmarks, POSE_INDICES.RIGHT_ELBOW, 1, 0.55);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 0.9, 0.45);
    return;
  }

  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0, 0.4);
  setPoint(landmarks, POSE_INDICES.LEFT_ELBOW, 0, 0.2);
  setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0, 0.1);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 1, 0.4);
  setPoint(landmarks, POSE_INDICES.RIGHT_ELBOW, 1, 0.2);
  setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 1, 0.1);
};

const setRaisePose = (landmarks: PoseLandmark[], phase: 'down' | 'lateral' | 'front') => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0.4, 0.3);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 0.6, 0.3);
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 0.42, 0.7);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 0.58, 0.7);

  if (phase === 'down') {
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0.43, 0.74);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 0.57, 0.74);
  } else if (phase === 'lateral') {
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, -0.6, 0.32);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 1.6, 0.32);
  } else {
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0.44, 0.32);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 0.56, 0.32);
  }
};

const setJumpingJackPose = (landmarks: PoseLandmark[], phase: 'closed' | 'open') => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0.4, 0.4);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 0.6, 0.4);
  if (phase === 'closed') {
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0.42, 0.65);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 0.58, 0.65);
    setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 0.46, 0.9);
    setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 0.54, 0.9);
  } else {
    setPoint(landmarks, POSE_INDICES.LEFT_WRIST, 0.15, 0.2);
    setPoint(landmarks, POSE_INDICES.RIGHT_WRIST, 0.85, 0.2);
    setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 0.2, 0.9);
    setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 0.8, 0.9);
  }
};

const setHighKneePose = (landmarks: PoseLandmark[], phase: 'down' | 'up') => {
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 0, 0.5);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 1, 0.5);
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 0, 0.95);
  setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 1, 0.95);
  setPoint(landmarks, POSE_INDICES.LEFT_KNEE, 0, phase === 'up' ? 0.48 : 0.7);
  setPoint(landmarks, POSE_INDICES.RIGHT_KNEE, 1, 0.72);
};

const setMountainClimberPose = (landmarks: PoseLandmark[], phase: 'extended' | 'drive') => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0, 0.2);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 0, 0.25);
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 1, 0.2);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 1, 0.25);
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 2, 0.2);
  setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 2, 0.25);
  setPoint(landmarks, POSE_INDICES.LEFT_KNEE, 1.45, phase === 'drive' ? 0.2 : 0.35);
  setPoint(landmarks, POSE_INDICES.RIGHT_KNEE, 1.45, 0.4);
};

const setTorsoAnglePose = (landmarks: PoseLandmark[], angle: number) => {
  const leftShoulder = pointAtAngle(0, 0, 1, 0, angle);
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 0, 0);
  setPoint(landmarks, POSE_INDICES.LEFT_KNEE, 1, 0);
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, leftShoulder.x, leftShoulder.y);

  const rightShoulder = pointAtAngle(3, 0, 4, 0, angle);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 3, 0);
  setPoint(landmarks, POSE_INDICES.RIGHT_KNEE, 4, 0);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, rightShoulder.x, rightShoulder.y);
};

const setDeadliftPose = (landmarks: PoseLandmark[], hipAngle: number) => {
  setTorsoAnglePose(landmarks, hipAngle);
  setPoint(landmarks, POSE_INDICES.LEFT_ANKLE, 2, 0);
  setPoint(landmarks, POSE_INDICES.RIGHT_ANKLE, 5, 0);
};

const setGluteBridgePose = (landmarks: PoseLandmark[], phase: 'down' | 'up') => {
  setPoint(landmarks, POSE_INDICES.LEFT_SHOULDER, 0, 0.6);
  setPoint(landmarks, POSE_INDICES.RIGHT_SHOULDER, 1, 0.6);
  setPoint(landmarks, POSE_INDICES.LEFT_KNEE, 0, 0.6);
  setPoint(landmarks, POSE_INDICES.RIGHT_KNEE, 1, 0.6);
  setPoint(landmarks, POSE_INDICES.LEFT_HIP, 0, phase === 'up' ? 0.5 : 0.6);
  setPoint(landmarks, POSE_INDICES.RIGHT_HIP, 1, phase === 'up' ? 0.5 : 0.6);
};

describe('exerciseAnalysis', () => {
  it('exposes seventeen camera-check exercise types', () => {
    expect(EXERCISE_OPTIONS).toHaveLength(17);
  });

  it('normalizes reflex angles over 180 degrees', () => {
    const angle = calculateAngle(
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: -1, y: 0 },
    );

    expect(angle).toBeCloseTo(90, 5);
  });

  it('counts a squat only once across repeated down and up frames', () => {
    const state = createExerciseState();
    const up = createLandmarks();
    const down = createLandmarks();
    const deeperDown = createLandmarks();
    const finish = createLandmarks();

    setBilateralKneeAngles(up, 165);
    setBilateralKneeAngles(down, 100);
    setBilateralKneeAngles(deeperDown, 95);
    setBilateralKneeAngles(finish, 170);

    expect(analyzeExercise(up, 'squat', state).currentCount).toBe(0);
    expect(analyzeExercise(down, 'squat', state).currentCount).toBe(0);
    expect(analyzeExercise(deeperDown, 'squat', state).currentCount).toBe(0);
    expect(analyzeExercise(finish, 'squat', state).currentCount).toBe(1);
    expect(analyzeExercise(finish, 'squat', state).currentCount).toBe(1);
  });

  it('counts a lunge only after a full down to up cycle', () => {
    const state = createExerciseState();
    const up = createLandmarks();
    const down = createLandmarks();

    setBilateralKneeAngles(up, 160);
    setBilateralKneeAngles(down, 100);

    expect(analyzeExercise(up, 'lunge', state).currentCount).toBe(0);
    expect(analyzeExercise(down, 'lunge', state).currentCount).toBe(0);
    expect(analyzeExercise(up, 'lunge', state).currentCount).toBe(1);
  });

  it('does not count a pushup when body alignment breaks during the rep', () => {
    const state = createExerciseState();
    const start = createLandmarks();
    const badDown = createLandmarks();
    const recoverUp = createLandmarks();

    setPushupPose(start, 170, 170);
    setPushupPose(badDown, 80, 140);
    setPushupPose(recoverUp, 170, 170);

    analyzeExercise(start, 'pushup', state);
    analyzeExercise(badDown, 'pushup', state);
    const result = analyzeExercise(recoverUp, 'pushup', state);

    expect(result.currentCount).toBe(0);
    expect(result.isCorrectForm).toBe(true);
  });

  it('counts a pushup when both down and up phases keep proper form', () => {
    const state = createExerciseState();
    const start = createLandmarks();
    const goodDown = createLandmarks();
    const goodUp = createLandmarks();

    setPushupPose(start, 170, 170);
    setPushupPose(goodDown, 80, 170);
    setPushupPose(goodUp, 170, 170);

    analyzeExercise(start, 'pushup', state);
    analyzeExercise(goodDown, 'pushup', state);
    const result = analyzeExercise(goodUp, 'pushup', state);

    expect(result.currentCount).toBe(1);
    expect(result.isCorrectForm).toBe(true);
  });

  it('ignores low-visibility squat landmarks instead of counting noisy frames', () => {
    const state = createExerciseState();
    const noisyLandmarks = createLandmarks();

    setBilateralKneeAngles(noisyLandmarks, 95, 0.1);

    const result = analyzeExercise(noisyLandmarks, 'squat', state);

    expect(result.feedback).toBe('랜드마크 부족');
    expect(result.currentCount).toBe(0);
  });

  it('counts calf raises only after returning from the lowered phase', () => {
    const state = createExerciseState();
    const down = createLandmarks();
    const up = createLandmarks();

    setCalfRaisePose(down, 0.095, 0.09);
    setCalfRaisePose(up, 0.2, 0.1);

    expect(analyzeExercise(down, 'calf_raise', state).currentCount).toBe(0);
    expect(analyzeExercise(up, 'calf_raise', state).currentCount).toBe(1);
    expect(analyzeExercise(up, 'calf_raise', state).currentCount).toBe(1);
  });

  it('does not count a squat by joining frames across lost tracking', () => {
    const state = createExerciseState();
    const down = createLandmarks();
    const missing = createLandmarks();
    const up = createLandmarks();

    setBilateralKneeAngles(down, 100);
    setBilateralKneeAngles(missing, 100, 0.1);
    setBilateralKneeAngles(up, 170);

    expect(analyzeExercise(down, 'squat', state).currentCount).toBe(0);
    expect(analyzeExercise(missing, 'squat', state).currentCount).toBe(0);
    expect(analyzeExercise(up, 'squat', state).currentCount).toBe(0);
  });

  it('does not count a calf raise by joining frames across lost tracking', () => {
    const state = createExerciseState();
    const down = createLandmarks();
    const missing = createLandmarks();
    const up = createLandmarks();

    setCalfRaisePose(down, 0.095, 0.09);
    setCalfRaisePose(missing, 0.095, 0.09, 0.1);
    setCalfRaisePose(up, 0.2, 0.1);

    expect(analyzeExercise(down, 'calf_raise', state).currentCount).toBe(0);
    expect(analyzeExercise(missing, 'calf_raise', state).currentCount).toBe(0);
    expect(analyzeExercise(up, 'calf_raise', state).currentCount).toBe(0);
  });

  it.each<[ExerciseType, (landmarks: PoseLandmark[]) => void, (landmarks: PoseLandmark[]) => void]>([
    ['bicep_curl', (pose) => setBilateralElbowAngles(pose, 170), (pose) => setBilateralElbowAngles(pose, 50)],
    ['shoulder_press', (pose) => setShoulderPressPose(pose, 'down'), (pose) => setShoulderPressPose(pose, 'up')],
    ['lateral_raise', (pose) => setRaisePose(pose, 'down'), (pose) => setRaisePose(pose, 'lateral')],
    ['front_raise', (pose) => setRaisePose(pose, 'down'), (pose) => setRaisePose(pose, 'front')],
    ['jumping_jack', (pose) => setJumpingJackPose(pose, 'closed'), (pose) => setJumpingJackPose(pose, 'open')],
    ['high_knee', (pose) => setHighKneePose(pose, 'down'), (pose) => setHighKneePose(pose, 'up')],
    ['mountain_climber', (pose) => setMountainClimberPose(pose, 'extended'), (pose) => setMountainClimberPose(pose, 'drive')],
    ['situp', (pose) => setTorsoAnglePose(pose, 170), (pose) => setTorsoAnglePose(pose, 95)],
    ['crunch', (pose) => setTorsoAnglePose(pose, 170), (pose) => setTorsoAnglePose(pose, 120)],
    ['deadlift', (pose) => setDeadliftPose(pose, 110), (pose) => setDeadliftPose(pose, 170)],
    ['glute_bridge', (pose) => setGluteBridgePose(pose, 'down'), (pose) => setGluteBridgePose(pose, 'up')],
    ['tricep_dip', (pose) => setBilateralElbowAngles(pose, 80), (pose) => setBilateralElbowAngles(pose, 170)],
  ])('counts a full %s repetition', (type, setDown, setUp) => {
    const state = createExerciseState();
    const down = createLandmarks();
    const up = createLandmarks();

    setDown(down);
    setUp(up);

    expect(analyzeExercise(down, type, state).currentCount).toBe(0);
    expect(analyzeExercise(up, type, state).currentCount).toBe(1);
    expect(analyzeExercise(up, type, state).currentCount).toBe(1);
  });
});
