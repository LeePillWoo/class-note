import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, type DateStr } from '../utils/date'
import { formatFee, formatWon } from '../utils/money'
import type { AbsenceCounting, Billing, FeeRule, MakeupRule, MakeupWindow, Period, TimeSlot } from './types'

/** date에 적용되는 기간 설정. date가 첫 기간보다 앞이면 첫 기간을 씁니다. */
export function periodAt<T>(periods: Period<T>[], date: DateStr): T {
  let current = periods[0]
  for (const period of periods) {
    if (period.startsOn <= date) current = period
  }
  return current.value
}

/** 기간을 시작일 순서로 정렬하고, 첫 기간의 시작일을 반 시작일에 맞춥니다. */
export function normalizePeriods<T>(periods: Period<T>[], startedOn: DateStr): Period<T>[] {
  const sorted = [...periods].sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  return sorted.map((period, index) => (index === 0 ? { ...period, startsOn: startedOn } : period))
}

/**
 * 일정을 바꿉니다. applyFrom부터 새 일정을 쓰고, 그 앞의 기간은 그대로 둡니다. (지난 수업 기록이 어긋나지 않게)
 * applyFrom이 첫 기간보다 앞이거나 같으면 일정을 통째로 바꿉니다.
 */
export function withScheduleChange(
  periods: Period<TimeSlot[]>[],
  slots: TimeSlot[],
  applyFrom: DateStr,
  startedOn: DateStr,
  newId: () => string,
): Period<TimeSlot[]>[] {
  const kept = periods.filter((period) => period.startsOn < applyFrom)
  return normalizePeriods([...kept, { id: newId(), startsOn: applyFrom, value: sortSlots(slots) }], kept.length === 0 ? startedOn : kept[0].startsOn)
}

/** 요일 순서(월~일)로 정렬 */
export function sortSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort(
    (a, b) => WEEKDAYS_FROM_MONDAY.indexOf(a.weekday) - WEEKDAYS_FROM_MONDAY.indexOf(b.weekday) || a.start.localeCompare(b.start),
  )
}

export function sameSlots(a: TimeSlot[], b: TimeSlot[]): boolean {
  const left = sortSlots(a)
  const right = sortSlots(b)
  return (
    left.length === right.length &&
    left.every((slot, index) => slot.weekday === right[index].weekday && slot.start === right[index].start && slot.end === right[index].end)
  )
}

/** 예: '월·수·금' (시각 없이 요일만) */
export function describeWeekdays(slots: TimeSlot[]): string {
  if (slots.length === 0) return '요일 없음'
  return sortSlots(slots)
    .map((slot) => WEEKDAY_NAMES[slot.weekday])
    .join('·')
}

/** 예: '월·수·금 17:00~18:30', 시간이 다르면 '월 17:00~18:30, 토 10:00~12:00' */
export function describeSlots(slots: TimeSlot[]): string {
  if (slots.length === 0) return '요일 없음'
  const sorted = sortSlots(slots)
  const sameTime = sorted.every((slot) => slot.start === sorted[0].start && slot.end === sorted[0].end)
  if (sameTime) {
    return `${sorted.map((slot) => WEEKDAY_NAMES[slot.weekday]).join('·')} ${sorted[0].start}~${sorted[0].end}`
  }
  return sorted.map((slot) => `${WEEKDAY_NAMES[slot.weekday]} ${slot.start}~${slot.end}`).join(', ')
}

/** 예: '8회 24만 원', 금액을 안 정했으면 '8회 금액 미정' */
export function describeFee(fee: FeeRule): string {
  return `${fee.sessionCount}회 ${formatFee(fee.amount)}`
}

/** 1회 금액. 예: 8회 16만 원 → '1회 2만 원'. 나누어떨어지지 않으면 '1회 약 2만 833원'. 금액이 없으면 빈 글자 */
export function perSessionText(fee: FeeRule): string {
  if (!fee.amount || fee.sessionCount < 1) return ''
  const exact = fee.amount % fee.sessionCount === 0
  return `1회 ${exact ? '' : '약 '}${formatWon(Math.round(fee.amount / fee.sessionCount))}`
}

export const BILLING_LABELS: Record<Billing, string> = {
  prepaid: '선납',
  postpaid: '후납',
}

export const BILLING_HINTS: Record<Billing, string> = {
  prepaid: '묶음의 첫 수업 날에 받아요. 받은 횟수를 다 쓰면 그다음 수업 날이 받을 날이에요.',
  postpaid: '묶음의 마지막 수업 날에 받아요. 정한 횟수를 다 들으면 그날이 받을 날이에요.',
}

export const ABSENCE_COUNTING_LABELS: Record<AbsenceCounting, string> = {
  never: '결석은 회차로 세지 않음',
  ifNoMakeup: '보강하면 안 세고, 보강을 안 하면 셈',
  always: '결석해도 회차로 셈',
}

export const ABSENCE_COUNTING_HINTS: Record<AbsenceCounting, string> = {
  never: '결석한 수업은 남은 횟수에서 빠지지 않아요. 보강을 하면 보강한 날에 한 번 셉니다.',
  ifNoMakeup: '보강을 하면 보강한 날에 한 번 셉니다. 보강을 안 하기로 하거나 기한이 지나면 결석한 날에 셉니다.',
  always: '결석해도 그 수업은 한 것으로 셉니다. 보강을 해도 회차는 더 늘지 않아요.',
}

export function describeMakeupWindow(window: MakeupWindow): string {
  switch (window.type) {
    case 'days':
      return `빠진 날부터 ${window.days}일 안`
    case 'sameMonth':
      return '같은 달 안'
    case 'nextMonthEnd':
      return '다음 달 말까지'
    case 'none':
      return '기한 없음'
  }
}

/** 예: '결석·휴강 보강, 빠진 날부터 14일 안', 보강이 없으면 '보강 없음' */
export function describeMakeupRule(rule: MakeupRule): string {
  const targets = [rule.forAbsence && '결석', rule.forCancellation && '휴강'].filter(Boolean)
  if (targets.length === 0) return '보강 없음'
  return `${targets.join('·')} 보강, ${describeMakeupWindow(rule.window)}`
}


