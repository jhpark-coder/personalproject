# FitMate - Auth.js OAuth2 프로젝트

React + TypeScript + Vite로 구축된 OAuth2 인증 시스템입니다.

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# OAuth2 클라이언트 설정
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

VITE_KAKAO_CLIENT_ID=your_kakao_client_id
VITE_KAKAO_CLIENT_SECRET=your_kakao_client_secret

VITE_NAVER_CLIENT_ID=your_naver_client_id
VITE_NAVER_CLIENT_SECRET=your_naver_client_secret
```

### 3. 개발 서버 실행
```bash
npm run dev
```

## 📁 프로젝트 구조

```
src/
├── components/
│   ├── LoginPage.tsx      # 로그인 페이지
│   ├── LoginPage.css
│   ├── OAuth2Callback.tsx # OAuth2 콜백 처리
│   ├── OAuth2Callback.css
│   ├── Dashboard.tsx      # 대시보드
│   └── Dashboard.css
├── auth.ts                # OAuth2 인증 유틸리티
├── App.tsx               # 메인 앱 컴포넌트
└── main.tsx              # 앱 진입점
```

## 🔐 OAuth2 제공자 설정

### Google OAuth2
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. OAuth2 클라이언트 ID 생성
3. 승인된 리디렉션 URI: `http://localhost:5173/auth/google/callback`

### Kakao OAuth2
1. [Kakao Developers](https://developers.kakao.com/)에서 앱 생성
2. 플랫폼 설정에서 웹 플랫폼 추가
3. 리디렉션 URI: `http://localhost:5173/auth/kakao/callback`

### Naver OAuth2
1. [Naver Developers](https://developers.naver.com/)에서 애플리케이션 등록
2. 서비스 URL: `http://localhost:5173`
3. Callback URL: `http://localhost:5173/auth/naver/callback`

## 🎯 주요 기능

### ✅ 구현된 기능
- **OAuth2 인증**: Google, Kakao, Naver 로그인
- **프론트엔드 콜백 처리**: React에서 직접 OAuth2 처리
- **사용자 정보 관리**: 로컬 스토리지 기반
- **반응형 디자인**: 모바일 친화적 UI
- **TypeScript 지원**: 타입 안전성 보장

### 🔄 인증 흐름
1. 사용자가 소셜 로그인 버튼 클릭
2. OAuth2 제공자 인증 페이지로 리다이렉트
3. 인증 후 프론트엔드 콜백 URL로 리다이렉트
4. 토큰 교환 및 사용자 정보 가져오기
5. 대시보드로 이동

## 🛠️ 기술 스택

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: CSS3 (모듈화)
- **OAuth2**: 직접 구현 (Auth.js 대신)

## 📱 사용법

### 로그인
1. `/login` 페이지에서 소셜 로그인 버튼 클릭
2. OAuth2 제공자에서 인증
3. 자동으로 대시보드로 이동

### 로그아웃
1. 대시보드 우상단의 "로그아웃" 버튼 클릭
2. 로컬 스토리지에서 사용자 정보 및 토큰 제거
3. 로그인 페이지로 이동

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run type-check
```

## 🚨 주의사항

1. **환경변수**: `.env` 파일을 반드시 설정해야 합니다
2. **OAuth2 설정**: 각 제공자의 개발자 콘솔에서 올바른 리디렉션 URI 설정
3. **CORS**: 개발 환경에서는 localhost:5173으로 설정
4. **프로덕션**: 배포 시 HTTPS 필수

## 🐛 문제 해결

### OAuth2 오류
- 클라이언트 ID/시크릿 확인
- 리디렉션 URI 설정 확인
- 개발자 콘솔에서 앱 상태 확인

### 빌드 오류
- TypeScript 타입 오류 확인
- 환경변수 설정 확인
- 의존성 설치 확인

## 📄 라이선스

MIT License

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request 