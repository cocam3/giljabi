# 작업지시서 T-002: 규칙 데이터 스키마와 로더

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.

## 담당
- 지시서 작성: Claude
- 구현: Codex
- 확인: (미정, 기획 담당 권장)
- 브랜치: `feat/T-002-rules-schema`
- 선행 작업: **T-001 merge 후** 시작

## 목표 (한두 문장)
`data/rules/` 의 CSV 5종을 읽어서 zod로 검사하고, 타입이 붙은 데이터로 돌려주는 로더를 만든다.
CSV에 잘못된 값이 있으면 "어느 파일 몇 번째 줄 어느 열이 왜 틀렸는지" 전부 알려 준다.

## 배경
짜다·지키다의 규칙 엔진과 찾다의 AI 출력 대조가 모두 이 로더를 거쳐 학교 데이터를 읽는다. (AGENTS.md 4-1)
기획 담당이 엑셀로 CSV를 고치므로 오류 메시지가 사람이 읽기 쉬워야 한다.
실제 학교 데이터는 아직 없다. 그래서 이 작업은 **가짜 데이터**로만 테스트한다.

## 해야 할 일
1. **패키지 추가**: `papaparse`(dependencies), `@types/papaparse`(devDependencies)
   - 추가 사유: 과목명에 쉼표·따옴표가 들어가도 안전하게 CSV를 읽기 위함 (팀 결정, docs/DECISIONS.md 2026-11-21)
   - PR 설명 '새 패키지' 항목에 위 사유를 그대로 적는다.
2. **스키마** — `lib/data/schemas.ts`
   - 열 이름·허용값은 `data/rules/README.md` 초안을 **그대로** 따른다. 아래 표에 없는 열·값을 만들지 않는다.
   - 모든 파일 공통
     - `source`: 비어 있지 않은 `http://` 또는 `https://` URL
     - `as_of`: `YYYY-MM-DD` 형식이고 실제로 있는 날짜 (`2026-13-01`, `2026-02-30` 은 오류)
     - 모든 값은 앞뒤 공백을 지운(trim) 뒤 검사한다.
     - "필수" 열은 빈 값이면 오류다. "선택" 열은 빈 값이면 `undefined` 로 바꾼다.
   - 파일별

     | 파일 | 열 | 규칙 |
     |---|---|---|
     | `tracks.csv` | `track_id` | 필수 문자열, 파일 안에서 중복 금지 |
     | | `name`, `college` | 필수 문자열 |
     | | `day_night` | 필수 문자열 (허용값 확정 전. 아래 '확정 필요' 1) |
     | | `status` | `운영` \| `모집중지` |
     | `courses.csv` | `track_id` | 필수, `tracks.csv` 에 있는 값 |
     | | `year`, `semester` | 필수 정수, 1 이상 (의미 확정 전. '확정 필요' 2) |
     | | `category` | `전기` \| `전필` \| `전선` |
     | | `course_code`, `course_name` | 필수 문자열 |
     | | `credits` | 필수 숫자, 0 이상 (0학점 허용, 음수·`3학점` 같은 글자는 오류) |
     | `requirements.csv` | `rule_id` | 필수, 파일 안에서 중복 금지 |
     | | `applies_to` | 필수 문자열 (형식 확정 전. '확정 필요' 3) |
     | | `type` | `총학점` \| `전공` \| `교양` \| `비교과` \| `비학점` |
     | | `value` | 필수 문자열 (숫자 변환은 규칙 엔진에서. '확정 필요' 4) |
     | | `note` | 선택 |
     | `micro_degrees.csv` | `md_id`, `name`, `course_name` | 필수 문자열 (`md_id` 는 과목마다 한 줄이라 중복 허용) |
     | | `type` | 필수 문자열 (허용값 확정 전. '확정 필요' 5) |
     | | `credits` | 필수 숫자, 0 이상 |
     | `competencies.csv` | `track_id` | 필수, `tracks.csv` 에 있는 값 |
     | | `competency`, `career` | 필수 문자열 |
     | | `certificate` | 선택 |

   - 각 스키마에서 타입을 export 한다. (예: `export type Track = z.infer<typeof trackSchema>`)
3. **CSV 읽기** — `lib/data/parseCsv.ts`
   - papaparse로 `header: true`, `skipEmptyLines: true`, `comments: '#'` 로 읽는다. (`#` 로 시작하는 줄은 주석)
   - 파일 맨 앞의 UTF-8 BOM(엑셀 저장 시 생김)을 지운다.
   - 열 검사: 빠진 열이 있으면 오류. 표에 없는 열이 있어도 오류다. (열 이름 오타를 잡기 위함)
   - 열 이름만 있고 데이터 줄이 없는 파일은 빈 배열로 돌려준다. (오류 아님)
4. **로더** — `lib/data/loadRules.ts`
   - `parseRules(texts: Record<RuleFileName, string>): RuleData` — 파일 내용 문자열 5개를 받아 검사하는 **순수 함수**. 파일 시스템을 쓰지 않는다.
   - `loadRules(dir = 'data/rules', options?: { fileSuffix?: string }): Promise<RuleData>` — `dir` 에서 `tracks${fileSuffix}` 등 5개 파일을 읽어 `parseRules` 에 넘긴다. `fileSuffix` 기본값은 `.csv` 이고, 가짜 데이터는 `.fake.csv` 를 쓴다.
   - 오류는 **첫 번째에서 멈추지 않고 모두 모아서** `RulesValidationError` 하나로 던진다.
     - 오류 한 건 = `{ file, line, column, message }`. `line` 은 엑셀에서 보이는 줄 번호다. (열 이름 줄 = 1, 주석 줄도 센다)
     - `message` 는 한국어로 쓴다. 예: `courses.csv 4번째 줄 credits: 0 이상의 숫자여야 합니다 (입력값: "3학점")`
   - 파일이 없으면 그 파일 이름을 적은 오류를 던진다.
   - 교차 검사: `courses.track_id`·`competencies.track_id` 가 `tracks.track_id` 에 없으면 오류
   - 이 로더는 Node `fs` 를 쓰므로 서버 코드에서만 import 한다. 파일 맨 위에 주석으로 남긴다.
5. **내보내기** — `lib/data/index.ts` (T-001의 빈 파일을 대체): 스키마, 타입, `parseRules`, `loadRules`, `RulesValidationError`
6. **가짜 데이터** — `tests/fixtures/rules/` 에 5개 파일, 각 3줄
   - 파일 이름: `tracks.fake.csv`, `courses.fake.csv`, `requirements.fake.csv`, `micro_degrees.fake.csv`, `competencies.fake.csv`
   - 각 파일 첫 줄: `# 가짜 테스트 데이터 — 실제 한성대학교 데이터 아님`
   - 값은 실제와 헷갈리지 않게 만든다
     - 이름: `가짜트랙A`, `가짜과목1`, `가짜역량1`
     - 코드: `FAKE101`, `FAKE-T01`
     - `source`: `https://example.com/fake`
     - `as_of`: `2000-01-01`
   - **실제 한성대 트랙명·과목명·학점 기준을 쓰지 않는다.**
   - 세 줄 안에 `courses` 의 `credits = 0` 행 1개와, 쉼표가 들어간 따옴표 과목명 1개(예: `"가짜과목2, 실습"`)를 넣는다.
7. **테스트** — `tests/data/loadRules.test.ts`
   - 정상: `loadRules('tests/fixtures/rules', { fileSuffix: '.fake.csv' })` 가 5종 각 3행을 돌려준다.
   - 정상: 쉼표가 든 과목명을 그대로 읽는다. `credits = 0` 을 허용한다.
   - 정상: BOM이 붙은 텍스트도 열 이름을 제대로 읽는다.
   - 정상: 열 이름만 있는 파일은 빈 배열이다.
   - 오류 (`parseRules` 에 문자열을 직접 넣어 검사)
     - `source` 빈 값
     - `as_of` = `2026-13-01`
     - `category` = `교양` (courses 허용값 아님)
     - `credits` = `-1`, `credits` = `3학점`
     - 열 빠짐, 모르는 열 있음
     - `track_id` 중복, `rule_id` 중복
     - `courses` 에 `tracks` 에 없는 `track_id`
   - 오류 2건이 들어간 입력에서 2건이 모두 보고되고, 각각 `file`·`line`·`column` 이 맞는지 확인한다.
   - 없는 폴더를 주면 파일 이름이 들어간 오류가 난다.

## 건드릴 파일
- `package.json`, `package-lock.json` — papaparse, @types/papaparse 추가만
- `lib/data/schemas.ts`, `lib/data/parseCsv.ts`, `lib/data/loadRules.ts`, `lib/data/index.ts`
- `tests/fixtures/rules/*.fake.csv` (5개)
- `tests/data/loadRules.test.ts`

## 건드리면 안 되는 파일
- `data/rules/**` — 가짜 데이터도 여기에 두지 않는다 (기획 담당 관리)
- `next.config.*`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.*`, package.json 스크립트
- `app/**`, `components/**`, `lib/rules/**`, `lib/ai/**`
- `AGENTS.md`, `CLAUDE.md`, `docs/**`, `.github/**`

## 필요한 데이터
- 실제 CSV 5종은 이 작업에 필요 없다. 가짜 데이터로만 테스트한다.
- **데이터 필요 (기획 담당, 이 작업과 별도)**: `data/rules/` 에 실제 CSV 5종. 열은 위 표 기준이다.
- **기획 확정 필요** — 확정되면 스키마를 좁히는 후속 작업을 따로 만든다. 이번에는 문자열·정수로만 받는다.
  1. `tracks.day_night` 의 허용값 (예: 주간/야간처럼 정해진 값이 있는지)
  2. `courses.year` 가 학년(1~4)인지 교육과정 연도(2026)인지, `semester` 에 계절학기가 있는지
  3. `requirements.applies_to` 의 형식 (학번 범위·트랙을 한 칸에 어떻게 적는지)
  4. `requirements.value` 가 항상 숫자인지 (`비학점` 유형의 값은 무엇인지)
  5. `micro_degrees.type` 의 허용값

## 완료 조건
- [ ] (기능) 가짜 데이터 폴더를 읽으면 5종 각 3행이 타입이 붙어 반환된다.
- [ ] (기능) 잘못된 CSV를 넣으면 파일·줄·열이 적힌 한국어 오류가 **전부** 나온다.
- [ ] (테스트) `tests/data/loadRules.test.ts` 에 위 7번의 정상·오류·경계값(0학점, 빈 파일, BOM) 케이스가 모두 있다.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] `data/rules/` 아래 변경 없음 (`git diff main --stat -- data/` 결과가 비어 있음)
- [ ] 추가 패키지는 papaparse, @types/papaparse 뿐이다.
- [ ] `any`, `@ts-ignore` 를 쓰지 않았다.
- [ ] AGENTS.md 4장 절대 규칙 위반 없음

## 하지 말 것
- 실제 학교 규정·과목명·학점·트랙명을 지어내거나 가짜 데이터에 섞기
- '확정 필요' 항목을 추측해서 enum으로 좁히기
- 오류를 `try/catch` 로 삼키고 빈 데이터 돌려주기
- 화면(`app/**`)에 로더 연결하기 (이후 작업)
- 요청 범위 밖 리팩터링, 위 외의 패키지 추가

## 보고 형식 (Codex가 끝나고 남길 것)
- 바꾼 파일 목록
- 완료 조건 체크 결과 (테스트 개수, 네 명령의 마지막 출력 줄)
- 오류 메시지 예시 2개 (실제 출력 복사)
- 막힌 점·사람이 결정해야 할 점
