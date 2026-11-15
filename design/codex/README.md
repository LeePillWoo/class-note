# 마녀의 출석부 디자인 후보

2026-11-15에 기존 화면과 로고를 보고 만들었어요. 앱 코드는 변경하지 않았어요.

## 만든 방법

모든 아이콘과 그림은 좌표와 경로를 직접 설계한 SVG예요. 내장 그림 생성 도구는 있지만 이 세션에서 **추가 비용이 없는지 확인할 수 없어** 요청에 허용된 SVG 대안을 사용했어요. 외부 서비스, API 키, 유료 호출은 사용하지 않았어요. 원본 로고의 검은 고양이·붉은 리본·나무색 악기를 참고했으며 원본을 대체하는 정식 로고가 아니라 보조 그림과 앱 아이콘 후보예요.

아이콘은 24×24 격자, currentColor, 선 1.8, 둥근 끝과 모서리를 사용해요. 16·20·24px 미리보기는 preview.html에서 확인해요. 빈 화면 SVG 4장은 384×320이며 배경 사각형이 없어 투명해요. 앱 아이콘 SVG는 1024×1024이고 따뜻한 회색 둥근 네모 바깥은 투명해요. 모든 그림은 150KB보다 작아요.

## 파일과 쓰임새

| 파일 | 쓰임새 | 만든 방법 |
|---|---|---|
| [icons/nav-home.svg](icons/nav-home.svg) | 홈 메뉴 | 직접 그린 SVG |
| [icons/nav-lessons.svg](icons/nav-lessons.svg) | 수업 메뉴 | 직접 그린 SVG |
| [icons/nav-makeups.svg](icons/nav-makeups.svg) | 보강 메뉴 | 직접 그린 SVG |
| [icons/nav-payments.svg](icons/nav-payments.svg) | 납부 메뉴 | 직접 그린 SVG |
| [icons/nav-settings.svg](icons/nav-settings.svg) | 설정 메뉴 | 직접 그린 SVG |
| [icons/set-lesson-defaults.svg](icons/set-lesson-defaults.svg) | 수업·수강료 기본값 | 직접 그린 SVG |
| [icons/set-students.svg](icons/set-students.svg) | 학생 관리 | 직접 그린 SVG |
| [icons/set-attendance.svg](icons/set-attendance.svg) | 출결·보강 설정 | 직접 그린 SVG |
| [icons/set-messages.svg](icons/set-messages.svg) | 안내 문구 설정 | 직접 그린 SVG |
| [icons/set-backup.svg](icons/set-backup.svg) | 백업과 복원 | 직접 그린 SVG |
| [icons/set-data.svg](icons/set-data.svg) | 데이터 관리 | 직접 그린 SVG |
| [icons/camera.svg](icons/camera.svg) | 사진 넣기 | 직접 그린 SVG |
| [icons/zoom-in.svg](icons/zoom-in.svg) | 크게 보기 | 직접 그린 SVG |
| [icons/zoom-out.svg](icons/zoom-out.svg) | 작게 보기 | 직접 그린 SVG |
| [icons/copy.svg](icons/copy.svg) | 복사 | 직접 그린 SVG |
| [icons/message.svg](icons/message.svg) | 문자 보내기 | 직접 그린 SVG |
| [icons/stats.svg](icons/stats.svg) | 통계 | 직접 그린 SVG |
| [icons/note.svg](icons/note.svg) | 메모 | 직접 그린 SVG |
| [icons/group.svg](icons/group.svg) | 그룹 수업 | 직접 그린 SVG |
| [icons/solo.svg](icons/solo.svg) | 1:1 레슨 | 직접 그린 SVG |
| [icons/pause.svg](icons/pause.svg) | 잠시 쉬기 | 직접 그린 SVG |
| [icons/leave.svg](icons/leave.svg) | 그만두기 | 직접 그린 SVG |
| [icons/return.svg](icons/return.svg) | 다시 다니기 | 직접 그린 SVG |
| [icons/check-all.svg](icons/check-all.svg) | 모두 출석 | 직접 그린 SVG |
| [icons/ukulele.svg](icons/ukulele.svg) | 우쿨렐레 | 직접 그린 SVG |
| [icons/kalimba.svg](icons/kalimba.svg) | 칼림바 | 직접 그린 SVG |
| [icons/witch-hat.svg](icons/witch-hat.svg) | 마녀 모자 | 직접 그린 SVG |
| [icons/cat.svg](icons/cat.svg) | 고양이 | 직접 그린 SVG |
| [icons/music-note.svg](icons/music-note.svg) | 음표 | 직접 그린 SVG |
| [images/empty-lessons.svg](images/empty-lessons.svg) | 수업이 없어요: 쉬고 있는 고양이와 우쿨렐레 | 직접 그린 SVG |
| [images/empty-makeups.svg](images/empty-makeups.svg) | 잡힌 보강이 없어요: 고양이와 비어 있는 달력 | 직접 그린 SVG |
| [images/empty-payments.svg](images/empty-payments.svg) | 받을 수강료가 없어요: 정리한 장부와 고양이 | 직접 그린 SVG |
| [images/empty-students.svg](images/empty-students.svg) | 학생이 없어요: 새 친구를 기다리는 고양이와 칼림바 | 직접 그린 SVG |
| [images/app-icon.svg](images/app-icon.svg) | 앱 아이콘 후보: 붉은 리본의 마녀 모자 | 직접 그린 SVG |
| [review.md](review.md) | 실제 화면에 근거한 우선순위 10개와 CSS 제안 | 직접 검토·작성 |
| [preview.html](preview.html) | 그림과 아이콘 16·20·24px 크기 비교 | 직접 작성한 정적 HTML |
| [make-assets.py](make-assets.py) | SVG·목록·미리보기 재생성 | Python 표준 라이브러리 |
| [preview.png](preview.png) | 그림·아이콘을 함께 보는 검토용 렌더 | 브라우저 Canvas로 SVG 렌더 |
| [images/app-icon.png](images/app-icon.png) | 1024×1024 앱 아이콘 후보 | 직접 그린 SVG를 PNG로 렌더 |
| [render-preview.js](render-preview.js) | 미리보기 렌더 코드 | 직접 작성한 JavaScript |
| [validate.py](validate.py) | XML·규격·크기와 파일 목록 검사 | Python 표준 라이브러리 |
| [validation.md](validation.md) | XML·규격 검사 결과와 전체 파일 크기 | 검사 결과 기록 |

## 적용할 때

- SVG 아이콘의 내부 도형을 기존 `Icon` 컴포넌트 안에 넣거나 inline SVG로 사용해요. `<img>`로 불러오면 바깥 CSS의 `currentColor`가 전달되지 않아요.
- 아이콘 옆에 글자가 있으면 `aria-hidden="true"`를 주고, 아이콘만 있는 단추에는 동작을 설명하는 `aria-label`을 붙여요.
- 빈 화면 그림은 112~144px 너비로, `object-fit: contain`과 `alt=""`를 사용해요. 옆 제목이 의미를 설명해요.
- 수업: “아직 등록한 수업이 없어요” / “1:1 레슨이나 그룹 수업을 등록해요.”
- 보강: “잡아 둔 보강이 없어요” / “날짜를 정한 보강이 여기에 보여요.” 대기 보강이 있으면 ‘날짜 잡기’로 연결해요.
- 납부: “지금 받을 수강료가 없어요” / “받을 날이 되면 여기에 알려 드려요.”
- 학생: “아직 등록한 학생이 없어요” / “수업을 만들면서 학생도 함께 등록해요.” 기존 수업 중심 흐름을 유지해요.
- `set-lesson-defaults`, `set-students`, `set-messages`는 요청한 새 메뉴 후보용이에요. 현재 설정 구조와 이름이 다르므로 파일을 만들었다고 새 경로를 자동 추가하지 않아요.
- 재생성: 저장소 루트에서 `python design/codex/make-assets.py`를 실행해요. review.md와 validation.md는 덮어쓰지 않아요.
