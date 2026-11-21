# 작업지시서 T-003: 학교 데이터 수집·검증 스크립트

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.

## 담당
- 지시서 작성: Claude
- 구현: Codex (kyu0lee가 Codex에게 넘김)
- 담당·확인: kyu0lee (데이터)
- 브랜치: `feat/T-003-data-pipeline`
- 선행 작업: **T-002 merge 후** 시작 (검증에 T-002의 스키마를 씀)

## 목표 (한두 문장)
kyu0lee가 명령 두 개로 학교 트랙 페이지의 교육과정 표·졸업요건을 CSV 초안으로 바꾸고, 그 초안의 문제점 보고서를 받는다.
초안은 `private/data-draft/` 에만 생긴다. `data/rules/` 로 옮기는 것은 **사람이 확인한 뒤 직접** 한다.

## 배경
짜다·지키다·찾다는 모두 `data/rules/` 의 CSV를 읽는다. (AGENTS.md 4-1)
트랙 5개(컴퓨터공학 계열 4개 트랙 + AI응용학과)의 교육과정을 손으로 옮기면 오타와 누락이 생기기 쉽다. 그래서 수집은 스크립트로 하고, 판단과 최종 반영은 사람이 한다.
일정: 첫 트랙 11/29, 나머지 4개 12/13 (ROADMAP)

## 기본 원칙
- 스크립트는 **읽을 수 있는 것만 옮기고, 애매하면 지어내지 않고 '사람 확인 목록'에 남긴다.**
- 학교 서버에 부담을 주지 않는다. 같은 페이지는 한 번만 받고 저장본을 재사용한다.
- 스크립트는 `data/rules/` 에 **절대 쓰지 않는다.** 읽기만 한다(이전 데이터 비교용).

## 해야 할 일

### 0. 패키지·명령 (팀 결정 2026-11-22, docs/DECISIONS.md)
- devDependencies: `cheerio`(HTML 표 읽기), `tsx`(TypeScript 스크립트 실행). 이 둘만 추가한다.
- package.json 스크립트 2개 추가 (기존 스크립트는 건드리지 않음)
  - `"data:fetch": "tsx scripts/data/fetch.ts"`
  - `"data:validate": "tsx scripts/data/validate.ts"`
- PR 설명 '새 패키지' 항목에 위 사유를 적는다.

### 1. 대상 목록 — `scripts/data/targets.csv`
- 열: `track_id, name, college, day_night, status, curriculum_url, requirements_url, note`
- Codex는 **열 이름 줄과 주석 줄만** 만든다. 주석 예: `# kyu0lee가 학교 사이트에서 확인해 채움. URL은 hansung.ac.kr 만`
- 실제 트랙 이름·URL은 kyu0lee가 채운다. **Codex는 트랙 이름이나 URL을 추측해 넣지 않는다.**
- 테스트는 `tests/fixtures/data-pipeline/targets.fake.csv`(가짜 값)로 한다.

### 2. 수집 — `scripts/data/fetch.ts` (`npm run data:fetch`)
- `targets.csv` 의 URL을 **한 번에 하나씩** 받는다. 동시 요청은 하지 않는다.
- 요청 간격: 최소 **3초**. 상수로 두되 3초보다 작게 설정하면 시작 전에 오류를 낸다.
- 허용 도메인: `hansung.ac.kr` 와 그 하위 도메인만. 다른 도메인 URL은 받지 않고 '사람 확인 목록'에 남긴다.
- `robots.txt`: 시작할 때 한 번 받는다. `User-agent: *` 의 `Disallow` 경로에 걸리는 URL은 받지 않고 목록에 남긴다.
- User-Agent: `giljabi-student-project (HSU e-Advisor contest data collection)`. 개인 이름·이메일은 넣지 않는다.
- 시간 제한: 요청당 20초. 실패하면 10초 뒤 한 번만 다시 시도한다. 그래도 실패하면 목록에 남기고 다음 URL로 넘어간다.
- **저장본 재사용**
  - 받은 HTML은 `private/cache/pages/` 에 저장하고, `private/cache/index.json` 에 `url → 파일명, 받은 시각` 을 적는다.
  - 저장본이 있으면 다시 받지 않는다. `--refresh` 옵션을 줄 때만 다시 받는다.
- 문자 인코딩: `Content-Type` 이나 `<meta charset>` 을 보고 UTF-8이 아니면(예: EUC-KR) `TextDecoder` 로 바꿔 UTF-8로 저장한다.
- 받기가 끝나면 이어서 3번(변환)을 실행한다. 이미 받은 페이지만으로 변환만 다시 돌릴 수 있게 `--offline` 옵션을 둔다.
- 네트워크 부분은 `fetch` 함수와 `wait` 함수를 인자로 받게 만들어서 테스트에서 가짜로 바꿀 수 있게 한다.

### 3. 변환 — `scripts/data/parse.ts` (HTML 문자열 → 행 + 문제 목록, **순수 함수**)
- **체크포인트 (구현 전에 멈춤)**: 실제 트랙 페이지 1개를 받아 표 구조를 보고하고 멈춘다. 보고할 것은 다음과 같다.
  - 표 개수
  - 각 표의 열 이름
  - 병합된 칸이 있는지
  - '이수구분' 칸에 실제로 쓰인 글자들
  
  kyu0lee가 열 대응(어느 열 → `year`·`semester`·`category`·`course_code`·`course_name`·`credits`)을 확인해 준 뒤 계속한다.
- 병합된 칸(`rowspan`, `colspan`)은 같은 값으로 펼쳐서 읽는다.
- **교육과정 표 → `courses.csv` 형식**
  - 열은 T-002 스키마 그대로다.
  - `category`: 이수구분 글자를 `전기`·`전필`·`전선` 으로 바꾸는 대응표를 `scripts/data/category-map.ts` 에 둔다. 대응표에 없는 글자는 **추측하지 않고** 그 행을 '사람 확인 목록'에 넣는다.
  - `credits` 가 숫자가 아니거나, 필요한 칸이 비어 있는 행도 목록에 넣는다. (초안에서 빼고, 이유를 적음)
  - `source` = 그 페이지 URL, `as_of` = 페이지를 받은 날짜(YYYY-MM-DD)
- **졸업요건**: `requirements.csv` 형식으로 바꾸지 않는다. (적용 학번·트랙 판단은 사람이 함)
  - 페이지의 표를 원문 그대로 `private/data-draft/requirements-raw/{track_id}.csv` 로 저장한다. 첫 줄 주석에 출처 URL과 받은 날짜를 적는다.
  - 사람이 이 원문을 보고 `requirements.csv` 행을 직접 만든다.
- **`tracks.csv` 형식**: `targets.csv` 의 앞 5열 + `source`(curriculum_url) + `as_of` 로 만든다.
- **표로 읽을 수 없는 부분 → 사람 확인 목록** (`private/data-draft/manual-todo.csv`)
  - 열: `track_id, url, kind, detail`
  - `kind` 값은 다음 중 하나다: `image`, `pdf`, `hwp`, `iframe`, `no_table`, `unknown_category`, `bad_row`, `blocked_robots`, `blocked_domain`, `fetch_failed`
  - 본문 영역의 `<img>`, `.pdf`·`.hwp` 링크, `<iframe>`, 표가 하나도 없는 페이지는 모두 기록한다.
  - `detail` 에는 사람이 원본을 찾아갈 수 있게 다음을 적는다: 이미지 `src`, 링크 주소, 표 제목 등.

### 4. 결과물 (전부 `private/data-draft/`)
```
private/data-draft/
  tracks.csv
  courses.csv
  requirements-raw/{track_id}.csv
  manual-todo.csv
  validation-report.md      ← 5번 검증 결과
```
- `private/` 는 이미 `.gitignore` 에 있다. 확인만 하고 `.gitignore` 는 고치지 않는다.

### 5. 검증 — `scripts/data/validate.ts` (`npm run data:validate`)
- 입력: `--dir` (기본 `private/data-draft`). 비교 대상: `--compare` (기본 `data/rules`, 읽기만)
- 그 폴더에 있는 CSV만 검사한다. (초안에는 tracks·courses만 있을 수 있음)
- 검사 항목
  1. **스키마**: T-002의 zod 스키마와 CSV 읽기 함수를 그대로 쓴다. 새로 만들지 않는다.
     - `@/lib/data` 나 `@/lib/data/parseCsv` 에서 import한다.
     - 필요한 함수가 export 되어 있지 않으면 `lib/` 를 고치지 말고 멈추고 묻는다.
  2. **source·as_of 누락**: 파일별 누락 행 수와 줄 번호
  3. **중복 과목**
     - 같은 `track_id` 안에 같은 `course_code` 가 두 번 이상 나오면 오류
     - 트랙이 달라도 같은 `course_code` 의 `course_name`·`credits` 가 서로 다르면 경고
  4. **학점 합계**: 트랙 × `category` 별 학점 합계와 트랙별 총합 표
     - 판정은 하지 않는다. 사람이 학교 페이지의 숫자와 맞춰 보는 용도다.
  5. **이전 데이터 대비 바뀐 과목**: `track_id + course_code` 를 기준으로 비교한다.
     - **추가**, **삭제**, **변경**(이름·학점·이수구분·학년·학기 중 바뀐 칸과 전후 값)을 나눠 보여 준다.
     - 비교 대상 파일이 없으면 "이전 데이터 없음"이라고 적는다.
  6. **사람 확인 목록 요약**: `manual-todo.csv` 의 `kind` 별 개수
- 출력
  - 화면: 요약 몇 줄
  - 파일: `private/data-draft/validation-report.md` (위 1~6을 표로)
  - 종료 코드: 오류(1·2·3의 오류)가 있으면 1, 경고만 있으면 0

### 6. 사용 안내 — `scripts/data/README.md`
다음 순서를 kyu0lee가 따라 할 수 있게 쓴다.
1. `targets.csv` 채우기
2. `npm run data:fetch`
3. `npm run data:validate`
4. `validation-report.md` 와 `manual-todo.csv` 확인
5. 이미지·PDF 부분은 원본을 보고 손으로 채우기
6. 확인한 CSV를 `data/rules/` 로 직접 복사하기
7. `data/` 브랜치에서 PR 열기 (Code Owner 승인 필요)

### 7. 테스트 (네트워크 없이)
- `tests/data-pipeline/parse.test.ts` — `tests/fixtures/data-pipeline/*.fake.html` (직접 만든 가짜 HTML, 가짜 과목명)
  - 정상 표 → `courses` 행. `source`·`as_of` 가 채워진다.
  - `rowspan` 으로 학년이 병합된 표를 펼쳐 읽는다.
  - 대응표에 없는 이수구분 → 행에서 빠지고 `unknown_category` 로 기록된다.
  - `credits` 가 `3학점` → `bad_row`
  - 본문에 이미지·PDF 링크·iframe이 있는 페이지 → 각각 `image`·`pdf`·`iframe` 으로 기록된다.
  - 표가 없는 페이지 → `no_table`
- `tests/data-pipeline/fetch.test.ts` (가짜 `fetch`·`wait`)
  - URL 2개를 받으면 그 사이에 `wait(3000 이상)` 이 호출된다.
  - 저장본이 있으면 `fetch` 가 호출되지 않는다. `--refresh` 면 호출된다.
  - 허용 도메인 밖 URL과 `robots.txt` 에 막힌 URL은 `fetch` 없이 목록에 기록된다.
  - 실패 → 한 번 재시도 → 또 실패면 `fetch_failed` 로 기록되고 다음 URL로 넘어간다.
  - 요청 간격을 3초 미만으로 설정하면 오류가 난다.
- `tests/data-pipeline/validate.test.ts` (임시 폴더에 가짜 CSV를 써서 검사)
  - 같은 트랙 안 중복 `course_code` → 오류, 종료 코드 1
  - 트랙 간 같은 코드·다른 학점 → 경고, 종료 코드 0
  - `source` 빈 행의 줄 번호가 보고된다.
  - 학점 합계가 맞게 계산된다. (0학점 과목 포함)
  - 이전 데이터 대비 추가 1·삭제 1·변경 1(학점 3 → 2)이 정확히 나온다.
  - 비교 대상 폴더가 비어 있으면 "이전 데이터 없음"

## 건드릴 파일
- `package.json`, `package-lock.json`: devDependencies 2개, 스크립트 2개 추가만
- `scripts/data/targets.csv`: 열 이름과 주석만
- `scripts/data/fetch.ts`, `scripts/data/parse.ts`, `scripts/data/category-map.ts`, `scripts/data/validate.ts`
- `scripts/data/README.md`
- `tests/data-pipeline/*.test.ts`, `tests/fixtures/data-pipeline/*`

## 건드리면 안 되는 파일
- `data/rules/**`: 스크립트도 사람도 이 작업에서는 쓰지 않는다
- `lib/**`: T-002 코드는 import만 한다
- `app/**`, `components/**`
- `.gitignore`, `tsconfig.json`, `next.config.*`, `vitest.config.ts`, `eslint.config.*`, 기존 package.json 스크립트
- `AGENTS.md`, `CLAUDE.md`, `docs/**`, `.github/**`

## 필요한 데이터
- **데이터 필요 (kyu0lee)**: `targets.csv` 의 5개 트랙과 각 트랙의 교육과정·졸업요건 페이지 URL. 트랙 이름·`track_id`·`day_night`·`status` 도 kyu0lee가 확인해 채운다.
- **데이터 필요 (kyu0lee)**: 체크포인트에서 표 열 대응과 이수구분 대응표 확인
- 이번 범위가 아닌 것은 손으로 채운다: `micro_degrees.csv`, `competencies.csv`, `requirements.csv` 의 최종 행

## 완료 조건
- [ ] (기능) 가짜 대상 목록으로 `npm run data:fetch -- --offline` → `npm run data:validate` 를 실행하면 `private/data-draft/` 에 4번의 파일들이 생긴다.
- [ ] (기능) 같은 명령을 두 번 실행하면 두 번째에는 네트워크 요청이 0번이다. (저장본 재사용을 로그로 확인)
- [ ] (실제 데이터, kyu0lee 확인) 실제 트랙 1개로 실행해서, `courses.csv` 초안과 학교 페이지를 사람이 비교했을 때 빠지거나 바뀐 과목이 없거나 전부 `manual-todo.csv` 에 있다.
- [ ] (테스트) 7번의 parse·fetch·validate 케이스가 모두 있고 통과한다. 테스트는 실제 학교 사이트에 접속하지 않는다.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] `data/rules/` 와 `lib/` 변경 없음 (`git diff main --stat -- data/ lib/` 가 비어 있음)
- [ ] `private/` 아래 파일이 커밋에 없음
- [ ] AGENTS.md 4장 절대 규칙 위반 없음

## 하지 말 것
- 트랙 이름·URL·과목·학점·이수구분 대응을 추측해서 채우기 (모르면 `manual-todo.csv` 또는 질문)
- 요청 간격 줄이기, 동시 요청, `hansung.ac.kr` 밖 사이트 접속
- 스크립트가 `data/rules/` 에 쓰기
- 받은 학교 페이지·초안 CSV 커밋하기 (`private/` 는 커밋 금지)
- 이미지 글자 인식(OCR)이나 PDF 파싱 라이브러리 추가 (이번 범위 아님, 사람이 채움)
- 위에 적힌 것 외의 패키지 추가

## 보고 형식 (Codex가 끝나고 남길 것)
- 바꾼 파일 목록
- 체크포인트에서 보고한 표 구조와 kyu0lee가 확인한 열 대응
- 완료 조건 체크 결과 (테스트 개수, 네 명령의 마지막 출력 줄)
- `validation-report.md` 요약 (실제 트랙 1개 기준)
- 막힌 점·사람이 결정해야 할 점
