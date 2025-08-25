# 🏋️‍♂️ FitMate 운동 추천 시스템 

## 🚀 빠른 시작 가이드

FitMate의 운동 추천 시스템이 완료되었습니다! 사용자 온보딩 데이터를 기반으로 개인 맞춤형 운동 세트를 자동 생성합니다.

## 📊 주요 기능

### ✨ 개인화된 운동 추천
- **5가지 운동 목표**: 다이어트, 근력, 탄탄한 몸, 체력, 신체능력
- **3단계 경험 레벨**: 초보자, 중급자, 고급자
- **BMI 기반 강도 조절**: 사용자 신체 조건에 맞는 운동 강도
- **AI 모션 코칭 통합**: 7가지 핵심 운동에 AI 코칭 지원

### 🎯 스마트 운동 구성
- **3단계 구조**: 준비운동 → 메인운동 → 마무리운동
- **동적 세트/횟수 계산**: 경험도별 맞춤 설정
- **칼로리 예측**: MET 값 기반 정확한 칼로리 소모량 계산
- **개인화된 조언**: 목표와 체형에 맞는 맞춤 팁 제공

## 🛠️ 구현 완료 파일

### Backend (Spring Boot)
```
📁 src/main/java/backend/fitmate/
├── 📄 controller/WorkoutRecommendationController.java  # REST API 엔드포인트
└── 📄 service/WorkoutRecommendationService.java        # 추천 알고리즘 로직
```

### Frontend (React + TypeScript)
```
📁 frontend/src/components/ui/
├── 📄 WorkoutRecommendation.tsx   # 메인 추천 컴포넌트
└── 📄 WorkoutRecommendation.css   # 반응형 스타일링
```

## 🔌 API 엔드포인트

### POST `/api/workout/recommend`
사용자 데이터 기반 운동 추천 생성

**요청 예시:**
```json
{
  "goal": "diet",
  "experience": "beginner", 
  "weight": "70",
  "height": "170",
  "age": "25"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "userProfile": {
      "goal": "diet",
      "experience": "beginner",
      "bmi": 24.2,
      "bmiCategory": "정상",
      "fitnessLevel": "보통"
    },
    "workoutPlan": {
      "warmup": {
        "name": "준비운동",
        "duration": 10,
        "exercises": [...]
      },
      "main": {
        "name": "메인운동", 
        "duration": 35,
        "exercises": [...]
      },
      "cooldown": {
        "name": "마무리운동",
        "duration": 10, 
        "exercises": [...]
      }
    },
    "estimatedCalories": 287,
    "totalDuration": 55,
    "recommendations": [
      "💡 다이어트를 위해서는 꾸준한 유산소 운동이 중요합니다",
      "🌱 초보자는 정확한 자세가 가장 중요합니다"
    ]
  }
}
```

### GET `/api/workout/templates`
사용 가능한 운동 템플릿 목록 조회

## 🎨 프론트엔드 컴포넌트 사용법

### 1. 컴포넌트 임포트
```tsx
import WorkoutRecommendation from '@components/ui/WorkoutRecommendation';
```

### 2. 라우팅에 추가
```tsx
// App.tsx 또는 Router 설정
<Route path="/workout/recommendation" element={<WorkoutRecommendation />} />
```

### 3. 네비게이션 바에 링크 추가
```tsx
<Link to="/workout/recommendation">운동 추천</Link>
```

## ⚡ 핵심 알고리즘

### 1. 사용자 프로필 분석
```javascript
// BMI 계산 및 분류
BMI = 체중(kg) / (키(m))²

// 경험도 점수화 (0.3 ~ 1.0)
experienceScore = {
  'beginner': 0.3,
  'intermediate': 0.6, 
  'advanced': 1.0
}

// 나이별 조정 계수
ageMultiplier = age <= 25 ? 1.0 : 0.95 - (age-25)*0.01
```

### 2. 운동 선별 로직
```javascript
// 목표별 운동 유형 가중치
goalWeights = {
  'diet': {'cardio': 0.7, 'strength': 0.3},
  'strength': {'cardio': 0.2, 'strength': 0.8}, 
  'body': {'cardio': 0.5, 'strength': 0.5}
}

// 복합 점수 계산
totalScore = (goalScore * 0.4) + (experienceScore * 0.3) + 
             (muscleScore * 0.2) + aiCoachingBonus
```

### 3. 칼로리 계산
```javascript
// MET 기반 칼로리 소모량 계산
caloriesPerMinute = (운동MET * 체중kg * 3.5) / 200
totalCalories = caloriesPerMinute * 운동시간(분)
```

## 🎯 목표별 운동 구성

### 다이어트 (Diet) 🔥
- **구성**: 유산소 70% + 근력 30%
- **특징**: 고강도 인터벌, 칼로리 소모 극대화
- **주요 운동**: 스쿼트, 마운틴 클라이머, 버피, 점프 스쿼트

### 근력 (Strength) 💪  
- **구성**: 근력 80% + 유산소 20%
- **특징**: 복합 관절 운동, 점진적 부하
- **주요 운동**: 스쿼트, 푸시업, 턱걸이, 딥스, 데드리프트

### 탄탄한 몸 (Body) 🏃‍♂️
- **구성**: 균형잡힌 근력 50% + 유산소 50%  
- **특징**: 전신 조화, 체형 개선
- **주요 운동**: 플랭크, 런지, 크런치, 마운틴 클라이머

### 체력 (Stamina) ⚡
- **구성**: 유산소 80% + 근력 20%
- **특징**: 심폐 지구력 향상, 장시간 운동
- **주요 운동**: 제자리 뛰기, 줄넘기, 계단 오르기, 버피

### 신체능력 (Fitness) 📈
- **구성**: 기능성 운동 60% + 유산소 40%
- **특징**: 폭발력, 민첩성, 협응력
- **주요 운동**: 버피 테스트, 점프 스쿼트, 하이 니즈

## 🤖 AI 모션 코칭 통합

### 지원 운동 (7가지)
1. **스쿼트** - 하체 근력의 기본
2. **런지** - 균형감각과 하체 강화  
3. **푸시업** - 상체 종합 근력
4. **플랭크** - 코어 안정성
5. **카프 레이즈** - 종아리 강화
6. **버피** - 전신 복합 운동
7. **마운틴 클라이머** - 유산소 + 코어

### AI 코칭 혜택
- 🎯 **초보자 우선 배치**: AI 지원 운동을 초보자에게 우선 추천
- 📊 **실시간 폼 피드백**: 자세 교정 및 점수화
- 🏆 **안전한 운동**: 부상 방지를 위한 정확한 자세 가이드

## 📱 모바일 최적화

### 반응형 디자인
- **데스크톱**: 그리드 레이아웃, 카드 형태
- **태블릿**: 2열 구조, 터치 최적화  
- **모바일**: 1열 구조, 스와이프 지원

### 터치 인터페이스
- **큰 버튼**: 15px 이상 패딩으로 터치하기 쉬움
- **제스처 지원**: 스와이프로 운동 단계 이동
- **빠른 로딩**: 최적화된 이미지와 애니메이션

## 🚀 배포 및 테스트

### 1. 백엔드 서버 시작
```bash
cd C:\NodeWork\fitmate
./mvnw spring-boot:run
```

### 2. 프론트엔드 개발 서버 시작  
```bash
cd frontend
npm run dev
```

### 3. 테스트 URL
- **API 테스트**: `http://localhost:8080/api/workout/recommend`
- **프론트엔드**: `http://localhost:5173/workout/recommendation`

## 🎉 완성도 및 데모

### ✅ 구현 완료사항
- [x] 사용자 프로필 분석 알고리즘
- [x] 5가지 목표별 운동 추천 로직
- [x] BMI/나이/성별 개인화
- [x] MET 기반 칼로리 계산
- [x] AI 모션 코칭 통합 준비  
- [x] 반응형 UI 컴포넌트
- [x] REST API 엔드포인트
- [x] 에러 처리 및 로딩 상태

### 🎬 데모 시나리오
1. **온보딩 완료** → 사용자 목표/경험 선택
2. **추천 요청** → 개인 맞춤 운동 세트 생성  
3. **운동 계획 확인** → 세트/횟수/칼로리 표시
4. **AI 코칭** → 지원 운동에 특별 표시
5. **개인화 팁** → 목표별 맞춤 조언 제공

## 💡 추후 확장 아이디어

### 단기 (1-2주)
- 운동 진행 타이머 기능
- 완료 체크리스트 
- 운동 기록 저장

### 중기 (1-2개월)
- 성과 분석 대시보드
- 진행도 기반 난이도 자동 조절
- 소셜 기능 (친구와 운동 공유)

### 장기 (3-6개월)  
- 머신러닝 기반 개인화
- 웨어러블 기기 연동
- 영양 관리 통합

---

**🎯 결과**: 하루-이틀 내에 완성 가능한 프로토타입 수준의 운동 추천 시스템이 구현되었습니다. 기존 온보딩 데이터와 운동 DB를 최대한 활용하여 그럴싸한 추천 기능을 제공합니다!