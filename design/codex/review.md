# 마녀의 출석부 디자인 검토

2026-11-15 · 제공된 화면 PNG를 직접 보고, README와 decisions 51~71, styles.css, icons.tsx, navItems.tsx, SettingsLayout.tsx, Empty.tsx를 대조했어요. 아래는 **우선순위 순서**예요. CSS는 제안이며 앱에 적용하지 않았어요. 다른 작업자가 수정 중이므로 적용할 때 해당 선택자의 최신 선언과 비교해 주세요. 화면 파일은 저장소 루트 기준이고, 확대된 캡처의 픽셀 수를 CSS 크기로 오해하지 않았어요.

전체적으로 따뜻한 바탕과 절제된 카드가 좋아요. 가장 먼저 고칠 것은 작은 화면의 정보 충돌이에요. 밝은 화면·Pretendard·홈 제목과 앱 이름에만 주아를 쓰는 원칙은 유지해요. 아래 새 선택자는 명시한 마크업 변경과 함께 사용해요.

## 1. 납부 창의 횟수·금액 입력을 같은 줄에 맞춰요

**화면:** `shots/폰-세로/12-payment-sheet.png`

횟수의 ‘회분’이 입력 아래에 떨어지고 금액은 오른쪽에 ‘원’이 있어 줄이 다르게 보여요. `PaymentSheet.tsx`의 `.count-input`은 현재 styles.css에 정의가 없어요. 수업 등록의 `.fee-pair`와 달리 납부 창은 `.field-pair`를 사용하고 있어요.

**수정:** TuitionEditor와 RecordEditor의 두 필드가 있을 때 `className="field-pair payment-fee-pair"`를 사용해요. 금액만 있는 기록은 기존 한 칸을 유지해요. 단위 컨테이너는 `.input-with-unit`로 통일하고 AmountInput의 금액 도움말은 두 입력 아래 공통 줄로 옮겨요. 새 `.payment-fee-summary`에 “8회 16만 원 · 1회 2만 원”처럼 계산한 값을 보여줘요.

```css
.payment-fee-pair {
  grid-template-columns: minmax(5.5rem, 0.7fr) minmax(0, 1.3fr);
  align-items: start;
  gap: 0.75rem;
}
.input-with-unit { min-width: 0; }
.input-with-unit .input { min-width: 0; }
.payment-fee-summary {
  grid-column: 1 / -1;
  color: var(--text-2);
  font-size: 0.875rem;
  line-height: 1.5;
}
```

**확인:** 320px에서 999회와 큰 금액을 넣어도 단위가 내려가지 않고, 두 라벨과 입력 윗선이 맞아야 해요. 기존 계산·검증은 유지해요.

## 2. 휴대폰 홈에서 그림과 글의 자리를 나눠요

**화면:** `shots/폰-세로/01-home.png`, `shots/폰-세로/00-welcome.png`

안내 글이 마녀의 머리카락 위로 올라가요. 현재 `.hero-text` 62%와 절대 배치 `.hero-art` 최대 82%가 겹쳐요. 이미지의 흐려지는 마스크도 로고의 또렷한 선을 약하게 해요.

**수정:** 작은 홈 카드에서는 그림을 아래쪽 독립 행으로 배치해요. hero 자체의 컨테이너 질의로 자기 배치를 바꾸지 않고, 부모 `.home`의 질의를 사용해요.

```css
@container home (max-width: 33.99rem) {
  .hero { display: grid; grid-template-columns: minmax(0, 1fr); }
  .hero-text {
    width: 100%; min-height: 0;
    padding: 1.25rem 1.25rem 0.5rem;
    gap: 0.375rem;
  }
  .hero-title { font-size: 1.625rem; }
  .hero-sub { max-width: 28ch; line-height: 1.5; }
  .hero-art {
    position: static; justify-self: end;
    width: 11rem; max-width: 100%; height: 8rem;
    margin-right: 0.75rem; object-fit: contain;
    -webkit-mask-image: none; mask-image: none;
  }
}
```

**확인:** 첫 카드가 길어지는 만큼 오늘 수업 노출이 줄어요. 360px에서 그림 높이 8rem을 상한으로 두고 안내는 두 줄 이내의 짧은 문장으로 써요. 예: “오늘 수업을 마쳤어요. 출결을 확인해요.”

## 3. 주간 일정에서 수업명과 학생 이름을 구분해요

**화면:** `shots/폰-세로/01-home.png`, `shots/PC/03-lessons.png`

주간 일정은 시각·수업명·대표 학생·상태가 한 줄을 차지해 수업명이 일찍 잘려요. PC 수업 목록에서도 대표 이름이 제목과 붙어 제목의 위계가 약해요. 결정 71의 대표 두 명 표시는 유지하되 보조 줄로 내려요.

```css
.person-members { display: block; margin-top: 0.125rem; }
@container week (max-width: 45.99rem) {
  .week-item {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr) auto;
    column-gap: 0.5rem; row-gap: 0.125rem;
    align-items: start;
  }
  .week-name { white-space: normal; line-height: 1.4; }
  .week-members { display: block; font-size: 0.8125rem; }
  .week-state { padding-top: 0.125rem; }
}
```

**확인:** 긴 수업명에서 두세 줄은 허용하고, 시각·상태는 같은 위치에 남겨요. 이름을 별도 DOM으로 이동한다면 `.week-members`를 `.week-name` 안에 두어 위 그리드가 유지되게 해요.

## 4. 보조 글자와 입력 경계를 더 또렷하게 해요

**화면:** `shots/좁은-폰/06-solo-form-full.png`, `shots/PC/09-settings.png`

입력 예시 `#a39a90`은 흰 바탕에서 대비가 약하고, PC 설정의 작은 요약 글도 가늘게 보여요. 제목을 더 키우기보다 13px 보조 글을 14px로 올리고 짙게 해요. 본문 계층은 24px 화면 제목 / 17px 구역 제목 / 16px 항목 / 14px 보조 글로 유지해요.

```css
:root { --muted: #6c635b; }
.input::placeholder { color: #746a61; }
.input { border-color: #bdb5ac; }
.person-sub, .list-sub, .lesson-sub, .tuition-meta {
  font-size: 0.875rem; line-height: 1.5;
}
.page-title { font-size: 1.5rem; line-height: 1.3; }
.block-title, .card-title { font-size: 1.0625rem; }
```

**확인:** 도움말과 placeholder도 흰색·따뜻한 회색 바탕 각각에서 읽어 봐요. placeholder를 라벨 대신 쓰지는 않아요. 적용 후 색 대비를 다시 측정해요.

## 5. 설정 메뉴의 긴 요약은 생략하지 않아요

**화면:** `shots/폰-세로/09-settings.png`, `shots/PC/09-settings.png`

‘출결·보강’의 요약은 길지만 `.person-sub`가 한 줄 말줄임이에요. 휴대폰에서 보이던 기한 정보가 20rem PC 목록에서는 잘릴 수 있어요. 아이콘 상자와 행 간격은 이미 안정적이므로 큰 카드로 바꾸지 않고 요약에 두 줄 공간만 줘요.

```css
.menu-row { min-height: 4.5rem; padding: 0.75rem; gap: 0.75rem; }
.menu-row .person-sub {
  white-space: normal; overflow: visible;
  text-overflow: clip; line-height: 1.4;
}
.menu-icon { width: 2.25rem; height: 2.25rem; border-radius: 8px; }
.menu-row > svg { width: 1.125rem; height: 1.125rem; }
.app-info { align-items: flex-start; margin-top: 1.5rem; }
```

**확인:** 자동 저장이나 현재 값의 뜻을 담은 문장은 “결석은 세지 않아요”처럼 해요체로 정리해요. 메뉴명·단위 같은 짧은 명사는 그대로 써도 좋아요. 학생 관리와 안내 문구 아이콘 후보가 생겼다고 설정 경로를 임의 추가하지 않아요.

## 6. 보강 목록의 제목과 보조 정보를 분리해요

**화면:** `shots/폰-세로/07-makeups.png`

수업명과 ‘2명 한 번에’, 개인 이름과 수업명이 한 줄에서 비슷한 굵기로 이어져요. 상태 배지는 충분히 분리되어 있지만 무엇의 보강인지 빠르게 훑기 어려워요.

**수정:** 보강 페이지의 제목 안에 붙는 보조 문구에 새 `.list-context`를 붙이고, 페이지 최상위에 `.makeups-page`를 붙여요. 새 카드 대신 기존 목록과 구분선을 유지해요.

```css
.makeups-page .list-row { padding: 0.875rem 1rem; align-items: center; }
.makeups-page .list-title { line-height: 1.4; }
.makeups-page .list-context {
  display: block; margin-top: 0.125rem;
  color: var(--text-2); font-size: 0.875rem; font-weight: 400;
}
.makeups-page .list-sub { margin-top: 0.25rem; }
.makeups-page .badge { align-self: center; }
```

**확인:** 날짜·기한 두 줄을 무조건 늘리지 말고, 짧은 경우 ‘11월 3일 휴강분 · 기한 없음’ 한 줄로 묶어요. 320px에서는 자연스럽게 줄을 바꿔요.

## 7. 창에는 명확한 닫기 위치와 안정적인 하단을 만들어요

**화면:** `shots/PC/11-makeup-sheet.png`, `shots/폰-세로/12-payment-sheet.png`

PC 창은 제목과 필드가 같은 흐름으로 이어져 시작점이 약하고, 긴 휴대폰 창은 닫기와 저장을 맨 아래에서 찾아야 해요. 위쪽 모서리를 더 둥글게 만드는 것보다 제목 영역을 구분하는 편이 도움이 돼요.

**수정:** Sheet 컴포넌트에 제목 옆 `.sheet-close` 버튼을 추가하고 접근 가능한 이름은 “닫기”로 줘요. 기존 `.sheet-header`가 없는 내용도 있으므로 실제로 헤더가 있는 편집창부터 적용해요. `.sheet-actions`는 마지막 일반 동작 행으로 두고 삭제·‘보강 안 함’은 별도 링크 영역에 유지해요.

```css
.sheet-header {
  position: relative; padding: 0 2.75rem 0.875rem 0;
  border-bottom: 1px solid var(--line); gap: 0.375rem;
}
.sheet-close { position: absolute; top: -0.5rem; right: -0.5rem; }
.sheet-actions {
  position: sticky; bottom: 0; z-index: 1;
  padding-top: 0.75rem; padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface); border-top: 1px solid var(--line);
}
.sheet-body { gap: 1rem; }
```

**확인:** 시트 밖 닫기·Escape·포커스 복원은 기존 동작을 보존해요. 모바일 키보드가 열린 상태, 짧은 가로 화면, 오류 문구가 생긴 상태에서 필드가 고정 버튼에 가리지 않는지 확인해야 해요. 정지 화면만으로 키보드 동작을 확인한 것은 아니에요.

## 8. 빈 화면은 상황별 그림과 다음 행동을 보여줘요

**화면:** `shots/PC/03-lessons.png`, `shots/PC/09-settings.png`, `shots/폰-세로/00-welcome.png`

현재 Empty는 모두 64px 고양이 얼굴 원형이에요. ‘선택 전’과 ‘데이터 없음’이 같은 인상을 주고 PC 오른쪽 위에 작은 안내만 떠 있어요. `Empty.tsx`에 선택적인 `artSrc`와 `kind: 'empty' | 'selection'`을 추가해요. 이번 SVG 4장은 데이터가 없을 때만 사용하고, 선택 전은 기존 고양이를 작게 유지해요.

```css
.empty { gap: 0.75rem; padding: 2.5rem 1.25rem; }
.empty-art {
  width: 8rem; height: auto; aspect-ratio: 6 / 5;
  object-fit: contain; background: transparent;
  border-radius: 0; box-shadow: none;
}
.empty-title { font-size: 1.0625rem; line-height: 1.4; }
.empty .muted { max-width: 28ch; }
.empty[data-kind='selection'] { min-height: 18rem; align-content: center; }
.empty[data-kind='selection'] .empty-art { width: 4rem; aspect-ratio: 1; }
```

**마크업:** `data-kind={kind}`를 바깥 요소에 주고, 이미지의 기존 width/height 72를 SVG의 384/320으로 바꿔요. 장식 그림은 `alt=""`를 유지해요. “아직 등록한 수업이 없어요” 아래에 ‘1:1 레슨’·‘그룹 수업’ 단추를 연결해요. 받을 수강료가 없는 상태에는 불필요한 새 청구 단추를 넣지 않아요. 선택 전 화면에는 등록을 유도하지 않고 “왼쪽에서 수업을 골라요”라고 안내해요.

## 9. 메뉴와 동작 아이콘의 크기·여백을 통일해요

**화면:** `shots/폰-세로/09-settings.png`, `shots/폰-세로/04-solo-detail.png`, `shots/PC/03-lessons.png`

기존 아이콘의 선 규격은 좋지만 메뉴는 20px, 버튼은 18px이며 일부 복합 모양은 작은 크기에서 촘촘해요. 새 묶음은 장식을 기능 아이콘에 억지로 넣지 않고 악기·마녀 모자는 별도 아이콘으로 제공해요.

```css
.nav-icon svg, .menu-icon svg { width: 1.25rem; height: 1.25rem; }
.btn svg { width: 1.25rem; height: 1.25rem; flex-shrink: 0; }
.icon-btn svg { width: 1.25rem; height: 1.25rem; }
.icon-btn { min-width: 2.75rem; min-height: 2.75rem; }
```

**마크업:** `icons/*.svg`의 도형을 기존 `Icon`에 넣어 stroke 규격을 유지해요. `message`는 문자 보내기, `set-messages`는 안내 문구 관리로 구별해요. `leave`/`return`은 방향만으로 이해하기 어려우므로 반드시 ‘그만두기’/‘다시 다니기’ 글자를 함께 둬요. 아이콘만 있는 버튼은 aria-label을 제공해요. 메뉴 선택에만 리본 빨강을 쓰고 아이콘 자체에는 색을 박아 넣지 않아요.

## 10. 출결 달력의 날짜와 조작 설명을 더 읽기 쉽게 해요

**화면:** `shots/폰-세로/04-solo-detail.png`, `shots/좁은-폰/06-solo-form-full.png`

출결 달력 날짜는 12px이고 출석 체크는 선명해요. 작은 날짜와 큰 체크의 격차를 줄이고, 체크 상자가 세 상태를 순환한다는 설명을 달력 바로 위에서 읽게 해요. 폼의 고정 저장 줄은 전체 페이지 캡처 중간에 보이는데, 이것만으로 실제 가림 버그라고 단정하지는 않아요.

```css
.att-num { font-size: 0.8125rem; min-width: 1.5rem; height: 1.5rem; line-height: 1.5rem; }
.att-weekday { font-size: 0.8125rem; padding-block: 0.5rem; }
.att-day { min-height: 4.5rem; }
.form-page .input, .form-page .textarea, .att-entry {
  scroll-margin-bottom: calc(var(--tabbar-h) + 6rem);
  scroll-margin-top: calc(var(--sticky-top) + 1rem);
}
```

**마크업:** 달력 위에 “한 번 누르면 출석, 다시 누르면 결석, 한 번 더 누르면 지워요”를 14px 도움말로 보여줘요. 색뿐 아니라 체크·가위표·빈 상자를 유지해요. 320px에서는 7열을 유지하며 터치 영역이 서로 겹치지 않게 확인해요. 실기기에서 키보드·스크롤·고정 저장 줄 가림은 별도로 확인해야 해요.

## 적용과 검증 범위

- 우선 1~3을 적용한 뒤 글자·목록·창을 차례로 조정해요. 모든 CSS를 검증 없이 한꺼번에 붙이지 않아요.
- 원본 로고는 유지하고 새 그림은 보조로 사용해요. 앱 아이콘은 정식 교체 전 비교용 후보예요.
- 이 검토는 제공된 PNG와 소스에 근거해요. 빌드·E2E·실제 앱 조작 검증은 요청대로 실행하지 않았어요.
- 새 자료에는 실제 이름·연락처를 복사하지 않았어요. 화면 파일명만 근거로 남겼어요.
