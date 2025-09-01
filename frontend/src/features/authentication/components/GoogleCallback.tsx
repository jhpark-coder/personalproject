import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { handleApiError } from '@utils/axiosConfig';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: 'Google OAuth 인증에 실패했습니다.'
        }, window.location.origin);
        window.close();
        return;
      }

      if (!code) {
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: '인증 코드가 없습니다.'
        }, window.location.origin);
        window.close();
        return;
      }

      try {
        // Google OAuth 토큰 교환
        const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', 
          new URLSearchParams({
            code,
            client_id: '581520849563-mragtke8gp7fdb83llmkhcdpnk2rrrg7.apps.googleusercontent.com',
            client_secret: 'GOCSPX-your-client-secret', // 실제 클라이언트 시크릿 필요
            redirect_uri: window.location.origin + '/google-callback',
            grant_type: 'authorization_code'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          }
        );

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        // Google 사용자 정보 가져오기
        const { data: userData } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        // 부모 창에 결과 전송
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          accessToken: tokenData.access_token,
          userInfo: userData
        }, window.location.origin);

        window.close();
      } catch (error) {
        const errorMessage = handleApiError(error);
        console.error('Google OAuth 처리 실패:', errorMessage);
        
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: errorMessage || 'Google OAuth 처리 중 오류가 발생했습니다.'
        }, window.location.origin);
        window.close();
      }
    };

    handleGoogleCallback();
  }, [searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h3>Google 인증 처리 중...</h3>
      <p>잠시만 기다려주세요.</p>
    </div>
  );
};

export default GoogleCallback; 