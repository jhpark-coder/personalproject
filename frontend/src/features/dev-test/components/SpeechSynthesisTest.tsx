import React, { useState, useEffect, useRef } from 'react';
import './SpeechSynthesisTest.css';
import hybridTTSService from '../../../services/hybridTTSService';
import type { TTSOptions, TTSResult, VoiceCategory, VoiceDetails } from '../../../services/hybridTTSService';

const SpeechSynthesisTest: React.FC = () => {
    const [text, setText] = useState<string>('안녕하세요, FitMate 음성 가이드입니다.');
    const [voiceCategories, setVoiceCategories] = useState<Map<string, VoiceCategory>>(new Map());
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [selectedVoiceDetails, setSelectedVoiceDetails] = useState<VoiceDetails | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const [serviceStatus, setServiceStatus] = useState<{ googleCloud: boolean; browser: boolean }>({ googleCloud: false, browser: false });
    const [ttsOptions, setTtsOptions] = useState<TTSOptions>({
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
    });

    const addDebugInfo = (info: string) => {
        setDebugInfo(prev => [...prev.slice(-9), info]);
    };

    useEffect(() => {
        loadVoices();
        checkServiceStatus();
    }, []);

    useEffect(() => {
        if (selectedVoice) {
            loadVoiceDetails(selectedVoice);
        }
    }, [selectedVoice]);

    const loadVoices = async () => {
        try {
            const availableVoices = await hybridTTSService.getAvailableVoices();
            setVoiceCategories(availableVoices);
            
            // 첫 번째 사용 가능한 음성 선택
            if (availableVoices.size > 0) {
                const firstCategory = Array.from(availableVoices.keys())[0];
                const firstVoice = Array.from(availableVoices.get(firstCategory)!.voices.keys())[0];
                setSelectedVoice(firstVoice);
            }
            
            addDebugInfo(`✅ 음성 목록 로드 완료 (${availableVoices.size}개 카테고리)`);
        } catch (error) {
            addDebugInfo(`❌ 음성 목록 로드 실패: ${error}`);
        }
    };

    const loadVoiceDetails = async (voiceName: string) => {
        try {
            const details = await hybridTTSService.getVoiceDetails(voiceName);
            setSelectedVoiceDetails(details);
        } catch (error) {
            addDebugInfo(`❌ 음성 상세 정보 로드 실패: ${error}`);
        }
    };

    const checkServiceStatus = async () => {
        try {
            const status = await hybridTTSService.getServiceStatus();
            setServiceStatus(status);
            addDebugInfo(`🔍 서비스 상태: Google Cloud ${status.googleCloud ? '✅' : '❌'}, Browser ${status.browser ? '✅' : '❌'}`);
        } catch (error) {
            addDebugInfo(`❌ 서비스 상태 확인 실패: ${error}`);
        }
    };

    const previewVoice = async () => {
        if (!selectedVoice) {
            addDebugInfo('❌ 미리듣기할 음성을 선택해주세요.');
            return;
        }
        
        setIsPreviewing(true);
        addDebugInfo(`🎧 음성 미리듣기 시작: ${selectedVoice}`);

        try {
            const result = await hybridTTSService.previewVoice(selectedVoice);
            
            if (result.success && result.audioUrl) {
                const audio = new Audio(result.audioUrl);
                audio.onended = () => {
                    setIsPreviewing(false);
                    addDebugInfo('✅ 음성 미리듣기 완료');
                };
                audio.onerror = () => {
                    setIsPreviewing(false);
                    addDebugInfo('❌ 음성 미리듣기 오류');
                };
                audio.play();
            } else {
                addDebugInfo(`❌ 음성 미리듣기 실패: ${result.error}`);
                setIsPreviewing(false);
            }
        } catch (error) {
            addDebugInfo(`❌ 음성 미리듣기 중 오류: ${error}`);
            setIsPreviewing(false);
        }
    };

    const speak = async (textToSpeak: string) => {
        if (!textToSpeak.trim()) {
            addDebugInfo('❌ 재생할 텍스트가 없습니다.');
            return;
        }

        setIsPlaying(true);
        addDebugInfo(`🎵 음성 재생 시작: "${textToSpeak}"`);

        try {
            const result: TTSResult = await hybridTTSService.synthesize(textToSpeak, {
                ...ttsOptions,
                voice: selectedVoice
            });

            if (result.success) {
                if (result.method === 'google-cloud') {
                    addDebugInfo(`✅ Google Cloud TTS 성공 (${result.method})`);
                    
                    // 오디오 재생
                    if (result.audioUrl) {
                        const audio = new Audio(result.audioUrl);
                        audio.onended = () => {
                            setIsPlaying(false);
                            addDebugInfo('✅ 음성 재생 완료');
                        };
                        audio.onerror = () => {
                            setIsPlaying(false);
                            addDebugInfo('❌ 오디오 재생 오류');
                        };
                        audio.play();
                    }
                } else {
                    addDebugInfo(`✅ 브라우저 TTS 성공 (${result.method})`);
                    setIsPlaying(false);
                }
            } else {
                addDebugInfo(`❌ TTS 실패: ${result.error}`);
                setIsPlaying(false);
            }
        } catch (error) {
            addDebugInfo(`❌ 음성 재생 중 오류: ${error}`);
            setIsPlaying(false);
        }
    };

    const speakExerciseGuide = async () => {
        const exerciseText = "스쿼트를 시작합니다. 발을 어깨너비로 벌리고 서세요. 천천히 앉았다가 일어나세요.";
        
        setIsPlaying(true);
        addDebugInfo(`🏃‍♂️ 운동 가이드 음성 재생: "${exerciseText}"`);

        try {
            const result = await hybridTTSService.synthesizeExerciseGuide(exerciseText);
            
            if (result.success) {
                if (result.method === 'google-cloud' && result.audioUrl) {
                    const audio = new Audio(result.audioUrl);
                    audio.onended = () => {
                        setIsPlaying(false);
                        addDebugInfo('✅ 운동 가이드 음성 재생 완료');
                    };
                    audio.play();
                } else {
                    addDebugInfo(`✅ 운동 가이드 브라우저 TTS 성공`);
                    setIsPlaying(false);
                }
            } else {
                addDebugInfo(`❌ 운동 가이드 TTS 실패: ${result.error}`);
                setIsPlaying(false);
            }
        } catch (error) {
            addDebugInfo(`❌ 운동 가이드 음성 재생 오류: ${error}`);
            setIsPlaying(false);
        }
    };

    const stop = () => {
        hybridTTSService.stop();
        setIsPlaying(false);
        setIsPreviewing(false);
        addDebugInfo('⏹️ 음성 재생 중지');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            speak(text);
        }
    };

    const testBasicSpeech = () => {
        speak(text);
    };

    const testLongText = () => {
        const longText = "이것은 긴 텍스트 테스트입니다. Standard 음성을 사용하여 기본 품질 음성으로 변환됩니다. " +
                        "운동 가이드, 알림 메시지 등 다양한 용도로 활용할 수 있습니다. " +
                        "한국어 음성 합성의 품질을 확인해보세요.";
        speak(longText);
    };

    const testServiceStatus = () => {
        checkServiceStatus();
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case '기본': return '#34C759';
            default: return '#999';
        }
    };

    const getCostColor = (cost: string) => {
        if (cost === '무료') return '#34C759';
        return '#FF9500';
    };

    return (
        <div className="speech-synthesis-test">
            <h2>🎵 하이브리드 TTS 테스트 (Google Cloud + Browser Fallback)</h2>
            
            {/* 서비스 상태 표시 */}
            <div className="service-status">
                <h3>🔍 서비스 상태</h3>
                <div className="status-grid">
                    <div className={`status-item ${serviceStatus.googleCloud ? 'available' : 'unavailable'}`}>
                        <span>Google Cloud TTS:</span>
                        <span>{serviceStatus.googleCloud ? '✅ 사용 가능' : '❌ 사용 불가'}</span>
                    </div>
                    <div className={`status-item ${serviceStatus.browser ? 'available' : 'unavailable'}`}>
                        <span>Browser TTS:</span>
                        <span>{serviceStatus.browser ? '✅ 사용 가능' : '❌ 사용 불가'}</span>
                    </div>
                </div>
            </div>

            {/* 음성 선택 */}
            <div className="voice-selection">
                <h3>🎤 음성 선택</h3>
                <div className="voice-categories">
                    {Array.from(voiceCategories.entries()).map(([categoryKey, category]) => (
                        <div key={categoryKey} className="voice-category">
                            <div className="category-header">
                                <h4>{category.name}</h4>
                                <div className="category-info">
                                    <span className="quality-badge" style={{ backgroundColor: getQualityColor(category.quality) }}>
                                        {category.quality}
                                    </span>
                                    <span className="cost-badge" style={{ backgroundColor: getCostColor(category.cost) }}>
                                        {category.cost}
                                    </span>
                                </div>
                            </div>
                            <p className="category-description">{category.description}</p>
                            <div className="voice-options">
                                {Array.from(category.voices.entries()).map(([voiceKey, voiceName]) => (
                                    <div key={voiceKey} className="voice-option">
                                        <input
                                            type="radio"
                                            id={voiceKey}
                                            name="voice"
                                            value={voiceKey}
                                            checked={selectedVoice === voiceKey}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                        />
                                        <label htmlFor={voiceKey}>
                                            <span className="voice-name">{voiceName}</span>
                                            <button
                                                onClick={() => previewVoice()}
                                                disabled={isPreviewing || selectedVoice !== voiceKey}
                                                className="preview-btn"
                                            >
                                                {isPreviewing && selectedVoice === voiceKey ? '듣는 중...' : '🔊 미리듣기'}
                                            </button>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 선택된 음성 상세 정보 */}
            {selectedVoiceDetails && (
                <div className="voice-details">
                    <h3>📋 선택된 음성 정보</h3>
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="detail-label">음성명:</span>
                            <span className="detail-value">{selectedVoiceDetails.voiceName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">카테고리:</span>
                            <span className="detail-value">{selectedVoiceDetails.category}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">품질:</span>
                            <span className="detail-value">{selectedVoiceDetails.quality}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">비용:</span>
                            <span className="detail-value">{selectedVoiceDetails.cost}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">성별:</span>
                            <span className="detail-value">{selectedVoiceDetails.gender}</span>
                        </div>
                        <div className="detail-item full-width">
                            <span className="detail-label">설명:</span>
                            <span className="detail-value">{selectedVoiceDetails.description}</span>
                        </div>
                        <div className="detail-item full-width">
                            <span className="detail-label">적합한 용도:</span>
                            <span className="detail-value">{selectedVoiceDetails.bestFor}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 음성 설정 */}
            <div className="voice-settings">
                <h3>⚙️ 음성 설정</h3>
                <div className="setting-group">
                    <label>속도: {ttsOptions.rate}</label>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={ttsOptions.rate}
                        onChange={(e) => setTtsOptions(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                    />
                </div>
                
                <div className="setting-group">
                    <label>톤: {ttsOptions.pitch}</label>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={ttsOptions.pitch}
                        onChange={(e) => setTtsOptions(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                    />
                </div>
                
                <div className="setting-group">
                    <label>볼륨: {ttsOptions.volume}</label>
                    <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={ttsOptions.volume}
                        onChange={(e) => setTtsOptions(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    />
                </div>
            </div>

            {/* 텍스트 입력 */}
            <div className="text-input-section">
                <h3>📝 텍스트 입력</h3>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="음성으로 변환할 텍스트를 입력하세요 (Enter로 재생)"
                    rows={4}
                />
            </div>

            {/* 컨트롤 버튼 */}
            <div className="control-buttons">
                <button 
                    onClick={testBasicSpeech} 
                    disabled={isPlaying}
                    className="control-btn primary"
                >
                    {isPlaying ? '재생 중...' : '🎵 기본 음성 재생'}
                </button>
                
                <button 
                    onClick={speakExerciseGuide} 
                    disabled={isPlaying}
                    className="control-btn secondary"
                >
                    {isPlaying ? '재생 중...' : '🏃‍♂️ 운동 가이드 음성'}
                </button>
                
                <button 
                    onClick={testLongText} 
                    disabled={isPlaying}
                    className="control-btn secondary"
                >
                    {isPlaying ? '재생 중...' : '📖 긴 텍스트 테스트'}
                </button>
                
                <button 
                    onClick={stop} 
                    disabled={!isPlaying && !isPreviewing}
                    className="control-btn stop"
                >
                    ⏹️ 중지
                    </button>
                
                <button 
                    onClick={testServiceStatus} 
                    className="control-btn info"
                >
                    🔍 서비스 상태 확인
                    </button>
            </div>

            {/* 디버그 정보 */}
            <div className="debug-section">
                <h3>📊 디버그 정보</h3>
                <div className="debug-info">
                    {debugInfo.map((info, index) => (
                        <div key={index} className="debug-line">{info}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SpeechSynthesisTest;
