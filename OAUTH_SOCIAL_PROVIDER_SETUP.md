# OAuth 소셜 프로바이더 설정 가이드

## 문제점
Dynamic Tunnel URL은 OAuth 프로바이더에 사전 등록이 불가능하여 인증 실패 발생

## 해결 방법

### 1. Google OAuth 설정
**Google Cloud Console** → **API 및 서비스** → **사용자 인증 정보**

#### 승인된 리디렉션 URI 추가:
```
http://localhost/login/oauth2/code/google
https://*.trycloudflare.com/login/oauth2/code/google
https://*.loca.lt/login/oauth2/code/google
https://fitmate-dev.trycloudflare.com/login/oauth2/code/google
```

### 2. Kakao OAuth 설정  
**Kakao Developers** → **내 애플리케이션** → **제품 설정** → **카카오 로그인**

#### Redirect URI 추가:
```
http://localhost/login/oauth2/code/kakao
https://fitmate-dev.trycloudflare.com/login/oauth2/code/kakao
```

### 3. Naver OAuth 설정
**Naver Developers** → **Application** → **API 설정**

#### Callback URL 추가:
```
http://localhost/login/oauth2/code/naver
https://fitmate-dev.trycloudflare.com/login/oauth2/code/naver
```

## 추천: 고정 서브도메인 사용

### Cloudflare Tunnel 고정 도메인 생성
```bash
# 방법 1: 고정 호스트명 지정
cloudflared tunnel --url http://127.0.0.1:80 --hostname fitmate-dev.trycloudflare.com

# 방법 2: Named Tunnel 생성 (영구적)
cloudflared tunnel create fitmate-dev
cloudflared tunnel route dns fitmate-dev fitmate-dev.trycloudflare.com
cloudflared tunnel run --url http://127.0.0.1:80 fitmate-dev
```

### localtunnel 고정 서브도메인
```bash
# 고정 서브도메인 사용
npx localtunnel --port 80 --subdomain fitmate-dev
# 결과: https://fitmate-dev.loca.lt
```

## 개발 환경별 설정

### 1. Localhost 개발
- 기존 설정 그대로 사용
- `http://localhost/login/oauth2/code/{provider}`

### 2. 터널 개발 (고정 도메인)
- `https://fitmate-dev.trycloudflare.com/login/oauth2/code/{provider}`
- 또는 `https://fitmate-dev.loca.lt/login/oauth2/code/{provider}`

### 3. 프로덕션
- 실제 도메인 사용
- `https://fitmate.com/login/oauth2/code/{provider}`

## 구현된 동적 시스템의 수정 방향

현재 구현된 동적 URL 시스템은 다음과 같이 수정 필요:

1. **환경 감지 개선**: 고정 도메인 패턴 인식
2. **폴백 처리**: 등록되지 않은 도메인은 localhost로 폴백
3. **에러 처리**: OAuth 실패 시 명확한 에러 메시지

```javascript
const getOAuthRedirectUrl = (provider) => {
  const currentUrl = window.location.origin;
  
  // 등록된 도메인 패턴 확인
  const registeredDomains = [
    'http://localhost',
    'https://fitmate-dev.trycloudflare.com',
    'https://fitmate-dev.loca.lt'
  ];
  
  const isRegistered = registeredDomains.some(domain => 
    currentUrl.startsWith(domain)
  );
  
  if (!isRegistered) {
    console.warn('현재 도메인이 OAuth에 등록되지 않음, localhost로 폴백');
    return `http://localhost/login/oauth2/code/${provider}`;
  }
  
  return `${currentUrl}/login/oauth2/code/${provider}`;
};
```