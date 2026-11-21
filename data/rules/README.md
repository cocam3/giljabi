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
| `requirements.csv` | 졸업요건 | rule_id, applies_to(학번·트랙), type(총학점/전공/교양/비교과/비학점), value, note, source, as_of |
| `micro_degrees.csv` | 마이크로디그리 | md_id, name, type, course_name, credits, source, as_of |
| `competencies.csv` | 트랙 전공역량·진로 | track_id, competency, career, certificate, source, as_of |

## 출처 예시
- 졸업 요건: https://www.hansung.ac.kr/hansung/6234/subview.do
- 전공 이수학점: https://www.hansung.ac.kr/hansung/6218/subview.do
- 빅데이터트랙 교육과정: https://www.hansung.ac.kr/Engineering/4896/subview.do
- 마이크로디그리: https://www.hansung.ac.kr/hansung/6215/subview.do
