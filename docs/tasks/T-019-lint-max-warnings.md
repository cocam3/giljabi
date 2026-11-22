# 작업지시서 T-019: lint 경고도 실패로 처리 (`--max-warnings 0`)

> Claude가 작성하고, Codex가 수행하고, 사람이 승인한다.
> 번호: 다음 빈 번호(T-019)를 쓴다. ROADMAP에서는 '0. 기반'에 둔다.

## 담당
- 지시서 작성: Claude
- 구현: Codex
- 확인: 임솔
- 브랜치: `chore/T-019-lint-max-warnings`
- 선행 작업: T-001 (merge 완료). T-018(CI)이 merge되면 CI에도 바로 적용된다. 그 전이어도 작업할 수 있다.

## 목표 (한두 문장)
`npm run lint` 가 ESLint **경고**가 하나라도 있으면 실패하게 한다. CI(`check`)도 `npm run lint` 를 쓰므로 경고가 있는 PR은 검사를 통과하지 못한다.

## 배경
- T-018 실패 확인 중에 발견했다(PR #9). 지금 ESLint 설정에서 "쓰지 않는 변수" 같은 규칙은 오류가 아니라 **경고**로 나온다.
- ESLint는 경고만 있으면 종료 코드 0(성공)으로 끝난다. 그래서 CI도 통과한다.
- 경고가 쌓이면 진짜 문제를 놓친다. AI가 만든 코드에 쓰지 않는 변수·import가 자주 남는다.
- 2026-11-22 기준 코드의 경고는 **0개**다. (`npx eslint . --max-warnings 0` 통과 확인) 그래서 이 변경만으로 기존 코드가 깨지지 않는다.

## 해야 할 일
1. `package.json` 의 `lint` 스크립트를 바꾼다.
   - 전: `"lint": "eslint ."`
   - 후: `"lint": "eslint . --max-warnings 0"`
2. 다른 스크립트, 의존성, ESLint 설정(`eslint.config.mjs`)은 바꾸지 않는다.
   - 규칙을 경고에서 오류로 올리는 대신 이 옵션을 쓰는 이유: 설정 파일을 건드리지 않고, 앞으로 추가되는 규칙의 경고도 모두 막을 수 있다.
3. `package-lock.json` 은 바뀌지 않아야 한다. (스크립트만 바뀜)
4. 확인
   - 지금 코드에서 `npm run lint` 가 통과한다. 경고가 0개다.
   - 임시로 아무 `.ts` 파일에 쓰지 않는 변수 한 줄을 넣고 `npm run lint` 를 돌리면 실패한다(종료 코드 1).
     - 출력에 `ESLint found too many warnings (maximum: 0)` 같은 문구가 나와야 한다.
     - 확인이 끝나면 그 줄은 지운다. 이 줄은 커밋하지 않는다.

## 건드릴 파일
- `package.json`: `lint` 스크립트 한 줄만 (이 작업에서는 package.json 스크립트 수정을 허용한다)

## 건드리면 안 되는 파일
- `package.json` 의 다른 스크립트·의존성, `package-lock.json`
- `eslint.config.mjs`, `tsconfig.json`, `next.config.*`, `vitest.config.mts`
- `.github/**` (CI는 `npm run lint` 를 그대로 부르므로 고칠 필요 없음)
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/**`, `data/**`, 기능 코드 전체

## 필요한 데이터
- 없음

## 완료 조건
- [ ] (기능) `npm run lint` 가 지금 코드에서 통과한다.
- [ ] (기능) 쓰지 않는 변수를 임시로 넣으면 `npm run lint` 가 종료 코드 1로 실패한다. 출력 두세 줄을 보고에 붙인다.
- [ ] `git diff main -- package.json` 이 `lint` 한 줄만 바뀌었고, `package-lock.json` 은 변경이 없다.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] (T-018이 merge된 뒤라면) 이 PR에서 `CI / check` 가 통과한다.
- [ ] AGENTS.md 4장 절대 규칙 위반 없음

## 하지 말 것
- 경고를 없애려고 규칙을 끄거나(`"off"`), `eslint-disable` 주석을 추가하기
- ESLint 설정 파일 수정, 패키지 추가
- 확인용 임시 코드 커밋하기

## 보고 형식 (Codex가 끝나고 남길 것)
- 바꾼 파일 목록
- 4번 확인 결과 (실패 출력 그대로)
- 네 명령의 마지막 출력 줄
- 막힌 점·사람이 결정해야 할 점
