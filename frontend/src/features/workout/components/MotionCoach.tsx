import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../../../context/WorkoutContext';
import '../../../components/ui/styles/pose-detection.css';
import { API_ENDPOINTS } from '../../../config/api';
import PoseDetector from '../../pose-detection/components/PoseDetector';
import { SquatAnalyzer } from '../../pose-detection/analyzers';

interface ExerciseAnalysis {
    exerciseType: string;
    currentCount: number;
    isCorrectForm: boolean;
    feedback: string;
    confidence: number;
}

interface MotionCoachProps {
    exerciseType: string;
    targetReps?: number;
    targetSets?: number;
    currentSet?: number;
    onSetComplete?: () => void;
    onSessionComplete?: (sessionData: any) => void;
    onPoseDetected?: (landmarks: any[], analysis?: ExerciseAnalysis) => void;
}

interface MotionState {
    isInPosition: boolean;
    lastPosition: string | null;
}

function MotionCoach({
    exerciseType = 'squat',
    targetReps = 10,
    targetSets = 1,
    currentSet = 1,
    onSetComplete,
    onSessionComplete,
    onPoseDetected
}: MotionCoachProps) {
    const navigate = useNavigate();
    const { currentExerciseIndex } = useWorkout();
    
    // 첫 운동이 아닌 경우 자동 시작 (currentExerciseIndex > 0이면 이전에 운동한 적이 있음)
    const shouldAutoStart = currentExerciseIndex > 0;
    const [isSessionActive, setIsSessionActive] = useState(shouldAutoStart);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(shouldAutoStart ? new Date() : null);
    const [currentExercise, setCurrentExercise] = useState<any>({});
    const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis | null>(null);
    const [allWorkoutResults, setAllWorkoutResults] = useState<any[]>([]);
    
    // UI 업데이트를 위해 repCount는 useState 사용 (우선순위 1 버그 수정)
    const [repCount, setRepCount] = useState(0);
    const stateRef = useRef<MotionState>({
        isInPosition: false,
        lastPosition: null
    });

    // TTS 음성 피드백 함수
    const playTTSFeedback = useCallback((message: string, isImportant: boolean = false) => {
        if ('speechSynthesis' in window && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            utterance.volume = isImportant ? 1.0 : 0.7;
            utterance.pitch = isImportant ? 1.2 : 1.0;
            
            // 이전 발언 중단
            window.speechSynthesis.cancel();
            
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 100);
        }
    }, []);

    // 두 번째 운동부터 자동 시작
    useEffect(() => {
        if (shouldAutoStart && !isSessionActive) {
            console.log('🚀 [MotionCoach] 자동 시작 - 운동 인덱스:', currentExerciseIndex);
            // 약간의 지연 후 자동 시작 (화면이 렌더링된 후)
            const timer = setTimeout(() => {
                setIsSessionActive(true);
                setSessionStartTime(new Date());
                setRepCount(0);
                stateRef.current = { isInPosition: false, lastPosition: null };
                
                // TTS 음성 안내
                const ttsMessage = `${exerciseType} 운동을 시작합니다. ${targetReps}회를 목표로 운동해주세요.`;
                console.log('🔊 [MotionCoach] 자동 시작 TTS:', ttsMessage);
                playTTSFeedback(ttsMessage, true);
            }, 1000); // 1초 후 자동 시작

            return () => clearTimeout(timer);
        }
    }, [shouldAutoStart, isSessionActive, currentExerciseIndex, exerciseType, targetReps, playTTSFeedback]);

    // 운동 완료 함수
    const finishCurrentExercise = useCallback(async () => {
        if (import.meta.env.DEV) console.log('🏁 운동 완료!', exerciseType, repCount);
        
        if (!sessionStartTime) {
            if (import.meta.env.DEV) console.warn('세션 시작 시간이 없습니다.');
            return;
        }

        const exerciseResult = {
            exerciseName: (currentExercise as any)?.name || exerciseType,
            completedReps: repCount,
            targetReps: (currentExercise as any)?.reps ?? targetReps,
            completedSets: currentSet,
            targetSets: (currentExercise as any)?.sets ?? targetSets,
            caloriesBurned: Math.round(repCount * 0.5),
            duration: Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
        };

        // Set completion callback - 세트 완료 알림
        if (onSetComplete) {
            onSetComplete();
        }
        
        // 모든 세트 완료 여부 확인
        // currentSet은 1부터 시작하므로, currentSet >= targetSets일 때 모든 세트 완료
        const isAllSetsComplete = currentSet >= targetSets;

        // 모든 세트가 완료되었을 때만 세션 완료 처리
        if (!isAllSetsComplete) {
            return; // 아직 더 세트가 남았으면 여기서 종료
        }

        // 전체 세션 완료 처리
        const finalSessionData = {
            sessionId: `workout_${Date.now()}`,
            userId: 'default_user',
            exerciseType: exerciseType,
            results: exerciseResult,
            startTime: sessionStartTime,
            endTime: new Date(),
            duration: Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000),
            completedExercises: [...allWorkoutResults, {
                exerciseName: (currentExercise as any)?.name || exerciseType,
                completedReps: repCount,
                targetReps: (currentExercise as any)?.reps ?? targetReps,
                sets: (currentExercise as any)?.sets ?? targetSets
            }]
        };

        playTTSFeedback('모든 운동을 완료했습니다! 수고하셨습니다. 잠시 후 결과 페이지로 이동합니다.', true);
        
        // 로컬 스토리지에 백업 먼저 저장
        const backupKey = `workout_backup_${Date.now()}`;
        try {
            localStorage.setItem(backupKey, JSON.stringify(finalSessionData));
            if (import.meta.env.DEV) console.log('✅ 운동 데이터 로컬 백업 완료');
        } catch (error) {
            if (import.meta.env.DEV) console.warn('로컬 백업 실패:', error);
        }
        
        // 서버에 전송 시도
        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/workout/full-session-feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalSessionData)
            });
            
            if (response.ok) {
                if (import.meta.env.DEV) console.log('✅ 서버 전송 성공');
                // 전송 성공 시 백업 데이터 제거
                localStorage.removeItem(backupKey);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('❌ 서버 전송 실패, 백업 데이터 유지:', error);
            // 실패 시 사용자에게 알림(프로덕션 UX는 토스트로 대체 가능)
            if (import.meta.env.DEV) alert('⚠️ 네트워크 문제로 결과 저장에 실패했습니다. 데이터는 안전하게 보관되어 있으니 안심하세요!');
            
            // 재시도 플래그 설정
            localStorage.setItem('workout_backup_pending', 'true');
        }

        setIsSessionActive(false);
        
        // If onSessionComplete callback is provided (for integration), use it
        if (onSessionComplete) {
            const sessionData = {
                totalReps: repCount,
                duration: sessionStartTime ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000) : 0,
                exerciseType: exerciseType,
                caloriesBurned: Math.round(repCount * 0.5), // Simple calorie estimation
                averageFormScore: 0.85, // Mock score - replace with actual calculation
                formCorrectionsCount: 0, // Mock count - replace with actual tracking
                completedSets: Math.ceil(repCount / targetReps),
                targetSets,
                targetReps
            };
            onSessionComplete(sessionData);
        } else {
            // Default navigation to results page
            setTimeout(() => {
                navigate('/results');
            }, 3000);
        }
    }, [exerciseType, targetReps, targetSets, sessionStartTime, currentExercise, allWorkoutResults, onSetComplete, onSessionComplete, playTTSFeedback, navigate, repCount]);

    // 분석 함수들을 먼저 정의 (TDZ 방지)
    
    // 스쿼트 분석 함수 (간단한 구현)
    const analyzeSquatWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        const hasValidLandmarks = landmarks && landmarks.length > 0;
        const avgVisibility = hasValidLandmarks 
            ? landmarks.reduce((sum, lm) => sum + (lm?.visibility || 0), 0) / landmarks.length 
            : 0;
        
        return {
            exerciseType: 'squat',
            currentCount: repCount,
            isCorrectForm: hasValidLandmarks && avgVisibility > 0.5,
            feedback: hasValidLandmarks ? '스쿼트 자세 좋음' : '자세를 카메라에 맞춰주세요',
            confidence: Math.max(0.1, Math.min(0.9, avgVisibility))
        };
    }, [repCount]);
    
    const analyzePushupWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        return { 
            exerciseType: 'pushup',
            currentCount: repCount, 
            isCorrectForm: landmarks.length > 0, 
            feedback: '푸시업 자세 유지하세요', 
            confidence: Math.min(0.9, landmarks.length > 0 ? 0.8 : 0.1) 
        };
    }, [repCount]);

    const analyzeLungeWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        return { 
            exerciseType: 'lunge',
            currentCount: repCount, 
            isCorrectForm: landmarks.length > 0, 
            feedback: '런지 자세 좋음', 
            confidence: Math.min(0.9, landmarks.length > 0 ? 0.8 : 0.1) 
        };
    }, [repCount]);

    const analyzePlankWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        return { 
            exerciseType: 'plank',
            currentCount: repCount, 
            isCorrectForm: landmarks.length > 0, 
            feedback: '플랭크 자세 유지 중', 
            confidence: Math.min(0.9, landmarks.length > 0 ? 0.8 : 0.1) 
        };
    }, [repCount]);

    const analyzeBurpeeWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        return { 
            exerciseType: 'burpee',
            currentCount: repCount, 
            isCorrectForm: landmarks.length > 0, 
            feedback: '버피 동작 좋음', 
            confidence: Math.min(0.9, landmarks.length > 0 ? 0.8 : 0.1) 
        };
    }, [repCount]);

    const analyzeMountainClimberWithCount = useCallback((landmarks: any[]): ExerciseAnalysis => {
        return { 
            exerciseType: 'mountain_climber',
            currentCount: repCount, 
            isCorrectForm: landmarks.length > 0, 
            feedback: '마운틴 클라이머 자세 유지', 
            confidence: Math.min(0.9, landmarks.length > 0 ? 0.8 : 0.1) 
        };
    }, [repCount]);

    const analyzeGenericExercise = useCallback((landmarks: any[]): ExerciseAnalysis => {
        const hasValidLandmarks = landmarks && landmarks.length > 0;
        const avgConfidence = hasValidLandmarks 
            ? landmarks.reduce((sum, lm) => sum + (lm?.visibility || 0), 0) / landmarks.length 
            : 0;
        
        return { 
            exerciseType: 'generic',
            currentCount: repCount, 
            isCorrectForm: hasValidLandmarks, 
            feedback: hasValidLandmarks 
                ? '운동을 계속하세요. 수동으로 카운팅해주세요.' 
                : '자세를 카메라에 맞춰주세요', 
            confidence: Math.max(0.1, Math.min(0.8, avgConfidence)) 
        };
    }, [repCount]);

    // 분석 함수들이 모두 정의된 후에 매핑 함수 정의
    const getAnalysisFunctionFor = useCallback((exerciseName: string) => {
        const name = exerciseName.toLowerCase().trim();
        
        if (name.includes('squat') || name.includes('스쿼트') || 
            name.includes('deep squat') || name.includes('jump squat') ||
            name.includes('딥 스쿼트') || name.includes('점프 스쿼트')) {
            return analyzeSquatWithCount;
        }
        
        if (name.includes('pushup') || name.includes('push-up') || name.includes('push up') ||
            name.includes('팔굽혀펴기') || name.includes('푸시업') || 
            name.includes('incline pushup') || name.includes('decline pushup')) {
            return analyzePushupWithCount;
        }
        
        if (name.includes('lunge') || name.includes('런지') || 
            name.includes('forward lunge') || name.includes('앞 런지')) {
            return analyzeLungeWithCount;
        }
        
        if (name.includes('plank') || name.includes('플랭크') || 
            name.includes('forearm plank') || name.includes('팔뚝 플랭크')) {
            return analyzePlankWithCount;
        }
        
        if (name.includes('burpee') || name.includes('버피') || name.includes('burpees')) {
            return analyzeBurpeeWithCount;
        }
        
        if (name.includes('mountain_climber') || name.includes('mountain climber') || 
            name.includes('마운틴 클라이머') || name.includes('산악 등반')) {
            return analyzeMountainClimberWithCount;
        }
        
        console.warn(`운동 "${exerciseName}"에 대한 전용 분석기가 없습니다. 기본 분석기를 사용합니다.`);
        return analyzeGenericExercise;
    }, [analyzeSquatWithCount, analyzePushupWithCount, analyzeLungeWithCount, analyzePlankWithCount, analyzeBurpeeWithCount, analyzeMountainClimberWithCount, analyzeGenericExercise]);

    // 이제 getAnalysisFunctionFor가 정의된 후에 이를 사용하는 함수들 정의
    const analyzeExercise = useCallback((landmarks: any[]) => {
        const exerciseName = (currentExercise as any)?.name || exerciseType || 'squat';
        const targetRepCount = (currentExercise as any)?.reps ?? targetReps;
        
        const analysisFunction = getAnalysisFunctionFor(exerciseName);
        if (analysisFunction) {
            const analysis = analysisFunction(landmarks);
            setExerciseAnalysis(analysis);
            if (targetRepCount && analysis.currentCount >= targetRepCount) {
                finishCurrentExercise();
            }
        }
    }, [currentExercise, exerciseType, targetReps, getAnalysisFunctionFor, finishCurrentExercise]);

    // 세션 시작
    const startSession = useCallback(() => {
        console.log('🎯 [MotionCoach] 세션 시작!');
        setIsSessionActive(true);
        setSessionStartTime(new Date());
        setRepCount(0);
        stateRef.current = { isInPosition: false, lastPosition: null };
        
        // TTS 음성 안내 먼저 실행
        const ttsMessage = `${exerciseType} 운동을 시작합니다. ${targetReps}회를 목표로 운동해주세요.`;
        console.log('🔊 [MotionCoach] TTS 메시지:', ttsMessage);
        playTTSFeedback(ttsMessage, true);
        
        // 모바일에서 카메라 자동 시작
        setTimeout(() => {
            const videoContainer = document.querySelector('.video-container');
            if (videoContainer && !document.querySelector('.pose-video')?.srcObject) {
                (videoContainer as HTMLElement).click();
                console.log('📱 모바일 카메라 시작 트리거');
            }
        }, 500);
    }, [exerciseType, targetReps, playTTSFeedback]);

    // 포즈 감지 콜백 - PoseDetector로부터 분석 결과를 받아 처리
    const handlePoseDetected = useCallback((landmarks: any[], analysisFromChild?: ExerciseAnalysis) => {
        if (isSessionActive && landmarks) {
            // 내장 PoseDetector가 전달한 분석값 우선 사용, 없으면 로컬 분석 수행
            if (analysisFromChild) {
                // 외부 분석 결과의 카운트를 useState로 반영 (UI 업데이트)
                const newCount = analysisFromChild.currentCount;
                
                // 실제로 카운트가 증가했을 때만 업데이트하고 음성 피드백
                if (newCount > repCount) {
                    setRepCount(newCount);
                    
                    // 카운트 증가 시 음성 피드백
                    if (newCount % 5 === 0) {
                        playTTSFeedback(`${newCount}회 완료! 좋습니다!`, false);
                    } else if (newCount === targetReps - 2) {
                        playTTSFeedback(`2회 남았습니다!`, true);
                    }
                    
                    if (import.meta.env.DEV) console.log(`🔢 운동 카운트 증가: ${newCount}/${targetReps}`);
                }
                
                setExerciseAnalysis(analysisFromChild);
                if (onPoseDetected) onPoseDetected(landmarks, analysisFromChild);
                
                // 목표 도달 시 세트/세션 종료 처리
                if (targetReps && newCount >= targetReps) {
                    finishCurrentExercise();
                }
            } else {
                analyzeExercise(landmarks);
                if (onPoseDetected && exerciseAnalysis) onPoseDetected(landmarks, exerciseAnalysis);
            }
        }
    }, [isSessionActive, analyzeExercise, onPoseDetected, exerciseAnalysis, targetReps, finishCurrentExercise, repCount, playTTSFeedback]);

    // DEV: 카메라 없이도 카운팅 검증용 시뮬레이터 (Shift+S 시작/중지)
    const simulatorRef = useRef<{ running: boolean; raf: number | null; sim: any } | null>(null);
    const startSimulator = useCallback(async () => {
        if (simulatorRef.current?.running) return;
        console.log('🔧 Starting Motion Coach simulator');
        const mod = await import('../../pose-detection/components/PoseSimulator');
        const sim = mod.createSquatSimulator();
        // 실제 카운팅 로직: SquatAnalyzer 사용
        const analyzer = new SquatAnalyzer();
        const external = { current: { phase: 'up', count: 0 } } as { current: { phase: string; count: number } };
        analyzer.setExternalState(external);
        simulatorRef.current = { running: true, raf: null, sim };
        let frameCount = 0;
        const tick = () => {
            const ctx = simulatorRef.current;
            if (!ctx || !ctx.running) { if (ctx?.raf) cancelAnimationFrame(ctx.raf); return; }
            const lm = ctx.sim.next(1/30);
            const analysis = analyzer.analyze(lm);
            
            // Debug logging every 30 frames (1 second)
            frameCount++;
            if (frameCount % 30 === 0) {
                console.log(`🔢 Frame ${frameCount}: count=${analysis.currentCount}, phase=${external.current.phase}, form=${analysis.isCorrectForm}, feedback=${analysis.feedback}`);
            }
            
            setExerciseAnalysis(analysis);
            // Ensure rep count updates immediately
            const newCount = analysis.currentCount;
            if (newCount > 0) {
                setRepCount(newCount);
                console.log(`✅ Rep count updated to: ${newCount}`);
            }
            ctx.raf = requestAnimationFrame(tick);
        };
        simulatorRef.current.raf = requestAnimationFrame(tick);
        console.log('✅ Motion Coach simulator started successfully');
    }, [getAnalysisFunctionFor]);

    const stopSimulator = useCallback(() => {
        const ctx = simulatorRef.current;
        if (!ctx) return;
        ctx.running = false;
        if (ctx.raf) cancelAnimationFrame(ctx.raf);
        simulatorRef.current = null;
    }, []);

    // DEV: Shift+S 수동 토글 (개발 편의)
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key.toLowerCase() === 's') {
                if (simulatorRef.current?.running) stopSimulator(); else startSimulator();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [startSimulator, stopSimulator]);

    // DEV: ?sim=1 이면 자동으로 세션/시뮬레이터 시작
    useEffect(() => {
        // HashRouter 환경 지원: search가 비어있으면 hash에서 ? 이후를 파싱
        const rawSearch = window.location.search && window.location.search.length > 1
            ? window.location.search.substring(1)
            : (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        const params = new URLSearchParams(rawSearch);
        const autoSim = params.get('sim') === '1';
        if (!autoSim) return;
        if (!isSessionActive) startSession();
        const id = setTimeout(() => { startSimulator(); }, 300);
        return () => clearTimeout(id);
    }, [isSessionActive, startSession, startSimulator]);


    // Initialize exercise on mount or when props change
    useEffect(() => {
        setCurrentExercise({
            name: exerciseType,
            reps: targetReps,
            sets: targetSets
        });
    }, [exerciseType, targetReps, targetSets]);

    return (
        <div className="motion-coach">
            <div className="motion-coach-header">
                <h2>모션 코치</h2>
                <div className="exercise-info">
                    <span>{exerciseType}</span>
                    <span>{repCount} / {targetReps} 회</span>
                    {targetSets > 1 && <span>세트 {currentSet} / {targetSets}</span>}
                </div>
            </div>

            {!isSessionActive ? (
                <div className="session-controls">
                    {shouldAutoStart ? (
                        <div className="auto-start-message">
                            <div className="loading-spinner">⏳</div>
                            <div>잠시만요... 자동으로 운동을 시작합니다</div>
                            <div style={{marginTop:8,fontSize:12,color:'#666'}}>
                                두 번째 운동부터는 자동으로 시작됩니다
                            </div>
                        </div>
                    ) : (
                        <>
                            <button onClick={startSession} className="start-session-btn">
                                운동 시작
                            </button>
                            <div style={{marginTop:8,fontSize:12,color:'#666'}}>카메라가 켜지면 자동으로 모션을 추적합니다.</div>
                        </>
                    )}
                </div>
            ) : (
                <div className="session-active">
                    <div className="exercise-stats">
                        <div className="rep-counter">
                            <div className="count">{repCount}</div>
                            <div className="target">/ {targetReps}</div>
                        </div>
                        
                        {exerciseAnalysis && (
                            <div className="form-feedback">
                                <div className={`form-status ${exerciseAnalysis.isCorrectForm ? 'good' : 'needs-improvement'}`}>
                                    {exerciseAnalysis.feedback}
                                </div>
                                <div className="confidence-meter">
                                    신뢰도: {Math.round(exerciseAnalysis.confidence * 100)}%
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* 포즈 감지 컴포넌트 실제 통합 */}
            <div className="pose-detection-container">
                <PoseDetector 
                    embedded
                    autoStart
                    exerciseType={exerciseType as any}
                    onPose={(lm, analysis) => handlePoseDetected(lm, analysis)}
                />
            </div>
        </div>
    );
}

export default MotionCoach;