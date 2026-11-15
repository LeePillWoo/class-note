import { expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** 처음 화면에서 예시 데이터를 넣습니다. (지어낸 학생 8명, 반 4개) */
export async function loadSample(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '예시 데이터 넣기' }).click()
  await expect(page.getByRole('heading', { name: '오늘 수업' })).toBeVisible()
}

/** 내용이 화면보다 넓어지지 않았는지 검사합니다. 넓어지면 휴대폰 브라우저가 화면 전체를 축소해서 보여줍니다. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth, '내용이 화면보다 넓습니다').toBeLessThanOrEqual(clientWidth)
}

/** 화면 그림을 shots/<화면 크기>/<이름>.png 로 남깁니다. (눈으로 확인할 때 봅니다. Git에는 올리지 않습니다) */
export async function shot(page: Page, testInfo: TestInfo, name: string, options: { fullPage?: boolean } = {}) {
  const dir = join(testInfo.config.rootDir, '..', '..', 'shots', testInfo.project.name)
  mkdirSync(dir, { recursive: true })
  // 제목 글꼴이 내려받아진 뒤에 찍습니다.
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: options.fullPage ?? false })
}

/** 지금 화면 크기에서 메뉴가 왼쪽에 있어야 하는지 (styles.css의 규칙과 같음) */
export function expectsRail(page: Page): boolean {
  const size = page.viewportSize()!
  return size.width >= 768 || (size.width > size.height && size.width >= 600)
}

/** 요일 단추를 누릅니다. 예: toggleWeekdays(page, '수업', ['월', '수']) */
export async function toggleWeekdays(page: Page, label: string, days: string[]) {
  const group = page.getByRole('group', { name: `${label} 요일` })
  for (const day of days) await group.getByRole('button', { name: day, exact: true }).click()
}

const ALL_DAYS = ['월', '화', '수', '목', '금', '토', '일']

interface LessonOptions {
  /** 수업 요일. 없으면 매일 (오늘이 항상 수업일이 되게) */
  days?: string[]
  start?: string
  end?: string
  /** 몇 회 (기본 4) */
  count?: string
  /** 수강료 (기본 100000) */
  amount?: string
  /** 후납 */
  postpaid?: boolean
}

async function fillLesson(page: Page, options: LessonOptions) {
  const days = options.days ?? ALL_DAYS
  await toggleWeekdays(page, '수업', [days[0]])
  if (options.start) await page.getByLabel(`수업 ${days[0]}요일 시작 시각`).fill(options.start)
  if (options.end) await page.getByLabel(`수업 ${days[0]}요일 끝 시각`).fill(options.end)
  // 나머지 요일은 첫 요일의 시간을 그대로 따릅니다.
  await toggleWeekdays(page, '수업', days.slice(1))
  await page.getByLabel('횟수', { exact: true }).fill(options.count ?? '4')
  await page.getByLabel('수강료', { exact: true }).fill(options.amount ?? '100000')
  if (options.postpaid) await page.getByRole('radiogroup', { name: '수강료 받는 때' }).getByRole('radio', { name: '후납' }).click()
}

/** 1:1 레슨을 등록합니다. 등록한 뒤에는 그 학생(레슨) 화면이 열려 있습니다. */
export async function addSolo(page: Page, name: string, options: LessonOptions & { birthYear?: string } = {}) {
  await page.goto('/#/lessons/new/solo')
  await page.getByLabel('이름', { exact: true }).fill(name)
  if (options.birthYear) await page.getByLabel('출생 연도').fill(options.birthYear)
  await fillLesson(page, options)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

/** 그룹 수업을 만듭니다. newStudents는 새로 적을 학생 이름. 만든 뒤에는 그 수업 화면이 열려 있습니다. */
export async function addGroup(page: Page, name: string, options: LessonOptions & { newStudents?: string[] } = {}) {
  await page.goto('/#/lessons/new/group')
  await page.getByLabel('수업 이름').fill(name)
  await fillLesson(page, options)
  for (const [position, student] of (options.newStudents ?? []).entries()) {
    await page.getByRole('button', { name: '새 학생 적기' }).click()
    await page.getByLabel(`새 학생 ${position + 1} 이름`).fill(student)
  }
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

/** 날짜 칸을 눌러 달력 창에서 날짜를 고릅니다. dateLabel 예: '2026년 11월 7일 (토)' */
export async function pickDate(page: Page, fieldLabel: string, dateLabel: string) {
  await page.getByRole('button', { name: new RegExp(`^${fieldLabel}`) }).click()
  const picker = page.getByRole('dialog', { name: `${fieldLabel} 고르기` })
  // 날짜 단추 이름은 '2026년 11월 7일 (토)' 뒤에 ', 오늘' 같은 말이 붙을 수 있어서 앞부분으로 찾습니다.
  await picker.locator(`button[aria-label^="${dateLabel}"]`).click()
  await expect(picker).toBeHidden()
}

/** 브라우저 기준으로 오늘에서 offset일 뒤의 날짜. label은 달력 창의 날짜 단추 이름 앞부분 (예: '2026년 11월 16일 (월)') */
export async function dayOffset(page: Page, offset: number): Promise<{ date: string; label: string; monthDiff: number }> {
  return page.evaluate((days) => {
    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
    const pad = (value: number) => String(value).padStart(2, '0')
    return {
      date: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`,
      label: `${target.getFullYear()}년 ${target.getMonth() + 1}월 ${target.getDate()}일 (${'일월화수목금토'[target.getDay()]})`,
      monthDiff: (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth(),
    }
  }, offset)
}

/** 날짜 칸을 눌러 오늘에서 offset일 뒤의 날짜를 고릅니다. 달이 넘어가면 달력을 넘깁니다. (날짜 칸이 오늘이나 빈 값에서 시작할 때) */
export async function pickDayOffset(page: Page, fieldLabel: string, offset: number) {
  const target = await dayOffset(page, offset)
  // 날짜 칸의 이름은 '이름표 + 고른 날짜'라서 앞부분이 이름표와 같은 단추를 찾습니다. (이름표에 물음표가 있어도 그대로)
  await page.locator(`button.date-input[aria-label^="${fieldLabel} "]`).click()
  const picker = page.getByRole('dialog', { name: `${fieldLabel} 고르기` })
  for (let step = 0; step < Math.abs(target.monthDiff); step++) {
    await picker.getByRole('button', { name: target.monthDiff > 0 ? '다음 달' : '이전 달' }).click()
  }
  await picker.locator(`button[aria-label^="${target.label}"]`).click()
  await expect(picker).toBeHidden()
}

/** 다음에 뜨는 확인 창(window.confirm)에서 '확인'을 누릅니다. */
export function acceptNextConfirm(page: Page) {
  page.once('dialog', (dialog) => void dialog.accept())
}
