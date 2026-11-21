# data/rules — 학교 규칙 원본

이 폴더의 CSV가 길잡이의 **유일한 진실**이다. 졸업요건 검사와 시뮬레이션은 전부 여기서 읽는다.
학사 개편이 생기면 코드를 고치지 않고 이 파일만 고친다. 엑셀이나 구글 시트로 열어서 고쳐도 된다.

- 관리: 기획 담당 (CODEOWNERS로 지정, 이 폴더 변경은 기획 담당 승인 필요)
- AI는 이 폴더를 수정하지 않는다.
- 모든 파일은 UTF-8, 첫 줄은 열 이름.
- 모든 행에 `source`(출처 URL)와 `as_of`(확인한 날짜, YYYY-MM-DD)를 채운다.

## 파일 목록 (초안, 첫 설계 때 확정)

| 파일 | 내용 | 주요 열 |
|---|---|---|
| `tracks.csv` | 트랙·학과 목록 | track_id, name, college, day_night, status(운영/모집중지), source, as_of |
| `courses.csv` | 트랙별 교육과정 | track_id, year, semester, category(전기/전필/전선), course_code, course_name, credits, source, as_of |
| `requirements.csv` | 졸업요건 | rule_id, applies_from(적용 시작 입학년도), applies_until(적용 끝 입학년도, 비우면 현재까지), applies_track(ALL 또는 track_id), type(총학점/전공/교양/비교과/비학점), value, note, source, as_of |
| `micro_degrees.csv` | 마이크로디그리 | md_id, name, type, needs_application(신청해야 인정되면 true, 자동 인정이면 false), course_name, credits, source, as_of |

> 2026-11-22 변경: `requirements.applies_to` 한 칸을 `applies_from`·`applies_until`·`applies_track` 3열로 나누고, `micro_degrees` 에 `needs_application` 열을 추가했다. 열별 허용값과 검사 규칙은 `docs/tasks/T-002-rules-schema.md`, 이유는 `docs/DECISIONS.md` 참고.
| `competencies.csv` | 트랙 전공역량·진로 | track_id, competency, career, certificate, source, as_of |

## 출처 예시
- 졸업 요건: https://www.hansung.ac.kr/hansung/6234/subview.do
- 전공 이수학점: https://www.hansung.ac.kr/hansung/6218/subview.do
- 빅데이터트랙 교육과정: https://www.hansung.ac.kr/Engineering/4896/subview.do
- 마이크로디그리: https://www.hansung.ac.kr/hansung/6215/subview.do
