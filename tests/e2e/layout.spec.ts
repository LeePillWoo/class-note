import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, expectsRail, loadSample, shot } from './helpers'

// 화면 배치 테스트: 모든 화면 크기(휴대폰, 태블릿, PC)에서 돌립니다.

/** 수업 목록과 자세히가 나란히 보여야 하는 화면 크기 */
const TWO_PANES = ['태블릿-가로', 'PC', '와이드']

test('처음 화면: 큰 그림과 시작 안내', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '첫 수업 등록' })).toBeVisible()
  await expect(page.locator('.hero-art')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '00-welcome')
})

test('모든 화면이 옆으로 넘치지 않고, 메뉴 위치와 칸 수가 화면 크기에 맞음', async ({ page }, testInfo) => {
  // 모든 화면을 차례로 도는 긴 테스트라, 여러 테스트가 함께 돌 때도 끝나도록 넉넉히
  test.setTimeout(150_000)
  await loadSample(page)
  const rail = expectsRail(page)
  const twoPanes = TWO_PANES.includes(testInfo.project.name)
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  const viewport = page.viewportSize()!

  // 메뉴: 넓은 화면은 왼쪽, 휴대폰은 아래쪽. 메뉴는 홈, 수업, 보강, 납부, 설정
  await expect(nav.locator('.nav-item')).toHaveText(['홈', '수업', '보강', '납부', '설정'])
  const navBox = (await nav.boundingBox())!
  if (rail) {
    expect(navBox.x).toBe(0)
    expect(navBox.height).toBeGreaterThanOrEqual(viewport.height - 1)
  } else {
    expect(Math.round(navBox.y + navBox.height)).toBe(viewport.height)
    expect(navBox.width).toBe(viewport.width)
  }

  // 홈: 오늘 수업, 주간 일정
  await expect(page.getByRole('heading', { name: '주간 일정' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '01-home')
  await shot(page, testInfo, '01-home-full', { fullPage: true })

  // 수업 카드를 펼치면 출석부 줄이 나오고, 체크 상자가 보임
  await page.locator('.lesson-head').first().click()
  await expect(page.locator('.lesson.is-open .roll-row .check').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '02-home-lesson-open')

  // 수업 목록: 1:1 레슨과 그룹 수업
  await page.goto('/#/lessons')
  const solos = page.getByRole('list', { name: '1:1 레슨' })
  const groups = page.getByRole('list', { name: '그룹 수업' })
  await expect(solos.getByRole('link')).toHaveCount(2)
  await expect(groups.getByRole('link')).toHaveCount(3)
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '03-lessons')

  // 1:1 레슨: 학생 정보와 출결 달력
  await solos.getByRole('link', { name: /이서윤/ }).click()
  await expect(page.getByRole('heading', { name: '이서윤', level: 1 })).toBeVisible()
  await expect(page.getByRole('group', { name: /이서윤 \d+월 출결/ })).toBeVisible()
  if (twoPanes) await expect(solos).toBeVisible()
  else await expect(solos).toBeHidden()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '04-solo-detail')
  await shot(page, testInfo, '04-solo-detail-full', { fullPage: true })

  // 목록 칸은 자세히 칸보다 훨씬 좁음 (반반이 아님)
  if (twoPanes) {
    const list = (await page.locator('.split-list').boundingBox())!
    const detail = (await page.locator('.split-detail').boundingBox())!
    expect(list.width).toBeLessThan(detail.width * 0.6)
  }

  // 그룹 수업: 명단과 출석부 (달력, 표)
  await page.goto('/#/lessons')
  await groups.getByRole('link', { name: /우쿨렐레 초급반/ }).click()
  await expect(page.getByRole('heading', { name: '우쿨렐레 초급반', level: 1 })).toBeVisible()
  await expect(page.getByRole('group', { name: /우쿨렐레 초급반 \d+월 출결/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '05-group-detail-full', { fullPage: true })
  await page.getByRole('radiogroup', { name: '출석부 보기' }).getByRole('radio', { name: '표' }).check({ force: true })
  await expect(page.getByRole('region', { name: /출석부/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '05-group-detail-table')
  await page.getByRole('radiogroup', { name: '출석부 보기' }).getByRole('radio', { name: '달력' }).check({ force: true })

  // 입력 화면
  await page.goto('/#/lessons/new/solo')
  await expect(page.getByRole('heading', { name: '1:1 레슨 등록' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '06-solo-form-full', { fullPage: true })
  await page.goto('/#/lessons/new/group')
  await expect(page.getByRole('heading', { name: '그룹 수업 만들기' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // 보강, 납부, 설정
  await page.goto('/#/makeups')
  await expect(page.getByRole('heading', { name: '보강', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '07-makeups')

  await page.goto('/#/payments')
  await expect(page.getByRole('heading', { name: '납부', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '08-payments')

  await page.goto('/#/settings')
  await expect(page.getByRole('list', { name: '기본 규칙' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '09-settings')
  await page.getByRole('list', { name: '기본 규칙' }).getByRole('link', { name: /출결·보강/ }).click()
  await expect(page.getByRole('heading', { name: '출결·보강', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '09-settings-attendance')
  await page.goto('/#/settings/backup')
  await expect(page.getByRole('heading', { name: '백업과 복원', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // 학생 관리: 모두 고르면 아래에 할 일 단추가 나옴
  await page.goto('/#/settings/students')
  await expect(page.getByRole('heading', { name: '학생 관리', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.getByRole('checkbox', { name: '모두 고르기' }).check()
  await expect(page.getByRole('group', { name: /고른 학생/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '13-settings-students')
  await page.goto('/#/settings/messages')
  await expect(page.getByRole('heading', { name: '안내 문구', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, '14-settings-messages')
  await page.goto('/#/settings/defaults')
  await expect(page.getByRole('heading', { name: '수업 기본값', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('창(보강, 납부, 주간 일정의 수업)이 화면 안에 들어오고 넘치지 않음', async ({ page }, testInfo) => {
  await loadSample(page)
  const viewport = page.viewportSize()!
  const inside = async (name: string) => {
    const box = (await page.getByRole('dialog', { name, exact: true }).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
    await expectNoHorizontalOverflow(page)
  }

  // 주간 일정에서 수업을 누르면 출석부 창
  await page.locator('.week-item').first().click()
  await expect(page.getByRole('dialog', { name: '수업 출석부' })).toBeVisible()
  await inside('수업 출석부')
  await shot(page, testInfo, '10-lesson-sheet')
  await page.getByRole('dialog', { name: '수업 출석부' }).getByRole('button', { name: '닫기', exact: true }).click()

  await page.goto('/#/makeups')
  await page.getByRole('list', { name: '날짜를 잡아야 하는 보강' }).getByRole('button').first().click()
  await expect(page.getByRole('dialog', { name: '보강', exact: true })).toBeVisible()
  await inside('보강')
  await shot(page, testInfo, '11-makeup-sheet')
  // 창 바깥(어두운 부분)을 누르면 닫힘
  await page.mouse.click(viewport.width / 2, 4)
  await expect(page.getByRole('dialog', { name: '보강', exact: true })).toBeHidden()

  await page.goto('/#/payments')
  await page.getByRole('list', { name: '받을 돈' }).getByRole('button').first().click()
  await expect(page.getByRole('dialog', { name: '납부' })).toBeVisible()
  await inside('납부')
  await shot(page, testInfo, '12-payment-sheet')
})

test('기기가 어두운 모드여도 밝은 화면', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '첫 수업 등록' })).toBeVisible()
  const colors = await page.evaluate(() => ({
    page: getComputedStyle(document.documentElement).backgroundColor,
    card: getComputedStyle(document.querySelector('.card')!).backgroundColor,
  }))
  expect(colors).toEqual({ page: 'rgb(246, 245, 242)', card: 'rgb(255, 255, 255)' })
})
