# 작업지시서 T-025: AGENTS.md·CLAUDE.md 갱신 (Supabase·로그인, 폴더 구조, 개인정보, 리뷰 규칙)

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.
> 코드 변경이 없는 문서 작업이다. 서버 작업(T-026)보다 **먼저 merge** 한다.

## 담당
- 지시서 작성: Claude
- 구현: Claude (문서만 고치는 작업이라 지시서와 같은 PR에서 반영)
- 확인: 임솔 (작성), **kyu0lee (리뷰어 겸 Code Owner 승인)**
- 브랜치: `docs/T-025-agents-update`
- 선행 작업: 없음. 다음 작업 T-026(Supabase 기반)이 이 PR의 규칙을 따른다.

## 목표 (한두 문장)
AI와 사람이 작업 전에 읽는 `AGENTS.md` 가 2026-11-25 이후의 실제 설계(Supabase·구글 로그인, 새 폴더, 서버 저장과 사용 기록의 개인정보 규칙, 승인 수 0 + 리뷰 순환)와 맞게 한다. 규칙이 옛날 그대로면 AI가 "DB 없음"을 지키려다 T-026을 막거나, 반대로 개인정보 규칙 없이 서버에 저장한다.

## 배경
- 2026-11-25 결정: 서버·DB·로그인은 Supabase(Postgres + 로그인 + RLS), 구글 로그인. 로그인 없이 체험(이 기기 저장)은 유지. "AGENTS.md 2장·3장·4-3은 T-025에서 고친다" (`docs/DECISIONS.md`).
- 2026-11-22 결정: AGENTS.md 4-4의 "리뷰 1명 이상 승인 → merge"는 다음에 AGENTS.md를 고칠 때 같이 고친다. 실제 규칙은 승인 수 0 + Code Owner 경로 리뷰.
- 2026-11-26 결정: PR 리뷰 순환 (`docs/TEAM_GUIDE.md`).
- 저장 범위와 사용 기록 규칙의 원본은 `docs/SCREENS.md` 1-3·7장·8장(확정 20), 담당 폴더는 `docs/tasks/ROADMAP.md` 역할 표다. AGENTS.md에는 **AI가 지켜야 하는 규칙만 짧게** 옮기고, 자세한 표는 링크한다.
- 지금 AGENTS.md 1장의 기능 설명(지키다 = 트랙 변경·휴학·조기졸업 시뮬레이션)도 v1 그대로라, 2026-11-25 화면 v2(`docs/SCREENS.md` 1-1)에 맞게 고친다.

## 해야 할 일
1. **1장 프로젝트 요약**: 세 단계 기능 설명을 SCREENS v2 1-1 표에 맞춘다.
   - 찾다: 진로·공고에서 트랙 조합 찾기(AI), 다른 학생 로드맵 둘러보기
   - 짜다: 1~4학년 학기별 로드맵 만들기·고치기, 졸업요건 달성률(규칙 엔진, AI 없음)
   - 지키다: 이번 학기 현황, 상담 자료·포트폴리오 만들기(규칙 엔진, AI 없음)
   - 중심 화면은 S21 로드맵 편집이라는 한 줄. 일정 줄은 그대로.
2. **2장 기술 스택** 표
   - `학생 데이터 저장` 행을 고친다: 로그인 안 함 = 브라우저 localStorage, 로그인 = Supabase. 로그인 없이도 로드맵 수립은 끝까지 된다.
   - 새 행 `서버·DB·로그인`: Supabase (Postgres + Auth + RLS), 구글 로그인. 패키지 `@supabase/supabase-js`·`@supabase/ssr` 는 T-026에서 추가(그 PR에서 승인).
   - "바꾸지 말 것" 원칙과 "새 라이브러리는 PR 설명에 이유" 문장은 그대로.
3. **3장 폴더 구조**에 아래를 추가한다 (ROADMAP 담당 폴더 표 기준). 각 줄에 한 줄 설명.
   - `/supabase/migrations` 테이블·RLS 마이그레이션
   - `/lib/db` 서버·브라우저 Supabase 연결, 서버 저장소 구현
   - `/lib/roadmap` 로드맵 데이터 형식·저장소 인터페이스·이 기기 저장소
   - `/lib/analytics` 사용 기록
   - `/lib/export` 상담 자료·포트폴리오·CSV 추출
   - `/app/admin` 관리자 대시보드, `/app/roadmaps` 공개 로드맵, `/app/tracks` 트랙 상세, `/app/me` 기본 정보·계정, `/app/todo` 할 일 전체
   - `/components/roadmap` 로드맵 편집 컴포넌트
   - 폴더별 담당은 `docs/tasks/ROADMAP.md` 를 본다는 한 줄
4. **4-3 개인정보**를 아래 내용으로 다시 쓴다 (SCREENS 1-3·7·8장 요약)
   - 로그인 안 한 학생의 데이터는 이 기기 localStorage에만 둔다.
   - 로그인한 학생은 SCREENS 7장 표의 항목만 Supabase에 저장한다. 학번·이름·연락처·공고 원문은 어디에도 저장하지 않는다.
   - **이메일은 Supabase 로그인 정보에만** 둔다. 앱 테이블에 복사하지 않고 화면·공개 로드맵·관리자 화면·사용 기록·AI에 보내지 않는다.
   - 모든 테이블에 RLS를 건다. 학생은 자기 행만 읽고 쓴다. 공개 로드맵은 공개 항목(학기·종류·이름, 트랙·희망 진로)만 남에게 보이고, 졸업 후 5년 계획은 항상 비공개다. 관리자도 비공개 로드맵 원본은 보지 않는다.
   - Supabase 서비스 키(service role)는 서버 코드에서만 쓴다. 브라우저 코드·`NEXT_PUBLIC_` 환경변수에 넣지 않는다.
   - **사용 기록**: 기본은 동의 안 함 → 익명 집계(화면 이름, 시간 단위 시각)만. 동의한 학생만 가명 ID로 화면 이름·들어온/나간 시각·직전 화면을 모은다. 가명 ID는 계정 ID·이메일과 다른 무작위 값이고 둘을 잇는 표를 두지 않는다. 실명·학번·이메일·입력 내용·로드맵 항목·5년 계획 글은 기록에 넣지 않는다. 동의하지 않아도 모든 기능을 쓸 수 있고, 철회하면 바로 멈추고 내 기록을 지울 수 있다.
   - 기존 문장 "실제 개인 성적표, 학번, 다른 사람의 정보를 레포에 커밋하지 않는다. 테스트에는 가짜 데이터만 쓴다"는 그대로 둔다. 사용성 테스트 기록에는 실명·학번 대신 참가자 번호를 쓴다는 한 줄을 더한다.
5. **4-4 Git**
   - "반드시 브랜치 → PR → 리뷰 1명 이상 승인 → merge" 를 바꾼다: 브랜치 → PR → CI `check` 통과 → merge. main 보호 규칙의 필요 승인 수는 0이지만, `docs/TEAM_GUIDE.md` '리뷰 순환'대로 사람 한 명이 리뷰한다.
   - Code Owner 경로(`data/rules/`, `AGENTS.md`, `CLAUDE.md`, `.github/`, 6번을 넣으면 `supabase/`)는 Code Owner 승인이 있어야 merge된다.
   - 남의 담당 폴더를 고친 PR은 그 담당도 리뷰어로 넣는다.
   - force push·reset 금지, 비밀값 커밋 금지, 한 PR 한 가지 일은 그대로.
6. **`.github/CODEOWNERS` 에 `/supabase/ @sol0404 @kyu0lee` 추가** (ROADMAP: "추가 검토")
   - 이유: 마이그레이션의 RLS가 학생 데이터 보호의 핵심이라, 규칙 데이터처럼 Code Owner가 보게 한다.
   - 리뷰에서 빼기로 하면 이 줄과 4-4의 `supabase/` 언급을 함께 지운다.
7. **CLAUDE.md** 2번 '코드 리뷰' 2항에 Supabase 점검을 더한다: 새 테이블의 RLS, 서비스 키가 브라우저로 가지 않는지, 이메일·가명 ID를 앱 데이터·사용 기록과 잇지 않는지.
8. `docs/DECISIONS.md` 에 한 줄: AGENTS.md·CLAUDE.md를 T-025로 갱신, 2026-11-22 '4-4 문구는 다음에 고친다'를 이 PR에서 처리. `docs/tasks/ROADMAP.md` 의 T-025 상태를 `작성됨` 으로.

## 건드릴 파일
- `AGENTS.md`: 1장, 2장, 3장, 4-3, 4-4만
- `CLAUDE.md`: '2. 코드 리뷰' 2항 한 곳
- `.github/CODEOWNERS`: `/supabase/` 한 줄
- `docs/DECISIONS.md`: 한 줄 추가
- `docs/tasks/ROADMAP.md`: T-025 상태
- `docs/tasks/T-025-agents-update.md`: 이 지시서

## 건드리면 안 되는 파일
- `AGENTS.md` 의 4-1·4-2·4-5·5~8장, 맨 아래 `nextjs-agent-rules` 블록 (`next dev` 가 다시 쓰는 부분)
- `.github/workflows/**`, `.github/pull_request_template.md`
- `data/**`, 코드 전체, `package.json`, 설정 파일
- `docs/SCREENS.md`, `docs/TEAM_GUIDE.md` (원본 문서. AGENTS.md는 이 문서를 링크만 한다)

## 필요한 데이터
- 없음. 정해지지 않은 것(사용 기록 보관 기간, 동의 문구)은 AGENTS.md에 값을 쓰지 않고 "T-033에서 정함"으로 둔다.

## 완료 조건
- [ ] (문서) AGENTS.md를 처음 읽는 AI가 "로그인 없이 이 기기 저장 / 로그인하면 Supabase", 서버에 둘 수 있는 것과 없는 것, 이메일·가명 ID 규칙, 사용 기록 동의 규칙, merge 조건을 다른 문서 없이 알 수 있다.
- [ ] (문서) AGENTS.md 3장 폴더 목록이 ROADMAP 담당 폴더 표의 폴더를 모두 포함한다.
- [ ] (문서) SCREENS 7·8장, DECISIONS와 어긋나는 문장이 없다. "DB·로그인 없음" 문장이 남아 있지 않다.
- [ ] `git diff main --stat` 이 '건드릴 파일'만 보여 준다.
- [ ] CI `check` 통과 (코드 변경이 없으므로 그대로 통과해야 함)
- [ ] Code Owner(kyu0lee) 승인

## 하지 말 것
- 정해지지 않은 값(보관 기간, 동의 문구, 테이블 이름) 지어내기
- 4-1·4-2·4-5 절대 규칙을 약하게 고치기
- SCREENS·TEAM_GUIDE 내용을 AGENTS.md에 통째로 복사하기 (요약 + 링크)

## 보고 형식
- 바꾼 파일 목록
- 완료 조건 체크 결과
- 막힌 점·사람이 결정해야 할 점 (특히 6번 CODEOWNERS)
