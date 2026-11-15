import { addDays, addMonths, daysBetween, endOfMonth, formatDate, startOfMonth, type DateStr, type TimeStr } from '../utils/date'
import { lessonOn, noteId, type DataIndex } from './schedule'
import type { ClassGroup, Makeup, MakeupRule } from './types'

/** 보강 기한. undefined면 기한 없음 */
export function makeupDeadline(rule: MakeupRule, missedOn: DateStr): DateStr | undefined {
  switch (rule.window.type) {
    case 'days':
      return addDays(missedOn, rule.window.days)
    case 'sameMonth':
      return endOfMonth(missedOn)
    case 'nextMonthEnd':
      return endOfMonth(addMonths(startOfMonth(missedOn), 1))
    case 'none':
      return undefined
  }
}

/** 화면에 보여주는 보강 상태: 대기, 예정, 완료, 기한 만료, 보강 안 함 */
export type MakeupState = 'pending' | 'scheduled' | 'done' | 'expired' | 'skipped'

export const MAKEUP_STATE_LABELS: Record<MakeupState, string> = {
  pending: '대기',
  scheduled: '예정',
  done: '완료',
  expired: '기한 지남',
  skipped: '보강 안 함',
}

export const MAKEUP_REASON_LABELS: Record<Makeup['reason'], string> = {
  absent: '결석',
  cancelled: '휴강',
}

/** 기한 만료는 따로 저장하지 않고, 날짜를 잡지 않은 채 기한이 지나면 그렇게 봅니다. */
export function makeupState(makeup: Makeup, todayStr: DateStr): MakeupState {
  if (makeup.status === 'done') return 'done'
  if (makeup.status === 'skipped') return 'skipped'
  if (makeup.scheduledOn) return 'scheduled'
  if (makeup.deadline && makeup.deadline < todayStr) return 'expired'
  return 'pending'
}

/** 남은 보강인지 (대기, 예정) */
export function isOpenState(state: MakeupState): boolean {
  return state === 'pending' || state === 'scheduled'
}

/** 예: '11월 13일 (금)까지, 14일 남음', '오늘까지', '기한 없음' */
export function describeDeadline(deadline: DateStr | undefined, todayStr: DateStr): string {
  if (!deadline) return '기한 없음'
  const left = daysBetween(todayStr, deadline)
  if (left < 0) return `${formatDate(deadline)}까지였어요`
  if (left === 0) return '오늘까지'
  return `${formatDate(deadline)}까지, ${left}일 남음`
}

/** 남은 보강을 급한 순서로: 예정일이 있으면 예정일, 없으면 기한 (기한 없음은 맨 뒤) */
export function urgencyKey(makeup: Makeup): string {
  return makeup.scheduledOn ?? makeup.deadline ?? '9999-12-31'
}

/** 'HH:MM'에 분을 더합니다. 자정을 넘기면 23:59로 맞춥니다. */
function addMinutes(time: TimeStr, minutes: number): TimeStr {
  const [hours, mins] = time.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function minutesBetween(start: TimeStr, end: TimeStr): number {
  const [startHours, startMins] = start.split(':').map(Number)
  const [endHours, endMins] = end.split(':').map(Number)
  return endHours * 60 + endMins - (startHours * 60 + startMins)
}

/**
 * 보강 날짜를 잡을 때 기본 시각.
 * - 그날 이 반의 수업이 있으면 **그 수업이 끝난 바로 뒤** (같은 길이). 원래 수업 시간과 겹치지 않게
 * - 없으면 빠진 날의 수업 시각, 그것도 없으면 16:00~17:00
 */
export function defaultMakeupTime(cls: ClassGroup, date: DateStr, missedOn: DateStr): { start: TimeStr; end: TimeStr } {
  const sameDay = lessonOn(cls, date)
  if (sameDay) return { start: sameDay.end, end: addMinutes(sameDay.end, Math.max(10, minutesBetween(sameDay.start, sameDay.end))) }
  const missed = lessonOn(cls, missedOn)
  return missed ? { start: missed.start, end: missed.end } : { start: '16:00', end: '17:00' }
}

/** 두 시간대가 겹치는지 */
export function timesOverlap(aStart: TimeStr, aEnd: TimeStr, bStart: TimeStr, bEnd: TimeStr): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * 보강 날짜를 정할 때 알려줄 점. 맞지 않아도 저장은 되고, 알려주기만 합니다.
 * (기한을 넘김, 그 시간에 다른 수업이 있음)
 */
export function scheduleWarnings(input: {
  index: DataIndex
  makeups: Makeup[]
  date: DateStr
  start: TimeStr
  end: TimeStr
  /** 다른 수업 시간에 같이 듣게 하면 그 반 (그 수업과는 겹쳐도 됨) */
  joinClassId?: string
}): string[] {
  const { index, makeups, date, start, end, joinClassId } = input
  const warnings: string[] = []
  const late = makeups.filter((makeup) => makeup.deadline && date > makeup.deadline)
  if (late.length > 0) {
    const deadline = late.map((makeup) => makeup.deadline!).sort()[0]
    warnings.push(`보강 기한(${formatDate(deadline)})이 지난 날짜예요.`)
  }
  for (const cls of index.db.classes) {
    if (cls.id === joinClassId) continue
    const lesson = lessonOn(cls, date)
    if (lesson && !index.notes.get(noteId(cls.id, date))?.cancelled && timesOverlap(start, end, lesson.start, lesson.end)) {
      warnings.push(`${cls.name} 수업(${lesson.start}~${lesson.end})과 시간이 겹쳐요.`)
    }
  }
  return warnings
}
