// Base classes
export { BaseAnalyzer } from './base/BaseAnalyzer';
export type { ExerciseAnalysis, ExerciseAnalyzer } from './base/BaseAnalyzer';
export { AngleCalculator } from './base/AngleCalculator';

// Lower body analyzers
export { SquatAnalyzer } from './lowerBody/SquatAnalyzer';
export { LungeAnalyzer } from './lowerBody/LungeAnalyzer';
export { CalfRaiseAnalyzer } from './lowerBody/CalfRaiseAnalyzer';

// Upper body analyzers
export { PushupAnalyzer } from './upperBody/PushupAnalyzer';

// Core analyzers
export { PlankAnalyzer } from './core/PlankAnalyzer';

// Cardio analyzers
export { BurpeeAnalyzer } from './cardio/BurpeeAnalyzer';
export { MountainClimberAnalyzer } from './cardio/MountainClimberAnalyzer';

// All analyzers grouped by category
export const ANALYZERS = {
  lowerBody: {
    squat: 'SquatAnalyzer',
    lunge: 'LungeAnalyzer',
    calf_raise: 'CalfRaiseAnalyzer'
  },
  upperBody: {
    pushup: 'PushupAnalyzer'
  },
  core: {
    plank: 'PlankAnalyzer'
  },
  cardio: {
    burpee: 'BurpeeAnalyzer',
    mountain_climber: 'MountainClimberAnalyzer'
  }
} as const; 