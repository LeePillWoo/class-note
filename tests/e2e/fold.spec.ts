import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, loadSample, shot } from './helpers'

// 폴드를 접고 펴는 상황: 쓰는 도중에 화면 크기가 바뀌어도 적던 내용, 보던 화면, 열려 있던 창이 그대로인지 확인합니다.
// 화면 크기를 직접 바꾸므로 한 가지 설정(폰-세로)에서만 돌립니다.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== '폰-세로', '접고 펴기 테스트는 한 번만 돌립니다')
})

// 폴드7: 접으면 길쭉한 휴대폰, 펴면 거의 정사각형 (아래쪽 메뉴 그대로, 두 칸)
const FOLD7 = { folded: { width: 360, height: 780 }, unfolded: { width: 750, height: 790 } }
// 폴드8: 접으면 짧고 넓은 휴대폰, 펴면 가로로 넓은 화면 (왼쪽 메뉴, 두 칸)
const FOLD8 = { folded: { width: 416, height: 580 }, unfolded: { width: 932, height: 620 } }

async function resize(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size)
  await expectNoHorizontalOverflow(page)
}

for (const [device, sizes] of Object.entries({ 폴드7: FOLD7, 폴드8: FOLD8 })) {
  test(`${device}: 학생 정보를 적다가 펴고 접어도 적던 내용이 남음`, async ({ page }, testInfo) => {
    await page.setViewportSize(sizes.folded)
    await loadSample(page)
    await page.goto('/#/students/new')
    await page.getByLabel('이름', { exact: true }).fill('접는 폰')
    await page.getByLabel('학교·학년 (선택)').fill('폴드초 1학년')
    await page.getByRole('button', { name: '보호자 추가' }).click()
    await page.getByLabel('보호자 1 전화번호').fill('010-0000-0077')
    await page.getByRole('radio', { name: '청록' }).check()
    await page.getByRole('list', { name: '들을 반' }).getByText('칼림바 취미반', { exact: true }).click()
    const list = page.getByRole('list', { name: '학생 목록' })
    await expect(list).toBeHidden()

    const expectKept = async () => {
      await expect(page.getByLabel('이름', { exact: true })).toHaveValue('접는 폰')
      await expect(page.getByLabel('학교·학년 (선택)')).toHaveValue('폴드초 1학년')
      await expect(page.getByLabel('보호자 1 전화번호')).toHaveValue('010-0000-0077')
      await expect(page.getByRole('radio', { name: '청록' })).toBeChecked()
      await expect(page.getByRole('list', { name: '들을 반' }).getByRole('checkbox', { name: /칼림바 취미반/ })).toBeChecked()
    }

    // 펴기: 목록이 옆에 나타나고, 적던 내용은 그대로
    await resize(page, sizes.unfolded)
    await expect(list).toBeVisible()
    await expectKept()
    await shot(page, testInfo, `fold-${device}-form-unfolded`)

    // 다시 접기: 입력 화면만 보이고, 적던 내용은 그대로
    await resize(page, sizes.folded)
    await expect(list).toBeHidden()
    await expectKept()

    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('heading', { name: '접는 폰', level: 1 })).toBeVisible()
    await expect(page.locator('.card', { hasText: '듣는 반' })).toContainText('칼림바 취미반')
  })

  test(`${device}: 보던 학생, 열어 둔 창, 펼쳐 둔 출석부가 접고 펴도 그대로`, async ({ page }, testInfo) => {
    await page.setViewportSize(sizes.folded)
    await loadSample(page)

    // 1. 보던 학생
    await page.goto('/#/students')
    const list = page.getByRole('list', { name: '학생 목록' })
    await list.getByRole('link', { name: /박지호/ }).click()
    const title = page.getByRole('heading', { name: '박지호', level: 1 })
    await expect(title).toBeVisible()
    await expect(list).toBeHidden()
    await resize(page, sizes.unfolded)
    await expect(title).toBeVisible()
    await expect(list.locator('.person-row.active')).toContainText('박지호')
    await shot(page, testInfo, `fold-${device}-detail-unfolded`)
    await resize(page, sizes.folded)
    await expect(title).toBeVisible()
    await expect(list).toBeHidden()
    // 접은 화면에서는 뒤로 가면 목록
    await page.getByRole('button', { name: '뒤로' }).click()
    await expect(list).toBeVisible()

    // 2. 열어 둔 창: 수강료를 받는 창에 메모를 적다가 펴고 접음
    await page.goto('/#/payments')
    await page.getByRole('list', { name: '받을 돈', exact: true }).getByRole('button', { name: /박지호/ }).click()
    const sheet = page.getByRole('dialog', { name: '납부' })
    await sheet.getByLabel('메모 (선택)').fill('현금으로 받음')
    await sheet.getByLabel('횟수').fill('4')
    await resize(page, sizes.unfolded)
    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('메모 (선택)')).toHaveValue('현금으로 받음')
    await expect(sheet.getByLabel('횟수')).toHaveValue('4')
    await expect(sheet.getByLabel('금액')).toHaveValue('80,000')
    await shot(page, testInfo, `fold-${device}-sheet-unfolded`)
    await resize(page, sizes.folded)
    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('메모 (선택)')).toHaveValue('현금으로 받음')
    await sheet.getByRole('button', { name: '닫기' }).click()

    // 3. 펼쳐 둔 출석부: 출석을 누르다가 펴고 접음
    await page.goto('/')
    const card = page.locator('.home-section', { has: page.getByRole('heading', { name: /출결을 안 적은 수업/ }) }).locator('.lesson')
    await card.locator('.lesson-head').click()
    const kang = card.getByRole('group', { name: '강도윤 출결' }).getByRole('button', { name: '출석' })
    await kang.click()
    await expect(kang).toHaveAttribute('aria-pressed', 'true')
    await card.getByLabel('우쿨렐레 초급반 수업 메모').fill('코드 연습')
    await resize(page, sizes.unfolded)
    await expect(card).toHaveClass(/is-open/)
    await expect(kang).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByLabel('우쿨렐레 초급반 수업 메모')).toHaveValue('코드 연습')
    await shot(page, testInfo, `fold-${device}-roll-unfolded`)
    await resize(page, sizes.folded)
    await expect(card).toHaveClass(/is-open/)
    await expect(kang).toHaveAttribute('aria-pressed', 'true')
    // 접은 채로 이어서 적음
    await card.getByRole('group', { name: '김하준 출결' }).getByRole('button', { name: '결석' }).click()
    await expect(card.getByLabel('김하준 결석 사유')).toBeVisible()
  })
}
