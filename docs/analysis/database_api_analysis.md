# FitMate 프로젝트 - 데이터베이스 설계 및 API 분석

## 개요
FitMate 프로젝트의 다중 데이터베이스 아키텍처(MySQL, MongoDB, Redis)와 RESTful API 설계에 대한 상세 분석입니다. 마이크로서비스 환경에서의 데이터 일관성, 성능 최적화, API 설계 원칙을 포괄적으로 다룹니다.

## 데이터베이스 아키텍처

### 다중 데이터베이스 전략
```
┌─────────────────────────────────────────────────────────────────┐
│                    FitMate 데이터 계층                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   MySQL/PostgreSQL   │    MongoDB     │         Redis            │
│   (관계형 데이터)      │   (문서형 데이터)  │      (캐시/세션)         │
│                      │                │                         │
│ • 사용자 정보         │ • 채팅 메시지    │ • JWT 토큰 캐시          │
│ • 운동 데이터         │ • 알림 데이터    │ • 세션 관리              │
│ • 운동 기록          │ • 로그 데이터    │ • OTP 임시 저장          │
│ • 신체 기록          │ • 실시간 데이터   │ • API Rate Limiting     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 데이터 분산 전략
- **MySQL**: 구조화된 데이터, ACID 트랜잭션이 중요한 데이터
- **MongoDB**: 스키마 유연성이 필요한 데이터, 실시간 데이터
- **Redis**: 임시 데이터, 캐시, 세션 관리

## MySQL 데이터베이스 설계

### 1. 사용자 관리 스키마
```sql
-- 사용자 테이블
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),                -- 로컬 회원가입 시에만 사용
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google', 'kakao', 'naver'
    provider_id VARCHAR(255),             -- OAuth2 프로바이더 ID
    
    -- 신체 정보
    height INT,                           -- cm
    weight DECIMAL(5,2),                  -- kg
    age INT,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    birth_date DATE,
    
    -- 운동 관련 정보
    fitness_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
    workout_goals JSON,                   -- 운동 목표 (배열)
    available_equipment JSON,             -- 보유 장비 (배열)
    available_workout_time INT,           -- 운동 가능 시간 (분)
    
    -- 연락처 및 프로필
    phone_number VARCHAR(20),
    picture VARCHAR(500),                 -- 프로필 이미지 URL
    
    -- 알림 설정
    sms_notification_enabled BOOLEAN DEFAULT false,
    email_notification_enabled BOOLEAN DEFAULT true,
    push_notification_enabled BOOLEAN DEFAULT true,
    
    -- 온보딩 및 상태
    onboarding_completed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    
    -- 감사 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 인덱스
    INDEX idx_email (email),
    INDEX idx_provider (provider, provider_id),
    INDEX idx_active_users (is_active, last_login_at),
    INDEX idx_fitness_level (fitness_level)
);

-- 사용자 역할 테이블
CREATE TABLE user_roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role ENUM('USER', 'ADMIN', 'TRAINER') DEFAULT 'USER',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    
    UNIQUE KEY unique_user_role (user_id, role),
    INDEX idx_role (role)
);
```

### 2. 운동 데이터 스키마
```sql
-- 운동 카테고리 테이블
CREATE TABLE exercise_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_kr VARCHAR(100) NOT NULL,        -- 한국어 이름
    description TEXT,
    image_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active_categories (is_active, sort_order)
);

-- 근육 그룹 테이블
CREATE TABLE muscle_groups (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_kr VARCHAR(100) NOT NULL,
    body_part ENUM('UPPER', 'LOWER', 'CORE', 'FULL_BODY'),
    
    UNIQUE KEY unique_muscle_name (name),
    INDEX idx_body_part (body_part)
);

-- 운동 테이블
CREATE TABLE exercises (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    name_kr VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,                    -- 운동 방법
    
    -- 운동 분류
    category_id BIGINT NOT NULL,
    primary_muscle_group_id BIGINT NOT NULL,
    
    -- 운동 강도 및 칼로리
    met_value DECIMAL(4,2),              -- MET 값
    intensity ENUM('LOW', 'MODERATE', 'HIGH'),
    difficulty_level INT DEFAULT 1,      -- 1-10
    
    -- 필요 장비
    required_equipment JSON,              -- 장비 목록 (배열)
    
    -- 미디어
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- 메타데이터
    duration_min INT,                     -- 권장 운동 시간
    repetitions_min INT,                  -- 최소 반복 횟수
    repetitions_max INT,                  -- 최대 반복 횟수
    sets_min INT DEFAULT 1,
    sets_max INT DEFAULT 5,
    
    -- 태그 및 검색
    tags JSON,                           -- 검색 태그
    is_beginner_friendly BOOLEAN DEFAULT false,
    is_equipment_free BOOLEAN DEFAULT true,
    
    -- 상태 관리
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    popularity_score DECIMAL(3,2) DEFAULT 0.0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래 키
    FOREIGN KEY (category_id) REFERENCES exercise_categories(id),
    FOREIGN KEY (primary_muscle_group_id) REFERENCES muscle_groups(id),
    
    -- 인덱스
    INDEX idx_category (category_id),
    INDEX idx_muscle_group (primary_muscle_group_id),
    INDEX idx_intensity (intensity),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_equipment_free (is_equipment_free),
    INDEX idx_active_exercises (is_active, popularity_score),
    INDEX idx_search (name, name_kr),
    FULLTEXT INDEX ft_search (name, name_kr, description, tags)
);

-- 운동-보조근육 관계 테이블
CREATE TABLE exercise_secondary_muscles (
    exercise_id BIGINT NOT NULL,
    muscle_group_id BIGINT NOT NULL,
    
    PRIMARY KEY (exercise_id, muscle_group_id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
);
```

### 3. 운동 기록 스키마
```sql
-- 운동 기록 테이블
CREATE TABLE workout_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    exercise_id BIGINT NOT NULL,
    
    -- 운동 수행 정보
    duration_minutes INT NOT NULL,        -- 운동 시간
    repetitions INT,                      -- 반복 횟수
    sets INT,                            -- 세트 수
    weight_kg DECIMAL(5,2),              -- 사용 중량
    distance_km DECIMAL(6,3),            -- 거리 (유산소)
    
    -- 칼로리 및 강도
    calories_burned DECIMAL(6,2),        -- 소모 칼로리
    perceived_exertion INT,              -- 주관적 운동 강도 (1-10)
    heart_rate_avg INT,                  -- 평균 심박수
    heart_rate_max INT,                  -- 최대 심박수
    
    -- 메타데이터
    workout_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    workout_type ENUM('INDIVIDUAL', 'GROUP', 'GUIDED') DEFAULT 'INDIVIDUAL',
    location VARCHAR(255),               -- 운동 장소
    
    -- 기분 및 피드백
    mood_before ENUM('POOR', 'FAIR', 'GOOD', 'EXCELLENT'),
    mood_after ENUM('POOR', 'FAIR', 'GOOD', 'EXCELLENT'),
    notes TEXT,                          -- 개인 메모
    
    -- AI 분석 데이터 (모션 코칭)
    motion_analysis_data JSON,           -- 자세 분석 결과
    form_score DECIMAL(3,2),             -- 폼 점수 (0-10)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래 키
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    
    -- 인덱스
    INDEX idx_user_date (user_id, workout_date),
    INDEX idx_exercise (exercise_id),
    INDEX idx_date_range (workout_date),
    INDEX idx_calories (calories_burned),
    INDEX idx_user_exercise (user_id, exercise_id)
);

-- 신체 기록 테이블
CREATE TABLE body_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    
    -- 신체 측정 데이터
    weight_kg DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),    -- 체지방률
    muscle_mass_kg DECIMAL(5,2),         -- 근육량
    bmi DECIMAL(4,2),                    -- BMI
    
    -- 신체 둘레
    waist_cm DECIMAL(4,1),               -- 허리둘레
    chest_cm DECIMAL(4,1),               -- 가슴둘레
    arm_cm DECIMAL(4,1),                 -- 팔둘레
    thigh_cm DECIMAL(4,1),               -- 허벅지둘레
    
    -- 메타데이터
    measurement_date DATE NOT NULL,
    measurement_time TIME,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 외래 키
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_user_date (user_id, measurement_date),
    INDEX idx_measurement_date (measurement_date)
);

-- 운동 목표 테이블
CREATE TABLE workout_goals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    
    -- 목표 정보
    goal_type ENUM('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS'),
    target_value DECIMAL(8,2),           -- 목표 수치
    current_value DECIMAL(8,2),          -- 현재 수치
    unit VARCHAR(20),                    -- 단위 (kg, %, 분 등)
    
    -- 기간 설정
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    
    -- 상태 관리
    status ENUM('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED') DEFAULT 'ACTIVE',
    completed_at TIMESTAMP NULL,
    
    -- 메타데이터
    title VARCHAR(255) NOT NULL,
    description TEXT,
    motivation_note TEXT,                -- 동기부여 메모
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래 키
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_user_status (user_id, status),
    INDEX idx_target_date (target_date),
    INDEX idx_goal_type (goal_type)
);
```

## MongoDB 컬렉션 설계

### 1. 채팅 메시지 컬렉션
```javascript
// ChatMessage 컬렉션
{
  _id: ObjectId,
  chatRoomId: String,          // 채팅방 ID
  senderId: ObjectId,          // 발신자 ID (users 테이블 참조)
  message: String,             // 메시지 내용
  messageType: {               // 메시지 타입
    type: String,
    enum: ['text', 'image', 'file', 'emoji', 'system'],
    default: 'text'
  },
  
  // 메타데이터
  timestamp: {
    type: Date,
    default: Date.now
  },
  editedAt: Date,              // 수정 시간
  
  // 읽음 상태
  readBy: [{
    userId: ObjectId,
    readAt: Date
  }],
  
  // 답장 및 인용
  replyTo: ObjectId,           // 답장할 메시지 ID
  isForwarded: Boolean,        // 전달된 메시지 여부
  
  // 첨부파일 정보
  attachments: [{
    type: String,              // 'image', 'file', 'link'
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  
  // 상태 관리
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  
  // 인덱스
  indexes: [
    { chatRoomId: 1, timestamp: -1 },
    { senderId: 1 },
    { timestamp: -1 },
    { "readBy.userId": 1 }
  ]
}

// ChatRoom 컬렉션
{
  _id: ObjectId,
  roomType: {
    type: String,
    enum: ['individual', 'group', 'support'],
    required: true
  },
  
  // 참여자 정보
  participants: [{
    userId: ObjectId,
    joinedAt: Date,
    role: {
      type: String,
      enum: ['member', 'admin', 'moderator'],
      default: 'member'
    },
    lastReadAt: Date
  }],
  
  // 방 정보
  name: String,                // 그룹 채팅방 이름
  description: String,
  avatar: String,              // 방 아바타
  
  // 설정
  settings: {
    isPrivate: Boolean,
    allowInvites: Boolean,
    maxParticipants: Number
  },
  
  // 메타데이터
  lastMessage: {
    messageId: ObjectId,
    content: String,
    senderId: ObjectId,
    timestamp: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  
  // 인덱스
  indexes: [
    { "participants.userId": 1 },
    { roomType: 1 },
    { updatedAt: -1 }
  ]
}
```

### 2. 알림 컬렉션
```javascript
// Notification 컬렉션
{
  _id: ObjectId,
  userId: ObjectId,            // 수신자 ID
  
  // 알림 내용
  title: String,
  message: String,
  type: {
    type: String,
    enum: [
      'workout_completed', 'goal_achieved', 'workout_reminder',
      'chat_message', 'friend_request', 'system_update', 'custom'
    ],
    required: true
  },
  
  // 추가 데이터
  data: {
    type: Map,
    of: Schema.Types.Mixed      // 타입별 추가 정보
  },
  
  // 상태 관리
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // 우선순위
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 만료 관리
  expiresAt: Date,             // TTL 인덱스용
  
  // 전송 채널
  channels: [{
    type: {
      type: String,
      enum: ['app', 'push', 'sms', 'email']
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed']
    },
    sentAt: Date,
    failureReason: String
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 인덱스
  indexes: [
    { userId: 1, createdAt: -1 },
    { userId: 1, isRead: 1 },
    { type: 1 },
    { expiresAt: 1 },           // TTL 인덱스
    { priority: 1, createdAt: -1 }
  ]
}
```

### 3. 시스템 로그 컬렉션
```javascript
// SystemLog 컬렉션
{
  _id: ObjectId,
  
  // 로그 기본 정보
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    required: true
  },
  message: String,
  
  // 서비스 정보
  service: String,             // 'communication-server', 'main-backend'
  component: String,           // 'chat', 'sms', 'auth'
  
  // 사용자 정보
  userId: ObjectId,
  sessionId: String,
  
  // 요청 정보
  request: {
    method: String,
    url: String,
    headers: Map,
    body: Schema.Types.Mixed,
    ip: String,
    userAgent: String
  },
  
  // 응답 정보
  response: {
    statusCode: Number,
    responseTime: Number,       // 응답 시간 (ms)
    size: Number               // 응답 크기 (bytes)
  },
  
  // 에러 정보
  error: {
    name: String,
    message: String,
    stack: String,
    code: String
  },
  
  // 메타데이터
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // 인덱스
  indexes: [
    { level: 1, timestamp: -1 },
    { service: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { timestamp: -1 }
  ]
}

// SMS 전송 로그
{
  _id: ObjectId,
  phoneNumber: String,
  message: String,
  templateType: String,        // 'otp', 'reminder', 'notification'
  
  // 전송 상태
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  // Twilio 정보
  twilioSid: String,
  twilioStatus: String,
  
  // 에러 정보
  errorMessage: String,
  errorCode: String,
  
  // 비용 정보
  cost: Number,
  currency: String,
  
  // 메타데이터
  userId: ObjectId,
  campaignId: String,          // 캠페인 ID (일괄 발송)
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  
  // 인덱스
  indexes: [
    { phoneNumber: 1, createdAt: -1 },
    { status: 1 },
    { templateType: 1, createdAt: -1 },
    { userId: 1 },
    { createdAt: -1 }
  ]
}
```

## Redis 캐시 설계

### 1. 세션 및 토큰 관리
```javascript
// JWT 토큰 캐시
key: "jwt:token:{tokenHash}"
value: {
  userId: "12345",
  email: "user@example.com",
  roles: ["USER"],
  expiresAt: "2024-12-31T23:59:59Z"
}
ttl: 86400 // 24시간

// 사용자 세션
key: "session:user:{userId}"
value: {
  isOnline: true,
  lastActivity: "2024-08-14T10:30:00Z",
  socketId: "socket_abc123",
  deviceInfo: {
    type: "mobile",
    os: "iOS",
    version: "17.0"
  }
}
ttl: 3600 // 1시간

// OTP 인증 코드
key: "otp:{phoneNumber}"
value: "123456"
ttl: 300 // 5분

// Rate Limiting
key: "rate_limit:sms:{phoneNumber}"
value: "3" // 시도 횟수
ttl: 3600 // 1시간
```

### 2. 애플리케이션 캐시
```javascript
// 운동 데이터 캐시
key: "exercises:category:{categoryId}"
value: JSON.stringify([{
  id: 1,
  name: "Push-up",
  metValue: 8.0,
  intensity: "MODERATE"
}])
ttl: 7200 // 2시간

// 사용자 운동 추천
key: "recommendations:user:{userId}"
value: JSON.stringify({
  exercises: [...],
  generatedAt: "2024-08-14T09:00:00Z",
  validUntil: "2024-08-14T21:00:00Z"
})
ttl: 43200 // 12시간

// 인기 운동 랭킹
key: "popular_exercises:weekly"
value: JSON.stringify([
  { exerciseId: 1, score: 95.5 },
  { exerciseId: 2, score: 89.2 }
])
ttl: 86400 // 24시간
```

## RESTful API 설계

### 1. 메인 백엔드 API (Spring Boot)

#### 인증 관련 API
```http
POST   /api/auth/register          # 회원가입
POST   /api/auth/login             # 로그인
POST   /api/auth/logout            # 로그아웃
POST   /api/auth/refresh           # 토큰 갱신
GET    /api/auth/me                # 현재 사용자 정보
POST   /api/auth/verify-password   # 비밀번호 확인

# OAuth2 엔드포인트
GET    /oauth2/authorization/{provider}  # OAuth2 로그인 시작
GET    /login/oauth2/code/{provider}     # OAuth2 콜백
```

#### 사용자 관리 API
```http
GET    /api/users/profile          # 프로필 조회
PUT    /api/users/profile          # 프로필 수정
POST   /api/users/upload-avatar    # 프로필 이미지 업로드
DELETE /api/users/account          # 계정 삭제

GET    /api/users/{userId}/body-records     # 신체 기록 조회
POST   /api/users/{userId}/body-records     # 신체 기록 추가
PUT    /api/users/{userId}/body-records/{id} # 신체 기록 수정
```

#### 운동 관련 API
```http
GET    /api/exercises              # 운동 목록 조회 (페이지네이션, 필터)
GET    /api/exercises/{id}         # 운동 상세 조회
GET    /api/exercises/categories   # 운동 카테고리 목록
GET    /api/exercises/muscles      # 근육 그룹 목록
GET    /api/exercises/search       # 운동 검색
GET    /api/exercises/popular      # 인기 운동 목록

POST   /api/workouts               # 운동 기록 생성
GET    /api/workouts               # 운동 기록 조회
PUT    /api/workouts/{id}          # 운동 기록 수정
DELETE /api/workouts/{id}          # 운동 기록 삭제
GET    /api/workouts/statistics    # 운동 통계

GET    /api/recommendations        # AI 운동 추천
POST   /api/recommendations/feedback # 추천 피드백
```

#### 목표 관리 API
```http
GET    /api/goals                  # 목표 목록 조회
POST   /api/goals                  # 목표 생성
PUT    /api/goals/{id}             # 목표 수정
DELETE /api/goals/{id}             # 목표 삭제
POST   /api/goals/{id}/complete    # 목표 완료 처리
```

### 2. 통신 서버 API (NestJS)

#### 채팅 API
```http
GET    /api/chat/rooms             # 채팅방 목록
POST   /api/chat/rooms             # 채팅방 생성
GET    /api/chat/rooms/{id}/messages # 채팅 메시지 조회
POST   /api/chat/rooms/{id}/messages # 메시지 전송
PUT    /api/chat/messages/{id}     # 메시지 수정
DELETE /api/chat/messages/{id}     # 메시지 삭제
POST   /api/chat/rooms/{id}/read   # 메시지 읽음 처리
```

#### 알림 API
```http
GET    /api/notifications          # 알림 목록 조회
POST   /api/notifications          # 알림 생성
PUT    /api/notifications/{id}/read # 알림 읽음 처리
POST   /api/notifications/read-all # 모든 알림 읽음 처리
DELETE /api/notifications/{id}     # 알림 삭제
GET    /api/notifications/unread-count # 읽지 않은 알림 수
```

#### SMS API
```http
POST   /sms/send                   # 기본 SMS 전송
POST   /sms/workout-reminder       # 운동 리마인더 SMS
POST   /sms/workout-recommendation # 운동 추천 SMS
POST   /sms/request-otp           # OTP 요청
POST   /sms/verify-otp            # OTP 검증
GET    /sms/statistics            # SMS 전송 통계
```

### 3. API 응답 형식 표준화

#### 성공 응답
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "사용자 이름"
  },
  "message": "요청이 성공적으로 처리되었습니다.",
  "timestamp": "2024-08-14T10:30:00Z"
}

// 페이지네이션 응답
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다.",
    "details": [
      {
        "field": "email",
        "message": "올바른 이메일 형식이 아닙니다."
      }
    ]
  },
  "timestamp": "2024-08-14T10:30:00Z"
}
```

## 데이터 일관성 및 동기화

### 1. 이벤트 기반 동기화
```java
// 사용자 정보 변경 시 이벤트 발행
@EventListener
public class UserEventHandler {
    
    @Async
    public void handleUserProfileUpdated(UserProfileUpdatedEvent event) {
        // MongoDB의 채팅 메시지에서 사용자 정보 업데이트
        communicationService.updateUserInfoInChats(event.getUserId(), event.getUserInfo());
        
        // Redis 캐시 무효화
        cacheService.evictUserCache(event.getUserId());
        
        // 실시간 알림 전송
        notificationService.notifyProfileUpdate(event.getUserId());
    }
}
```

### 2. 데이터 정합성 검증
```java
@Scheduled(fixedRate = 3600000) // 1시간마다
public void validateDataConsistency() {
    // MySQL과 MongoDB 간 사용자 데이터 일치성 검증
    validateUserDataConsistency();
    
    // 운동 기록과 통계 데이터 일치성 검증
    validateWorkoutStatistics();
    
    // 캐시 데이터 유효성 검증
    validateCacheData();
}
```

## 성능 최적화 전략

### 1. 데이터베이스 최적화
```sql
-- 복합 인덱스 최적화
CREATE INDEX idx_workout_user_date_exercise 
ON workout_records(user_id, workout_date, exercise_id);

-- 파티셔닝 (날짜 기반)
ALTER TABLE workout_records 
PARTITION BY RANGE (YEAR(workout_date)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);

-- 읽기 전용 복제본 활용
@Transactional(readOnly = true)
public List<Exercise> findPopularExercises() {
    // 읽기 전용 데이터소스 사용
    return exerciseRepository.findByOrderByPopularityScoreDesc();
}
```

### 2. 캐싱 전략
```java
// 다층 캐싱
@Cacheable(value = "exercises", key = "#category + '_' + #intensity")
public List<Exercise> findByCategory(String category, String intensity) {
    return exerciseRepository.findByCategoryAndIntensity(category, intensity);
}

// 캐시 워밍업
@PostConstruct
public void warmUpCache() {
    // 인기 운동 데이터 미리 로드
    exerciseService.loadPopularExercises();
    
    // 자주 사용되는 카테고리 데이터 로드
    exerciseService.loadFrequentCategories();
}
```

### 3. API 최적화
```java
// N+1 문제 해결
@Query("SELECT w FROM WorkoutRecord w " +
       "JOIN FETCH w.exercise e " +
       "JOIN FETCH e.category " +
       "WHERE w.userId = :userId")
List<WorkoutRecord> findUserWorkoutsWithExercise(@Param("userId") Long userId);

// 페이지네이션 최적화
public Page<Exercise> findExercises(ExerciseSearchCriteria criteria, Pageable pageable) {
    return exerciseRepository.findByCriteria(criteria, pageable);
}
```

## 면접 예상 질문 대비

### Q1: 다중 데이터베이스를 사용하는 이유는?
**A:**
- **특성화**: 각 데이터의 특성에 맞는 최적의 데이터베이스 선택
- **성능**: 용도별 최적화로 전체 시스템 성능 향상
- **확장성**: 개별 데이터베이스의 독립적인 스케일링
- **장애 격리**: 한 데이터베이스 문제가 전체에 영향을 주지 않음

### Q2: 데이터 일관성은 어떻게 보장하나요?
**A:**
- **이벤트 기반**: 도메인 이벤트를 통한 비동기 동기화
- **보상 트랜잭션**: Saga 패턴으로 분산 트랜잭션 관리
- **정합성 검증**: 배치 작업으로 데이터 일치성 주기적 검증
- **최종 일관성**: Eventually Consistent 모델 채택

### Q3: API 설계 시 고려한 원칙은?
**A:**
- **RESTful**: HTTP 메서드와 상태 코드 표준 준수
- **일관성**: 응답 형식과 에러 처리 표준화
- **버전 관리**: API 버전 관리를 통한 하위 호환성
- **문서화**: OpenAPI/Swagger를 통한 자동 문서화

### Q4: 대용량 데이터 처리 방안은?
**A:**
- **파티셔닝**: 날짜 기반 테이블 파티셔닝
- **인덱싱**: 쿼리 패턴에 맞는 복합 인덱스
- **아카이빙**: 오래된 데이터의 별도 저장소 이관
- **캐싱**: 다층 캐시로 데이터베이스 부하 분산

## 향후 개발 계획

### 1. 성능 향상
- **읽기 복제본**: 읽기 전용 쿼리 분산
- **샤딩**: 사용자 기반 데이터베이스 샤딩
- **CDN**: 정적 콘텐츠 전송 최적화

### 2. 데이터 분석
- **데이터 웨어하우스**: 분석용 데이터 저장소 구축
- **실시간 분석**: Apache Kafka + Apache Spark
- **ML 파이프라인**: 운동 추천 알고리즘 고도화

### 3. 보안 강화
- **데이터 암호화**: 민감 정보 컬럼 레벨 암호화
- **접근 제어**: 세밀한 권한 관리 시스템
- **감사 로그**: 모든 데이터 변경 이력 추적

---

*이 문서는 FitMate 프로젝트의 데이터베이스 설계 및 API 아키텍처에 대한 상세 분석을 제공합니다.*