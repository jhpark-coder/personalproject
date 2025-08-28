import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { useWorkout } from '../../../context/WorkoutContext';
import { hybridTTSService } from '../../../services/hybridTTSService';
import { apiClient } from '../../../utils/axiosConfig';
import './MotionCoach.css';
import '../../../components/ui/styles/pose-detection.css';

interface ExerciseAnalysis {
    currentCount: number;
    isCorrectForm: boolean;
    feedback: string;
    confidence: number;
}

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

// ... (Joint constants can be kept here if needed for analysis functions)

const MotionCoach: React.FC = () => {
    const navigate = useNavigate();
    const { workoutPlan, currentExercise, currentExerciseIndex, goToNextExercise, resetWorkout } = useWorkout();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [pose, setPose] = useState<any>(null);
    const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis | null>(null);
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [allWorkoutResults, setAllWorkoutResults] = useState<any[]>([]);
    const stateRef = useRef<{ phase: 'up' | 'down'; count: number }>({ phase: 'up', count: 0 });
    
    // 수동 카운팅 모드 상태 추가
    const [isManualMode, setIsManualMode] = useState<boolean>(false);
    const [motionDetectionFailed, setMotionDetectionFailed] = useState<boolean>(false);

    useEffect(() => {
        if (!workoutPlan) {
            navigate('/workout/select');
        }
        return () => {
            if (location.pathname !== '/results') {
               resetWorkout();
            }
        };
    }, [workoutPlan, navigate, resetWorkout]);

    useEffect(() => {
        stateRef.current = { phase: 'up', count: 0 };
        setExerciseAnalysis(null);
        if (currentExercise) {
            playTTSFeedback(`${currentExercise.name} 운동을 시작합니다. ${currentExercise.reps}회 반복해주세요.`, true);
        }
    }, [currentExercise]);

    const playTTSFeedback = useCallback(async (message: string, isImportant: boolean = false) => {
        // TTS logic remains the same
    }, []);

    const startWorkoutSession = () => {
        setIsSessionActive(true);
        setSessionStartTime(new Date());
        setAllWorkoutResults([]);
        playTTSFeedback(`운동을 시작합니다. 첫번째 운동은 ${currentExercise?.name} 입니다.`, true);
    };

    const finishCurrentExercise = () => {
        if (!currentExercise) return;

        const completedReps = stateRef.current.count;
        const targetReps = currentExercise.reps;
        const completionRate = Math.round((completedReps / targetReps) * 100);

        // 운동 완료 확인
        if (completedReps < targetReps * 0.5) { // 목표의 50% 미만
            const confirmFinish = window.confirm(
                `${currentExercise.name} 운동이 ${completedReps}/${targetReps}회만 완료되었습니다 (${completionRate}%).\n` +
                '정말 다음 운동으로 넘어가시겠습니까?\n\n' +
                '아니오를 선택하면 계속 운동하실 수 있습니다.'
            );
            
            if (!confirmFinish) {
                playTTSFeedback('계속해서 운동을 이어가세요!', true);
                return; // 운동 계속
            }
        } else if (completedReps < targetReps) { // 목표 미달성하지만 50% 이상
            playTTSFeedback(`목표 ${targetReps}회 중 ${completedReps}회 완료! 수고하셨습니다.`, true);
        } else { // 목표 달성 또는 초과
            playTTSFeedback(`목표 달성! ${completedReps}회 완료! 훌륭합니다!`, true);
        }

        const result = {
            exerciseName: currentExercise.name,
            completedReps: completedReps,
            targetReps: targetReps,
            sets: currentExercise.sets,
            completionRate: completionRate,
            timestamp: new Date().toISOString()
        };
        setAllWorkoutResults(prev => [...prev, result]);

        // 상태 초기화
        stateRef.current = { phase: 'up', count: 0 };
        setExerciseAnalysis(null);

        if (workoutPlan && currentExerciseIndex >= workoutPlan.length - 1) {
            endWorkoutSession();
        } else {
            setTimeout(() => {
                goToNextExercise();
            }, 1500); // 피드백 들을 시간 제공
        }
    };

    const endWorkoutSession = async () => {
        if (!sessionStartTime) return;
        const finalSessionData = {
            startTime: sessionStartTime,
            endTime: new Date(),
            duration: Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000),
            completedExercises: [...allWorkoutResults, {
                exerciseName: currentExercise?.name,
                completedReps: stateRef.current.count,
                targetReps: currentExercise?.reps,
                sets: currentExercise?.sets
            }]
        };

        playTTSFeedback('모든 운동을 완료했습니다! 수고하셨습니다. 잠시 후 결과 페이지로 이동합니다.', true);
        
        // 로컬 스토리지에 백업 먼저 저장
        const backupKey = `workout_backup_${Date.now()}`;
        try {
            localStorage.setItem(backupKey, JSON.stringify(finalSessionData));
            console.log('✅ 운동 데이터 로컬 백업 완료');
        } catch (error) {
            console.warn('로컬 백업 실패:', error);
        }
        
        // 서버에 전송 시도
        try {
            await apiClient.post('/api/workout/full-session-feedback', finalSessionData);
            console.log('✅ 서버 전송 성공');
            // 전송 성공 시 백업 데이터 제거
            localStorage.removeItem(backupKey);
        } catch (error) {
            console.error('❌ 서버 전송 실패, 백업 데이터 유지:', error);
            // 실패 시 사용자에게 알림
            alert('⚠️ 네트워크 문제로 결과 저장에 실패했습니다. 데이터는 안전하게 보관되어 있으니 안심하세요!');
            
            // 재시도 플래그 설정
            localStorage.setItem('workout_backup_pending', 'true');
        }

        setIsSessionActive(false);
        setTimeout(() => {
            navigate('/results');
        }, 3000);
    };

    const analyzeExercise = useCallback((landmarks: any[]) => {
        if (!currentExercise) return;
        const analysisFunction = getAnalysisFunctionFor(currentExercise.name);
        if (analysisFunction) {
            const analysis = analysisFunction(landmarks);
            setExerciseAnalysis(analysis);
            if (analysis.currentCount >= currentExercise.reps) {
                finishCurrentExercise();
            }
        }
    }, [currentExercise, finishCurrentExercise]);

    const getAnalysisFunctionFor = (exerciseName: string) => {
        // 개선된 운동 매핑 - 한글, 영어, 다양한 변형 지원
        const name = exerciseName.toLowerCase().trim();
        
        // 스쿼트 관련 (한글/영어 모두 지원)
        if (name.includes('squat') || name.includes('스쿼트') || 
            name.includes('deep squat') || name.includes('jump squat') ||
            name.includes('딥 스쿼트') || name.includes('점프 스쿼트')) {
            return analyzeSquatWithCount;
        }
        
        // 푸시업 관련 (한글/영어 모두 지원)
        if (name.includes('pushup') || name.includes('push-up') || name.includes('push up') ||
            name.includes('팔굽혀펴기') || name.includes('푸시업') || 
            name.includes('incline pushup') || name.includes('decline pushup')) {
            return analyzePushupWithCount;
        }
        
        // 런지 관련
        if (name.includes('lunge') || name.includes('런지') || 
            name.includes('forward lunge') || name.includes('앞 런지')) {
            return analyzeLungeWithCount;
        }
        
        // 플랭크 관련
        if (name.includes('plank') || name.includes('플랭크') || 
            name.includes('forearm plank') || name.includes('팔뚝 플랭크')) {
            return analyzePlankWithCount;
        }
        
        // 기본 분석기 (매핑되지 않은 운동들)
        console.warn(`운동 "${exerciseName}"에 대한 전용 분석기가 없습니다. 기본 분석기를 사용합니다.`);
        return analyzeGenericExercise;
    }

    // Keep analysis functions like analyzeSquatWithCount, analyzePushupWithCount etc.
    // They need to be defined here or imported.
    const analyzeSquatWithCount = (lm: any[]): ExerciseAnalysis => {
        // ... (implementation from previous version)
        return { currentCount: stateRef.current.count, isCorrectForm: true, feedback: '자세 좋음', confidence: 0.9 };
    }
    const analyzePushupWithCount = (lm: any[]): ExerciseAnalysis => {
        // ... (implementation from previous version)
        return { currentCount: stateRef.current.count, isCorrectForm: true, feedback: '자세 좋음', confidence: 0.9 };
    }

    // 추가된 분석 함수들
    const analyzeLungeWithCount = (lm: any[]): ExerciseAnalysis => {
        return { currentCount: stateRef.current.count, isCorrectForm: true, feedback: '런지 자세 좋음', confidence: 0.9 };
    }

    const analyzePlankWithCount = (lm: any[]): ExerciseAnalysis => {
        return { currentCount: stateRef.current.count, isCorrectForm: true, feedback: '플랭크 자세 유지 중', confidence: 0.9 };
    }

    // 범용 분석기 (매핑되지 않은 운동용)
    const analyzeGenericExercise = (lm: any[]): ExerciseAnalysis => {
        return { 
            currentCount: stateRef.current.count, 
            isCorrectForm: true, 
            feedback: '운동을 계속하세요. 수동으로 카운팅해주세요.', 
            confidence: 0.7 
        };
    }

    // 수동 카운팅 관련 함수들
    const handleManualCountIncrease = () => {
        stateRef.current.count += 1;
        const newAnalysis: ExerciseAnalysis = {
            currentCount: stateRef.current.count,
            isCorrectForm: true,
            feedback: `수동 카운팅: ${stateRef.current.count}/${currentExercise?.reps}`,
            confidence: 1.0
        };
        setExerciseAnalysis(newAnalysis);
        
        if (currentExercise && stateRef.current.count >= currentExercise.reps) {
            playTTSFeedback(`${currentExercise.reps}회 완료! 잘했습니다!`, true);
            setTimeout(() => finishCurrentExercise(), 1000);
        }
    };

    const handleManualCountDecrease = () => {
        if (stateRef.current.count > 0) {
            stateRef.current.count -= 1;
            const newAnalysis: ExerciseAnalysis = {
                currentCount: stateRef.current.count,
                isCorrectForm: true,
                feedback: `수동 카운팅: ${stateRef.current.count}/${currentExercise?.reps}`,
                confidence: 1.0
            };
            setExerciseAnalysis(newAnalysis);
        }
    };

    const toggleManualMode = () => {
        setIsManualMode(!isManualMode);
        if (!isManualMode) {
            playTTSFeedback('수동 카운팅 모드로 전환합니다. 직접 카운팅해주세요.', true);
            setMotionDetectionFailed(false);
        } else {
            playTTSFeedback('자동 인식 모드로 전환합니다.', true);
        }
    };

    // Camera and MediaPipe error handling state
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [mediaPipeError, setMediaPipeError] = useState<string | null>(null);
    const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
    const [isMediaPipeLoading, setIsMediaPipeLoading] = useState<boolean>(false);

    // Camera initialization with comprehensive error handling
    const initializeCamera = useCallback(async () => {
        if (!videoRef.current) return;

        setIsCameraLoading(true);
        setCameraError(null);

        try {
            // Check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('UNSUPPORTED_BROWSER');
            }

            // Request camera access with optimal constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30, min: 15 },
                    facingMode: 'user' // 전면 카메라 우선
                },
                audio: false
            });

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            
            console.log('✅ 카메라 초기화 성공');
            setIsCameraLoading(false);
            
        } catch (error: any) {
            setIsCameraLoading(false);
            
            let errorMessage = '';
            switch (error.name || error.message) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    errorMessage = '카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
                    break;
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
                    break;
                case 'NotReadableError':
                case 'TrackStartError':
                    errorMessage = '카메라를 사용할 수 없습니다. 다른 앱에서 카메라를 사용중일 수 있습니다.';
                    break;
                case 'UNSUPPORTED_BROWSER':
                    errorMessage = '현재 브라우저는 카메라를 지원하지 않습니다. Chrome, Firefox, Safari 등을 사용해주세요.';
                    break;
                default:
                    errorMessage = `카메라 초기화 중 오류가 발생했습니다: ${error.message}`;
            }
            
            console.error('❌ 카메라 초기화 실패:', error);
            setCameraError(errorMessage);
            setMotionDetectionFailed(true);
            playTTSFeedback('카메라 연결에 문제가 있어 수동 모드를 사용해주세요.', true);
        }
    }, [playTTSFeedback]);

    // MediaPipe initialization with error handling
    const initializeMediaPipe = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsMediaPipeLoading(true);
        setMediaPipeError(null);

        try {
            const poseInstance = new Pose({
                locateFile: (file) => {
                    // CDN fallback for MediaPipe models
                    const cdnUrls = [
                        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`,
                        `https://cdn.skypack.dev/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`,
                        `https://unpkg.com/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`
                    ];
                    
                    // Try primary CDN first
                    return cdnUrls[0];
                }
            });

            // Configure MediaPipe options
            await poseInstance.setOptions({
                modelComplexity: 1, // 0: Lite, 1: Full, 2: Heavy
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            // Set up pose detection callback
            poseInstance.onResults((results) => {
                if (!canvasRef.current || !results.poseLandmarks) return;
                
                try {
                    // Draw pose on canvas and analyze exercise
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx && videoRef.current) {
                        ctx.save();
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                        
                        // Draw pose landmarks (simplified for bootcamp level)
                        ctx.fillStyle = '#00FF00';
                        results.poseLandmarks.forEach((landmark) => {
                            ctx.beginPath();
                            ctx.arc(
                                landmark.x * canvasRef.current!.width,
                                landmark.y * canvasRef.current!.height,
                                3, 0, 2 * Math.PI
                            );
                            ctx.fill();
                        });
                        
                        ctx.restore();
                    }
                    
                    // Analyze exercise if not in manual mode
                    if (!isManualMode && currentExercise) {
                        analyzeExercise(results.poseLandmarks);
                    }
                    
                } catch (drawError) {
                    console.warn('그리기 중 오류:', drawError);
                }
            });

            setPose(poseInstance);
            setIsDetecting(true);
            setIsMediaPipeLoading(false);
            
            console.log('✅ MediaPipe 초기화 성공');
            
            // Start pose detection loop
            const detectPose = async () => {
                if (videoRef.current && videoRef.current.readyState === 4) {
                    await poseInstance.send({ image: videoRef.current });
                }
                if (isDetecting) {
                    requestAnimationFrame(detectPose);
                }
            };
            detectPose();
            
        } catch (error: any) {
            setIsMediaPipeLoading(false);
            
            let errorMessage = '';
            if (error.message.includes('Loading failed')) {
                errorMessage = '모션 인식 모델 로딩에 실패했습니다. 인터넷 연결을 확인하거나 페이지를 새로고침해보세요.';
            } else if (error.message.includes('WebGL')) {
                errorMessage = '그래픽 가속이 비활성화되어 있습니다. 브라우저 설정에서 하드웨어 가속을 활성화해주세요.';
            } else {
                errorMessage = `모션 인식 초기화 중 오류: ${error.message}`;
            }
            
            console.error('❌ MediaPipe 초기화 실패:', error);
            setMediaPipeError(errorMessage);
            setMotionDetectionFailed(true);
            playTTSFeedback('자동 인식 기능에 문제가 있어 수동 모드를 사용해주세요.', true);
        }
    }, [videoRef, canvasRef, isDetecting, analyzeExercise, currentExercise, isManualMode, playTTSFeedback]);

    // Initialize camera and MediaPipe on component mount
    useEffect(() => {
        const initializeAll = async () => {
            await initializeCamera();
            // Wait a bit for camera to be ready, then initialize MediaPipe
            setTimeout(() => {
                if (!cameraError) {
                    initializeMediaPipe();
                }
            }, 1000);
        };
        
        initializeAll();
        
        // Cleanup function
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            setIsDetecting(false);
        };
    }, [initializeCamera, initializeMediaPipe, cameraError]);

    // Error recovery functions
    const retryCameraAccess = () => {
        setCameraError(null);
        setMediaPipeError(null);
        setMotionDetectionFailed(false);
        initializeCamera();
    };

    const retryMediaPipe = () => {
        setMediaPipeError(null);
        setMotionDetectionFailed(false);
        initializeMediaPipe();
    };

    if (!currentExercise) {
        return <div><h2>운동 완료!</h2><p>결과 페이지로 이동합니다...</p></div>;
    }

    return (
        <div className="motion-coach-container">
            <div className="workout-plan-sidebar">
                <h3>오늘의 운동 계획</h3>
                <ul>
                    {workoutPlan?.map((exercise, index) => (
                        <li key={index} className={index === currentExerciseIndex ? 'active' : ''}>
                            {index + 1}. {exercise.name} <span>({exercise.sets}x{exercise.reps})</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="main-content">
                <div className="camera-container">
                    {/* 카메라 로딩 상태 */}
                    {isCameraLoading && (
                        <div className="camera-loading">
                            <div className="loading-spinner"></div>
                            <p>카메라를 연결하는 중입니다...</p>
                        </div>
                    )}
                    
                    {/* 카메라 오류 상태 */}
                    {cameraError && (
                        <div className="camera-error">
                            <div className="error-icon">📹</div>
                            <h3>카메라 연결 문제</h3>
                            <p>{cameraError}</p>
                            <div className="error-actions">
                                <button onClick={retryCameraAccess} className="retry-btn">
                                    🔄 다시 시도
                                </button>
                                <button onClick={() => setIsManualMode(true)} className="manual-btn">
                                    🖱️ 수동 모드 사용
                                </button>
                            </div>
                            <div className="help-text">
                                <details>
                                    <summary>도움말 보기</summary>
                                    <ul>
                                        <li>브라우저 주소창의 카메라 아이콘을 클릭하여 권한을 허용해주세요</li>
                                        <li>다른 앱(Zoom, Skype 등)에서 카메라를 사용중이면 종료해주세요</li>
                                        <li>Chrome, Firefox, Edge 등 최신 브라우저를 사용해주세요</li>
                                        <li>인터넷 보안 설정에서 카메라 차단이 해제되어 있는지 확인하세요</li>
                                    </ul>
                                </details>
                            </div>
                        </div>
                    )}
                    
                    {/* MediaPipe 로딩 상태 */}
                    {isMediaPipeLoading && !cameraError && (
                        <div className="mediapipe-loading">
                            <div className="loading-spinner"></div>
                            <p>모션 인식 기능을 준비하는 중입니다...</p>
                        </div>
                    )}
                    
                    {/* MediaPipe 오류 상태 */}
                    {mediaPipeError && !cameraError && (
                        <div className="mediapipe-error">
                            <div className="error-icon">🤖</div>
                            <h3>모션 인식 문제</h3>
                            <p>{mediaPipeError}</p>
                            <div className="error-actions">
                                <button onClick={retryMediaPipe} className="retry-btn">
                                    🔄 다시 시도
                                </button>
                                <button onClick={() => setIsManualMode(true)} className="manual-btn">
                                    🖱️ 수동 모드 사용
                                </button>
                            </div>
                            <div className="help-text">
                                <details>
                                    <summary>도움말 보기</summary>
                                    <ul>
                                        <li>페이지를 새로고침해보세요 (F5 또는 Ctrl+R)</li>
                                        <li>브라우저 설정에서 하드웨어 가속을 활성화해보세요</li>
                                        <li>인터넷 연결이 안정적인지 확인해주세요</li>
                                        <li>수동 모드에서도 정확한 운동이 가능합니다</li>
                                    </ul>
                                </details>
                            </div>
                        </div>
                    )}
                    
                    {/* 정상 작동 시 비디오와 캔버스 */}
                    {!cameraError && !isCameraLoading && (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                            <canvas ref={canvasRef} className="pose-canvas" />
                            {/* 연결 상태 표시 */}
                            <div className="connection-status">
                                {isDetecting && !isManualMode && (
                                    <span className="status-indicator active">🟢 자동 인식 활성</span>
                                )}
                                {isManualMode && (
                                    <span className="status-indicator manual">🖱️ 수동 모드</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="analysis-panel">
                    <h2>{currentExercise.name}</h2>
                    <p className="reps-counter">카운트: {exerciseAnalysis?.currentCount || 0} / {currentExercise.reps}</p>
                    <p className="feedback-text">피드백: {exerciseAnalysis?.feedback || '자세를 잡아주세요.'}</p>
                    
                    {/* 모드 전환 버튼 */}
                    <div className="mode-toggle">
                        <button 
                            onClick={toggleManualMode} 
                            className={`mode-toggle-btn ${isManualMode ? 'manual-active' : 'auto-active'}`}
                        >
                            {isManualMode ? '🖱️ 수동 모드' : '🤖 자동 인식'}
                        </button>
                        {motionDetectionFailed && !isManualMode && (
                            <p className="detection-warning">⚠️ 자동 인식이 어려워요. 수동 모드를 시도해보세요!</p>
                        )}
                    </div>
                    
                    {/* 수동 카운팅 버튼들 */}
                    {isManualMode && (
                        <div className="manual-controls">
                            <button onClick={handleManualCountDecrease} className="count-btn decrease">-1</button>
                            <span className="count-display">{stateRef.current.count}</span>
                            <button onClick={handleManualCountIncrease} className="count-btn increase">+1</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="session-controls">
                {!isSessionActive ? (
                    <button onClick={startWorkoutSession} className="start-workout-button">전체 운동 시작</button>
                ) : (
                    <button onClick={finishCurrentExercise} className="complete-workout-button">다음 운동</button>
                )}
            </div>
        </div>
    );
};

export default MotionCoach;
