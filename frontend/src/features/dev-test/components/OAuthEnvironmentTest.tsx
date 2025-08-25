import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@config/api';
import { getOAuthEnvironmentInfo } from '@utils/oauthHelper';
import { apiClient, handleApiError } from '@utils/axiosConfig';

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: string;
}

interface TestResults {
  [provider: string]: TestResult;
}

const OAuthEnvironmentTest: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  const runEnvironmentTest = () => {
    // API에서 환경 정보 테스트
    const apiEnvInfo = API_ENDPOINTS.TEST_OAUTH_ENVIRONMENT();
    
    // 헬퍼 함수에서 환경 정보 테스트
    const helperEnvInfo = getOAuthEnvironmentInfo();
    
    setEnvInfo({
      api: apiEnvInfo,
      helper: helperEnvInfo,
      timestamp: new Date().toISOString()
    });
  };

  const testOAuthUpdate = async (provider: string) => {
    try {
      const baseUrl = API_ENDPOINTS.GET_CURRENT_BASE_URL();
      
      const { data: result } = await apiClient.post(API_ENDPOINTS.UPDATE_OAUTH_REDIRECT, {
        baseUrl: baseUrl,
        provider: provider
      });
      
      setTestResults((prev: TestResults | null) => ({
        ...prev,
        [provider]: {
          success: true,
          result: result,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error(`OAuth ${provider} 테스트 실패:`, errorMessage);
      
      setTestResults((prev: TestResults | null) => ({
        ...prev,
        [provider]: {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>OAuth 환경 테스트</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={runEnvironmentTest} style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          환경 정보 확인
        </button>
      </div>

      {envInfo && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3>환경 정보</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(envInfo, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>OAuth 업데이트 테스트</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => testOAuthUpdate('google')} style={{ padding: '8px 16px', backgroundColor: '#db4437', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            Google 테스트
          </button>
          <button onClick={() => testOAuthUpdate('kakao')} style={{ padding: '8px 16px', backgroundColor: '#fee500', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            Kakao 테스트
          </button>
          <button onClick={() => testOAuthUpdate('naver')} style={{ padding: '8px 16px', backgroundColor: '#03c75a', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            Naver 테스트
          </button>
        </div>
      </div>

      {testResults && (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3>테스트 결과</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
        <h4>테스트 설명</h4>
        <ul style={{ fontSize: '14px' }}>
          <li><strong>환경 정보 확인:</strong> 현재 실행 환경이 localhost인지 Quick Tunnel인지 감지</li>
          <li><strong>OAuth 업데이트 테스트:</strong> 백엔드에 동적 OAuth 리다이렉트 URL 업데이트 요청</li>
          <li><strong>Quick Tunnel 감지:</strong> HTTPS 프로토콜이면서 localhost가 아닌 도메인을 Quick Tunnel로 판단</li>
        </ul>
      </div>
    </div>
  );
};

export default OAuthEnvironmentTest;