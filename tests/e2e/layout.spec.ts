import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, expectsRail, loadSample, shot } from './helpers'

// 화면 배치 테스트: 모든 화면 크기(휴대폰, 폴드 접음·펼침, 태블릿, PC)에서 돌립니다.

/** 두 칸으로 나뉘어야 하는 화면 크기 (목록 + 자세히가 나란히) */
const TWO_PANES = ['폴드7-펼침', '폴드8-펼침', '태블릿-세로', 'PC']

test('처음 화면: 큰 그림과 시작 안내', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '반부터 만들어 볼까요?' })).toBeVisible()
  await expect(page.locator('.hero-art')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '00-welcome')
})

test('모든 화면이 옆으로 넘치지 않고, 메뉴 위치와 칸 수가 화면 크기에 맞음', async ({ page }, testInfo) => {
  await loadSample(page)
  const rail = expectsRail(page)
  const twoPanes = TWO_PANES.includes(testInfo.project.name)
  const nav = page.getByRole('navigation', { name: '주 메뉴' })

  // 메뉴: 가로 화면은 왼쪽, 세로 화면은 아래쪽
  const navBox = (await nav.boundingBox())!
  const viewport = page.viewportSize()!
  if (rail) {
    expect(navBox.x).toBe(0)
    expect(navBox.width).toBeLessThan(120)
    expect(navBox.height).toBeGreaterThanOrEqual(viewport.height - 1)
    await expect(nav.getByRole('link', { name: '설정' })).toBeVisible()
  } else {
    expect(Math.round(navBox.y + navBox.height)).toBe(viewport.height)
    expect(navBox.width).toBe(viewport.width)
    await expect(page.getByRole('banner').getByRole('link', { name: '설정' })).toBeVisible()
  }

  // 홈
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '01-home')
  await shot(page, testInfo, '01-home-full', { fullPage: true })

  // 홈의 수업 카드를 펼쳐 출석부 줄이 화면 안에 들어오는지
  const firstLesson = page.locator('.lesson-head').first()
  await firstLesson.click()
  await expect(page.locator('.lesson.is-open .roll-row').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '02-home-lesson-open')

  // 출결: 월, 주, 일
  for (const view of ['month', 'week', 'day']) {
    await page.goto(`/#/attendance?view=${view}`)
    await expect(page.getByRole('heading', { name: '출결', level: 1 })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await shot(page, testInfo, `03-attendance-${view}`)
  }

  // 학생: 목록 → 자세히
  await page.goto('/#/students')
  const studentList = page.getByRole('list', { name: '학생 목록' })
  await expect(studentList.getByRole('link')).toHaveCount(8)
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '04-students')
  await studentList.getByRole('link', { name: /김하준/ }).click()
  await expect(page.getByRole('heading', { name: '김하준', level: 1 })).toBeVisible()
  // 넓은 화면은 목록이 옆에 그대로, 좁은 화면은 자세히만
  if (twoPanes) await expect(studentList).toBeVisible()
  else await expect(studentList).toBeHidden()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '05-student-detail')
  await shot(page, testInfo, '05-student-detail-full', { fullPage: true })

  // 두 칸일 때 칸 사이가 화면 한가운데(폴드의 접힌 선)에 오는지. PC는 접힌 선이 없어 목록 칸 너비가 고정입니다.
  if (twoPanes && testInfo.project.name !== 'PC') {
    const list = (await page.locator('.split-list').boundingBox())!
    const detail = (await page.locator('.split-detail').boundingBox())!
    const gapCenter = (list.x + list.width + detail.x) / 2
    expect(Math.abs(gapCenter - viewport.width / 2)).toBeLessThanOrEqual(2)
  }

  await page.goto('/#/students/new')
  await expect(page.getByRole('heading', { name: '학생 추가' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '06-student-form')

  // 반: 목록 → 자세히 (출석부 표)
  await page.goto('/#/classes')
  const classList = page.getByRole('list', { name: '반 목록' })
  await expect(classList.getByRole('link')).toHaveCount(4)
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '07-classes')
  await classList.getByRole('link', { name: /우쿨렐레 초급반/ }).click()
  await expect(page.getByRole('heading', { name: '우쿨렐레 초급반', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: /출석부/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '08-class-detail-full', { fullPage: true })

  await page.goto('/#/classes/new')
  await expect(page.getByRole('heading', { name: '반 만들기' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '09-class-form-full', { fullPage: true })

  // 보강, 납부, 설정
  await page.goto('/#/makeups')
  await expect(page.getByRole('heading', { name: '보강', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '10-makeups')

  await page.goto('/#/payments')
  await expect(page.getByRole('heading', { name: '납부', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '11-payments')
  await shot(page, testInfo, '11-payments-full', { fullPage: true })

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: '설정', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '12-settings')
})

test('창(보강, 납부)이 화면 안에 들어오고 넘치지 않음', async ({ page }, testInfo) => {
  await loadSample(page)

  await page.goto('/#/makeups')
  await page.getByRole('list', { name: '날짜를 잡아야 하는 보강' }).getByRole('button').first().click()
  const makeup = page.getByRole('dialog', { name: '보강' })
  await expect(makeup).toBeVisible()
  await expectNoHorizontalOverflow(page)
  const viewport = page.viewportSize()!
  const makeupBox = (await makeup.boundingBox())!
  expect(makeupBox.x).toBeGreaterThanOrEqual(0)
  expect(makeupBox.x + makeupBox.width).toBeLessThanOrEqual(viewport.width)
  expect(makeupBox.y + makeupBox.height).toBeLessThanOrEqual(viewport.height + 1)
  await shot(page, testInfo, '13-makeup-sheet')
  // 창 바깥(어두운 부분)을 누르면 닫힘
  await page.mouse.click(viewport.width / 2, 4)
  await expect(makeup).toBeHidden()

  await page.goto('/#/payments')
  await page.getByRole('list', { name: '받을 돈' }).getByRole('button').first().click()
  const payment = page.getByRole('dialog', { name: '납부' })
  await expect(payment).toBeVisible()
  await expectNoHorizontalOverflow(page)
  const paymentBox = (await payment.boundingBox())!
  expect(paymentBox.x + paymentBox.width).toBeLessThanOrEqual(viewport.width)
  expect(paymentBox.y + paymentBox.height).toBeLessThanOrEqual(viewport.height + 1)
  await shot(page, testInfo, '14-payment-sheet')
})

test('기기가 어두운 모드여도 밝은 화면', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '반부터 만들어 볼까요?' })).toBeVisible()
  const colors = await page.evaluate(() => ({
    page: getComputedStyle(document.documentElement).backgroundColor,
    card: getComputedStyle(document.querySelector('.card')!).backgroundColor,
  }))
  expect(colors).toEqual({ page: 'rgb(247, 244, 240)', card: 'rgb(255, 255, 255)' })
})
