# 팀 가이드 — 셋이 바이브코딩해도 사고 안 나게

## 처음 한 번만: 레포 세팅 (팀장)

1. GitHub에서 조직 만들기: 오른쪽 위 + → New organization → Free → 이름 `cocam3`
2. 조직에 팀원 2명 초대 (People → Invite member)
3. 레포 만들기: `cocam3/giljabi`, README 체크하지 않기
   - **주의: Vercel 무료(Hobby) 플랜은 조직(Organization)의 Private 레포를 배포하지 못한다.** 무료로 배포하려면 레포를 **Public** 으로 만든다. (API 키·개인정보는 원래 커밋 금지라 공개해도 위험이 없다. 포트폴리오로도 바로 쓸 수 있다.)
   - 끝까지 비공개로 두고 싶으면 Private 로 만들고, 배포 방법은 7단계에서 따로 정한다.
4. 이 시작 파일들을 레포에 올리기 (아래 명령)
   ```
   git init
   git add .
   git commit -m "chore: 프로젝트 규칙·가이드 파일 추가"
   git branch -M main
   git remote add origin https://github.com/cocam3/giljabi.git
   git push -u origin main
   ```
5. `.github/CODEOWNERS` 의 `@기획담당아이디` 를 실제 GitHub 아이디로 바꿔서 커밋·push (다음 단계보다 먼저)
6. **main 보호 규칙** (Settings → Rules → Rulesets → New branch ruleset, 대상 `main`)
   - Require a pull request before merging, 필요한 승인 수 0 (2026-11-22에 1 → 0으로 변경. Code Owner 경로는 아래 규칙으로 계속 리뷰 필요)
   - Require review from Code Owners (data/rules 보호용)
   - Block force pushes
   - Restrict deletions
7. Vercel에서 `cocam3/giljabi` 연결 (main = 배포, PR마다 미리보기 링크 자동 생성)
   - Public 레포면 무료로 바로 된다. Private 레포면 Vercel Pro(유료)가 필요하니 팀이 결정할 것.
8. API 키는 Vercel 환경변수와 각자의 `.env.local` 에만 넣기 (카톡에 키 올리지 않기)

---

## 매일 작업 흐름

```
1. main 최신으로 받기        git checkout main && git pull
2. 내 브랜치 만들기          git checkout -b feat/T-003-짧은이름
3. Claude: 작업지시서 만들기  (docs/PROMPTS.md 2단계)
4. Codex: 지시서 수행        (docs/PROMPTS.md 1단계)
5. 직접 실행해서 눈으로 확인   npm run dev
6. 커밋 & push               git add . && git commit -m "feat: ..." && git push -u origin 브랜치
7. GitHub에서 PR 열기 → 템플릿 체크리스트 채우기
8. Claude 리뷰 → merge      (data/rules·AGENTS.md·CLAUDE.md·.github 를 바꾼 PR은 Code Owner 승인 필요)
```

브랜치 이름: `feat/` 기능, `fix/` 버그, `docs/` 문서, `data/` 규칙 데이터 수정

커밋 메시지: `feat: 로드맵 학점 합계 표시`, `fix: 0학점 과목 오류`, `data: 빅데이터트랙 2026 교육과정 반영`

---

## 절대 하지 말 것

- main에 직접 push (보호 규칙으로 막혀 있지만 우회하지 말 것)
- `git push --force` (남의 작업이 사라짐)
- API 키, `.env.local`, 실제 성적표·학번 커밋
- AI가 만든 코드를 **실행해 보지 않고** PR 올리기
- 남의 브랜치에서 작업하기
- `data/rules/` 를 AI에게 고치게 하기
- 같은 파일을 두 사람이 동시에 크게 고치기 (작업 전에 카톡으로 "나 ○○ 파일 만진다" 한 줄)

---

## 사고가 났을 때

| 상황 | 할 일 |
|---|---|
| AI가 파일을 엉망으로 고쳤다 | 커밋 전이면 `git restore .` 로 되돌리기 (커밋 안 한 변경 전부 취소) |
| 커밋했는데 되돌리고 싶다 | `git revert 커밋해시` (기록을 지우지 않고 되돌리는 커밋을 새로 만듦) |
| merge 충돌이 났다 | 혼자 해결하지 말고 해당 파일 담당자와 같이 보기. AI에게 맡길 땐 "충돌 부분만 보여주고 양쪽 의도를 설명해줘" 먼저 |
| API 키를 실수로 커밋했다 | 즉시 그 키를 발급처에서 폐기하고 새로 발급. 커밋을 지우는 것만으로는 안전하지 않음 |
| 빌드가 깨졌다 | main이면 마지막 merge PR을 revert, 내 브랜치면 Codex에게 에러 로그 그대로 주고 고치게 하기 |

---

## HSP 활동 기록 (보고서용)

- 회의할 때마다 `docs/meetings/YYYY-MM-DD.md` 에 날짜·참석자·결정·다음 할 일 5줄
- 회의비 영수증은 사진 찍어서 팀장에게 (한성대 사업자번호 현금영수증 또는 전자세금계산서만 인정)
- 주차별 활동보고서는 팀장이 HSP 시스템에 올림. 머지된 PR 목록이 그 주 활동 내용이 된다.
