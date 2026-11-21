# 작업지시서 T-001: 프로젝트 뼈대 만들기

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.

## 담당
- 지시서 작성: Claude
- 구현: Codex
- 확인: (미정)
- 브랜치: `feat/T-001-project-setup`

## 목표 (한두 문장)
`npm run dev` 를 실행하면 찾다·짜다·지키다 세 버튼이 있는 홈 화면이 뜨고,
lint·typecheck·test·build 네 명령이 모두 통과하는 빈 프로젝트를 만든다. 이후 모든 작업의 출발점이다.

## 배경
지금 레포에는 규칙·가이드 문서만 있고 코드가 없다. AGENTS.md 2장 기술 스택과 3장 폴더 구조를 실제 프로젝트로 옮긴다.
기능(찾다/짜다/지키다)은 아직 만들지 않는다. 각 화면은 "준비 중" 자리만 잡는다.

## 해야 할 일
1. **Next.js 프로젝트 생성** (App Router, TypeScript, Tailwind CSS, ESLint, `src/` 폴더 사용 안 함, import alias `@/*`)
   - 레포 루트에 이미 파일이 있어서 `create-next-app` 이 바로 안 될 수 있다. 그러면 임시 폴더에 만든 뒤 루트로 복사한다.
   - **기존 파일은 덮어쓰지 않는다**: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`, `.github/**`, `docs/**`, `data/**`
   - `.gitignore` 는 기존 것을 유지한다. 생성기가 만든 `.gitignore` 에만 있는 줄(예: `next-env.d.ts`, `*.tsbuildinfo`)만 맨 아래에 추가한다.
   - `create-next-app` 이 `AGENTS.md`·`CLAUDE.md`·`README.md` 를 만들면 버린다. (기존 파일 유지)
   - 버전은 작업 시점의 최신 안정판을 쓰고, 설치된 Next.js·React·TypeScript·Tailwind 버전을 보고에 적는다.
   - 패키지 매니저는 npm만 쓴다. `package-lock.json` 을 커밋한다.
2. **추가 패키지** (이 둘만): `zod`(dependencies), `vitest`(devDependencies)
3. **package.json 스크립트** — 정확히 아래 5개가 있어야 한다
   | 스크립트 | 명령 |
   |---|---|
   | `dev` | `next dev` |
   | `build` | `next build` |
   | `lint` | `eslint .` (생성기가 만든 ESLint 설정 사용) |
   | `typecheck` | `tsc --noEmit` |
   | `test` | `vitest run` |
4. **Vitest 설정**: `vitest.config.ts` 를 만든다
   - `test.environment: 'node'`, `test.include: ['tests/**/*.test.ts']`
   - `@/` alias를 `resolve.alias` 로 직접 설정한다. (alias용 플러그인 패키지는 추가하지 않는다)
5. **TypeScript strict**: `tsconfig.json` 에 `"strict": true` 가 켜져 있는지 확인한다.
6. **폴더 구조** (AGENTS.md 3장 그대로)
   ```
   app/(find)/find/page.tsx      → /find  : "찾다 — 준비 중" 한 줄
   app/(plan)/plan/page.tsx      → /plan  : "짜다 — 준비 중" 한 줄
   app/(guard)/guard/page.tsx    → /guard : "지키다 — 준비 중" 한 줄
   app/api/.gitkeep
   components/.gitkeep
   lib/rules/index.ts            // 졸업요건 규칙 엔진 자리. 순수 함수만, AI 호출 금지 (주석 한 줄 + export {})
   lib/ai/index.ts               // AI 호출 자리. 서버(app/api)에서만 import (주석 한 줄 + export {})
   lib/data/index.ts             // data/rules 로더 자리. T-002에서 채움 (주석 한 줄 + export {})
   tests/smoke.test.ts
   ```
7. **홈 화면** (`app/page.tsx`)
   - 제목 "길잡이", 부제 한 줄: "진로에서 졸업까지, 내 전공 설계를 한 곳에서"
   - 버튼 3개 (`next/link`)
     - **찾다** → `/find` — "희망 진로로 맞는 트랙 찾기"
     - **짜다** → `/plan` — "학기별 수강 계획 세우기"
     - **지키다** → `/guard` — "트랙 변경·휴학 등 계획 점검하기"
   - Tailwind만 사용한다. 모바일 폭(375px)에서 버튼이 세로로 쌓이고 가로 스크롤이 생기지 않는다.
   - `app/layout.tsx` 의 `<html lang="ko">`, `metadata.title` 은 "길잡이"
   - 생성기가 넣은 예시 이미지·문구(Next.js 로고, "Get started by editing" 등)는 지운다.
8. **스모크 테스트** (`tests/smoke.test.ts`)
   - `@/lib/data` 를 import해서 오류 없이 불러와지는지 확인한다. (Vitest와 `@/` alias가 제대로 연결됐다는 증거)

## 건드릴 파일
- 생성기가 만드는 설정 파일: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.*`, `eslint.config.*`, `postcss.config.*`, `next-env.d.ts`
  - 이 작업은 프로젝트 첫 생성이라 예외로 허용한다. 이후 작업에서는 다시 금지된다.
- `vitest.config.ts` — 새로 만든다
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/(find)/find/page.tsx`, `app/(plan)/plan/page.tsx`, `app/(guard)/guard/page.tsx`
- `app/api/.gitkeep`, `components/.gitkeep`
- `lib/rules/index.ts`, `lib/ai/index.ts`, `lib/data/index.ts`
- `tests/smoke.test.ts`
- `.gitignore` — 줄 추가만 (기존 줄 삭제·수정 금지)

## 건드리면 안 되는 파일
- `data/rules/**` (기획 담당 관리)
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `.env.example`
- `.github/**`, `docs/**` (이 지시서 포함)

## 필요한 데이터
- 없음. 학교 데이터는 이 작업에서 쓰지 않는다.

## 완료 조건
- [ ] (화면) `npm run dev` → http://localhost:3000 에 "길잡이" 제목과 찾다/짜다/지키다 버튼 3개가 보인다. 각 버튼을 누르면 해당 "준비 중" 페이지로 이동한다.
- [ ] (화면) 브라우저 폭 375px에서 가로 스크롤이 없다.
- [ ] (테스트) `npm test` 에서 `tests/smoke.test.ts` 1개가 통과한다.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] `package.json` 스크립트가 위 표의 5개와 정확히 같다.
- [ ] 의존성은 Next.js 생성기 기본값과 `zod`, `vitest` 뿐이다.
- [ ] 기존 문서 파일(`AGENTS.md`, `CLAUDE.md`, `README.md`, `.env.example`, `docs/**`, `.github/**`)이 바뀌지 않았다. (`git diff main --stat` 로 확인)
- [ ] AGENTS.md 4장 절대 규칙 위반 없음
- [ ] 홈 화면 스크린샷 PR 첨부

## 하지 말 것
- 찾다·짜다·지키다 기능 구현 (자리만 잡는다)
- 학교 규정·과목·학점·트랙 이름을 화면이나 코드에 넣기
- 위에 적힌 것 외의 패키지 추가 (UI 라이브러리, 상태관리, 테스트 도구 등)
- `src/` 폴더 사용, pnpm·yarn 사용
- 기존 문서 파일 덮어쓰기

## 보고 형식 (Codex가 끝나고 남길 것)
- 바꾼 파일 목록
- 설치된 Next.js·React·TypeScript·Tailwind·zod·Vitest 버전
- 완료 조건 체크 결과 (네 명령의 마지막 출력 줄 포함)
- 막힌 점·사람이 결정해야 할 점
