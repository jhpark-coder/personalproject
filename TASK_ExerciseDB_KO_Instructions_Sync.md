# Exercisedb 지침(Instructions) 자동 수집·번역·DB 저장 태스크

목표: 우리 DB의 운동 목록을 기준으로 Exercisedb(Open Source v1)에서 영문 동작지침을 가져오고, 한국어로 번역한 결과를 서버 DB에 저장한다. 이후 프런트 모달은 항상 저장된 한국어 지침을 우선 표시한다.

참고 문서: Exercisedb v1 Open Source API ([GitHub](https://github.com/ExerciseDB/exercisedb-api/tree/main), 베이스 URL: `https://www.exercisedb.dev/api/v1`)

---

## 0. 전제
- 백엔드 서버가 `http://localhost:8080`에서 기동 중
- 엔드포인트(이미 구현되어 있거나, 없으면 먼저 추가):
  - GET `/api/exercises/instructions/{exerciseId}` → 저장된 한국어 지침 배열 반환
  - POST `/api/exercises/instructions` → 한국어 지침 저장
    - Body(JSON): `{ "exerciseId": string, "nameKo": string, "instructionsKo": string[] }`
- 프런트는 해당 API를 우선 조회하여 한국어 지침을 표시하도록 연동되어 있음

만약 서버 엔드포인트가 없다면 아래 1-1 단계의 “백엔드 반영”을 먼저 수행.

---

## 1. 준비 단계

### 1-1. 백엔드 반영(없을 시)
- 컨트롤러: `ExerciseInstructionController`
  - GET `/api/exercises/instructions/{exerciseId}`
  - POST `/api/exercises/instructions`
- 서비스: `ExerciseInstructionService`
  - `saveKoInstructions(exerciseId, nameKo, instructionsKo)`
  - `getKoInstructions(exerciseId)`
- 엔티티/리포지토리:
  - `ExerciseInstruction(id, exerciseId, nameKo, instructionsKoJson, updatedAt)`
  - `ExerciseInstructionRepository#findByExerciseId`

(이 저장소에는 이미 동일 명의 파일이 있을 수 있음. 없다면 위 스펙대로 추가.)

### 1-2. Exercisedb API 사전 파악
- 검색: `GET https://www.exercisedb.dev/api/v1/exercises/search?q={query}&limit=1`
  - 응답에서 `data[0].exerciseId` 확보
- 상세: `GET https://www.exercisedb.dev/api/v1/exercises/{exerciseId}`
  - 응답 `data.instructions`(영문 배열)을 취득

---

## 2. 수행 절차(운동 1건 기준)
1) 운동 한글명 → 검색어(영문) 매핑
   - 예시 매핑: 스쿼트→`squat`, 런지→`lunge`, 푸시업→`push up`, 플랭크→`plank`, 카프 레이즈→`calf raise`, 데드리프트→`deadlift`, 벤치 프레스→`bench press`, 바벨 로우→`barbell row`, 크런치→`crunch`, 윗몸일으키기→`sit up`, 브릿지→`glute bridge` 등
2) Exercisedb 검색 → `exerciseId` 획득
3) Exercisedb 상세 호출 → `instructions`(영문 배열) 획득
4) 번역(엔진 자유: 예. 사내 번역 API/LLM). 결과를 줄 단위 배열로 정리
5) DB 저장(API 호출)
6) 검증: 프런트에서 해당 운동 카드 클릭 → 모달에 한국어 지침 표출 확인

---

## 3. 예시 커맨드(curl)

### 3-1. 검색 → exerciseId 획득
```bash
curl "https://www.exercisedb.dev/api/v1/exercises/search?q=squat&limit=1"
# => { data: [{ exerciseId: "gUjqdei", ... }] }
```

### 3-2. 상세 → instructions 영문 배열 조회
```bash
curl "https://www.exercisedb.dev/api/v1/exercises/gUjqdei"
# => { data: { instructions: ["Step:1 ...", "Step:2 ...", ...] } }
```

### 3-3. DB 저장(한국어 지침)
```bash
curl -X POST http://localhost:8080/api/exercises/instructions \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseId":"gUjqdei",
    "nameKo":"스쿼트",
    "instructionsKo":[
      "발을 어깨너비로 벌리고 선다.",
      "오른발을 왼발 뒤 사선 방향으로 보내며 교차한다.",
      "커트시 동작처럼 양쪽 무릎을 굽혀 몸을 낮춘다.",
      "상체를 곧게 세우고 체중은 앞발에 둔다.",
      "앞발 뒤꿈치로 바닥을 밀어 시작 자세로 돌아온다.",
      "반대쪽도 동일하게 반복한다."
    ]
  }'
```

### 3-4. 저장 확인
```bash
curl http://localhost:8080/api/exercises/instructions/gUjqdei
# => { success: true, data: ["발을 ...", ...] }
```

---

## 4. 체크리스트(우리 DB 기준)
- 아래 표에서 좌측은 우리 DB의 한글 운동명, 우측은 Exercisedb 검색어/확인용 메모. 각 항목 수행 시 ✅ 체크, `exerciseId` 기록.

| # | 우리DB 운동명 | Exercisedb 검색어 | exerciseId | 번역/저장 | 비고 |
|---|---|---|---|---|---|
| 1 | 스쿼트 | squat | gUjqdei | ⬜ | 커트시/백/프론트 등 변형 주의 |
| 2 | 점프 스쿼트 | jump squat |  | ⬜ |  |
| 3 | 와이드 스쿼트 | wide squat |  | ⬜ |  |
| 4 | 런지 | lunge |  | ⬜ |  |
| 5 | 브릿지 | glute bridge |  | ⬜ |  |
| 6 | 레그 레이즈 | leg raise |  | ⬜ |  |
| 7 | 스탠딩 카프 레이즈 | calf raise |  | ⬜ |  |
| 8 | 푸시업 | push up |  | ⬜ |  |
| 9 | 윗몸일으키기 | sit up |  | ⬜ |  |
|10 | 크런치 | crunch |  | ⬜ |  |
|11 | 플랭크 | plank |  | ⬜ | 정적 자세, 지침 간결하게 |
|12 | 버피 테스트 | burpee |  | ⬜ |  |
|13 | 턱걸이 | pull up / chin up |  | ⬜ | 장비/그립 변형 주의 |
|14 | 딥스 | dips |  | ⬜ |  |
|15 | 벤치 프레스 | bench press |  | ⬜ |  |
|16 | 덤벨 숄더프레스 | dumbbell shoulder press |  | ⬜ |  |
|17 | 벤트 오버 바벨 로우 | barbell row / bent over row |  | ⬜ |  |
|18 | 데드리프트 | deadlift |  | ⬜ |  |
|19 | 제자리 뛰기 | jumping in place |  | ⬜ |  |
|20 | 마운틴 클라이머 | mountain climber |  | ⬜ |  |
|21 | 줄넘기 | jump rope |  | ⬜ |  |
|22 | 계단 오르기 | stair climbing |  | ⬜ |  |
|23 | 스트레칭 | stretching |  | ⬜ |  |
|24 | 폼롤러 | foam roller |  | ⬜ |  |

> 필요한 경우 실제 Exercisedb의 명칭이 다를 수 있으므로 검색어는 유연하게 조정.

---

## 5. 번역 지침
- 톤: 간결·명령형, 1문장 1동작, 사용자(일반인) 기준 안전 수칙 우선
- 한 줄에 하나의 스텝, 총 4~8줄 권장
- 장비 명칭은 한국어 통용어 사용(바벨, 덤벨, 케틀벨 등)

---

## 6. 산출물
- 각 운동의 `exerciseId`와 `instructionsKo[]`가 DB에 저장
- 프런트 `운동 정보` 목록 → 카드 클릭 시 모달에 한국어 지침 표출

---

## 7. 운영 팁
- 최초에는 영문 지침을 그대로 저장해도 됨(빈 화면 방지), 이후 번역문으로 덮어쓰기
- 저장 재실행 시 `exerciseId` 동일 항목은 overwrite 여부를 서버에서 정책화(현재는 덮어쓰기 안전)
- Exercisedb 응답이 다중 변형을 반환하는 경우, 가장 일반적인 변형을 선택하거나 우리 DB 운동명과 가장 가까운 것을 채택 