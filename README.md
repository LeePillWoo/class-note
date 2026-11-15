# 마녀의 출석부 (class-note)

**마녀의 우쿨렐레 & 칼림바** 학원 선생님이 학생들의 출결, 수강료 납부, 보강 일정을 관리하는 앱입니다.
학원노트(`10_Apps/academy-note`)를 선생님 입장으로 뒤집은 앱으로, 뼈대와 부품을 이어받았습니다.

- 안드로이드 앱(APK): https://github.com/LeePillWoo/class-note/releases/latest/download/class-note.apk
- 웹으로 열어 보기: https://leepillwoo.github.io/class-note/ (휴대폰, 태블릿, PC)
- 저장소: https://github.com/LeePillWoo/class-note (공개)
- 계획서: [docs/plan.md](docs/plan.md)
- 개발 중 정한 것들: [docs/decisions.md](docs/decisions.md) — "확인 부탁" 표시가 있는 항목을 봐 주세요.

기록은 그 기기(앱 또는 브라우저)에만 저장하고 서버로 보내지 않습니다. 기기마다, 그리고 앱과 웹 주소끼리도 기록이 따로이며, 백업 파일로 옮깁니다.

## 현재 상태

**v1.0.0** (2026-11-15) · 1차 마무리 (디버그 APK)

| 조각 | 내용 | 상태 |
|---|---|---|
| 1차 | 학생·반, 출결, 보강, 횟수 수강료, 백업, 로고 그림 디자인 | 완료 |
| 2차 | **수업 하나로**(1:1 레슨 / 그룹 수업), 1:1은 학생 정보와 함께 등록, 출생 연도·사진, 1회 금액, 선납·후납, **설정의 기본 규칙**, 체크 상자(출석→결석→지움), 학생 출결 달력, 홈의 주간 일정, 넓은 화면 배치, 디자인 다시 | 완료 |
| + | 설정 첫 화면을 메뉴로 정리 (수강료 납부, 수업·학생 추가, 출결·보강, 백업과 복원, 데이터 관리) | 완료 |
| + | 학생마다 수강료 규칙(횟수·금액·선납/후납), 오전부터 고르는 시각, 끝 시각 자동(1시간), 수강료 입력 줄 맞춤, 그룹 이름 옆 (대표 두 명 외 n명) | 완료 |
| 3차 | **학생 관리**(여럿을 골라 쉬기·그만두기·그룹에 넣기·지우기), **프로필 사진 자리 맞추기**(끌기, 확대·축소, 미리 보기), 창 뒤 화면 흐림, **보호자 안내 문구**(복사, 문자), 달마다 받은 돈 막대, 수업 기록, Codex와 만든 아이콘·빈 화면 그림 | 완료 |
| 1차 마무리 | 그룹 출석부 **달력·표 고르기**, 수업 일정을 넣을 때 **다른 수업과 겹치는지 확인**, **안드로이드 APK**(인터넷 없이 열림, 백업은 공유 창으로) | v1.0.0 |

정한 것들은 [docs/decisions.md](docs/decisions.md) 51~88에 있습니다. Codex의 디자인 검토서와 아이콘 원본은 [design/codex/](design/codex/)에 있습니다.

## 새 버전 APK 내기

1. `android/app/build.gradle`의 `versionCode`를 1 올리고 `versionName`과 `package.json`의 `version`을 새 버전으로 바꿉니다.
2. `npm run apk`로 빌드합니다.
3. 커밋·푸시한 뒤, 파일 이름을 **`class-note.apk`로 똑같이** 해서 릴리스를 만듭니다. 이름이 같아야 위의 "APK" 주소가 늘 새 파일을 가리킵니다.
   ```
   gh release create v1.0.1 apk/class-note.apk --target main --title "마녀의 출석부 v1.0.1" --notes "바뀐 점"
   ```
4. 업데이트 설치는 **같은 서명 키**로 만든 APK만 됩니다. 학원노트와 같은 디버그 키를 쓰고, 백업은 `90_Tools/signing-backup/debug.keystore`에 있습니다.

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
| `npm run apk` | 디버그 APK를 만듭니다. (웹 빌드 → Capacitor 동기화 → Gradle) 결과는 `apk/class-note.apk` 입니다. JDK·SDK·Gradle은 `90_Tools/`에 있습니다. |
| `python scripts/make-android-icons.py` | `public/icon-512.png`로 안드로이드 아이콘과 시작 화면을 다시 만듭니다. (정식 아이콘을 받으면) |
| `npm test` | 계산 테스트. 수업 날, 회차, 받을 날, 보강, 백업이 맞는지 확인합니다. |
| `npm run test:e2e` | 화면 테스트. PC의 Edge로 여덟 가지 화면 크기에서 자동으로 눌러 확인합니다. 화면 그림은 `shots/`에 남습니다. |
| `python scripts/make-brand-art.py` | 로고 그림(`design/logo-source.png`)에서 앱에 쓰는 그림과 임시 아이콘을 다시 만듭니다. |

`main` 브랜치에 올리면 GitHub Actions가 빌드해서 GitHub Pages에 배포합니다. (`.github/workflows/deploy-pages.yml`)

## 폴더 구조

```
class-note/
├─ docs/            계획서, 개발 중 정한 것들
├─ android/         안드로이드 앱 (Capacitor가 만든 Gradle 프로젝트, 아이콘·시작 화면)
├─ design/          학원 로고 원본 그림, Codex가 만든 아이콘·그림과 검토서(codex/)
├─ public/          앱 아이콘, 자른 그림(brand/), 홈 화면에 추가 설정
├─ scripts/         그림 자르기, 안드로이드 아이콘, APK 빌드
├─ src/
│  ├─ data/         저장소 계층과 계산 (화면은 이곳만 통해 저장)
│  │                schedule(수업 날, 명단) · lessons(그날의 수업) · attendanceChanges(출결과 보강 맞추기)
│  │                tuition(횟수, 선납·후납, 받을 날) · settings(기본 규칙) · makeupRules(보강) · backup · sample
│  │                students(상태 바꾸기, 여럿 한 번에) · messages(보호자 안내 문구)
│  ├─ components/   여러 화면에서 쓰는 부품 (수업 카드, 창, 달력, 출석부 표 …)
│  ├─ layout/       화면 뼈대 (메뉴, 두 칸 배치)
│  ├─ pages/        화면 (홈, 수업[lessons/], 보강, 납부, 설정)
│  └─ styles.css    색, 글꼴, 배치, 부품
├─ tests/e2e/       화면 테스트 (배치, 기능, 학생 관리·사진·안내 문구)
└─ package.json
```

## 다음 할 일

1. 폰에 APK를 설치해 써 보고 의견 받기 (사진 고르기·자리 맞추기, 백업 공유, 안내 문구 복사·문자, 그룹 출석부 달력)
2. decisions.md의 "확인 부탁" 항목 답 받기 (앱 아이콘 후보 포함)
3. 출석부 표 A4 인쇄, 미납·부분 납부 잔액
4. Codex 검토서에서 아직 안 한 것: 홈 그림과 글 자리(2), 보강 목록 줄 정리(6), 출결 달력 글자(10)
5. 큰 원본 그림과 정식 아이콘
6. APK는 요청하실 때
