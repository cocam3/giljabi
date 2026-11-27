# 작업지시서 T-004: 로드맵 데이터 형식 + 이 기기 저장소

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.

## 담당
- 지시서 작성: Claude
- 구현: Codex
- 확인: 2junewoo
- 리뷰: kyu0lee (리뷰 순환), **임솔 (추가 리뷰어: 서버 구현 T-028이 같은 인터페이스를 쓰는지 확인)**
- 브랜치: `feat/T-004-roadmap-store`
- 선행 작업: T-001, T-002 (merge 됨)
- 마감: 2026-11-30

## 목표 (한두 문장)
학생의 기본 정보·로드맵·항목·5년 계획·비학점 체크를 담는 **데이터 형식**과, 이를 브라우저(localStorage)에 저장하고 불러오는 **저장소**를 만든다.
화면은 만들지 않는다. 다음 작업(T-005 학점 합계, T-006·T-027 편집 화면, T-022 기본 정보, T-028 서버 저장)이 모두 이 형식과 인터페이스를 쓴다.

## 배경
- 짜다(수립)의 모든 화면이 이 데이터를 읽고 쓴다. 근거는 `docs/SCREENS.md` 2장 확정 10·15·16·19, 6장 S01·S20·S21·S22, 7장 '저장하는 것'.
- 로그인하지 않으면 이 기기(localStorage), 로그인하면 계정(Supabase)에 저장한다. 두 구현이 **같은 인터페이스**를 쓴다 (SCREENS 7장). 서버 구현은 임솔의 T-028이다.
- 학생 데이터는 깨질 수 있다 (직접 고친 값, 옛 형식, 저장 공간 부족, 사생활 보호 모드). 깨져도 화면이 멈추지 않아야 한다.

## 해야 할 일

### 1. 학기 칸 — `lib/roadmap/terms.ts`
- 학기 칸 키 `TermKey`
  - 정규 학기 8개: `1-1` `1-2` `2-1` `2-2` `3-1` `3-2` `4-1` `4-2`
  - 계절 학기 8개: `1-S` `1-W` `2-S` `2-W` `3-S` `3-W` `4-S` `4-W` (S = 여름, W = 겨울)
- `TERM_ORDER`: 시간 순서 배열. 여름은 1학기 뒤, 겨울은 2학기 뒤다.
  - `1-1, 1-S, 1-2, 1-W, 2-1, 2-S, …, 4-2, 4-W`
- `isSeasonalTerm(term)`: 계절 학기인지
- `termStatus(term, profile)`: `'past' | 'current' | 'future'`
  - 기준은 기본 정보의 지금 학년·학기다 (`profile.currentYear`, `profile.currentSemester`).
  - 지금 학기 = `current`. `TERM_ORDER` 에서 그보다 앞 = `past`, 뒤 = `future`.
  - `profile` 이 없으면 `null` 을 돌려준다 (화면이 "기본 정보를 먼저 입력" 안내를 띄움).
- 화면에서 쓰는 규칙(완료 체크는 지난·이번 학기 칸에서만, SCREENS S21)은 T-006이 이 함수로 처리한다. 저장소는 이 규칙을 강제하지 않는다.

### 2. 데이터 형식 (zod) — `lib/roadmap/schema.ts`
- 모든 형식을 zod 스키마로 만들고 `z.infer` 로 타입을 export 한다.
- 문자열은 앞뒤 공백을 지우고 검사한다. 학점은 0 이상의 유한한 숫자다. 날짜·시각은 ISO 문자열이다.

**기본 정보 `Profile`** (SCREENS S01)

| 필드 | 형식 | 비고 |
|---|---|---|
| `admissionYear` | 4자리 정수 | 입학년도 |
| `dayNight` | `'주간' \| '야간'` | `lib/data` 의 tracks `day_night` 과 같은 값 |
| `currentYear` | `1 \| 2 \| 3 \| 4` | 지금 학년 |
| `currentSemester` | `1 \| 2` | 지금 학기 |

- 학번·이름·연락처 필드를 만들지 않는다 (SCREENS S01 '받지 않는 것', AGENTS 4-3).

**로드맵 `Roadmap`** (SCREENS 확정 16, S20)

| 필드 | 형식 | 비고 |
|---|---|---|
| `id` | 문자열 | `crypto.randomUUID()` |
| `name` | 필수 문자열, 40자 이하 | |
| `track1Id` | 필수 문자열 | `data/rules/tracks.csv` 의 `track_id`. 저장소는 존재 여부를 검사하지 않는다 (화면·엔진이 대조) |
| `track2Id` | 문자열 또는 `null` | `null` = 아직 미정 |
| `career` | 문자열, 100자 이하 | 희망 진로(직무 이름 한 줄). 빈 값 허용 |
| `showSeasonal` | boolean | [계절학기 칸 보이기] 상태. 기본 `false` |
| `items` | `RoadmapItem[]` | 아래. **같은 학기 안의 순서 = 배열 안의 순서** |
| `fiveYearPlan` | `FiveYearPlan` | 아래 |
| `isPublic` | boolean | 기본 `false`. 공개는 로그인해야 켤 수 있다 (T-028). 이 기기 저장소에서는 늘 `false` 로 저장한다 |
| `createdAt`, `updatedAt` | ISO 시각 문자열 | |

- 대표 로드맵은 로드맵 필드가 아니라 **저장소의 `primaryRoadmapId`** 로 둔다 (대표가 둘이 되는 일을 막기 위함).

**로드맵 항목 `RoadmapItem`** — `kind` 로 나누는 판별 유니온 (SCREENS S21 ③, 확정 10)

공통 필드: `id`(문자열, `crypto.randomUUID()`), `term`(`TermKey`), `completed`(boolean, 기본 `false`), `memo`(선택 문자열, 200자 이하)

| `kind` | 화면 탭 | 추가 필드 |
|---|---|---|
| `course` | 교과 | `courseCode`(필수), `courseName`(필수), `credits`(0 이상), `trackId`(필수, 어느 트랙 교육과정에서 골랐는지) |
| `otherCourse` | 교과 [기타 과목 추가] | `name`(필수), `credits`(0 이상). 전공 요건에 세지 않고 총 학점에만 (확정 10, 계산은 T-005) |
| `extracurricular` | 비교과 | `name`(필수), `programId`(선택. 비교과 목록 데이터가 생기면 씀) |
| `academic` | 학사제도 | `name`(필수), `mdId`(선택. `micro_degrees.csv` 의 `md_id`) |
| `external` | 교외활동 | `category`(`'어학시험' \| '자격증' \| '인턴' \| '대외활동' \| '기타'`), `name`(필수) |

- `course` 의 `courseName`·`credits` 는 **고른 시점의 사본**이다. 데이터가 바뀌거나 남의 로드맵을 가져왔을 때(T-029)도 화면에 이름을 보여 주기 위함이다. 학점 계산(T-005)은 `courseCode` 로 `data/rules` 를 다시 찾는다. 계산 규칙은 T-005 지시서에서 정한다.

**졸업 후 5년 계획 `FiveYearPlan`** (SCREENS S21 ④, 확정 19)
- 졸업 후 1~5년, 길이 5인 배열. 칸마다 `{ chips: Chip[], text: string }`
  - `Chip` = `'자격증' | '시험' | '대학원' | '취업' | '이직'`, 중복 없음
  - `text` 는 500자 이하, 빈 값 허용
- 새 로드맵은 빈 칸 5개로 시작한다.
- **항상 비공개**다. 이 사실을 스키마 위 주석에 적는다. 공개용 변환(T-028·T-029)에서 이 필드를 빼야 한다.

**비학점 요건 체크 `NonCreditChecks`** (SCREENS S22, 7장)
- `Record<string, boolean>` — 키는 `requirements.csv` 의 `rule_id` (`type = 비학점` 인 행), 값은 "달성했어요" 체크 여부
- **로드맵마다가 아니라 학생 한 명에 하나**다. 달성 여부는 계획이 아니라 학생에 대한 사실이라서다.

**저장 전체 `StoredData`** (localStorage에 들어가는 한 덩어리)

```ts
{
  version: 1,
  profile: Profile | null,
  roadmaps: Roadmap[],
  primaryRoadmapId: string | null,
  nonCreditChecks: NonCreditChecks,
}
```

### 3. 로드맵 다루기 (순수 함수) — `lib/roadmap/ops.ts`
화면(T-006·T-027)이 쓰는 함수다. 입력을 바꾸지 않고 **새 객체를 돌려준다**. 시각·ID는 인자로 받을 수 있게 해서 테스트에서 고정한다.

- `createRoadmap(input: { name, track1Id, track2Id, career }, opts?: { now?, id? }): Roadmap` — 빈 항목, 빈 5년 계획, `isPublic: false`, `showSeasonal: false`
- `addItem(roadmap, item, opts?)` → `{ ok: true, roadmap } | { ok: false, reason: 'duplicate', existingTerm: TermKey }`
  - 같은 `courseCode` 의 `course` 항목이 이미 있으면 넣지 않고 그 항목의 학기를 알려 준다 (SCREENS S21 "같은 과목을 두 번 넣으면 막고 이미 있는 학기를 알려 준다").
  - `otherCourse`·비교과 등은 이름이 같아도 막지 않는다.
  - 새 항목은 그 학기의 맨 끝에 붙는다.
- `moveItem(roadmap, itemId, toTerm, toIndex)` — 다른 학기로 옮기거나 같은 학기 안에서 순서를 바꾼다. `toIndex` 는 **옮긴 뒤 그 학기 안에서의 위치**다. 범위를 넘으면 맨 끝. 드래그와 버튼 옮기기(S21) 모두 이 함수를 쓴다.
- `removeItem(roadmap, itemId)`
- `setCompleted(roadmap, itemId, completed)`
- `updateItemMemo(roadmap, itemId, memo)`
- `updateRoadmapInfo(roadmap, patch: Partial<{ name, track1Id, track2Id, career, showSeasonal }>)`
- `updateFiveYearPlan(roadmap, yearIndex: 0~4, entry)`
- `itemsInTerm(roadmap, term): RoadmapItem[]` — 그 학기 항목을 순서대로
- 바꾸는 함수는 모두 `updatedAt` 을 새 시각으로 바꾼다. 없는 `itemId` 는 바꾸지 않고 같은 로드맵을 돌려준다.
- 결과를 `roadmapSchema` 로 검사해서 틀리면 던진다 (예: 이름 41자). 화면이 막을 값이지만 잘못 저장되는 것을 막기 위함이다.

### 4. 저장소 인터페이스 — `lib/roadmap/repository.ts`
**T-028 서버 구현이 그대로 이 인터페이스를 구현한다.** 그래서 모든 메서드는 `Promise` 를 돌려준다 (localStorage는 동기지만 서버는 비동기라서).

```ts
export interface RoadmapRepository {
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;

  listRoadmaps(): Promise<Roadmap[]>;            // updatedAt 최신 순
  getRoadmap(id: string): Promise<Roadmap | null>;
  saveRoadmap(roadmap: Roadmap): Promise<void>;  // 같은 id 면 덮어쓰기, 없으면 추가
  deleteRoadmap(id: string): Promise<void>;

  getPrimaryRoadmapId(): Promise<string | null>;
  setPrimaryRoadmap(id: string): Promise<void>;  // 없는 id 면 RoadmapStorageError

  getNonCreditChecks(): Promise<NonCreditChecks>;
  setNonCreditCheck(ruleId: string, done: boolean): Promise<void>;

  clearAll(): Promise<void>;                     // S01 [이 기기에 저장된 내 정보 모두 지우기]
}
```

- **대표 로드맵 규칙** (구현마다 같아야 함. 인터페이스 위 주석에 적는다)
  - 로드맵이 처음 하나 저장되면 그것이 대표가 된다.
  - 대표 로드맵을 지우면 남은 것 중 `updatedAt` 이 가장 최근인 것이 대표가 된다. 하나도 없으면 `null`.
- 저장할 때 형식이 틀리면(`saveRoadmap` 에 스키마에 안 맞는 값) `RoadmapStorageError` 를 던진다.
- `RoadmapStorageError` 는 이 파일에 정의한다. `code` 필드로 `'invalid' | 'not_found' | 'quota' | 'unavailable'` 를 구분하고, `message` 는 화면에 그대로 띄울 수 있는 한국어로 쓴다.
- **로그인 전 → 로그인 후 올리기**(SCREENS S01 "이 기기의 로드맵 N개를 계정에 올릴까요?")는 T-028이 두 저장소를 써서 만든다. T-004는 만들지 않는다.

### 5. 이 기기 저장소 — `lib/roadmap/localRepository.ts`
- `createLocalRepository(options?: { storage?: Storage; now?: () => Date }): LocalRoadmapRepository`
  - `storage` 를 안 주면 `globalThis.localStorage` 를 쓴다. 테스트에서는 가짜 `Storage` 를 넣는다.
  - `RoadmapRepository` 를 구현하고, 아래 `getLoadReport()` 를 더 가진다.
- 저장 키: `giljabi:data:v1` (한 덩어리 JSON). 이 접두사 `giljabi:` 는 이 앱의 모든 localStorage 키에 쓴다.
- **읽을 때 깨진 값 처리** — 어떤 경우에도 던지지 않는다.
  1. 키가 없음 → 빈 데이터. 정상.
  2. JSON이 아님, 또는 `version` 이 1이 아님 → 원래 문자열을 `giljabi:broken:<ISO 시각>` 키에 **백업**하고 빈 데이터로 시작
  3. 전체 모양은 맞는데 로드맵 일부만 틀림 → **틀린 로드맵만 빼고** 나머지는 살린다. 원래 문자열은 2처럼 백업
     - `profile` 이 틀리면 `null`, `nonCreditChecks` 가 틀리면 `{}`, `primaryRoadmapId` 가 없는 로드맵을 가리키면 대표 규칙으로 다시 정함
  4. 무엇을 고쳤는지 `getLoadReport()` 로 알려 준다: `{ recovered: boolean; droppedRoadmaps: number; backupKey?: string }`. 화면은 이걸 보고 "저장된 로드맵 일부를 읽지 못했어요" 를 띄운다 (T-006).
- **localStorage를 쓸 수 없을 때** (사생활 보호 모드, 서버 렌더링 중 `localStorage` 없음, 접근 시 예외)
  - 메모리에만 저장하는 방식으로 계속 동작한다. `getLoadReport()` 에 `storageUnavailable: true` 를 더한다.
  - 화면은 "이 브라우저에서는 저장되지 않아요" 를 띄운다 (T-006).
- **쓸 때**
  - 매번 전체 덩어리를 다시 쓴다.
  - 저장 공간 부족(`QuotaExceededError`)이면 `RoadmapStorageError('quota')` 를 던지고, 메모리 상태는 저장 전 값으로 되돌린다.
  - `isPublic` 은 늘 `false` 로 저장한다 (공개는 로그인 필요).
- `clearAll()` 은 `giljabi:` 로 시작하는 키를 **백업까지 모두** 지운다 (사용성 테스트 뒤 정리용).
- 다른 탭에서 동시에 고치는 경우는 다루지 않는다. 마지막에 저장한 쪽이 남는다. 파일 위 주석에 적는다.
- 사용 기록 동의·가명 ID(T-033)는 이 저장소에 넣지 않는다.

### 6. 내보내기 — `lib/roadmap/index.ts`
- 스키마, 타입, `terms`, `ops`, `RoadmapRepository`, `RoadmapStorageError`, `createLocalRepository` 를 export 한다.
- `lib/roadmap` 은 브라우저에서 쓰므로 Node 전용 모듈(`fs` 등)과 `@/lib/data` 의 `loadRules` 를 import 하지 않는다. 타입이 필요하면 `@/lib/data/schemas` 에서 가져온다.

### 7. 테스트 — `tests/roadmap/`
가짜 데이터만 쓴다. 트랙·과목은 `FAKE-T01`, `FAKE101`, `가짜과목1` 처럼 실제와 헷갈리지 않게 한다.

- `terms.test.ts`
  - `TERM_ORDER` 가 16칸이고 `1-1, 1-S, 1-2, 1-W, 2-1` 로 시작한다.
  - 기본 정보 2학년 2학기: `2-1` past, `2-S` past, `2-2` current, `2-W` future, `3-1` future
  - 경계: 1학년 1학기면 `1-1` current, 그 밖은 전부 future. 4학년 2학기면 `4-W` 만 future
  - 기본 정보가 없으면 `null`
- `schema.test.ts`
  - 정상: 항목 5종이 하나씩 든 로드맵이 통과한다. `credits = 0` 허용
  - 오류: `term = '5-1'`, `credits = -1`, `otherCourse` 의 `name` 빈 값, `course` 에 `courseCode` 없음, `chips` 중복, `fiveYearPlan` 길이 4, 이름 41자, `admissionYear = 26`, `currentYear = 5`
- `ops.test.ts`
  - 같은 `courseCode` 를 두 번 넣으면 `{ ok: false, reason: 'duplicate', existingTerm }` 이고 로드맵은 그대로다.
  - `moveItem`: `1-1` → `2-1` 의 1번 자리로 옮기면 `2-1` 순서가 맞고 `1-1` 에서 빠진다. 같은 학기 안 순서 바꾸기. `toIndex` 가 범위를 넘으면 맨 끝. 없는 `itemId` 는 그대로
  - 바꾸는 함수가 입력 객체를 바꾸지 않는다 (`Object.freeze` 로 확인 가능)
  - `updatedAt` 이 주입한 시각으로 바뀐다.
- `localRepository.test.ts` (메모리로 만든 가짜 `Storage` 사용)
  - 저장 → **새 저장소 객체**로 다시 읽으면 같은 값이다 (로드맵 2개, 기본 정보, 비학점 체크).
  - 첫 로드맵이 대표가 된다. 대표를 지우면 남은 것 중 최신이 대표가 된다. 다 지우면 `null`
  - `setPrimaryRoadmap('없는-id')` → `RoadmapStorageError('not_found')`
  - 깨진 JSON → 빈 데이터, `recovered: true`, 백업 키에 원래 문자열이 있다.
  - 로드맵 2개 중 1개만 틀림 → 1개만 남고 `droppedRoadmaps: 1`
  - `version: 2` → 빈 데이터로 시작하고 백업
  - `storage.getItem` 이 예외를 던지는 가짜 → 메모리로 동작하고 `storageUnavailable: true`, 저장·읽기가 된다.
  - `setItem` 이 `QuotaExceededError` 를 던지는 가짜 → `RoadmapStorageError('quota')`, 그 뒤 읽으면 저장 전 값
  - `isPublic: true` 로 저장해도 다시 읽으면 `false`
  - `clearAll()` 뒤 `giljabi:` 키가 하나도 없다 (백업 포함). 다른 접두사 키는 남아 있다.

## 건드릴 파일
- `lib/roadmap/terms.ts`, `lib/roadmap/schema.ts`, `lib/roadmap/ops.ts`, `lib/roadmap/repository.ts`, `lib/roadmap/localRepository.ts`, `lib/roadmap/index.ts` (모두 새 파일)
- `tests/roadmap/*.test.ts` (새 파일 4개)

파일이 지시서 기준(5개 안팎)보다 많다. 모두 작은 파일이고 한 형식을 같이 정해야 해서 한 PR로 한다. Codex가 한 번에 끝내기 어려우면 1~3(형식·함수)과 4~5(저장소)를 PR 두 개로 나누고 PR 설명에 적는다.

## 건드리면 안 되는 파일
- `data/rules/**` (기획 담당 관리)
- `lib/data/**` (T-002 담당 영역. 타입만 import)
- `lib/rules/**` (T-005·T-007)
- `app/**`, `components/**` (화면은 T-006·T-022·T-027)
- `package.json`, `package-lock.json` — **새 패키지 없음**. UUID는 `crypto.randomUUID()`, 검증은 이미 있는 zod
- `next.config.*`, `tsconfig.json`, `vitest.config.mts`, `eslint.config.*`
- `AGENTS.md`, `CLAUDE.md`, `.github/**`, `docs/**`

## 필요한 데이터
- 이 작업은 실제 학교 데이터가 필요 없다. 트랙·과목·요건 ID는 문자열로만 저장하고 존재 여부는 검사하지 않는다.
- 다음 작업에서 대조한다: 과목·트랙은 T-005·T-006, 비학점 `rule_id` 는 T-008.

## 완료 조건
- [ ] 위 7번 테스트가 모두 있고 통과한다.
- [ ] `createLocalRepository()` 로 로드맵을 만들고 항목을 넣고 저장한 뒤, 새 저장소 객체로 읽으면 같은 값이다.
- [ ] 깨진 값·localStorage 없음·저장 공간 부족에서 읽기가 예외를 던지지 않는다.
- [ ] `RoadmapRepository` 의 모든 메서드가 `Promise` 를 돌려준다. 대표 로드맵 규칙이 인터페이스 위 주석에 있다.
- [ ] 5년 계획이 항상 비공개라는 주석이 스키마에 있다.
- [ ] 학번·이름·이메일 필드가 없다.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] AGENTS.md 4장 절대 규칙 위반 없음

## 하지 말 것
- 학교 규정·과목·학점 지어내기 (테스트도 가짜 값만)
- 화면·컴포넌트 만들기
- Supabase·서버 저장 코드 (T-026·T-028)
- 사용 기록·가명 ID (T-033)
- 로드맵 복사·공개·가져오기 (T-028·T-029)
- 새 패키지 추가, 범위 밖 리팩터링

## 사람이 확인할 점 (리뷰 때)
1. **비학점 체크를 학생 한 명에 하나로** 둔 것 (로드맵마다가 아님). 로드맵마다 따로 체크해야 하면 바꾼다.
2. **교과 항목에 과목명·학점 사본**을 저장하는 것. 계산은 `courseCode` 로 데이터를 다시 찾는다.
3. **지금 학년은 1~4만** 받는다. 초과 학기(4학년 2학기 뒤) 학생을 어떻게 받을지는 정하지 않았다.
4. (임솔) 인터페이스가 서버 구현(T-028)에 맞는지. 특히 메서드 단위(`saveRoadmap` 이 로드맵 전체를 덮어씀)와 `clearAll`.

## 보고 형식 (Codex가 끝나고 남길 것)
- 바꾼 파일 목록
- 완료 조건 체크 결과
- 막힌 점·사람이 결정해야 할 점
