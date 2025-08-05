# FitMate - Google Calendar API 통합

## 개요
FitMate는 Google Calendar API를 통합하여 사용자의 운동 일정을 Google Calendar에 자동으로 추가할 수 있는 피트니스 애플리케이션입니다.

## Google Calendar API 설정

### 1. Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. Google Calendar API 활성화
4. OAuth 동의 화면 구성
5. OAuth 2.0 클라이언트 ID 생성 (데스크톱 애플리케이션)

### 2. OAuth 동의 화면 설정
- 앱 이름: FitMate
- 사용자 지원 이메일: your-email@gmail.com
- 개발자 연락처 정보: your-email@gmail.com
- 범위 추가: `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/calendar.events`

### 3. OAuth 2.0 클라이언트 ID 생성
- 애플리케이션 유형: 데스크톱 앱
- 클라이언트 ID와 클라이언트 시크릿을 `application-dev.properties`에 설정

## 프로젝트 구조

```
src/main/java/backend/fitmate/
├── config/
│   ├── SecurityConfig.java          # OAuth2 보안 설정
│   ├── KakaoOAuth2UserService.java  # 카카오 OAuth2 서비스
│   └── NaverOAuth2UserService.java # 네이버 OAuth2 서비스
├── controller/
│   ├── CalendarController.java      # Google Calendar API 컨트롤러
│   └── TestController.java          # 테스트 컨트롤러
└── service/
    └── CalendarService.java         # Google Calendar API 서비스
```

## API 엔드포인트

### Calendar API 엔드포인트
모든 Calendar API 엔드포인트는 OAuth2 인증이 필요합니다.

#### 1. 이벤트 조회
```http
GET /api/calendar/events?maxResults=10
```

#### 2. 이벤트 생성
```http
POST /api/calendar/events
Content-Type: application/json

{
  "summary": "운동 일정",
  "description": "오늘의 운동",
  "location": "피트니스 센터",
  "startDateTime": "2024-01-15T09:00:00Z",
  "endDateTime": "2024-01-15T10:00:00Z",
  "attendeeEmails": ["friend@example.com"]
}
```

#### 3. 운동 일정 생성
```http
POST /api/calendar/workout
Content-Type: application/json

{
  "name": "웨이트 트레이닝",
  "description": "상체 운동",
  "location": "피트니스 센터",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T10:00:00Z",
  "attendeeEmails": ["trainer@example.com"]
}
```

#### 4. 특정 이벤트 조회
```http
GET /api/calendar/events/{eventId}
```

#### 5. 이벤트 업데이트
```http
PUT /api/calendar/events/{eventId}
Content-Type: application/json

{
  "summary": "업데이트된 운동 일정",
  "description": "수정된 설명",
  "start": {
    "dateTime": "2024-01-15T09:00:00Z",
    "timeZone": "Asia/Seoul"
  },
  "end": {
    "dateTime": "2024-01-15T10:00:00Z",
    "timeZone": "Asia/Seoul"
  }
}
```

#### 6. 이벤트 삭제
```http
DELETE /api/calendar/events/{eventId}
```

#### 7. 날짜 범위 이벤트 조회
```http
GET /api/calendar/events/range?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
```

#### 8. 캘린더 상태 확인
```http
GET /api/calendar/status
```

## 설정 파일

### application-dev.properties
```properties
# Google OAuth2 설정
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_CLIENT_SECRET
spring.security.oauth2.client.registration.google.scope=openid,email,profile,https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/calendar.events
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}

# Google Calendar API 설정
google.calendar.application-name=FitMate Calendar API
google.calendar.tokens-directory-path=tokens
```

## 의존성

### pom.xml에 추가된 의존성
```xml
<!-- Google Calendar API 의존성 -->
<dependency>
    <groupId>com.google.apis</groupId>
    <artifactId>google-api-services-calendar</artifactId>
    <version>v3-rev20230707-2.0.0</version>
</dependency>
<dependency>
    <groupId>com.google.api-client</groupId>
    <artifactId>google-api-client</artifactId>
    <version>2.0.0</version>
</dependency>
<dependency>
    <groupId>com.google.oauth-client</groupId>
    <artifactId>google-oauth-client-jetty</artifactId>
    <version>1.34.1</version>
</dependency>
<dependency>
    <groupId>com.google.auth</groupId>
    <artifactId>google-auth-library-oauth2-http</artifactId>
    <version>1.19.0</version>
</dependency>
<dependency>
    <groupId>com.google.auth</groupId>
    <artifactId>google-auth-library-credentials</artifactId>
    <version>1.19.0</version>
</dependency>
```

## 사용 방법

### 1. 애플리케이션 실행
```bash
mvn spring-boot:run
```

### 2. Google 로그인
1. 브라우저에서 `http://localhost:8080/oauth2/authorization/google` 접속
2. Google 계정으로 로그인
3. Calendar API 권한 승인

### 3. API 테스트
```bash
# 캘린더 상태 확인
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:8080/api/calendar/status

# 이벤트 목록 조회
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:8080/api/calendar/events

# 운동 일정 생성
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "웨이트 트레이닝",
    "description": "상체 운동",
    "location": "피트니스 센터",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T10:00:00Z"
  }' \
  http://localhost:8080/api/calendar/workout
```

## 보안

- 모든 Calendar API 엔드포인트는 OAuth2 인증이 필요합니다
- Google OAuth2 토큰을 사용하여 Google Calendar API에 접근합니다
- 토큰은 Spring Security OAuth2 클라이언트에서 자동으로 관리됩니다

## 문제 해결

### 1. 인증 오류
- Google Cloud Console에서 OAuth 동의 화면이 올바르게 설정되었는지 확인
- 클라이언트 ID와 시크릿이 올바르게 설정되었는지 확인
- Calendar API가 활성화되었는지 확인

### 2. 권한 오류
- OAuth 동의 화면에서 Calendar API 범위가 추가되었는지 확인
- 사용자가 Calendar API 권한을 승인했는지 확인

### 3. 빌드 오류
- Maven 의존성이 올바르게 추가되었는지 확인
- Java 버전이 11 이상인지 확인

## 추가 기능

### 1. 운동 일정 자동 생성
- 사용자가 운동 프로그램을 선택하면 자동으로 Google Calendar에 일정 추가
- 운동 시간, 장소, 설명을 포함한 상세한 일정 생성

### 2. 알림 설정
- 운동 일정에 대한 알림 설정
- 이메일 또는 푸시 알림으로 운동 일정 알림

### 3. 운동 파트너 초대
- 운동 일정에 파트너 이메일을 추가하여 자동 초대
- Google Calendar의 참석자 기능 활용

## 참고 자료

- [Google Calendar API 문서](https://developers.google.com/calendar/api)
- [Spring Security OAuth2 문서](https://docs.spring.io/spring-security/reference/servlet/oauth2/index.html)
- [Google API Client Library for Java](https://github.com/googleapis/google-api-java-client) 