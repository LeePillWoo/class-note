# 마녀의 출석부 (class-note)

**마녀의 우쿨렐레 & 칼림바** 학원 선생님이 학생들의 출결, 수강료 납부, 보강 일정을 관리하는 앱입니다.
학원노트(`10_Apps/academy-note`)를 선생님 입장으로 뒤집은 앱으로, 뼈대와 부품을 이어받았습니다.

- 열어 보기: https://leepillwoo.github.io/class-note/ (휴대폰, 폴드, 태블릿, PC)
- 저장소: https://github.com/LeePillWoo/class-note (공개)
- 계획서: [docs/plan.md](docs/plan.md)
- 개발 중 정한 것들: [docs/decisions.md](docs/decisions.md) — "확인 부탁" 표시가 있는 항목을 봐 주세요.

기록은 여는 기기의 브라우저에만 저장하고 서버로 보내지 않습니다. 기기마다 기록이 따로이며, 백업 파일로 옮깁니다.

## 현재 상태

**v0.2.0** (2026-11-15) · 2차 개편

| 조각 | 내용 | 상태 |
|---|---|---|
| 1차 | 학생·반, 출결, 보강, 횟수 수강료, 백업, 로고 그림 디자인 | 완료 |
| 2차 | **수업 하나로**(1:1 레슨 / 그룹 수업), 1:1은 학생 정보와 함께 등록, 출생 연도·사진, 1회 금액, 선납·후납, **설정의 기본 규칙**, 체크 상자(출석→결석→지움), 학생 출결 달력, 홈의 주간 일정, 넓은 화면 배치, 디자인 다시 | 완료 |
| + | 설정 첫 화면을 메뉴로 정리 (수강료 납부, 수업·학생 추가, 출결·보강, 백업과 복원, 데이터 관리) | 완료 |

정한 것들은 [docs/decisions.md](docs/decisions.md) 51~66에 있습니다.

## 실행 방법

처음 한 번만 라이브러리를 설치합니다.

```
npm install
```

| 명령 | 용도 |
|---|---|
| `npm run dev` | PC에서 개발 서버를 켭니다. 브라우저에서 `http://localhost:5173` 을 엽니다. |
| `npm run dev:phone` | 폰에서도 접속할 수 있게 개발 서버를 켭니다. 같은 와이파이에서 화면에 나오는 `Network:` 주소를 엽니다. |
| `npm run build` | 배포용 파일을 `dist/` 폴더에 만듭니다. |
| `npm test` | 계산 테스트. 수업 날, 회차, 받을 날, 보강, 백업이 맞는지 확인합니다. |
| `npm run test:e2e` | 화면 테스트. PC의 Edge로 여덟 가지 화면 크기에서 자동으로 눌러 확인합니다. 화면 그림은 `shots/`에 남습니다. |
| `python scripts/make-brand-art.py` | 로고 그림(`design/logo-source.png`)에서 앱에 쓰는 그림과 임시 아이콘을 다시 만듭니다. |

`main` 브랜치에 올리면 GitHub Actions가 빌드해서 GitHub Pages에 배포합니다. (`.github/workflows/deploy-pages.yml`)

## 폴더 구조

```
class-note/
├─ docs/            계획서, 개발 중 정한 것들
├─ design/          학원 로고 원본 그림
├─ public/          앱 아이콘, 자른 그림(brand/), 홈 화면에 추가 설정
├─ scripts/         그림 자르기
├─ src/
│  ├─ data/         저장소 계층과 계산 (화면은 이곳만 통해 저장)
│  │                schedule(수업 날, 명단) · lessons(그날의 수업) · attendanceChanges(출결과 보강 맞추기)
│  │                tuition(횟수, 선납·후납, 받을 날) · settings(기본 규칙) · makeupRules(보강) · backup · sample
│  ├─ components/   여러 화면에서 쓰는 부품 (수업 카드, 창, 달력, 출석부 표 …)
│  ├─ layout/       화면 뼈대 (메뉴, 두 칸 배치)
│  ├─ pages/        화면 (홈, 수업[lessons/], 보강, 납부, 설정)
│  └─ styles.css    색, 글꼴, 배치, 부품
├─ tests/e2e/       화면 테스트 (배치, 기능, 접고 펴기)
└─ package.json
```

## 다음 할 일

1. 2차 개편을 폰·태블릿·PC에서 써 보고 의견 받기 (수업 등록, 체크 상자, 출결 달력, 설정의 기본 규칙)
2. decisions.md의 "확인 부탁" 항목 답 받기
3. 보호자 안내 문구(결석 · 보강 · 납부 안내 복사), 출석부 표 A4 인쇄
4. 큰 원본 그림과 정식 아이콘
5. APK는 요청하실 때
