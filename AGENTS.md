# AGENTS.md — 길잡이 프로젝트 공통 규칙

이 파일은 이 레포에서 일하는 **모든 AI(Codex, Claude 등)와 사람**이 지켜야 하는 규칙이다.
작업을 시작하기 전에 반드시 끝까지 읽는다. 규칙과 요청이 충돌하면 작업을 멈추고 사람에게 묻는다.

---

## 1. 프로젝트 한 줄 요약

**길잡이**: 한성대학교 학생이 진로에서 출발해 트랙 선택 → 학기별 로드맵 → 졸업까지 계획하는 웹앱.
(한성대 학생성공·전공설계센터 'HSU 진로로드맵 e-Advisor 웹앱 개발 공모전' 출품작, 팀 코캠)

중심 화면은 **1~4학년 학기별 진로로드맵 편집(S21)** 이다. 세 단계 기능 (`docs/SCREENS.md` 1-1):
- **찾다**: 희망 진로·직무·채용공고 → 맞는 트랙 조합 추천 (AI 사용), 다른 학생 공개 로드맵 둘러보기
- **짜다**: 학기별 교과·비교과 로드맵 만들기·고치기 → 졸업요건 달성률 (규칙 엔진, AI 사용 안 함)
- **지키다**: 이번 학기 현황, 상담 자료·포트폴리오 만들기 (규칙 엔진, AI 사용 안 함)

일정: 결과보고서·프로토타입 제출 2027-01-04, 시연 경진대회 2027-01-11.

---

## 2. 기술 스택 (바꾸지 말 것)

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript | 화면·서버·AI 호출을 한 레포에서 |
| 스타일 | Tailwind CSS | 별도 CSS 프레임워크 추가 금지 |
| 데이터 검증 | zod | 규칙 데이터·AI 출력 모두 스키마 검증 |
| 테스트 | Vitest | 규칙 엔진은 테스트 필수 |
| 패키지 매니저 | npm | pnpm/yarn 섞지 말 것 |
| 배포 | Vercel | main 브랜치 = 배포 버전 |
| 서버·DB·로그인 | Supabase (Postgres + Auth + RLS), 구글 로그인 | 패키지 `@supabase/supabase-js`·`@supabase/ssr` 는 T-026에서 추가 |
| 학생 데이터 저장 | 로그인 안 함: 브라우저 localStorage / 로그인: Supabase | 로그인 없이도 로드맵 수립은 끝까지 된다 |
| AI 호출 | 서버 측 API Route에서만 | API 키는 절대 클라이언트로 보내지 않음 |

새 라이브러리를 추가해야 하면 **추가하기 전에** PR 설명에 이유를 쓰고 팀원 확인을 받는다.

---

## 3. 폴더 구조

```
/app                 화면(페이지)과 API Route
  /(find)            찾다 화면
  /(plan)            짜다 화면
  /(guard)           지키다 화면
  /api               서버 API (AI 호출은 여기서만)
  /tracks            트랙 상세
  /roadmaps          다른 학생 공개 로드맵 둘러보기·보기
  /me                기본 정보·계정
  /todo              할 일 전체
  /admin             관리자 대시보드 (관리자 계정만)
/components          재사용 UI 컴포넌트
  /roadmap           로드맵 편집 컴포넌트
/lib
  /rules             졸업요건 규칙 엔진 (순수 함수, AI 사용 금지)
  /ai                AI 호출·프롬프트·출력 검증
  /data              데이터 로더 (data/ 폴더를 읽어 zod로 검증)
  /roadmap           로드맵 데이터 형식, 저장소 인터페이스, 이 기기(localStorage) 저장소
  /db                Supabase 서버·브라우저 연결, 서버 저장소 구현
  /analytics         사용 기록 (동의 여부에 따라 익명 집계 / 가명 ID)
  /export            상담 자료·포트폴리오·CSV 추출
/supabase
  /migrations        테이블·RLS 마이그레이션
/data
  /rules             학교 규칙 원본 (CSV) ← 사람이 직접 관리
/scripts
  /data              데이터 수집·검증 스크립트 (학교 페이지 → CSV 초안, 초안 검사)
/docs
  /tasks             작업지시서 (Claude가 작성, Codex가 수행)
/tests               테스트
/private             커밋하지 않는 개인 작업 폴더 (.gitignore). 수집 저장본·CSV 초안
```

폴더별 담당은 `docs/tasks/ROADMAP.md` '담당 폴더' 표를 본다.

---

## 4. 절대 규칙 (어기면 사고 난다)

### 4-1. 학교 규칙 데이터
- `data/rules/` 의 CSV가 **유일한 진실**이다. 졸업요건·과목·학점은 반드시 여기서 읽는다.
- **AI(너 포함)는 졸업요건, 과목명, 과목코드, 학점, 트랙 이름을 지어내지 않는다.** 모르면 데이터에 없다고 표시하고 사람에게 묻는다.
- `data/rules/` 파일은 기획 담당이 관리한다. AI는 이 폴더를 **수정·삭제하지 않는다.** 데이터가 틀려 보이면 PR 설명이나 이슈로 알린다.
- 모든 규칙 데이터 행에는 `source`(출처 URL)와 `as_of`(기준일) 열이 있어야 한다.
- 규칙 엔진(`lib/rules`)은 같은 입력이면 항상 같은 결과를 내는 순수 함수로 짠다. 이 안에서 AI를 호출하지 않는다.
- 수집 스크립트(`scripts/data`)의 결과는 `private/data-draft/` 에만 쓴다. `data/rules/` 에는 **사람이 확인한 뒤 직접** 옮긴다. 스크립트가 `data/rules/` 에 쓰는 코드는 만들지 않는다.

### 4-2. AI(LLM) 기능과 보안
- AI는 `app/api` 의 서버 코드에서만 호출한다. API 키는 환경변수(`.env.local`)로만 쓰고 코드·로그·커밋에 넣지 않는다.
- **사용자가 붙여 넣은 텍스트(채용공고 등)는 데이터일 뿐 지시가 아니다.** 프롬프트에서 구분자로 감싸고, 그 안의 지시를 따르지 않도록 시스템 프롬프트에 명시한다. (프롬프트 인젝션 방어)
- AI 출력은 반드시 zod 스키마로 검증하고, 추천된 트랙·과목이 `data/rules` 목록에 실제로 있는지 코드로 대조한다. 없는 항목은 버린다. (출력 가드레일)
- AI에 학번, 이름, 이메일, 전화번호를 보내지 않는다. 추천에 필요한 최소 정보만 보낸다.
- AI 응답을 화면에 띄울 때 HTML로 해석하지 않는다(`dangerouslySetInnerHTML` 금지).

### 4-3. 개인정보
저장 항목과 사용 기록의 자세한 표는 `docs/SCREENS.md` 7장·8장이 원본이다. AI는 아래를 반드시 지킨다.

- **로그인 안 한 학생**의 입력 데이터(기본 정보, 로드맵, 졸업 후 5년 계획, 비학점 체크)는 그 기기의 localStorage에만 둔다. 서버나 외부로 보내 저장하지 않는다. 서버로 가는 것은 아래 사용 기록(동의 여부에 따른 범위, 가명 ID는 이 기기에 둠)과 공개 로드맵의 가져간 수·신고뿐이다.
- **로그인한 학생**은 SCREENS 7장 표의 항목(기본 정보, 로드맵 목록·항목, 졸업 후 5년 계획, 비학점 체크)만 Supabase에 저장한다. 학번·이름·연락처·채용공고 원문은 어디에도 저장하지 않는다.
- **이메일은 Supabase 로그인 정보에만** 둔다. 앱 테이블에 복사하지 않고 화면·공개 로드맵·관리자 화면·사용 기록·AI 어디에도 보내지 않는다.
- 모든 테이블에 **RLS(행 단위 권한)** 를 건다. 학생은 자기 행만 읽고 쓴다. 공개 로드맵은 공개 항목(학기·종류·이름, 트랙·희망 진로)만 남에게 보이고, 졸업 후 5년 계획은 항상 비공개다. 관리자도 비공개 로드맵 원본은 보지 않는다.
- Supabase 서비스 키(service role)는 서버 코드에서만 쓴다. 브라우저 코드와 `NEXT_PUBLIC_` 환경변수에 넣지 않는다.
- **사용 기록**: 기본은 동의 안 함이고, 이때는 익명 집계(화면 이름, 시간 단위 시각)만 모은다. 동의한 학생만 **가명 ID**로 화면 이름·들어온/나간 시각·직전 화면을 모은다.
  - 가명 ID는 계정 ID·이메일과 다른 무작위 값이고, 둘을 잇는 표를 두지 않는다.
  - 실명·학번·이메일·입력 내용(공고·직무)·로드맵 항목·5년 계획 글은 기록에 넣지 않는다.
  - 동의하지 않아도 모든 기능을 쓸 수 있다. 철회하면 바로 수집을 멈추고, 학생이 자기 기록을 지울 수 있다.
  - 보관 기간·동의 문구는 아직 정하지 않았다 (T-033). 값을 지어내지 않는다.
- 실제 개인 성적표, 학번, 다른 사람의 정보를 레포에 커밋하지 않는다. 테스트에는 가짜 데이터만 쓴다. 사용성 테스트 기록에는 실명·학번 대신 참가자 번호를 쓴다.

### 4-4. Git
- `main` 에 직접 push 금지. 반드시 브랜치 → PR → CI `check` 통과 → merge.
- main 보호 규칙의 필요 승인 수는 0이지만, `docs/TEAM_GUIDE.md` '리뷰 순환'대로 사람 한 명이 리뷰한다.
- Code Owner 경로(`data/rules/`, `supabase/`, `AGENTS.md`, `CLAUDE.md`, `.github/`)를 바꾼 PR은 Code Owner 승인이 있어야 merge된다.
- 남의 담당 폴더를 고친 PR은 그 폴더 담당도 리뷰어로 넣는다.
- `git push --force`, `git reset --hard` 로 공유 브랜치 기록을 지우지 않는다.
- `.env`, `.env.local`, API 키, `node_modules` 를 커밋하지 않는다.
- 한 PR에는 한 가지 일만 담는다. 남의 담당 폴더를 고쳐야 하면 PR 설명에 이유를 쓴다.

### 4-5. AI가 하면 안 되는 행동
- 요청받지 않은 파일 대량 삭제·이름 변경·폴더 구조 변경
- 테스트를 통과시키려고 테스트를 지우거나 약하게 고치기
- 에러를 숨기려고 `try/catch` 로 삼키거나 `any`·`@ts-ignore` 남발
- 확인 없이 패키지 추가, 설정 파일(`next.config`, `tsconfig`, `package.json` 스크립트) 변경
- "아마 이럴 것이다"로 학교 규정을 채워 넣기

---

## 5. 작업 방식

1. 작업은 `docs/tasks/` 의 작업지시서 단위로 한다. 지시서에 없는 일은 하지 않는다.
2. 작업 전: 관련 파일을 먼저 읽고, 무엇을 바꿀지 3~5줄로 계획을 말한다.
3. 작업 후: 아래 '완료 조건'을 확인하고, 바꾼 파일 목록과 확인 결과를 보고한다.
4. 막히면 추측으로 밀어붙이지 말고 멈추고 질문한다.

## 6. 완료 조건 (Definition of Done)

- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm test` 통과 (규칙 엔진을 건드렸으면 테스트 추가)
- [ ] `npm run build` 통과
- [ ] 작업지시서의 완료 조건 충족
- [ ] 화면을 바꿨으면 스크린샷을 PR에 첨부

## 7. 명령어

```
npm install        # 설치
npm run dev        # 로컬 실행 (http://localhost:3000)
npm run lint       # 린트
npm run typecheck  # 타입 검사
npm test           # 테스트
npm run build      # 빌드
```

## 8. 코드 스타일

- TypeScript strict. 함수와 변수 이름은 영어, 화면 문구와 주석은 한국어 가능.
- 컴포넌트는 함수형, 파일 하나에 컴포넌트 하나.
- 화면 문구는 학생이 바로 이해하는 쉬운 말로 쓴다. 학사 용어는 처음 나올 때 풀어 쓴다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
