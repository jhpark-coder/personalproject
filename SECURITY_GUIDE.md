# 🔐 FitMate Security Guide

## ⚠️ 민감한 정보 관리 가이드

이 문서는 FitMate 프로젝트의 보안 관련 설정과 민감한 정보 관리 방법을 설명합니다.

## 📋 노출된 정보 처리 체크리스트

### 1. 즉시 처리 필요 항목
- [x] `.gitignore` 파일 업데이트
- [x] 코드에서 하드코딩된 키 제거
- [x] 환경변수 예시 파일 생성 (`.env.example`)
- [ ] GitHub 히스토리에서 민감한 정보 제거 (선택사항)

### 2. 노출된 정보 목록
다음 정보들이 GitHub에 노출되었습니다:
- **Google Cloud API Key**: Firebase 관련 (현재 주석처리됨)
- **Twilio Credentials**: SMS 서비스용
- **OAuth2 Secrets**: Google, Kakao, Naver
- **SMTP Credentials**: 이메일 서비스용
- **RSA Private Keys**: 서버 인증용

## 🛡️ 보안 설정 방법

### 1. 환경변수 파일 생성

#### Frontend (.env.local)
```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:8080
VITE_CHAT_SERVER_URL=http://localhost:3000

# Firebase (필요시)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
```

#### Communication Server (.env.development)
```bash
# communication-server/.env.development 파일 생성
# .env.example 파일을 복사하여 실제 값으로 수정
cp .env.example .env.development
```

#### Spring Boot (application-dev.properties)
```properties
# src/main/resources/application-dev.properties
# OAuth2 Client Secrets (실제 값으로 교체)
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
spring.security.oauth2.client.registration.kakao.client-secret=YOUR_KAKAO_CLIENT_SECRET
spring.security.oauth2.client.registration.naver.client-secret=YOUR_NAVER_CLIENT_SECRET

# JWT Secret
jwt.secret=YOUR_SECURE_JWT_SECRET_KEY_HERE
```

### 2. 환경변수로 실행

#### 개발 환경
```bash
# Frontend
cd frontend
npm run dev

# Backend (환경변수 설정)
export JWT_SECRET=your_jwt_secret_key
export GOOGLE_CLIENT_SECRET=your_google_secret
./mvnw spring-boot:run

# Communication Server
cd communication-server
npm run start:dev
```

#### Docker Compose
```bash
# .env 파일 생성 후
docker compose up -d
```

### 3. GitHub에서 민감한 정보 제거 (선택사항)

기존 커밋 히스토리에서 민감한 정보를 완전히 제거하려면:

```bash
# BFG Repo-Cleaner 사용
java -jar bfg.jar --delete-files *.env
java -jar bfg.jar --replace-text passwords.txt

# 또는 git filter-branch 사용
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch communication-server/.env.development' \
  --prune-empty --tag-name-filter cat -- --all
```

⚠️ **주의**: 히스토리 수정은 협업자들과 충돌을 일으킬 수 있으므로 신중히 결정하세요.

## 🔑 API 키 관리 베스트 프랙티스

### 1. 절대 하지 말아야 할 것들
- ❌ 코드에 직접 API 키 하드코딩
- ❌ 환경변수 파일을 Git에 커밋
- ❌ Public 저장소에 민감한 정보 포함
- ❌ 프로덕션 키를 개발 환경에서 사용

### 2. 항상 해야 할 것들
- ✅ 환경변수 사용 (`.env` 파일)
- ✅ `.gitignore`에 환경변수 파일 추가
- ✅ 예시 파일 제공 (`.env.example`)
- ✅ 개발/프로덕션 환경 키 분리
- ✅ 정기적인 키 로테이션

### 3. 프로덕션 배포시
```bash
# AWS Systems Manager Parameter Store 사용 (권장)
aws ssm put-parameter --name "/fitmate/jwt-secret" --value "your-secret" --type SecureString

# 또는 환경변수로 직접 설정
export JWT_SECRET=production_secret_key
export TWILIO_AUTH_TOKEN=production_twilio_token
```

## 📞 문제 발생시 대처 방법

### 1. 키가 노출된 경우
1. **즉시** 해당 키를 무효화하거나 재발급
2. 새로운 키로 모든 환경 업데이트
3. 로그를 확인하여 악용 여부 확인

### 2. Twilio 계정 보안
- Twilio Console에서 새 Auth Token 생성
- IP 화이트리스트 설정
- 사용량 알림 설정

### 3. OAuth2 클라이언트 보안
- Google Cloud Console에서 새 클라이언트 시크릿 생성
- Redirect URI 제한 설정
- API 키 제한 설정 (도메인, IP 등)

## 📚 참고 자료

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)
- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

## ✅ 최종 체크리스트

- [ ] 모든 하드코딩된 키를 환경변수로 변경
- [ ] `.gitignore` 파일 업데이트 완료
- [ ] `.env.example` 파일 생성 완료
- [ ] 팀원들에게 새로운 환경설정 방법 공유
- [ ] 프로덕션 환경 키 안전하게 저장
- [ ] 정기적인 키 로테이션 일정 수립