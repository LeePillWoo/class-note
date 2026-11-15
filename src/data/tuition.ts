import { addDays, type DateStr } from '../utils/date'
import { makeupState } from './makeupRules'
import { compareStudents, isCurrentEnrollment, makeupId, pairKey, studentLessons, studentStatus, type DataIndex, type RollStatus } from './schedule'
import type { AbsenceCounting, Billing, Enrollment, FeeRule, Makeup, Payment, PaymentKind, PaymentMethod } from './types'

/**
 * 수강료는 **횟수로만** 받습니다. (예: 8회 24만 원)
 *
 * 셈하는 방법은 횟수권과 같습니다.
 * - 수강료를 받으면 그 횟수만큼 "남은 횟수"가 채워집니다.
 * - 수업을 하면 한 번씩 줄어듭니다.
 * - 선납: 남은 횟수를 다 쓰면, 그다음 수업 날이 새 수강료를 받을 날입니다. (묶음의 첫 수업 날)
 * - 후납: 정한 횟수를 다 들은 날이 받을 날입니다. (묶음의 마지막 수업 날)
 *
 * 달에 수업이 다섯 번 있어도 따로 할 일이 없습니다. 다섯 번째 수업은 다음 묶음의 첫 회가 됩니다.
 */

/** 앞으로의 수업을 얼마나 내다볼지 (다음 받을 날을 미리 알려주려고) */
const LOOKAHEAD_DAYS = 180
/** 한 학생·반에서 한꺼번에 보여줄 밀린 수강료 수 */
const MAX_DUES = 12

/**
 * 이 수업을 회차로 세는지.
 * - 출석, 체크 전(지난 수업은 한 것으로 봄), 예정: 셈 / 휴강: 안 셈
 * - 결석: 'always'면 셈, 'never'면 안 셈, 'ifNoMakeup'이면 보강이 안 되는 것(보강 안 함, 기한 지남, 보강 없음)만 셈
 *
 * 다녀온 보강은 sessionMarks에서 따로 셉니다. 그래서 결석 하나에 보강까지 하면 어느 방식이든 회차는 정확히 1 늘어납니다.
 */
export function countsAsSession(status: RollStatus, counting: AbsenceCounting, makeup: Makeup | undefined, todayStr: DateStr): boolean {
  switch (status) {
    case 'present':
    case 'unchecked':
    case 'planned':
      return true
    case 'cancelled':
      return false
    case 'absent': {
      if (counting === 'always') return true
      if (counting === 'never') return false
      if (!makeup) return true
      const state = makeupState(makeup, todayStr)
      return state === 'skipped' || state === 'expired'
    }
  }
}

/** 회차로 세는 수업 하나 */
export interface SessionMark {
  date: DateStr
  /** 정규 수업인지, 보강으로 한 수업인지 */
  kind: 'lesson' | 'makeup'
  /** 오늘까지 실제로 한 수업인지. 오늘 수업은 출결을 적어야 한 것으로 봅니다. 앞으로의 수업은 false */
  used: boolean
}

function pairEnrollments(index: DataIndex, studentId: string, classId: string): Enrollment[] {
  return (index.enrollmentsByStudent.get(studentId) ?? []).filter((item) => item.classId === classId)
}

/** 한 학생이 한 반에서 회차로 세는 수업들 (날짜 순서). 첫 수강 시작일부터 until까지, 앞으로의 수업은 예정대로 셉니다. */
export function sessionMarks(index: DataIndex, studentId: string, classId: string, until: DateStr, todayStr: DateStr): SessionMark[] {
  const cls = index.classes.get(classId)
  const enrollments = pairEnrollments(index, studentId, classId)
  if (!cls || enrollments.length === 0) return []
  const counting = index.settings.absenceCounting
  const marks: SessionMark[] = []
  for (const lesson of studentLessons(index, studentId, classId, enrollments[0].startedOn, until, todayStr)) {
    const makeup = index.makeups.get(makeupId(classId, lesson.date, studentId))
    if (!countsAsSession(lesson.status, counting, makeup, todayStr)) continue
    marks.push({
      date: lesson.date,
      kind: 'lesson',
      used: lesson.date < todayStr || (lesson.date === todayStr && lesson.status !== 'planned'),
    })
  }
  for (const makeup of index.makeupsByStudent.get(studentId) ?? []) {
    if (makeup.classId !== classId || makeup.status !== 'done' || !makeup.scheduledOn || makeup.scheduledOn > until) continue
    // 결석도 세는 반은 결석한 날에 이미 셌으므로 그 보강은 다시 세지 않습니다. (휴강 보강은 셉니다)
    if (counting === 'always' && makeup.reason === 'absent') continue
    marks.push({ date: makeup.scheduledOn, kind: 'makeup', used: makeup.scheduledOn <= todayStr })
  }
  return marks.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))
}

/** 이 학생에게 적용하는 수강료: 학생만 다르게 정했으면 그것, 아니면 반의 기본 수강료 */
export function feeFor(index: DataIndex, studentId: string, classId: string): FeeRule {
  const enrollments = pairEnrollments(index, studentId, classId)
  const own = enrollments[enrollments.length - 1]?.fee
  const fee = own ?? index.classes.get(classId)?.fee ?? { amount: 0, sessionCount: 1 }
  return { amount: fee.amount, sessionCount: Math.max(1, fee.sessionCount) }
}

/** 아직 받지 못한 수강료 하나 */
export interface TuitionDue {
  key: string
  studentId: string
  classId: string
  /** 받을 날: 선납은 묶음의 첫 수업 날, 후납은 묶음의 마지막 수업 날 */
  dueOn: DateStr
  sessions: number
  amount: number
}

/** 한 학생이 한 반에서 수강료를 어디까지 냈고 얼마나 썼는지 */
export interface TuitionState {
  studentId: string
  classId: string
  fee: FeeRule
  billing: Billing
  /** 받은 수강료로 채워진 횟수 (앱에 넣을 때 남아 있던 횟수 포함) */
  covered: number
  /** 오늘까지 한 수업 횟수 */
  used: number
  /** 남은 횟수. 음수면 수업은 했는데 아직 수강료를 받지 못한 횟수 */
  remaining: number
  /** 아직 받지 못한 수강료 (받을 날 순서, 앞으로 180일까지). 첫 항목이 다음에 받을 것 */
  dues: TuitionDue[]
  /** 보강을 하는지에 따라 회차가 달라지는 결석 수 ('보강을 안 하면 셈' 반에서 아직 대기·예정인 결석 보강) */
  undecidedMakeups: number
  /** 지금 다니는 중인지 (수강이 끝났거나 그만둔 학생은 false) */
  current: boolean
}

export function tuitionState(index: DataIndex, studentId: string, classId: string, todayStr: DateStr): TuitionState | null {
  const cls = index.classes.get(classId)
  const student = index.students.get(studentId)
  const enrollments = pairEnrollments(index, studentId, classId)
  if (!cls || !student || enrollments.length === 0) return null
  const fee = feeFor(index, studentId, classId)
  const size = fee.sessionCount

  const marks = sessionMarks(index, studentId, classId, addDays(todayStr, LOOKAHEAD_DAYS), todayStr)
  const paid = (index.tuitionByPair.get(pairKey(studentId, classId)) ?? []).reduce((sum, payment) => sum + (payment.sessions ?? 0), 0)
  const covered = enrollments.reduce((sum, item) => sum + item.startCredit, 0) + paid
  const used = marks.filter((mark) => mark.used).length

  // 받을 날이 되는 수업: 선납은 묶음의 첫 회, 후납은 마지막 회
  const offset = cls.billing === 'postpaid' ? size - 1 : 0
  const dues: TuitionDue[] = []
  for (let position = covered; position + offset < marks.length && dues.length < MAX_DUES; position += size) {
    dues.push({ key: `${pairKey(studentId, classId)}|${position}`, studentId, classId, dueOn: marks[position + offset].date, sessions: size, amount: fee.amount })
  }

  const undecidedMakeups =
    index.settings.absenceCounting === 'ifNoMakeup'
      ? (index.makeupsByStudent.get(studentId) ?? []).filter((makeup) => {
          if (makeup.classId !== classId || makeup.reason !== 'absent') return false
          const state = makeupState(makeup, todayStr)
          return state === 'pending' || state === 'scheduled'
        }).length
      : 0

  return {
    studentId,
    classId,
    fee,
    billing: cls.billing,
    covered,
    used,
    remaining: covered - used,
    dues,
    undecidedMakeups,
    current: studentStatus(student, todayStr) !== 'left' && enrollments.some((item) => isCurrentEnrollment(item, todayStr)),
  }
}

/** 지금 받아야 할 수강료가 있으면 그 받을 날. 없으면 undefined (미리 받는 수강료) */
export function dueNowOn(state: Pick<TuitionState, 'dues'>, todayStr: DateStr): DateStr | undefined {
  const due = state.dues[0]
  return due && due.dueOn <= todayStr ? due.dueOn : undefined
}

/** 수강이 있는 모든 학생·반의 수강료 상태 (반 순서, 학생 이름 순서) */
export function allTuitionStates(index: DataIndex, todayStr: DateStr): TuitionState[] {
  const seen = new Set<string>()
  const states: TuitionState[] = []
  for (const enrollment of index.db.enrollments) {
    const key = pairKey(enrollment.studentId, enrollment.classId)
    if (seen.has(key)) continue
    seen.add(key)
    const state = tuitionState(index, enrollment.studentId, enrollment.classId, todayStr)
    if (state) states.push(state)
  }
  const classOrder = (id: string) => index.classes.get(id)?.order ?? 0
  return states.sort(
    (a, b) => classOrder(a.classId) - classOrder(b.classId) || compareStudents(index.students.get(a.studentId)!, index.students.get(b.studentId)!),
  )
}

/**
 * 지금 묶음의 진행 (막대용)
 * - 선납: 받은 묶음에서 몇 회를 썼는지. 예: 8회 중 3회 남았으면 5/8. 남은 횟수가 없으면 꽉 찬 것으로(8/8)
 * - 후납: 아직 받지 않은 수업이 몇 회인지. 예: 3회 들었으면 3/8
 */
export function bundleProgress(state: Pick<TuitionState, 'fee' | 'remaining' | 'covered' | 'billing'>): { filled: number; size: number } {
  const size = state.fee.sessionCount
  if (state.billing === 'postpaid') {
    const owed = -state.remaining
    return { filled: owed <= 0 ? 0 : Math.min(owed, size), size }
  }
  // 아직 받은 적도 수업한 적도 없는 새 학생은 빈 막대
  if (state.remaining === 0 && state.covered === 0) return { filled: 0, size }
  if (state.remaining <= 0) return { filled: size, size }
  return { filled: (size - (state.remaining % size)) % size, size }
}

/**
 * 남은 횟수를 한마디로
 * - 선납: '3회 남음', '다 썼어요', '2회 밀림', 새 학생은 '받기 전'
 * - 후납: '3/8회 들음', '8회 들음'(받을 때), '2회 미리 받음', 새 학생은 '수업 전'
 */
export function describeRemaining(state: Pick<TuitionState, 'remaining' | 'covered' | 'billing' | 'fee'>): string {
  if (state.billing === 'postpaid') {
    const owed = -state.remaining
    if (owed < 0) return `${-owed}회 미리 받음`
    if (owed === 0) return state.covered === 0 ? '수업 전' : '정산 끝'
    if (owed < state.fee.sessionCount) return `${owed}/${state.fee.sessionCount}회 들음`
    return `${owed}회 들음`
  }
  if (state.remaining > 0) return `${state.remaining}회 남음`
  if (state.remaining === 0) return state.covered === 0 ? '받기 전' : '다 썼어요'
  return `${-state.remaining}회 밀림`
}

/** 받을 날이 지난 수강료가 있는지 (빨간색으로 보여줌) */
export function isBehind(state: Pick<TuitionState, 'dues'>, todayStr: DateStr): boolean {
  return state.dues.length > 0 && state.dues[0].dueOn < todayStr
}

// ===== 받을 돈 목록 =====

/** 받을 날이 지남, 오늘, 앞으로 */
export type DueStatus = 'overdue' | 'today' | 'upcoming'

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  overdue: '받을 날 지남',
  today: '오늘 받을 날',
  upcoming: '받을 예정',
}

export function dueStatus(dueOn: DateStr, todayStr: DateStr): DueStatus {
  if (dueOn < todayStr) return 'overdue'
  return dueOn === todayStr ? 'today' : 'upcoming'
}

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  tuition: '수강료',
  textbook: '교재비',
  special: '특강비',
  other: '기타',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: '카드',
  transfer: '이체',
  cash: '현금',
  other: '기타',
}

/** 받을 돈 한 줄: 계산한 수강료이거나, 청구해 둔 교재비 같은 추가 항목 */
export interface DueView {
  key: string
  studentId: string
  classId?: string
  kind: PaymentKind
  title: string
  dueOn: DateStr
  amount: number
  status: DueStatus
  /** 수강료면 채워질 횟수 */
  sessions?: number
  /** 추가 항목이면 저장된 기록 */
  record?: Payment
}

/** until까지 받을 돈 (받을 날 순서). 수강료는 계산하고, 교재비 같은 추가 항목은 아직 못 받은 것을 넣습니다. */
export function dueViews(index: DataIndex, states: TuitionState[], until: DateStr, todayStr: DateStr): DueView[] {
  const views: DueView[] = []
  for (const state of states) {
    for (const due of state.dues) {
      if (due.dueOn > until) break
      views.push({ ...due, kind: 'tuition', title: `${due.sessions}회분`, status: dueStatus(due.dueOn, todayStr) })
    }
  }
  for (const payment of index.db.payments) {
    if (payment.kind === 'tuition' || payment.paidOn || payment.dueOn > until || !index.students.has(payment.studentId)) continue
    views.push({
      key: `extra|${payment.id}`,
      studentId: payment.studentId,
      classId: payment.classId,
      kind: payment.kind,
      title: payment.title,
      dueOn: payment.dueOn,
      amount: payment.amount,
      status: dueStatus(payment.dueOn, todayStr),
      record: payment,
    })
  }
  return views.sort(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || compareStudents(index.students.get(a.studentId)!, index.students.get(b.studentId)!),
  )
}

/** 그 달('YYYY-MM')에 받은 돈 (받은 날 최근 순서) */
export function paidInMonth(payments: Payment[], month: string): Payment[] {
  return payments
    .filter((payment) => payment.paidOn?.startsWith(month))
    .sort((a, b) => `${b.paidOn}${b.updatedAt}`.localeCompare(`${a.paidOn}${a.updatedAt}`))
}

export function sumAmounts(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}
