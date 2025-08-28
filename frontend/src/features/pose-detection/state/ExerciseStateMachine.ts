import { Point3D, AngleCalculationResult } from '../analyzers/base/AngleCalculator';

export enum ExerciseState {
  READY = 'READY',
  CONTRACT = 'CONTRACT', 
  RELAX = 'RELAX',
  TRANSITION = 'TRANSITION',
  ERROR = 'ERROR'
}

export interface StateTransition {
  from: ExerciseState;
  to: ExerciseState;
  condition: (data: FrameAnalysisData) => boolean;
  requirements?: {
    minConfidence?: number;
    minDuration?: number;
    angleRange?: { min: number; max: number };
  };
  onTransition?: (data: FrameAnalysisData) => void;
}

export interface FrameAnalysisData {
  landmarks: Point3D[];
  angles: { [key: string]: AngleCalculationResult };
  timestamp: number;
  confidence: number;
  exerciseType: string;
}

export interface RepData {
  count: number;
  startTime: number;
  endTime?: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  feedback: string[];
  formErrors: string[];
}

export interface StateMachineResult {
  currentState: ExerciseState;
  previousState: ExerciseState;
  repCount: number;
  currentRep?: RepData;
  completedReps: RepData[];
  stateChanged: boolean;
  feedback: string[];
  confidence: number;
  isValidTransition: boolean;
}

export class ExerciseStateMachine {
  private currentState: ExerciseState = ExerciseState.READY;
  private previousState: ExerciseState = ExerciseState.READY;
  private repCount: number = 0;
  private completedReps: RepData[] = [];
  private currentRep?: RepData;
  private stateStartTime: number = Date.now();
  private transitions: StateTransition[] = [];
  private stateHistory: { state: ExerciseState; timestamp: number; confidence: number }[] = [];
  private readonly maxHistoryLength = 10;
  
  private readonly MIN_STATE_DURATION = 200;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.5;
  
  constructor(private exerciseType: string) {
    this.setupDefaultTransitions();
  }
  
  private setupDefaultTransitions(): void {
    this.transitions = [
      {
        from: ExerciseState.READY,
        to: ExerciseState.CONTRACT,
        condition: (data) => this.isContractPosition(data),
        requirements: { minConfidence: 0.6, minDuration: 300 }
      },
      {
        from: ExerciseState.CONTRACT,
        to: ExerciseState.RELAX,
        condition: (data) => this.isRelaxPosition(data),
        requirements: { minConfidence: 0.6, minDuration: 300 },
        onTransition: () => this.completeRep()
      },
      {
        from: ExerciseState.RELAX,
        to: ExerciseState.READY,
        condition: (data) => this.isReadyPosition(data),
        requirements: { minConfidence: 0.5, minDuration: 200 }
      },
      {
        from: ExerciseState.CONTRACT,
        to: ExerciseState.READY,
        condition: (data) => this.isReadyPosition(data),
        requirements: { minConfidence: 0.5, minDuration: 200 }
      }
    ];
  }
  
  addCustomTransition(transition: StateTransition): void {
    this.transitions.push(transition);
  }
  
  updateState(data: FrameAnalysisData): StateMachineResult {
    const previousState = this.currentState;
    const currentTime = Date.now();
    const stateChanged = this.processStateTransitions(data, currentTime);
    
    this.updateStateHistory(data, currentTime);
    this.updateCurrentRep(data, currentTime);
    
    const feedback = this.generateStateFeedback(data);
    
    return {
      currentState: this.currentState,
      previousState,
      repCount: this.repCount,
      currentRep: this.currentRep,
      completedReps: [...this.completedReps],
      stateChanged,
      feedback,
      confidence: data.confidence,
      isValidTransition: this.isValidTransition(previousState, this.currentState)
    };
  }
  
  private processStateTransitions(data: FrameAnalysisData, currentTime: number): boolean {
    const timeSinceStateChange = currentTime - this.stateStartTime;
    
    if (data.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      this.handleLowConfidence(data);
      return false;
    }
    
    for (const transition of this.transitions) {
      if (transition.from === this.currentState && transition.condition(data)) {
        if (this.meetsTransitionRequirements(transition, data, timeSinceStateChange)) {
          this.previousState = this.currentState;
          this.currentState = transition.to;
          this.stateStartTime = currentTime;
          
          if (transition.onTransition) {
            transition.onTransition(data);
          }
          
          return true;
        }
      }
    }
    
    return false;
  }
  
  private meetsTransitionRequirements(
    transition: StateTransition, 
    data: FrameAnalysisData, 
    timeSinceStateChange: number
  ): boolean {
    const req = transition.requirements;
    if (!req) return true;
    
    if (req.minConfidence && data.confidence < req.minConfidence) {
      return false;
    }
    
    if (req.minDuration && timeSinceStateChange < req.minDuration) {
      return false;
    }
    
    return true;
  }
  
  private handleLowConfidence(data: FrameAnalysisData): void {
    if (this.currentState !== ExerciseState.ERROR && data.confidence < 0.3) {
      this.previousState = this.currentState;
      this.currentState = ExerciseState.ERROR;
      this.stateStartTime = Date.now();
    }
  }
  
  private isContractPosition(data: FrameAnalysisData): boolean {
    return false;
  }
  
  private isRelaxPosition(data: FrameAnalysisData): boolean {
    return false;
  }
  
  private isReadyPosition(data: FrameAnalysisData): boolean {
    return data.confidence > 0.6;
  }
  
  private completeRep(): void {
    if (this.currentRep) {
      this.currentRep.endTime = Date.now();
      this.currentRep.quality = this.assessRepQuality(this.currentRep);
      this.completedReps.push(this.currentRep);
      this.repCount++;
    }
    
    this.currentRep = {
      count: this.repCount + 1,
      startTime: Date.now(),
      quality: 'fair',
      feedback: [],
      formErrors: []
    };
  }
  
  private assessRepQuality(rep: RepData): 'excellent' | 'good' | 'fair' | 'poor' {
    const errorCount = rep.formErrors.length;
    const duration = (rep.endTime || Date.now()) - rep.startTime;
    
    if (errorCount === 0 && duration > 1000 && duration < 4000) {
      return 'excellent';
    } else if (errorCount <= 1 && duration > 800) {
      return 'good';
    } else if (errorCount <= 2) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
  
  private updateStateHistory(data: FrameAnalysisData, currentTime: number): void {
    this.stateHistory.push({
      state: this.currentState,
      timestamp: currentTime,
      confidence: data.confidence
    });
    
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }
  }
  
  private updateCurrentRep(data: FrameAnalysisData, currentTime: number): void {
    if (this.currentState === ExerciseState.CONTRACT && !this.currentRep) {
      this.currentRep = {
        count: this.repCount + 1,
        startTime: currentTime,
        quality: 'fair',
        feedback: [],
        formErrors: []
      };
    }
  }
  
  private generateStateFeedback(data: FrameAnalysisData): string[] {
    const feedback: string[] = [];
    
    switch (this.currentState) {
      case ExerciseState.READY:
        feedback.push('자세를 준비하세요');
        break;
      case ExerciseState.CONTRACT:
        feedback.push('좋습니다! 동작을 유지하세요');
        break;
      case ExerciseState.RELAX:
        feedback.push('천천히 시작 자세로 돌아가세요');
        break;
      case ExerciseState.ERROR:
        feedback.push('자세를 다시 잡아주세요');
        break;
    }
    
    if (data.confidence < 0.5) {
      feedback.push('카메라 앞에서 전신이 보이도록 조정해주세요');
    }
    
    return feedback;
  }
  
  private isValidTransition(from: ExerciseState, to: ExerciseState): boolean {
    return this.transitions.some(t => t.from === from && t.to === to);
  }
  
  getStateHistory(): { state: ExerciseState; timestamp: number; confidence: number }[] {
    return [...this.stateHistory];
  }
  
  getCurrentRep(): RepData | undefined {
    return this.currentRep;
  }
  
  getCompletedReps(): RepData[] {
    return [...this.completedReps];
  }
  
  getRepCount(): number {
    return this.repCount;
  }
  
  getCurrentState(): ExerciseState {
    return this.currentState;
  }
  
  reset(): void {
    this.currentState = ExerciseState.READY;
    this.previousState = ExerciseState.READY;
    this.repCount = 0;
    this.completedReps = [];
    this.currentRep = undefined;
    this.stateStartTime = Date.now();
    this.stateHistory = [];
  }
  
  setCustomConditions(conditions: {
    isContract: (data: FrameAnalysisData) => boolean;
    isRelax: (data: FrameAnalysisData) => boolean;
    isReady: (data: FrameAnalysisData) => boolean;
  }): void {
    this.isContractPosition = conditions.isContract;
    this.isRelaxPosition = conditions.isRelax;
    this.isReadyPosition = conditions.isReady;
  }
}