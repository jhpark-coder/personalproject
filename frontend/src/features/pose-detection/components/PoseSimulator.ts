import { POSE_CONSTANTS } from '../utils/pose-constants';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

function makeEmptyLandmarks(): Landmark[] {
  const arr: Landmark[] = new Array(33).fill(0).map(() => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  return arr;
}

export function createSquatSimulator(speed: number = 1.2) {
  // t: seconds
  let t = 0;
  return {
    next(dt: number = 1 / 60): Landmark[] {
      t += dt * speed;
      // depth 0..1 using half-sine
      const depth = (Math.sin(t) + 1) / 2; // 0(up) -> 1(down)

      const lm = makeEmptyLandmarks();
      const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE, LEFT_SHOULDER, RIGHT_SHOULDER } = POSE_CONSTANTS;

      // Base anchors
      const baseX = 0.5;
      const leftX = baseX - 0.08;
      const rightX = baseX + 0.08;

      const hipY = 0.50 + 0.15 * depth;   // 더 큰 변화로 각도 차이 증가
      const kneeY = 0.70 + 0.08 * depth;  // 무릎도 더 많이 움직이게
      const ankleY = 0.90;

      const kneeForward = 0.15 * depth; // 무릎이 더 앞으로 나오게 해서 각도 감소 유도

      // Left side
      lm[LEFT_HIP] = { x: leftX, y: hipY, visibility: 0.95 };
      lm[LEFT_KNEE] = { x: leftX + kneeForward, y: kneeY, visibility: 0.95 };
      lm[LEFT_ANKLE] = { x: leftX, y: ankleY, visibility: 0.95 };

      // Right side
      lm[RIGHT_HIP] = { x: rightX, y: hipY, visibility: 0.95 };
      lm[RIGHT_KNEE] = { x: rightX + kneeForward, y: kneeY, visibility: 0.95 };
      lm[RIGHT_ANKLE] = { x: rightX, y: ankleY, visibility: 0.95 };

      // Shoulders
      lm[LEFT_SHOULDER] = { x: leftX, y: 0.35 + 0.03 * depth, visibility: 0.95 };
      lm[RIGHT_SHOULDER] = { x: rightX, y: 0.35 + 0.03 * depth, visibility: 0.95 };

      // Head landmarks for distance validation
      const { NOSE, LEFT_EYE, RIGHT_EYE } = POSE_CONSTANTS;
      lm[NOSE] = { x: baseX, y: 0.15 + 0.01 * depth, visibility: 0.95 };
      lm[LEFT_EYE] = { x: leftX + 0.02, y: 0.13 + 0.01 * depth, visibility: 0.95 };
      lm[RIGHT_EYE] = { x: rightX - 0.02, y: 0.13 + 0.01 * depth, visibility: 0.95 };

      return lm;
    }
  };
} 