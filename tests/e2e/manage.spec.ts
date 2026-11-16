import { expect, test, type Page } from '@playwright/test'
import { acceptNextConfirm, addSolo, expectNoHorizontalOverflow, loadSample, shot } from './helpers'

// 기능 테스트: 학생 관리(여러 명 한 번에), 프로필 사진 자리 맞추기, 안내 문구 복사, 달마다 받은 돈, 수업 기록

/** 가로로 긴 그림 파일(600×300, 왼쪽 빨강·오른쪽 파랑)을 브라우저에서 만들어 돌려줍니다. */
async function wideImage(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 300
    const context = canvas.getContext('2d')!
    context.fillStyle = '#d0342c'
    context.fillRect(0, 0, 300, 300)
    context.fillStyle = '#2c5fd0'
    context.fillRect(300, 0, 300, 300)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(base64, 'base64')
}

/** 저장된 사진(data URL)의 한 점의 색 [r, g, b] */
async function pixelOf(page: Page, selector: string, x: number, y: number): Promise<number[]> {
  return page.evaluate(
    async ({ selector, x, y }) => {
      const img = document.querySelector<HTMLImageElement>(selector)!
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const context = canvas.getContext('2d')!
      context.drawImage(img, 0, 0)
      return [...context.getImageData(Math.round(x * img.naturalWidth), Math.round(y * img.naturalHeight), 1, 1).data].slice(0, 3)
    },
    { selector, x, y },
  )
}

test('학생 관리: 여러 명을 골라 쉬기 → 다시 다니기, 그룹에 넣기, 지우기', async ({ page }, testInfo) => {
  await loadSample(page)
  await page.goto('/#/settings')
  const menu = page.getByRole('list', { name: '학생' })
  await expect(menu.getByRole('link', { name: /학생 관리/ })).toContainText('다니는 중 8명')
  await menu.getByRole('link', { name: /학생 관리/ }).click()
  await expect(page.getByRole('heading', { name: '학생 관리', level: 1 })).toBeVisible()

  const list = page.getByRole('list', { name: '학생 목록' })
  await expect(list.getByRole('listitem')).toHaveCount(8)
  const bar = page.getByRole('group', { name: /고른 학생/ })
  await expect(bar).toHaveCount(0)

  // 두 명을 골라 쉬기
  await list.getByRole('checkbox', { name: '김하준 고르기' }).check()
  await list.getByRole('checkbox', { name: '박지호 고르기' }).check()
  await expect(bar).toContainText('2명')
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'manage-1-picked')
  await bar.getByRole('button', { name: '쉬기' }).click()
  const sheet = page.getByRole('dialog', { name: '학생 상태' })
  await expect(sheet.getByRole('heading')).toHaveText('2명 쉬기')
  await sheet.getByRole('button', { name: '쉬는 것으로 저장' }).click()
  await expect(page.getByRole('status')).toHaveText('2명을 쉬는 것으로 바꿨어요')
  await expect(list.getByRole('listitem').filter({ hasText: '김하준' })).toContainText('쉬는 중')
  // 고른 것이 풀림
  await expect(bar).toHaveCount(0)

  // 쉬는 중만 보기 → 모두 골라 다시 다니기
  await page.getByRole('radiogroup', { name: '학생 상태' }).getByRole('radio', { name: /쉬는 중/ }).check({ force: true })
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('checkbox', { name: '모두 고르기' }).check()
  // 쉬는 학생에게는 '쉬기'가 나오지 않음
  await expect(bar.getByRole('button', { name: '쉬기', exact: true })).toHaveCount(0)
  await bar.getByRole('button', { name: '다시 다니기' }).click()
  await sheet.getByRole('button', { name: '다시 다니는 것으로 저장' }).click()
  await expect(page.getByRole('status')).toHaveText('2명을 다시 다니는 것으로 바꿨어요')
  await expect(page.getByText('여기에 해당하는 학생이 없어요')).toBeVisible()

  // 그룹 수업에 넣기: 이미 듣는 학생은 건너뜀 (김하준은 초급반을 듣고, 이서윤은 듣지 않음)
  await page.getByRole('radiogroup', { name: '학생 상태' }).getByRole('radio', { name: /전체/ }).check({ force: true })
  await list.getByRole('checkbox', { name: '김하준 고르기' }).check()
  await list.getByRole('checkbox', { name: '이서윤 고르기' }).check()
  await bar.getByRole('button', { name: '그룹에 넣기' }).click()
  const enroll = page.getByRole('dialog', { name: '그룹 수업에 넣기' })
  // 첫 그룹 수업(우쿨렐레 초급반)이 먼저 골라져 있음
  await expect(enroll.getByLabel('그룹 수업').locator('option:checked')).toHaveText(/우쿨렐레 초급반/)
  await expect(enroll).toContainText('이미 듣는 1명은 그대로 두고 1명만 넣어요')
  await enroll.getByRole('button', { name: '1명 넣기' }).click()
  await expect(page.getByRole('status')).toHaveText('1명을 우쿨렐레 초급반에 넣었어요')
  await expect(list.getByRole('listitem').filter({ hasText: '이서윤' })).toContainText('우쿨렐레 초급반')

  // 찾아서 지우기
  await page.getByLabel('이름 찾기').fill('한서준')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await list.getByRole('checkbox', { name: '한서준 고르기' }).check()
  acceptNextConfirm(page)
  await bar.getByRole('button', { name: '지우기' }).click()
  await expect(page.getByRole('status')).toHaveText('1명을 지웠어요')
  await page.getByLabel('이름 찾기').fill('')
  await expect(list.getByRole('listitem')).toHaveCount(7)
})

test('프로필 사진: 고르면 그 자리에서 크게 보이고, 옮기고 키워서 자리를 맞춤', async ({ page }, testInfo) => {
  await page.goto('/#/lessons/new/solo')
  await page.getByLabel('이름', { exact: true }).fill('사진학생')
  await page.getByLabel('사진 고르기').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: await wideImage(page) })

  // 자리 맞추기가 열리고, 목록에서 보일 작은 미리 보기도 함께 나옴
  const stage = page.getByRole('group', { name: /사진 자리/ })
  // 여러 테스트가 함께 돌 때는 사진을 읽는 데 시간이 걸려 넉넉히 기다립니다.
  await expect(stage).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('목록에서는 이렇게 보여요')).toBeVisible()
  const zoom = page.getByLabel('사진 크기')
  await expect(zoom).toHaveValue('1')
  await expectNoHorizontalOverflow(page)

  // 키우고(단추), 오른쪽 끝으로 옮김(화살표 키) → 파란 쪽만 남음
  await page.getByRole('button', { name: '사진 크게' }).click()
  await expect(zoom).toHaveValue('1.25')
  await stage.focus()
  for (let step = 0; step < 40; step++) await page.keyboard.press('ArrowRight')
  await shot(page, testInfo, 'photo-1-crop')
  await page.getByRole('button', { name: '이대로 쓰기' }).click()
  await expect(stage).toBeHidden()

  // 저장할 사진은 정사각형이고 왼쪽 끝까지 파랑
  const saved = '.photo-field img.avatar'
  await expect(page.locator(saved)).toBeVisible()
  const size = await page.locator(saved).evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
  expect(size).toEqual([320, 320])
  const [red, , blue] = await pixelOf(page, saved, 0.05, 0.5)
  expect(blue).toBeGreaterThan(red + 60)

  // 다시 맞추다가 취소하면 그대로
  const before = await page.locator(saved).getAttribute('src')
  await page.getByRole('button', { name: '자리 맞추기' }).click()
  await page.getByRole('button', { name: '사진 크게' }).click()
  await page.getByRole('button', { name: '취소' }).first().click()
  await expect(page.locator(saved)).toHaveAttribute('src', before!)

  // 저장하면 학생 화면에 사진이 보임
  await page.getByRole('group', { name: '수업 요일' }).getByRole('button', { name: '월', exact: true }).click()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '사진학생', level: 1 })).toBeVisible()
  await expect(page.locator('.profile img.avatar')).toHaveAttribute('src', before!)
})

test('프로필 사진: 끌어서 옮김', async ({ page }) => {
  await page.goto('/#/lessons/new/solo')
  await page.getByLabel('사진 고르기').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: await wideImage(page) })
  const stage = page.getByRole('group', { name: /사진 자리/ })
  await expect(stage).toBeVisible({ timeout: 20_000 })
  const box = (await stage.boundingBox())!
  // 가운데는 빨강과 파랑의 경계. 오른쪽으로 끌면 사진이 따라와 왼쪽(빨강)이 보임
  await stage.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, bubbles: true })
  await stage.dispatchEvent('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: box.x + box.width / 2 + 400, clientY: box.y + box.height / 2, bubbles: true })
  await stage.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: box.x + box.width / 2 + 400, clientY: box.y + box.height / 2, bubbles: true })
  await page.getByRole('button', { name: '이대로 쓰기' }).click()
  const [red, , blue] = await pixelOf(page, '.photo-field img.avatar', 0.95, 0.5)
  expect(red).toBeGreaterThan(blue + 60)
})

test('안내 문구: 수강료 창에 학생 값으로 채워진 문구가 나오고 복사됨, 설정에는 안내 문구 메뉴가 없음', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await loadSample(page, { payments: true })
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /안내 문구/ })).toHaveCount(0)

  await page.goto('/#/payments')
  await page.getByRole('list', { name: '받을 돈', exact: true }).getByRole('button', { name: /박지호/ }).click()
  const sheet = page.getByRole('dialog', { name: '납부' })
  await sheet.getByText('수강료 안내 문구').click()
  await expect(sheet.locator('.message-text')).toContainText('박지호 학생 우쿨렐레 초급반 수강료 8회분 16만 원')
  await sheet.getByRole('button', { name: '문구 복사' }).click()
  await expect(sheet.getByRole('button', { name: '복사했어요' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('박지호 학생 우쿨렐레 초급반 수강료 8회분 16만 원')
  // 보호자 번호가 있으면 문자로도 보냄
  await expect(sheet.getByRole('link', { name: '문자로 보내기' })).toHaveAttribute('href', /^sms:0100000\d+\?body=/)
})

test('납부: 달마다 받은 돈 막대를 누르면 그 달의 받은 돈을 봄', async ({ page }, testInfo) => {
  await loadSample(page, { payments: true })
  await page.goto('/#/payments')
  const bars = page.getByRole('list', { name: '달마다 받은 돈' })
  await expect(bars.getByRole('button')).toHaveCount(6)
  // 이번 달이 골라져 있음
  await expect(bars.getByRole('button').last()).toHaveAttribute('aria-pressed', 'true')
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'payments-bars')
  const title = page.locator('.cal-title')
  const current = await title.textContent()
  await bars.getByRole('button').nth(4).click()
  await expect(title).not.toHaveText(current!)
  await expect(bars.getByRole('button').nth(4)).toHaveAttribute('aria-pressed', 'true')
})

test('수업 기록: 수업 메모가 학생 화면에 날짜순으로 모임', async ({ page }) => {
  await addSolo(page, '기록학생')
  await expect(page.getByText('출석부에서 수업 메모에 진도나 숙제를 적으면')).toBeVisible()
  await page.goto('/')
  const card = page.locator('.lesson', { hasText: '기록학생' }).first()
  await card.locator('.lesson-head').click()
  await card.getByLabel('기록학생 수업 메모').fill('스트로크 연습, 숙제 2쪽')
  await card.getByLabel('기록학생 수업 메모').blur()
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '수업' }).click()
  await page.getByRole('link', { name: /기록학생/ }).first().click()
  await expect(page.getByRole('list', { name: '수업 기록' }).getByRole('listitem')).toHaveText(/스트로크 연습, 숙제 2쪽/)
})
