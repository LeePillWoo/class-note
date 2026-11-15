import { expect, test } from '@playwright/test'
import { acceptNextConfirm, addClass, addStudent, expectNoHorizontalOverflow, pickDayOffset, shot } from './helpers'

// 기능 테스트: 빈 앱에서 반과 학생을 직접 만들어 봅니다.

test('반을 만들고 학생을 넣으면 오늘 수업 출석부에 올라옴. 학생 고치기, 쉬기, 지우기', async ({ page }, testInfo) => {
  // 매일 수업하는 반 (오늘이 항상 수업 날)
  await addClass(page, { name: '기타 교실', start: '15:00', end: '15:50', count: '4', amount: '100000' })
  // 좁은 화면에서는 목록 칸이 숨어 있을 뿐 그려져 있으므로, 자세히 칸 안에서 찾습니다.
  const detail = page.locator('.split-detail')
  await expect(detail.getByText('4회 10만 원', { exact: true })).toBeVisible()
  await expect(page.getByText('아직 학생이 없어요.')).toBeVisible()

  await addStudent(page, '홍길동', ['기타 교실'])
  // 아직 수강료를 받기 전
  const classes = page.locator('.card', { hasText: '듣는 반' })
  await expect(classes.getByRole('button', { name: /기타 교실/ })).toContainText('받기 전')
  await expectNoHorizontalOverflow(page)
  await shot(page, testInfo, 'crud-1-student')

  // 반 화면의 학생 목록
  await page.goto('/#/classes')
  await page.getByRole('list', { name: '반 목록' }).getByRole('link', { name: /기타 교실/ }).click()
  await expect(page.getByRole('list', { name: '이 반 학생' }).getByRole('button', { name: /홍길동/ })).toBeVisible()

  // 홈: 오늘 수업에 1명, 오늘이 첫 수업이라 받을 돈에도 올라옴
  await page.goto('/')
  const card = page.locator('.lesson', { hasText: '기타 교실' })
  await expect(card.locator('.lesson-sub')).toHaveText('1명')
  await expect(page.locator('.hero-title')).toHaveText('오늘 수업은 1개예요')
  await expect(page.getByRole('list').getByRole('button', { name: /홍길동.*수강료 4회분.*오늘 받을 날/ })).toBeVisible()

  // 학생 이름 고치기
  await page.goto('/#/students')
  await page.getByRole('list', { name: '학생 목록' }).getByRole('link', { name: /홍길동/ }).click()
  await page.getByRole('link', { name: '고치기' }).click()
  await page.getByLabel('이름', { exact: true }).fill('홍길순')
  await page.getByLabel('학교·학년 (선택)').fill('한빛초 2학년')
  await page.getByRole('button', { name: '보호자 추가' }).click()
  await page.getByLabel('보호자 1 전화번호').fill('010-0000-0099')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '홍길순', level: 1 })).toBeVisible()
  await expect(page.getByText('010-0000-0099')).toBeVisible()
  await expect(page.getByRole('link', { name: '어머니 전화 걸기' })).toHaveAttribute('href', 'tel:01000000099')

  // 오늘부터 쉬기: 수업 명단에서 빠짐
  const status = page.getByRole('dialog', { name: '학생 상태' })
  await page.getByRole('button', { name: '쉬기', exact: true }).click()
  await status.getByRole('button', { name: '쉬는 것으로 저장' }).click()
  await expect(status).toBeHidden()
  await expect(page.locator('.detail-head .badge')).toHaveText('쉬는 중')
  await page.goto('/')
  await expect(page.locator('.lesson', { hasText: '기타 교실' }).locator('.badge')).toHaveText('학생 없음')

  // 다시 다니기
  await page.goto('/#/students')
  await page.getByRole('group', { name: '학생 상태' }).getByRole('button', { name: /쉬는 중 1/ }).click()
  await page.getByRole('list', { name: '학생 목록' }).getByRole('link', { name: /홍길순/ }).click()
  await page.getByRole('button', { name: '다시 다니기' }).click()
  await status.getByRole('button', { name: '다시 다니는 것으로 저장' }).click()
  await expect(page.locator('.detail-head .badge')).toHaveText('다니는 중')

  // 학생 지우기
  await page.getByRole('link', { name: '고치기' }).click()
  acceptNextConfirm(page)
  await page.getByRole('button', { name: '학생 지우기' }).click()
  await expect(page.getByRole('heading', { name: '아직 학생이 없어요' })).toBeVisible()
})

test('입력 확인: 이름과 요일이 없으면 저장되지 않고 알려줌', async ({ page }) => {
  await page.goto('/#/classes/new')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('반 이름을 적어 주세요.')).toBeVisible()
  await expect(page.getByText('수업 요일을 하나 이상 골라 주세요.')).toBeVisible()
  await expect(page.getByRole('heading', { name: '반 만들기' })).toBeVisible()

  await page.goto('/#/students/new')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('이름을 적어 주세요.')).toBeVisible()
})

test('수강 설정: 전부터 다니던 학생의 남은 횟수를 적고, 반 일정을 바꿈', async ({ page }) => {
  await addClass(page, { name: '칼림바 교실', days: ['월', '수'], count: '8', amount: '160000' })
  await addStudent(page, '김다온', ['칼림바 교실'])

  // 남은 횟수 3회로 시작
  const sheet = page.getByRole('dialog', { name: '수강 설정' })
  await page.getByRole('button', { name: '수강 설정' }).click()
  await sheet.getByLabel('넣을 때 남아 있던 횟수').fill('3')
  await sheet.getByRole('button', { name: '저장' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.locator('.card', { hasText: '듣는 반' }).getByRole('button', { name: /칼림바 교실/ })).toContainText('3회 남음')

  // 한 요일만 듣게 바꾸면 그 요일만 보임
  await page.getByRole('button', { name: '수강 설정' }).click()
  await sheet.getByRole('group', { name: '듣는 요일' }).getByRole('button', { name: '월' }).click()
  await sheet.getByRole('button', { name: '저장' }).click()
  await expect(page.locator('.card', { hasText: '듣는 반' })).toContainText('수요일만')

  // 반 일정을 월·수에서 화·목으로 바꾸면 '언제부터'를 물어봄
  await page.goto('/#/classes')
  await page.getByRole('list', { name: '반 목록' }).getByRole('link', { name: /칼림바 교실/ }).click()
  await page.getByRole('link', { name: '고치기' }).click()
  const days = page.getByRole('group', { name: '수업 요일' })
  for (const day of ['월', '수', '화', '목']) await days.getByRole('button', { name: day, exact: true }).click()
  await expect(page.getByText('이날부터 새 요일과 시간으로 수업이 생겨요.')).toBeVisible()
  await pickDayOffset(page, '바뀐 일정은 언제부터인가요?', 7)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '칼림바 교실', level: 1 })).toBeVisible()
  await expect(page.locator('.split-detail').getByText('화·목 16:00~17:00')).toBeVisible()
  await expect(page.getByText(/부터 이 일정이에요/)).toBeVisible()
})
