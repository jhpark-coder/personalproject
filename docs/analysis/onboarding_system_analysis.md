# FitMate 프로젝트 - 온보딩 시스템 분석

## 개요
FitMate 프로젝트의 온보딩 시스템에 대한 상세 분석 문서입니다. 회원가입 후 사용자가 처음 경험하는 단계별 온보딩 플로우와 각 단계별 기능을 분석합니다.

## 온보딩 시스템 개요

온보딩은 사용자가 FitMate 서비스를 효과적으로 사용할 수 있도록 단계별로 필요한 정보를 수집하고 설정하는 과정입니다. 총 4단계로 구성되어 있으며, 각 단계마다 진행률 표시와 함께 사용자 경험을 최적화합니다.

## 파일 구조

### 프론트엔드 온보딩 컴포넌트
```
frontend/src/components/onboarding/
├── OnboardingExperience.tsx      # 1단계: 운동 경험 선택
├── OnboardingGoal.tsx            # 2단계: 운동 목표 설정
├── OnboardingBasicInfo.tsx       # 3단계: 기본 정보 입력
├── OnboardingComplete.tsx        # 4단계: 온보딩 완료
├── OnboardingExperience.css      # 운동 경험 스타일
├── OnboardingGoal.css            # 운동 목표 스타일
├── OnboardingBasicInfo.css       # 기본 정보 스타일
└── OnboardingComplete.css        # 완료 페이지 스타일
```

## 온보딩 플로우 순서

### 1단계: 운동 경험 선택 (`OnboardingExperience.tsx`)
- **목적**: 사용자의 운동 경험 수준 파악
- **선택 옵션**: 초보자, 중급자, 고급자
- **진행률**: 25%
- **저장 데이터**: `userExperience` (localStorage)

### 2단계: 운동 목표 설정 (`OnboardingGoal.tsx`)
- **목적**: 사용자의 운동 목표 파악
- **선택 옵션**: 
  - 스트렝스 근력 키우기
  - 탄탄한 몸 만들기
  - 다이어트 성공하기
  - 신체 능력 향상시키기
  - 체력 키우기
- **진행률**: 50%
- **저장 데이터**: `userGoal` (localStorage)

### 3단계: 기본 정보 입력 (`OnboardingBasicInfo.tsx`)
- **목적**: 사용자의 신체 정보 및 연락처 수집
- **입력 항목**: 키, 체중, 나이, 성별, 전화번호
- **특별 기능**: SMS 인증, 생년월일 기반 나이 자동 계산
- **진행률**: 75%
- **저장 데이터**: 사용자 프로필 정보 (API 호출)

### 4단계: 온보딩 완료 (`OnboardingComplete.tsx`)
- **목적**: 온보딩 완료 및 추가 서비스 연동
- **기능**: 
  - 구글 캘린더 연동 옵션
  - 온보딩 완료 플래그 설정
  - 대시보드 또는 홈으로 이동
- **진행률**: 100%
- **저장 데이터**: `onboardingCompleted` (localStorage)

## 상세 코드 분석

### 1단계 - 운동 경험 선택

#### 경험 옵션 정의
```typescript
const experienceOptions: ExperienceOption[] = [
  {
    id: 'beginner',
    title: '초보자',
    description: '운동을 처음 시작하는 분이에요.',
    icon: '🌱',
    color: '#34C759'
  },
  {
    id: 'intermediate',
    title: '중급자',
    description: '운동 경험이 있는 분이에요.',
    icon: '🌿',
    color: '#007AFF'
  },
  {
    id: 'advanced',
    title: '고급자',
    description: '운동에 익숙한 분이에요.',
    icon: '🌳',
    color: '#FF3B30'
  }
];
```

#### 경험 선택 처리
```typescript
const handleExperienceSelect = (experienceId: string) => {
  setSelectedExperience(experienceId);
};

const handleNext = () => {
  if (selectedExperience) {
    localStorage.setItem('userExperience', selectedExperience);
    navigate('/onboarding/goal');
  }
};
```

### 2단계 - 운동 목표 설정

#### 목표 옵션 정의
```typescript
const goalOptions: GoalOption[] = [
  {
    id: 'strength',
    title: '스트렝스 근력 키우기',
    description: '누구보다 강한 힘을 가지고 싶어요.',
    icon: '💪',
    color: '#FF3B30'
  },
  {
    id: 'body',
    title: '탄탄한 몸 만들기',
    description: '멋진 몸매를 만들고 싶어요.',
    icon: '🏃‍♂️',
    color: '#007AFF'
  },
  // ... 기타 목표들
];
```

#### 목표 선택 처리
```typescript
const handleGoalSelect = (goalId: string) => {
  setSelectedGoal(goalId);
};

const handleNext = () => {
  if (selectedGoal) {
    localStorage.setItem('userGoal', selectedGoal);
    navigate('/onboarding/basic-info');
  }
};
```

### 3단계 - 기본 정보 입력

#### 상태 관리
```typescript
const [formData, setFormData] = useState<BasicInfo>({
  height: '',
  weight: '',
  age: '',
  gender: '',
  phoneNumber: ''
});

// SMS 인증 관련 상태
const [showSmsCodeInput, setShowSmsCodeInput] = useState(false);
const [isSmsVerified, setIsSmsVerified] = useState(false);
const [smsCode, setSmsCode] = useState('');
const [isSmsLoading, setIsSmsLoading] = useState(false);
const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');

// 타이머 관련 상태
const [timeLeft, setTimeLeft] = useState<number>(0);
const [isTimerRunning, setIsTimerRunning] = useState(false);
const [canExtend, setCanExtend] = useState(false);
```

#### 생년월일 기반 나이 계산
```typescript
const calculateAgeFromBirthDate = (birthDate: string): string => {
  if (!birthDate || birthDate.length !== 8) return '';
  
  try {
    const year = parseInt(birthDate.substring(0, 4));
    const month = parseInt(birthDate.substring(4, 6));
    const day = parseInt(birthDate.substring(6, 8));
    
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age.toString();
  } catch (error) {
    console.error('나이 계산 오류:', error);
    return '';
  }
};
```

#### 전화번호 형식 변환
```typescript
const formatPhoneNumber = (phoneNumber: string): string => {
  // 010-XXXX-XXXX 형식을 +82-10-XXXX-XXXX로 변환
  if (phoneNumber.startsWith('010-')) {
    return phoneNumber.replace('010-', '+82-10-');
  }
  // 이미 +82로 시작하면 그대로 반환
  if (phoneNumber.startsWith('+82')) {
    return phoneNumber;
  }
  // 다른 형식이면 그대로 반환
  return phoneNumber;
};
```

#### 전화번호 유효성 검사
```typescript
const validatePhoneNumber = (phoneNumber: string): string | undefined => {
  if (!phoneNumber) return '휴대전화번호를 입력해주세요';
  const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return '올바른 휴대전화번호 형식을 입력해주세요 (예: 010-1234-5678)';
  }
  return undefined;
};
```

### 4단계 - 온보딩 완료

#### 온보딩 완료 플래그 설정
```typescript
const handleConnectGoogleCalendar = async () => {
  try {
    // 온보딩 완료 플래그 설정
    localStorage.setItem('onboardingCompleted', 'true');
    const provider = localStorage.getItem('currentProvider');
    if (provider) {
      localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
    }
    
    // 구글 캘린더 연동 로직...
  } catch (error) {
    console.error('캘린더 연동 실패:', error);
  }
};

const handleSkipCalendar = () => {
  try {
    localStorage.setItem('onboardingCompleted', 'true');
    const provider = localStorage.getItem('currentProvider');
    if (provider) {
      localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
    }
  } catch {}
  navigate('/');
};
```

#### JWT에서 사용자 ID 추출
```typescript
function getUserIdFromToken(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return '';
  }
}
```

## 진행률 표시 시스템

각 단계마다 상단에 진행률 바가 표시됩니다:

```typescript
<div className="progress-bar">
  <div className="progress-fill" style={{ width: '25%' }}></div>  // 1단계
  <div className="progress-fill" style={{ width: '50%' }}></div>  // 2단계
  <div className="progress-fill" style={{ width: '75%' }}></div>  // 3단계
  <div className="progress-fill" style={{ width: '100%' }}></div> // 4단계
</div>
```

## 데이터 저장 및 관리

### localStorage 저장 항목
- `userExperience`: 선택된 운동 경험 수준
- `userGoal`: 선택된 운동 목표
- `onboardingCompleted`: 온보딩 완료 여부
- `onboardingCompleted_{provider}`: 프로바이더별 온보딩 완료 여부

### API 호출
- **기본 정보 저장**: `/api/users/profile` (PUT)
- **구글 캘린더 연동**: `/api/calendar/auth/google` (GET)

## 사용자 경험 최적화

### 1. 단계별 진행
- 각 단계마다 명확한 목적과 설명
- 진행률 표시로 현재 위치 파악
- 뒤로가기 버튼으로 이전 단계 수정 가능

### 2. 입력 검증
- 실시간 유효성 검사
- 명확한 에러 메시지
- 필수 입력 항목 표시

### 3. SMS 인증
- 전화번호 인증을 통한 신뢰성 확보
- 타이머를 통한 인증 코드 만료 관리
- 재전송 기능 제공

### 4. 선택적 기능
- 구글 캘린더 연동은 선택사항
- 온보딩 완료 후에도 언제든 연동 가능

## 에러 처리

### 1. 입력 검증 에러
- 각 입력 필드별 유효성 검사
- 사용자 친화적인 에러 메시지
- 실시간 피드백

### 2. API 에러
- 네트워크 오류 처리
- 서버 응답 오류 처리
- 재시도 옵션 제공

### 3. SMS 인증 에러
- 인증 코드 불일치
- 인증 시간 만료
- 전화번호 형식 오류

## 향후 개선 방향

### 1. 데이터 유효성
- 더 정확한 신체 정보 검증
- 운동 경험 수준 정량화
- 목표 달성 가능성 검증

### 2. 개인화
- 사용자 선택에 따른 맞춤형 운동 추천
- AI 기반 목표 설정 가이드
- 단계별 맞춤형 팁 제공

### 3. 연동 확장
- 더 많은 캘린더 서비스 지원
- 운동 앱과의 연동
- 웨어러블 기기 연동

### 4. 사용자 경험
- 온보딩 단계 건너뛰기 옵션
- 진행 상황 저장 및 복구
- 모바일 최적화

## 성능 및 기술적 고려사항

### 데이터 유효성 및 보안
- **입력 검증**: 클라이언트와 서버 양쪽에서 검증
- **XSS 방지**: 입력값 sanitization
- **개인정보 보호**: GDPR 준수, 최소 필요 정보만 수집

### 사용자 경험 최적화
- **진행률 시각화**: 사용자 이탈 방지
- **중간 저장**: 브라우저 새로고침 시에도 데이터 보존
- **접근성**: WAI-ARIA 준수, 스크린 리더 지원

### 데이터 분석 활용
- **완료율 추적**: 각 단계별 이탈률 분석
- **A/B 테스팅**: 온보딩 플로우 최적화
- **사용자 행동 분석**: 어려운 단계 식별

## 면접 예상 질문 대비

### 설계 관련 질문
1. **Q: 온보딩을 4단계로 나눈 이유는?**
   - A: 사용자 인지 부하 최소화 및 단계별 명확한 목적
   - 각 단계마다 진행률 표시로 완료 동기 부여

2. **Q: SMS 인증을 포함한 이유는?**
   - A: 계정 보안 강화 및 실제 사용자 확인
   - 운동 알림 등 서비스 연동을 위한 신뢰할 수 있는 연락처

3. **Q: 온보딩 중 이탈 시 재개 방법은?**
   - A: localStorage에 진행 상황 저장
   - 로그인 시 미완료 온보딩 자동 감지 후 재개 제안

### 기술적 질문
1. **Q: 온보딩 데이터를 localStorage에 저장하는 이유는?**
   - A: 임시 데이터로 서버 부하 감소
   - 완료 시점에만 API 호출하여 네트워크 효율성 향상

2. **Q: 전화번호 형식 변환 로직의 필요성은?**
   - A: 국제 표준 형식 준수 및 SMS 서비스 호환성
   - 다양한 입력 형식에 대한 사용자 편의성

3. **Q: 구글 캘린더 연동이 선택사항인 이유는?**
   - A: 사용자 프라이버시 존중 및 온보딩 완료율 향상
   - 핵심 기능과 부가 기능의 분리

## 관련 시스템과의 연동

### 1. 회원가입 시스템
- 회원가입 완료 후 자동 온보딩 시작
- 온보딩 완료 시 회원가입 완료로 간주

### 2. 사용자 프로필 시스템
- 온보딩에서 수집한 정보로 프로필 생성
- 프로필 수정 시 온보딩 정보 활용

### 3. 운동 추천 시스템
- 운동 경험과 목표를 바탕으로 맞춤형 운동 추천
- 단계별 운동 난이도 조정

### 4. 알림 시스템
- 온보딩 완료 후 환영 메시지
- 운동 목표 달성을 위한 알림 설정

---

*이 문서는 FitMate 프로젝트의 온보딩 시스템에 대한 상세 분석을 제공합니다. 
사용자 경험 최적화와 데이터 수집을 위한 핵심 시스템입니다.* 