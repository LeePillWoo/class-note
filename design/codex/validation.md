# 검증 결과

- SVG 34개 모두 Python ElementTree로 XML 파싱을 통과했어요.
- 메뉴 5개 + 설정 6개 + 동작 13개 + 학원 5개 = 아이콘 29개예요.
- 아이콘 29개 모두 viewBox 0 0 24 24 / fill none / stroke currentColor / stroke-width 1.8 / 둥근 끝·모서리를 확인했어요.
- 빈 화면 그림 4개는 384×320이며 배경 면 없이 투명해요. SVG 5개 모두 외부 비트맵 삽입 없이 직접 그린 경로이고 장당 150KB 이하예요.
- 앱 아이콘 SVG와 PNG 모두 1024×1024예요. PNG는 SVG를 브라우저 Canvas로 렌더한 파일이에요.
- preview.html을 Orca 브라우저로 열고 SVG를 Canvas로 렌더한 preview.png를 직접 확인했어요. 16·20·24px 아이콘에서 잘림과 누락이 없고, 모든 그림이 표시되는 것을 확인했어요.
- 생성형 이미지 도구를 호출하지 않았어요. 비용 여부를 확인할 수 없어 허용된 대안인 직접 그린 SVG로 만들었어요.
- 앱 소스·public·package.json·테스트는 수정하지 않았고 빌드·E2E·git 상태 변경 명령도 실행하지 않았어요. 앱에 CSS 제안을 적용한 뒤의 검증은 남아 있어요.

## 검토서 항목

- 1. 납부 창의 횟수·금액 입력을 같은 줄에 맞춰요
- 2. 휴대폰 홈에서 그림과 글의 자리를 나눠요
- 3. 주간 일정에서 수업명과 학생 이름을 구분해요
- 4. 보조 글자와 입력 경계를 더 또렷하게 해요
- 5. 설정 메뉴의 긴 요약은 생략하지 않아요
- 6. 보강 목록의 제목과 보조 정보를 분리해요
- 7. 창에는 명확한 닫기 위치와 안정적인 하단을 만들어요
- 8. 빈 화면은 상황별 그림과 다음 행동을 보여줘요
- 9. 메뉴와 동작 아이콘의 크기·여백을 통일해요
- 10. 출결 달력의 날짜와 조작 설명을 더 읽기 쉽게 해요

## 파일 목록과 크기

크기는 바이트예요. 이 문서 자체의 크기도 포함해요.

| 파일 | 크기 (bytes) |
|---|---:|
| icons/camera.svg | 265 |
| icons/cat.svg | 290 |
| icons/check-all.svg | 207 |
| icons/copy.svg | 243 |
| icons/group.svg | 275 |
| icons/kalimba.svg | 257 |
| icons/leave.svg | 213 |
| icons/message.svg | 241 |
| icons/music-note.svg | 289 |
| icons/nav-home.svg | 218 |
| icons/nav-lessons.svg | 287 |
| icons/nav-makeups.svg | 217 |
| icons/nav-payments.svg | 244 |
| icons/nav-settings.svg | 308 |
| icons/note.svg | 220 |
| icons/pause.svg | 265 |
| icons/return.svg | 214 |
| icons/set-attendance.svg | 263 |
| icons/set-backup.svg | 234 |
| icons/set-data.svg | 267 |
| icons/set-lesson-defaults.svg | 316 |
| icons/set-messages.svg | 256 |
| icons/set-students.svg | 300 |
| icons/solo.svg | 235 |
| icons/stats.svg | 214 |
| icons/ukulele.svg | 289 |
| icons/witch-hat.svg | 253 |
| icons/zoom-in.svg | 247 |
| icons/zoom-out.svg | 236 |
| images/app-icon.png | 65,324 |
| images/app-icon.svg | 892 |
| images/empty-lessons.svg | 1,719 |
| images/empty-makeups.svg | 1,595 |
| images/empty-payments.svg | 1,429 |
| images/empty-students.svg | 1,640 |
| make-assets.py | 14,502 |
| preview.html | 30,321 |
| preview.png | 155,314 |
| README.md | 6,523 |
| render-preview.js | 1,264 |
| review.md | 13,969 |
| validate.py | 3,279 |
| validation.md | 3,360 |
