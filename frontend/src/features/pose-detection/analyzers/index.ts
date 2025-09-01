// Base classes
export { BaseAnalyzer } from './base/BaseAnalyzer';
export type { ExerciseAnalysis, ExerciseAnalyzer } from './base/BaseAnalyzer';
export { AngleCalculator } from './base/AngleCalculator';

// Lower body analyzers
export { SquatAnalyzer } from './lowerBody/SquatAnalyzer';
export { LungeAnalyzer } from './lowerBody/LungeAnalyzer';
export { CalfRaiseAnalyzer } from './lowerBody/CalfRaiseAnalyzer';
export { JumpSquatAnalyzer } from './lowerBody/JumpSquatAnalyzer';
export { DeadliftAnalyzer } from './lowerBody/DeadliftAnalyzer';
export { WallSitAnalyzer } from './lowerBody/WallSitAnalyzer';
export { BridgeAnalyzer } from './lowerBody/BridgeAnalyzer';

// Upper body analyzers
export { PushupAnalyzer } from './upperBody/PushupAnalyzer';
export { PullupAnalyzer } from './upperBody/PullupAnalyzer';

// Core analyzers
export { PlankAnalyzer } from './core/PlankAnalyzer';
export { SidePlankAnalyzer } from './core/SidePlankAnalyzer';
export { SitupAnalyzer } from './core/SitupAnalyzer';
export { CrunchAnalyzer } from './core/CrunchAnalyzer';

// Cardio analyzers
export { BurpeeAnalyzer } from './cardio/BurpeeAnalyzer';
export { MountainClimberAnalyzer } from './cardio/MountainClimberAnalyzer';
export { JumpingJackAnalyzer } from './cardio/JumpingJackAnalyzer';
export { HighKneesAnalyzer } from './cardio/HighKneesAnalyzer';

// All analyzers grouped by category
export const ANALYZERS = {
  lowerBody: {
    squat: 'SquatAnalyzer',
    lunge: 'LungeAnalyzer',
    calf_raise: 'CalfRaiseAnalyzer',
    jump_squat: 'JumpSquatAnalyzer',
    deadlift: 'DeadliftAnalyzer',
    wall_sit: 'WallSitAnalyzer',
    bridge: 'BridgeAnalyzer'
  },
  upperBody: {
    pushup: 'PushupAnalyzer',
    pullup: 'PullupAnalyzer'
  },
  core: {
    plank: 'PlankAnalyzer',
    side_plank: 'SidePlankAnalyzer',
    situp: 'SitupAnalyzer',
    crunch: 'CrunchAnalyzer'
  },
  cardio: {
    burpee: 'BurpeeAnalyzer',
    mountain_climber: 'MountainClimberAnalyzer',
    jumping_jack: 'JumpingJackAnalyzer',
    high_knees: 'HighKneesAnalyzer'
  }
} as const; 