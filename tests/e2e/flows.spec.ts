import { expect, test, type Page } from '@playwright/test'
import { acceptNextConfirm, expectNoHorizontalOverflow, loadSample, pickDayOffset, shot } from './helpers'

// 기능 테스트: 예시 데이터(지어낸 학생 8명, 반 4개)를 넣고 출결 → 보강 → 납부를 차례로 해 봅니다.
// 예시 데이터에는 언제 넣어도 오늘 수업('이서윤 1:1 레슨')이 하나 있습니다.

/** 수업 카드 (반 이름으로 찾음) */
function lessonCard(page: Page, className: string) {
  return page.locator('.lesson', { hasText: className })
}

test('출결: 오늘 수업에서 결석을 적으면 보강이 생기고, 다시 누르면 없어짐', async ({ page }, testInfo) => {
  await loadSample(page)
  const card = lessonCard(page, '이서윤 1:1 레슨').first()
  await expect(card.locator('.badge')).toHaveText('예정')
  await card.locator('.lesson-head').click()

  const buttons = card.getByRole('group', { name: '이서윤 출결' })
  await buttons.getByRole('button', { name: '결석' }).click()
  await expect(buttons.getByRole('button', { name: '결석' })).toHaveAttribute('aria-pressed', 'true')
  await expect(card.locator('.lesson-head .badge')).toHaveText('출결 끝')
  // 결석 사유를 적는 칸과 보강 단추가 생김
  await card.getByLabel('이서윤 결석 사유').fill('감기')
  await card.getByLabel('이서윤 결석 사유').blur()
  await expect(card.getByRole('button', { name: /보강 대기/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'flow-1-absent')

  // 누르는 즉시 저장되므로 새로 고쳐도 남아 있음
  await page.reload()
  const again = lessonCard(page, '이서윤 1:1 레슨').first()
  await again.locator('.lesson-head').click()
  await expect(again.getByRole('group', { name: '이서윤 출결' }).getByRole('button', { name: '결석' })).toHaveAttribute('aria-pressed', 'true')
  await expect(again.getByLabel('이서윤 결석 사유')).toHaveValue('감기')

  // 보강 화면에 이서윤의 보강이 대기로 올라옴
  await page.goto('/#/makeups')
  const waiting = page.getByRole('list', { name: '날짜를 잡아야 하는 보강' })
  await expect(waiting.getByRole('button', { name: /이서윤/ })).toContainText('대기')

  // 결석을 한 번 더 누르면 체크 전으로 돌아가고 보강도 없어짐
  await page.goto('/')
  const third = lessonCard(page, '이서윤 1:1 레슨').first()
  await third.locator('.lesson-head').click()
  await third.getByRole('group', { name: '이서윤 출결' }).getByRole('button', { name: '결석' }).click()
  await expect(third.locator('.lesson-head .badge')).toHaveText('예정')
  await expect(third.getByLabel('이서윤 결석 사유')).toHaveCount(0)
  await page.goto('/#/makeups')
  await expect(page.getByRole('heading', { name: '보강', level: 1 })).toBeVisible()
  await expect(waiting.getByRole('button', { name: /이서윤/ })).toHaveCount(0)
})

test('출결: 안 적은 지난 수업을 모두 출석으로 채우고, 출결 달력에서 휴강을 적음', async ({ page }) => {
  await loadSample(page)
  const heading = page.getByRole('heading', { name: /출결을 안 적은 수업/ })
  await expect(heading).toBeVisible()
  // 오늘이 초급반 수업 날이면 '오늘 수업'에도 같은 반이 있으므로, 이 묶음 안에서 찾습니다.
  const card = page.locator('.home-section', { has: heading }).locator('.lesson', { hasText: '우쿨렐레 초급반' })
  await expect(card.locator('.lesson-head .badge')).toHaveText('체크 전')
  await card.locator('.lesson-head').click()
  await card.getByRole('button', { name: '모두 출석' }).click()
  // 다 적었으니 '출결을 안 적은 수업'에서 사라짐
  await expect(heading).toHaveCount(0)

  // 출결 달력(일 보기)에서 오늘 수업을 휴강으로 → 학생에게 보강이 생김
  await page.goto('/#/attendance?view=day')
  const today = lessonCard(page, '이서윤 1:1 레슨')
  await today.locator('.lesson-head').click()
  acceptNextConfirm(page)
  await today.getByRole('button', { name: '휴강으로' }).click()
  await expect(today.locator('.lesson-head .badge')).toHaveText('휴강')
  await expect(today.getByText('학생 1명에게 보강이 생겼어요.')).toBeVisible()

  // 월 보기의 오늘 칸에도 휴강(줄 그은 칩)으로 보임
  // 보기 방식은 주소가 바뀐 뒤에 반영되므로 check() 대신 눌러서 바꿉니다.
  await page.getByRole('radiogroup', { name: '달력 보기 방식' }).getByRole('radio', { name: '월' }).click()
  await expect(page.locator('.is-calendar .day.is-today .cal-chip.is-cancelled')).toHaveCount(1)

  // 휴강을 취소하면 보강도 없어짐
  // 보기 방식을 바꿔도 펼쳐 둔 수업은 펼쳐진 채로 남습니다.
  const panel = lessonCard(page, '이서윤 1:1 레슨')
  await expect(panel).toHaveClass(/is-open/)
  await panel.getByRole('button', { name: '휴강 취소' }).click()
  await expect(panel.locator('.lesson-head .badge')).toHaveText('예정')
  await page.goto('/#/makeups')
  await expect(page.getByRole('heading', { name: '보강', level: 1 })).toBeVisible()
  await expect(page.getByRole('list', { name: '날짜를 잡아야 하는 보강' }).getByRole('button', { name: /이서윤/ })).toHaveCount(0)
})

test('보강: 한 명 보강을 끝내고, 휴강 보강은 여러 명을 한 번에 잡아 출석을 적음', async ({ page }, testInfo) => {
  await loadSample(page)
  await page.goto('/#/makeups')
  const waiting = page.getByRole('list', { name: '날짜를 잡아야 하는 보강' })
  const planned = page.getByRole('list', { name: '잡아 둔 보강' })
  const sheet = page.getByRole('dialog', { name: '보강', exact: true })
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'flow-2-makeups')

  // 박지호(결석 보강): 오늘 날짜로 잡고 바로 끝냄
  await waiting.getByRole('button', { name: /박지호/ }).click()
  await expect(sheet).toBeVisible()
  await pickDayOffset(page, '보강 날짜', 0)
  await sheet.getByLabel('메모 (선택)').fill('수업 끝나고 30분')
  await sheet.getByRole('button', { name: '보강했어요' }).click()
  await expect(sheet).toBeHidden()
  await expect(waiting.getByRole('button', { name: /박지호/ })).toHaveCount(0)
  await page.getByText(/끝난 보강 \d+개/).click()
  await expect(page.getByRole('list', { name: '끝난 보강' }).getByRole('button', { name: /박지호/ })).toContainText('완료')

  // 칼림바 휴강 보강: 두 명을 한 번에 오늘로 잡음 (아직 안 함)
  await waiting.getByRole('button', { name: /칼림바 취미반.*2명 한 번에/ }).click()
  await expect(sheet.getByRole('heading', { name: '칼림바 취미반 보강 2명' })).toBeVisible()
  await pickDayOffset(page, '보강 날짜', 0)
  await sheet.getByRole('button', { name: '날짜만 저장 (아직 안 함)' }).click()
  await expect(sheet).toBeHidden()
  await expect(planned.getByRole('button', { name: /정민서/ })).toContainText('예정')
  await expect(planned.getByRole('button', { name: /한서준/ })).toContainText('예정')

  // 홈의 오늘 수업에 '보강 수업'으로 올라오고, 온 학생만 출석을 누름
  await page.goto('/')
  const session = page.locator('.lesson', { hasText: '칼림바 취미반' }).filter({ has: page.locator('.badge.status-makeup') })
  await session.locator('.lesson-head').click()
  await session.getByRole('group', { name: '정민서 보강 출결' }).getByRole('button', { name: '출석' }).click()
  await expect(session.getByRole('group', { name: '정민서 보강 출결' }).getByRole('button', { name: '출석' })).toHaveAttribute('aria-pressed', 'true')

  // 정민서는 끝남, 한서준은 아직 예정
  await page.goto('/#/makeups')
  await expect(planned.getByRole('button', { name: /한서준/ })).toBeVisible()
  await expect(planned.getByRole('button', { name: /정민서/ })).toHaveCount(0)
})

test('납부: 밀린 수강료를 받으면 남은 횟수가 채워지고, 지우면 돌아옴. 교재비 청구', async ({ page }, testInfo) => {
  await loadSample(page)
  await page.goto('/#/payments')
  const dues = page.getByRole('list', { name: '받을 돈', exact: true })
  const paid = page.getByRole('list', { name: '받은 돈', exact: true })
  const remaining = page.getByRole('list', { name: '남은 횟수' })
  const sheet = page.getByRole('dialog', { name: '납부' })
  const row = remaining.getByRole('button', { name: /박지호/ })
  await expect(row).toContainText(/\d+회 밀림/)
  await expectNoHorizontalOverflow(page)

  // 박지호의 밀린 수강료 받기: 반의 수강료(8회 16만 원)가 미리 채워져 있음
  await dues.getByRole('button', { name: /박지호/ }).click()
  await expect(sheet.getByRole('heading', { name: '박지호 수강료' })).toBeVisible()
  await expect(sheet.getByLabel('횟수')).toHaveValue('8')
  await expect(sheet.getByLabel('금액')).toHaveValue('160,000')
  // 횟수를 바꾸면 금액도 같은 비율로
  await sheet.getByLabel('횟수').fill('16')
  await expect(sheet.getByLabel('금액')).toHaveValue('320,000')
  await sheet.getByLabel('횟수').fill('8')
  await shot(page, testInfo, 'flow-3-payment-sheet')
  await sheet.getByRole('button', { name: '받았어요' }).click()
  await expect(sheet).toBeHidden()
  await expect(row).toContainText(/\d+회 남음/)
  await expect(dues.getByRole('button', { name: /박지호.*수강료/ })).toHaveCount(0)
  await expect(paid.getByRole('button', { name: /박지호/ })).toContainText('16만 원')

  // 받은 기록을 지우면 다시 밀린 것으로
  await paid.getByRole('button', { name: /박지호/ }).click()
  acceptNextConfirm(page)
  await sheet.getByRole('button', { name: '받은 기록 지우기' }).click()
  await expect(sheet).toBeHidden()
  await expect(row).toContainText(/\d+회 밀림/)

  // 받을 날 전에 미리 받기: 남은 횟수 줄을 눌러서
  const ahead = remaining.getByRole('button', { name: /이서윤/ })
  const before = Number((await ahead.locator('.tuition-count').innerText()).match(/\d+/)![0])
  await ahead.click()
  await expect(sheet.getByText('미리 받는 수강료')).toBeVisible()
  await sheet.getByRole('button', { name: '받았어요' }).click()
  await expect(ahead.locator('.tuition-count')).toHaveText(`${before + 4}회 남음`)

  // 교재비 청구: 받을 돈에 올라오고, 받았다고 적으면 받은 돈으로
  await page.getByRole('button', { name: '추가 청구' }).click()
  await sheet.getByLabel('학생').selectOption({ label: '윤지아' })
  await sheet.getByLabel('이름 (선택)').fill('칼림바 악보집')
  await sheet.getByLabel('금액').fill('12000')
  await sheet.getByRole('button', { name: '청구하기' }).click()
  await expect(sheet).toBeHidden()
  const extra = dues.getByRole('button', { name: /윤지아/ })
  await expect(extra).toContainText('교재비 칼림바 악보집')
  await extra.click()
  await sheet.getByRole('button', { name: '받았어요' }).click()
  await expect(dues.getByRole('button', { name: /윤지아/ })).toHaveCount(0)
  await expect(paid.getByRole('button', { name: /윤지아.*칼림바 악보집/ })).toBeVisible()
})

test('반의 출석부 표: 칸을 누르면 출석, 결석, 지움 순서로 바뀜', async ({ page }, testInfo) => {
  await loadSample(page)
  await page.goto('/#/classes')
  await page.getByRole('list', { name: '반 목록' }).getByRole('link', { name: /이서윤 1:1 레슨/ }).click()
  const table = page.getByRole('region', { name: /출석부/ })
  // 오늘 칸: 예정(빈칸) → 출석 → 결석 → 지움
  const todayHeader = table.locator('thead th.is-today')
  await expect(todayHeader).toHaveCount(1)
  const index = await todayHeader.evaluate((cell) => Array.from(cell.parentElement!.children).indexOf(cell))
  const cell = table.locator('tbody tr').first().locator('th, td').nth(index).getByRole('button')
  await cell.scrollIntoViewIfNeeded()
  await expect(cell).toHaveAccessibleName(/이서윤 .* 예정/)
  await cell.click()
  await expect(cell).toHaveAccessibleName(/이서윤 .* 출석/)
  await expect(cell).toHaveText('○')
  await cell.click()
  await expect(cell).toHaveAccessibleName(/이서윤 .* 결석/)
  await expect(cell).toHaveText('×')
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'flow-4-roll-table')
  await cell.click()
  await expect(cell).toHaveAccessibleName(/이서윤 .* 예정/)
})
