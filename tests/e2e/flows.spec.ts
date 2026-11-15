import { expect, test, type Page } from '@playwright/test'
import { acceptNextConfirm, expectNoHorizontalOverflow, loadSample, pickDayOffset, shot } from './helpers'

// 기능 테스트: 예시 데이터(지어낸 학생 8명, 1:1 레슨 2개, 그룹 수업 3개)로 출결 → 보강 → 납부를 해 봅니다.
// 예시 데이터에는 언제 넣어도 오늘 수업('이서윤' 1:1 레슨)이 하나 있습니다.

function lessonCard(page: Page, name: string) {
  return page.locator('.lesson', { hasText: name })
}

test('출결: 체크 상자를 한 번 누르면 출석, 두 번 결석(보강이 생김), 세 번 처음으로', async ({ page }, testInfo) => {
  await loadSample(page)
  const card = lessonCard(page, '이서윤').first()
  await card.locator('.lesson-head').click()
  const check = card.getByRole('button', { name: /^이서윤 .*: / })
  await expect(check).toHaveAccessibleName(/예정$/)

  await check.click()
  await expect(check).toHaveAccessibleName(/출석$/)
  await expect(card.locator('.lesson-head .badge')).toHaveText('출결 끝')

  await check.click()
  await expect(check).toHaveAccessibleName(/결석$/)
  await card.getByLabel('이서윤 결석 사유').fill('감기')
  await card.getByLabel('이서윤 결석 사유').blur()
  await expect(card.getByRole('button', { name: /보강 대기/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'flow-1-absent')

  // 누르는 즉시 저장되므로 새로 고쳐도 남아 있음
  await page.reload()
  const again = lessonCard(page, '이서윤').first()
  await again.locator('.lesson-head').click()
  await expect(again.getByRole('button', { name: /^이서윤 .*: / })).toHaveAccessibleName(/결석$/)
  await expect(again.getByLabel('이서윤 결석 사유')).toHaveValue('감기')
  await page.goto('/#/makeups')
  await expect(page.getByRole('list', { name: '날짜를 잡아야 하는 보강' }).getByRole('button', { name: /이서윤/ })).toContainText('대기')

  // 세 번째: 처음으로 돌아가고 보강도 없어짐
  await page.goto('/')
  const third = lessonCard(page, '이서윤').first()
  await third.locator('.lesson-head').click()
  await third.getByRole('button', { name: /^이서윤 .*: / }).click()
  await expect(third.getByRole('button', { name: /^이서윤 .*: / })).toHaveAccessibleName(/예정$/)
  await page.goto('/#/makeups')
  await expect(page.getByRole('heading', { name: '보강', level: 1 })).toBeVisible()
  await expect(page.getByRole('list', { name: '날짜를 잡아야 하는 보강' }).getByRole('button', { name: /이서윤/ })).toHaveCount(0)
})

test('출결: 안 적은 수업을 모두 출석으로, 휴강과 취소, 학생 달력에서 바로 체크', async ({ page }) => {
  await loadSample(page)
  const heading = page.getByRole('heading', { name: /출결을 안 적은 수업/ })
  const card = page.locator('.block', { has: heading }).locator('.lesson', { hasText: '우쿨렐레 초급반' })
  await card.locator('.lesson-head').click()
  await card.getByRole('button', { name: '모두 출석' }).click()
  await expect(heading).toHaveCount(0)

  // 오늘 수업을 휴강으로 → 학생에게 보강이 생기고, 취소하면 없어짐
  const today = lessonCard(page, '이서윤').first()
  await today.locator('.lesson-head').click()
  acceptNextConfirm(page)
  await today.getByRole('button', { name: '휴강으로' }).click()
  await expect(today.locator('.lesson-head .badge')).toHaveText('휴강')
  await expect(today.getByText('학생 1명에게 보강이 생겼어요.')).toBeVisible()
  await today.getByRole('button', { name: '휴강 취소' }).click()
  await expect(today.locator('.lesson-head .badge')).toHaveText('예정')

  // 학생 화면의 출결 달력: 오늘 칸을 눌러 출석
  await page.goto('/#/lessons')
  await page.getByRole('list', { name: '1:1 레슨' }).getByRole('link', { name: /이서윤/ }).click()
  const calendar = page.getByRole('group', { name: /이서윤 \d+월 출결/ })
  const box = calendar.locator('.att-day.is-today .check')
  await box.click()
  await expect(box).toHaveAccessibleName(/출석$/)
  await expect(page.locator('.counts dd').first()).not.toHaveText('0')
})

test('보강: 한 명은 오늘 끝내고, 휴강 보강은 두 명을 한 번에 잡아 출석을 체크', async ({ page }) => {
  await loadSample(page)
  await page.goto('/#/makeups')
  const waiting = page.getByRole('list', { name: '날짜를 잡아야 하는 보강' })
  const planned = page.getByRole('list', { name: '잡아 둔 보강' })
  const sheet = page.getByRole('dialog', { name: '보강', exact: true })

  await waiting.getByRole('button', { name: /박지호/ }).click()
  await pickDayOffset(page, '보강 날짜', 0)
  await sheet.getByRole('button', { name: '보강했어요' }).click()
  await expect(sheet).toBeHidden()
  await expect(waiting.getByRole('button', { name: /박지호/ })).toHaveCount(0)

  await waiting.getByRole('button', { name: /칼림바 취미반.*2명 한 번에/ }).click()
  await expect(sheet.getByRole('heading', { name: '칼림바 취미반 보강 2명' })).toBeVisible()
  await pickDayOffset(page, '보강 날짜', 0)
  await sheet.getByRole('button', { name: '날짜만 저장 (아직 안 함)' }).click()
  await expect(planned.getByRole('button', { name: /정민서/ })).toContainText('예정')
  await expect(planned.getByRole('button', { name: /한서준/ })).toContainText('예정')

  // 홈의 오늘 수업에 보강으로 올라오고, 온 학생만 체크
  await page.goto('/')
  const session = page.locator('.lesson', { hasText: '칼림바 취미반' }).filter({ has: page.locator('.badge.status-makeup') })
  await session.locator('.lesson-head').click()
  await session.getByRole('button', { name: '정민서 보강: 예정' }).click()
  await expect(session.getByRole('button', { name: /정민서 보강: 출석/ })).toBeVisible()
  await page.goto('/#/makeups')
  await expect(planned.getByRole('button', { name: /한서준/ })).toBeVisible()
  await expect(planned.getByRole('button', { name: /정민서/ })).toHaveCount(0)
})

test('납부: 밀린 수강료 받기와 지우기, 후납 레슨, 교재비 청구', async ({ page }) => {
  await loadSample(page)
  await page.goto('/#/payments')
  const dues = page.getByRole('list', { name: '받을 돈', exact: true })
  const paid = page.getByRole('list', { name: '받은 돈', exact: true })
  const remaining = page.getByRole('list', { name: '남은 횟수' })
  const sheet = page.getByRole('dialog', { name: '납부' })
  const row = remaining.getByRole('button', { name: /박지호/ })
  await expect(row).toContainText(/\d+회 밀림/)

  // 받기: 수업의 수강료(8회 16만 원)가 미리 채워지고, 방법은 카드가 먼저
  await dues.getByRole('button', { name: /박지호/ }).click()
  await expect(sheet.getByLabel('횟수')).toHaveValue('8')
  await expect(sheet.getByLabel('금액')).toHaveValue('160,000')
  await expect(sheet.getByRole('radiogroup', { name: '납부 방법' }).getByRole('radio').first()).toHaveAccessibleName('카드')
  await sheet.getByRole('button', { name: '받았어요' }).click()
  await expect(row).toContainText(/\d+회 남음/)

  // 받은 기록을 지우면 다시 밀림
  await paid.getByRole('button', { name: /박지호/ }).first().click()
  acceptNextConfirm(page)
  await sheet.getByRole('button', { name: '받은 기록 지우기' }).click()
  await expect(row).toContainText(/\d+회 밀림/)

  // 후납 레슨(정민서 1:1)은 '몇 회 들음'으로 보임
  await expect(remaining.getByRole('button', { name: /정민서.*1:1 레슨/ })).toContainText(/회 들음|정산 끝|수업 전/)

  // 교재비 청구 → 받기
  await page.getByRole('button', { name: '추가 청구' }).click()
  await sheet.getByLabel('학생').selectOption({ label: '윤지아' })
  await sheet.getByLabel('이름 (선택)').fill('칼림바 악보집')
  await sheet.getByLabel('금액').fill('12000')
  await sheet.getByRole('button', { name: '청구하기' }).click()
  await dues.getByRole('button', { name: /윤지아/ }).click()
  await sheet.getByRole('button', { name: '받았어요' }).click()
  await expect(paid.getByRole('button', { name: /윤지아.*칼림바 악보집/ })).toBeVisible()
})

test('그룹 출석부 표: 칸을 누르면 출석, 결석, 처음 순서', async ({ page }) => {
  await loadSample(page)
  await page.goto('/#/lessons')
  await page.getByRole('list', { name: '그룹 수업' }).getByRole('link', { name: /우쿨렐레 초급반/ }).click()
  const table = page.getByRole('region', { name: /출석부/ })
  const cell = table.getByRole('button', { name: /^강도윤 .*: (체크 전|예정)$/ }).first()
  const name = (await cell.getAttribute('aria-label'))!.replace(/: .*$/, '')
  const target = table.locator(`button[aria-label^="${name}: "]`)
  await target.click()
  await expect(target).toHaveAccessibleName(/출석$/)
  await target.click()
  await expect(target).toHaveAccessibleName(/결석$/)
  await target.click()
  await expect(target).toHaveAccessibleName(/(체크 전|예정)$/)
})
