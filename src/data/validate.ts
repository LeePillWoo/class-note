import { PALETTE } from './colors'
import type { BaseRecord, CollectionName, FeeRule, MakeupRule, TimeSlot } from './types'

// 백업 파일에서 들어온 기록 검사. 밖에서 들어온 파일이라 믿지 않습니다.
// - 꼭 있어야 하는 칸이 없거나 모양이 틀리면 그 기록은 버립니다. (화면이 멈추지 않게)
// - 없어도 되는 칸이 틀리면 그 칸만 버리거나 처음 값으로 채웁니다.
// - 사진은 기기 안의 그림(data:image/...)만, 색은 #rrggbb만 받습니다. (바깥 주소로 요청이 나가지 않게)

type Raw = Record<string, unknown>

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const HEX = /^#[0-9a-f]{6}$/i
const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown): value is string => typeof value === 'string'
const date = (value: unknown): value is string => str(value) && DATE.test(value)
const time = (value: unknown): value is string => str(value) && TIME.test(value)
const int = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max
const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T => options.includes(value as T)

/** 없어도 되는 칸: 맞으면 넣고, 틀리거나 없으면 뺍니다. */
function optional<T>(key: string, value: unknown, check: (value: unknown) => value is T): Partial<Record<string, T>> {
  return check(value) ? { [key]: value } : {}
}

const text = (value: unknown, fallback = '') => (str(value) ? value : fallback)
const color = (value: unknown) => (str(value) && HEX.test(value) ? value : PALETTE[0].value)

function fee(value: unknown): FeeRule | null {
  if (!isRaw(value) || !int(value.sessionCount, 1, 999) || typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount < 0) return null
  return { sessionCount: value.sessionCount, amount: value.amount }
}

function slot(value: unknown): TimeSlot | null {
  if (!isRaw(value) || !int(value.weekday, 0, 6) || !time(value.start) || !time(value.end)) return null
  return { weekday: value.weekday as TimeSlot['weekday'], start: value.start, end: value.end }
}

function list<T>(value: unknown, item: (value: unknown) => T | null): T[] {
  return Array.isArray(value) ? value.flatMap((entry) => item(entry) ?? []) : []
}

const BILLINGS = ['prepaid', 'postpaid'] as const
const METHODS = ['card', 'transfer', 'cash', 'other'] as const

const VALIDATORS: Record<CollectionName, (item: Raw) => Raw | null> = {
  students(item) {
    if (!str(item.name) || !item.name.trim() || !date(item.enrolledOn)) return null
    return {
      name: item.name,
      color: color(item.color),
      ...optional('photo', item.photo, (value): value is string => str(value) && PHOTO.test(value)),
      ...optional('birthYear', item.birthYear, (value): value is number => int(value, 1900, 2100)),
      phone: text(item.phone),
      guardians: list(item.guardians, (value) =>
        isRaw(value) && str(value.id) && str(value.phone) ? { id: value.id, relation: text(value.relation), phone: value.phone } : null,
      ),
      enrolledOn: item.enrolledOn,
      pauses: list(item.pauses, (value) => (isRaw(value) && date(value.from) ? { from: value.from, ...optional('to', value.to, date) } : null)),
      ...optional('leftOn', item.leftOn, date),
      memo: text(item.memo),
    }
  },
  classes(item) {
    const schedules = list(item.schedules, (value) =>
      isRaw(value) && str(value.id) && date(value.startsOn) ? { id: value.id, startsOn: value.startsOn, value: list(value.value, slot) } : null,
    )
    const rule = fee(item.fee)
    if (!str(item.name) || !date(item.startedOn) || schedules.length === 0 || !rule) return null
    return {
      kind: oneOf(item.kind, ['solo', 'group'] as const) ? item.kind : 'group',
      name: item.name,
      subject: text(item.subject),
      color: color(item.color),
      memo: text(item.memo),
      order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : 0,
      startedOn: item.startedOn,
      ...optional('endedOn', item.endedOn, date),
      schedules,
      fee: rule,
      billing: oneOf(item.billing, BILLINGS) ? item.billing : 'prepaid',
    }
  },
  enrollments(item) {
    if (!str(item.classId) || !str(item.studentId) || !date(item.startedOn)) return null
    const weekdays = Array.isArray(item.weekdays) ? item.weekdays.filter((day) => int(day, 0, 6)) : undefined
    const rule = fee(item.fee)
    return {
      classId: item.classId,
      studentId: item.studentId,
      startedOn: item.startedOn,
      ...optional('endedOn', item.endedOn, date),
      ...(weekdays && weekdays.length > 0 ? { weekdays } : {}),
      ...(rule ? { fee: rule } : {}),
      ...optional('billing', item.billing, (value): value is string => oneOf(value, BILLINGS)),
      startCredit: int(item.startCredit, 0, 999) ? item.startCredit : 0,
    }
  },
  lessonNotes(item) {
    if (!str(item.classId) || !date(item.date)) return null
    return { classId: item.classId, date: item.date, cancelled: item.cancelled === true, memo: text(item.memo) }
  },
  attendance(item) {
    if (!str(item.classId) || !str(item.studentId) || !date(item.date) || !oneOf(item.status, ['present', 'absent'] as const)) return null
    return { classId: item.classId, studentId: item.studentId, date: item.date, status: item.status, memo: text(item.memo) }
  },
  makeups(item) {
    if (!str(item.classId) || !str(item.studentId) || !date(item.missedOn) || !oneOf(item.reason, ['absent', 'cancelled'] as const)) return null
    return {
      classId: item.classId,
      studentId: item.studentId,
      missedOn: item.missedOn,
      reason: item.reason,
      ...optional('deadline', item.deadline, date),
      ...optional('scheduledOn', item.scheduledOn, date),
      ...optional('start', item.start, time),
      ...optional('end', item.end, time),
      ...optional('joinClassId', item.joinClassId, str),
      status: oneOf(item.status, ['open', 'done', 'skipped'] as const) ? item.status : 'open',
      memo: text(item.memo),
    }
  },
  payments(item) {
    if (
      !str(item.studentId) ||
      !oneOf(item.kind, ['tuition', 'textbook', 'special', 'other'] as const) ||
      typeof item.amount !== 'number' ||
      !Number.isFinite(item.amount) ||
      !date(item.dueOn)
    ) {
      return null
    }
    return {
      studentId: item.studentId,
      ...optional('classId', item.classId, str),
      kind: item.kind,
      title: text(item.title),
      amount: item.amount,
      ...optional('sessions', item.sessions, (value): value is number => int(value, 1, 999)),
      dueOn: item.dueOn,
      ...optional('paidOn', item.paidOn, date),
      ...optional('method', item.method, (value): value is string => oneOf(value, METHODS)),
      memo: text(item.memo),
    }
  },
  settings(item) {
    // 기본 규칙은 칸마다 맞는 것만 받고, 나머지는 처음 값을 씁니다. (settingsOf가 채움) 모르는 칸은 버립니다.
    const rule = item.makeupRule
    const makeupRule: MakeupRule | undefined =
      isRaw(rule) && typeof rule.forAbsence === 'boolean' && typeof rule.forCancellation === 'boolean' && isRaw(rule.window)
        ? (() => {
            const window = rule.window as Raw
            if (window.type === 'days' && int(window.days, 1, 365)) return { forAbsence: rule.forAbsence, forCancellation: rule.forCancellation, window: { type: 'days', days: window.days } }
            if (oneOf(window.type, ['sameMonth', 'nextMonthEnd', 'none'] as const)) return { forAbsence: rule.forAbsence, forCancellation: rule.forCancellation, window: { type: window.type } }
            return undefined
          })()
        : undefined
    return {
      ...optional('sessionCount', item.sessionCount, (value): value is number => int(value, 1, 99)),
      ...optional('billing', item.billing, (value): value is string => oneOf(value, BILLINGS)),
      ...optional('absenceCounting', item.absenceCounting, (value): value is string => oneOf(value, ['never', 'always', 'ifNoMakeup'] as const)),
      ...(makeupRule ? { makeupRule } : {}),
      ...optional('method', item.method, (value): value is string => oneOf(value, METHODS)),
      ...optional('lessonMinutes', item.lessonMinutes, (value): value is number => int(value, 10, 600)),
      ...optional('lessonStart', item.lessonStart, time),
      ...optional('timeStep', item.timeStep, (value): value is number => value === 60 || value === 30 || value === 10),
      ...optional('paymentsEnabled', item.paymentsEnabled, (value): value is boolean => typeof value === 'boolean'),
    }
  },
}

/** 백업의 기록 하나를 검사합니다. 쓸 수 없으면 null */
export function validateRecord(collection: CollectionName, item: unknown): BaseRecord | null {
  if (!isRaw(item) || !str(item.id) || !item.id || item.id.length > 200) return null
  const cleaned = VALIDATORS[collection](item)
  if (!cleaned) return null
  return {
    ...cleaned,
    id: item.id,
    createdAt: text(item.createdAt),
    updatedAt: text(item.updatedAt),
  } as BaseRecord
}
