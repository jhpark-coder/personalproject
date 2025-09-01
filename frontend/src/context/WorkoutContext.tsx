import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { WorkoutExercise } from '../types/exercise';

export interface WorkoutPlan {
  id: string;
  title: string;
  exercises: WorkoutExercise[];
}

interface WorkoutContextType {
  workoutPlan: WorkoutPlan | null;
  currentExercise: WorkoutExercise | null;
  currentExerciseIndex: number;
  setWorkoutPlan: (plan: WorkoutPlan | null) => void;
  goToNextExercise: () => void;
  resetWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

interface WorkoutProviderProps {
  children: ReactNode;
}

export const WorkoutProvider: React.FC<WorkoutProviderProps> = ({ children }) => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);

  const currentExercise = workoutPlan?.exercises[currentExerciseIndex] || null;

  const goToNextExercise = () => {
    if (workoutPlan && currentExerciseIndex < workoutPlan.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const resetWorkout = () => {
    setCurrentExerciseIndex(0);
    setWorkoutPlan(null);
  };

  const value: WorkoutContextType = {
    workoutPlan,
    currentExercise,
    currentExerciseIndex,
    setWorkoutPlan,
    goToNextExercise,
    resetWorkout,
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};

export default WorkoutProvider;