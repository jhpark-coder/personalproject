# Cloudflare Tunnel 고정 도메인 설정 (무료)

## 문제점
- `cloudflared tunnel --url http://127.0.0.1:80` 실행 시 매번 랜덤 주소 생성
- OAuth 프로바이더에 사전 등록 불가능

## 해결책: Named Tunnel 생성 (무료)

### 1. Cloudflare 계정 생성 및 로그인
```bash
# Cloudflare에 로그인 (브라우저 열림)
cloudflared tunnel login
```

### 2. Named Tunnel 생성
```bash
# 고정 터널 생성
cloudflared tunnel create fitmate-dev

# 결과: Tunnel 생성되고 고유 UUID 발급됨
# 예: Created tunnel fitmate-dev with id 12345678-1234-1234-1234-123456789abc
```

### 3. DNS 레코드 추가
```bash
# 고정 서브도메인 연결 (무료!)
cloudflared tunnel route dns fitmate-dev fitmate-dev.YOUR_DOMAIN.com

# 또는 trycloudflare.com 서브도메인 사용
cloudflared tunnel route dns fitmate-dev fitmate-dev.trycloudflare.com
```

### 4. 터널 실행
```bash
# 고정 도메인으로 터널 실행
cloudflared tunnel --url http://127.0.0.1:80 run fitmate-dev

# 결과: 항상 같은 주소로 접속 가능
# https://fitmate-dev.YOUR_DOMAIN.com
```

## 대안: localtunnel 고정 서브도메인

```bash
# 고정 서브도메인 (보통 사용 가능)
npx localtunnel --port 80 --subdomain fitmate-dev

# 결과: https://fitmate-dev.loca.lt (고정)
```

## OAuth 프로바이더 등록할 주소

### Named Tunnel 사용 시:
```
http://localhost/login/oauth2/code/google
https://fitmate-dev.YOUR_DOMAIN.com/login/oauth2/code/google
```

### localtunnel 사용 시:
```
http://localhost/login/oauth2/code/google
https://fitmate-dev.loca.lt/login/oauth2/code/google
```

## 실제 작업 순서

1. **Named Tunnel 생성** → 고정 도메인 확보
2. **OAuth 프로바이더에 고정 도메인 등록**
3. **개발 시 Named Tunnel로 실행**

이렇게 하면 진짜 고정 주소로 OAuth가 정상 동작합니다! 🎯