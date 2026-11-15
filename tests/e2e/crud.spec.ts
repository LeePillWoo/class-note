import { expect, test } from '@playwright/test'
import { acceptNextConfirm, addGroup, addSolo, expectNoHorizontalOverflow, shot } from './helpers'

// 기능 테스트: 빈 앱에서 수업을 직접 만들어 봅니다.

test('1:1 레슨: 학생과 수업을 한 번에 등록, 1회 금액 표시, 출생 연도, 고치기, 지우기', async ({ page }, testInfo) => {
  await page.goto('/#/lessons/new/solo')
  await page.getByLabel('수강료', { exact: true }).fill('120000')
  await page.getByLabel('횟수', { exact: true }).fill('4')
  await expect(page.locator('.per-session')).toContainText('1회 3만 원')
  await shot(page, testInfo, 'crud-1-solo-form')

  await addSolo(page, '홍길동', { birthYear: '2016', start: '15:00', end: '15:50', count: '4', amount: '120000' })
  await expect(page.getByText('2016년생 · 1:1 레슨')).toBeVisible()
  await expect(page.locator('.lesson-fee').first()).toContainText('받기 전')
  await expect(page.locator('.lesson-fee').first()).toContainText('1회 3만 원')
  await expectNoHorizontalOverflow(page)

  // 목록에 1:1 레슨으로, 홈의 오늘 수업에도
  await page.goto('/#/lessons')
  await expect(page.getByRole('list', { name: '1:1 레슨' }).getByRole('link', { name: /홍길동.*2016년생/ })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.lesson', { hasText: '홍길동' })).toBeVisible()

  // 고치기: 이름을 바꾸면 수업 이름도 함께
  await page.goto('/#/lessons')
  await page.getByRole('list', { name: '1:1 레슨' }).getByRole('link', { name: /홍길동/ }).click()
  await page.getByRole('link', { name: '고치기' }).click()
  await page.getByLabel('이름', { exact: true }).fill('홍길순')
  await page.getByLabel('메모').fill('한빛초 4학년')
  await page.getByRole('button', { name: '보호자 추가' }).click()
  await page.getByLabel('보호자 1 전화번호').fill('010-0000-0099')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '홍길순', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: '어머니 전화 걸기' })).toHaveAttribute('href', 'tel:01000000099')
  await expect(page.getByText('한빛초 4학년')).toBeVisible()

  // 학생 지우기
  await page.getByRole('link', { name: '고치기' }).click()
  acceptNextConfirm(page)
  await page.getByRole('button', { name: '학생 지우기' }).click()
  await expect(page.getByRole('heading', { name: '아직 수업이 없어요' })).toBeVisible()
})

test('시각 고르기: 오전이 먼저, 시작을 고르면 끝은 1시간 뒤로 자동, 끝은 그 뒤에 따로 고침', async ({ page }) => {
  await page.goto('/#/lessons/new/solo')
  await page.getByRole('group', { name: '수업 요일' }).getByRole('button', { name: '화', exact: true }).click()
  const start = page.getByLabel('수업 화요일 시작 시각')
  const end = page.getByLabel('수업 화요일 끝 시각')
  // 목록은 오전부터
  const labels = await start.locator('option').allTextContents()
  expect(labels[0]).toBe('오전 6:00')
  expect(labels.findIndex((label) => label.startsWith('오후'))).toBeGreaterThan(labels.findIndex((label) => label === '오전 11:50'))
  await start.selectOption('10:30')
  await expect(end).toHaveValue('11:30')
  await expect(end.locator('option:checked')).toHaveText('오전 11:30')
  await start.selectOption('14:00')
  await expect(end).toHaveValue('15:00')
  await end.selectOption('14:50')
  await expect(end).toHaveValue('14:50')
  await expect(start).toHaveValue('14:00')
})

test('그룹 수업: 만들면서 새 학생을 적고, 나중에 학생 추가, 학생마다 수강료 규칙', async ({ page }) => {
  await addGroup(page, '기타 교실', { days: ['월', '수'], count: '8', amount: '160000', newStudents: ['김가온', '이나래'] })
  const members = page.getByRole('list', { name: '이 수업 학생' })
  await expect(members.getByRole('link')).toHaveCount(2)
  await expect(page.getByText('1회 2만 원')).toBeVisible()

  await page.getByRole('button', { name: '학생 추가' }).click()
  const sheet = page.getByRole('dialog', { name: '학생 추가' })
  await sheet.getByLabel('새 학생 1 이름').fill('박다솜')
  await sheet.getByLabel('새 학생 1 출생 연도').fill('2014')
  await sheet.getByRole('button', { name: '1명 넣기' }).click()
  await expect(members.getByRole('link')).toHaveCount(3)
  await expect(members.getByRole('link', { name: /박다솜.*2014년생/ })).toBeVisible()

  // 수업 목록: 이름 옆에 대표 두 명과 나머지 수
  await page.goto('/#/lessons')
  await expect(page.getByRole('list', { name: '그룹 수업' }).getByRole('link', { name: /기타 교실 \(김가온, 박다솜 외 1명\)/ })).toBeVisible()
  await page.getByRole('list', { name: '그룹 수업' }).getByRole('link', { name: /기타 교실/ }).click()

  // 학생마다 수강료: 이나래만 4회 9만 원, 후납
  const naraeRow = page.locator('.member-row', { hasText: '이나래' })
  await naraeRow.getByRole('button', { name: '수강료·수강 설정' }).click()
  const sheet2 = page.getByRole('dialog', { name: '수강 설정' })
  await sheet2.getByLabel('횟수', { exact: true }).fill('4')
  await sheet2.getByLabel('수강료', { exact: true }).fill('90000')
  await sheet2.getByRole('radiogroup', { name: '수강료 받는 때' }).getByRole('radio', { name: '후납' }).click()
  await sheet2.getByRole('button', { name: '저장' }).click()
  await expect(sheet2).toBeHidden()
  await expect(naraeRow).toContainText('4회 9만 원 · 후납')
  await expect(page.locator('.member-row', { hasText: '김가온' })).toContainText('8회 16만 원 · 선납')

  // 그룹 학생을 누르면 학생 화면 (출결 달력)
  await members.getByRole('link', { name: /김가온/ }).click()
  await expect(page.getByRole('heading', { name: '김가온', level: 1 })).toBeVisible()
  await expect(page.getByRole('group', { name: /김가온 \d+월 출결/ })).toBeVisible()
})

test('입력 확인: 이름과 요일이 없으면 저장되지 않음', async ({ page }) => {
  await page.goto('/#/lessons/new/solo')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('이름을 적어 주세요')).toBeVisible()
  await expect(page.getByText('수업 요일을 하나 이상 골라 주세요')).toBeVisible()
  await page.goto('/#/lessons/new/group')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('수업 이름을 적어 주세요')).toBeVisible()
})

test('설정: 첫 화면은 메뉴, 눌러서 들어가 기본 규칙을 바꾸면 새 수업에 쓰임', async ({ page }) => {
  await page.goto('/#/settings')
  const menu = page.getByRole('list', { name: '기본 규칙' })
  await expect(menu.getByRole('link')).toHaveCount(3)
  // 메뉴에 지금 값이 요약되어 보임 (사용자와 정한 처음 값)
  await expect(menu.getByRole('link', { name: /수업 기본값/ })).toContainText('4회 · 선납 · 카드 · 16:00부터 60분')
  await expect(menu.getByRole('link', { name: /출결·보강/ })).toContainText('기한 없음')

  await menu.getByRole('link', { name: /출결·보강/ }).click()
  await expect(page.getByRole('heading', { name: '출결·보강', level: 1 })).toBeVisible()
  await expect(page.getByRole('radio', { name: /결석은 회차로 세지 않음/ })).toBeChecked()
  await expect(page.getByLabel('보강 기한')).toHaveValue('none')
  await expect(page.getByRole('checkbox', { name: '결석하면 보강' })).toBeChecked()

  await page.goto('/#/settings')
  await menu.getByRole('link', { name: /수업 기본값/ }).click()
  await page.getByLabel('수강료 횟수').fill('8')
  await page.getByRole('radiogroup', { name: '수강료 받는 때' }).getByRole('radio', { name: '후납' }).click()
  // 저장이 끝나 화면에 반영된 뒤에 다른 화면으로
  await expect(page.getByRole('radio', { name: '후납' })).toBeChecked()
  // 수업 시간도 같은 화면에서 정함. 처음 값은 1시간 수업
  await expect(page.getByLabel('수업 시간')).toHaveValue('60')
  await page.getByLabel('시작 시각').selectOption('15:00')
  await page.getByLabel('수업 시간').selectOption('40')
  await expect(page.getByLabel('수업 시간')).toHaveValue('40')
  await page.goto('/#/settings')
  await expect(menu.getByRole('link', { name: /수업 기본값/ })).toContainText('8회 · 후납 · 카드 · 15:00부터 40분')

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '수업' }).click()
  await page.getByRole('link', { name: '1:1 레슨' }).first().click()
  await expect(page.getByLabel('횟수', { exact: true })).toHaveValue('8')
  await expect(page.getByRole('radio', { name: '후납' })).toBeChecked()
  await page.getByRole('group', { name: '수업 요일' }).getByRole('button', { name: '월', exact: true }).click()
  await expect(page.getByLabel('수업 월요일 시작 시각')).toHaveValue('15:00')
  await expect(page.getByLabel('수업 월요일 끝 시각')).toHaveValue('15:40')
})

test('화면 크기가 바뀌어도 적던 내용과 보던 화면이 그대로', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '폰-세로', '한 번만 돌립니다')
  await page.goto('/#/lessons/new/solo')
  await page.getByLabel('이름', { exact: true }).fill('돌리는 폰')
  await page.getByLabel('출생 연도').fill('2012')
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByRole('heading', { name: '1:1 레슨 등록' })).toBeVisible()
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('돌리는 폰')
  await expect(page.getByLabel('출생 연도')).toHaveValue('2012')
  await page.setViewportSize({ width: 360, height: 780 })
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('돌리는 폰')
})
