import { useMemo } from 'react'
import { today, type DateStr, type Weekday } from '../utils/date'
import { classRemovalChanges, enrollmentRemovalChanges } from './cascade'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { normalizePeriods, sameSlots, sortSlots, withScheduleChange } from './rules'
import { isCurrentEnrollment } from './schedule'
import { newEnrollment } from './students'
import type { AbsenceCounting, Change, ClassGroup, Enrollment, FeeRule, MakeupRule, TimeSlot } from './types'

/** 반을 저장할 때 화면에서 넘기는 내용 (id가 없으면 새 반) */
export interface ClassInput {
  id?: string
  name: string
  subject: string
  color: string
  place: string
  memo: string
  startedOn: DateStr
  /** 수업 요일과 시간 (지금 쓰는 일정) */
  slots: TimeSlot[]
  /** 요일이나 시간을 바꿨을 때 새 일정을 적용할 첫날. 없으면 오늘 */
  scheduleFrom?: DateStr
  /** 수업을 그만하는 반이면 마지막 수업 날. 없으면 계속하는 반 */
  endedOn?: DateStr
  fee: FeeRule
  absenceCounting: AbsenceCounting
  makeupRule: MakeupRule
}

/** 가장 나중에 시작하는 일정 (반 설정 화면에서 고치는 일정) */
export function latestSlots(cls: ClassGroup): TimeSlot[] {
  return cls.schedules[cls.schedules.length - 1]?.value ?? []
}

/** 반 목록(만든 순서)과 반을 바꾸는 기능 */
export function useClasses() {
  const { data, apply } = useData()
  const classes = useMemo(() => [...data.classes].sort((a, b) => a.order - b.order), [data.classes])

  /** 반을 저장합니다. 새 반이면 고른 학생을 반 시작일(지났으면 오늘)부터 넣습니다. */
  async function saveClass(input: ClassInput, studentIds: string[] = []): Promise<ClassGroup> {
    const now = nowIso()
    const existing = input.id ? data.classes.find((cls) => cls.id === input.id) : undefined
    const { id: _id, slots, scheduleFrom, endedOn, ...fields } = input
    // 전에 닫았던 반을 다시 열 수 있게, 닫은 날은 넘겨받은 값으로만 정합니다.
    const { endedOn: _wasEndedOn, ...kept }: Partial<ClassGroup> = existing ?? {}
    const schedules = existing
      ? sameSlots(latestSlots(existing), slots)
        ? normalizePeriods(existing.schedules, input.startedOn)
        : withScheduleChange(existing.schedules, slots, scheduleFrom ?? today(), input.startedOn, newId)
      : [{ id: newId(), startsOn: input.startedOn, value: sortSlots(slots) }]
    const item: ClassGroup = {
      ...kept,
      ...fields,
      ...(endedOn ? { endedOn } : {}),
      schedules,
      id: existing?.id ?? newId(),
      order: existing?.order ?? classes.reduce((max, cls) => Math.max(max, cls.order), -1) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    const changes: Change[] = [{ type: 'put', collection: 'classes', item }]
    if (!existing) {
      const startedOn = input.startedOn > today() ? input.startedOn : today()
      for (const studentId of studentIds) {
        changes.push({ type: 'put', collection: 'enrollments', item: newEnrollment(item.id, studentId, startedOn, now) })
      }
    }
    await apply(changes)
    return item
  }

  /** 반을 지우면 그 반의 수강, 출결, 보강, 납부 기록도 함께 지웁니다. */
  async function removeClass(id: string) {
    await apply(classRemovalChanges(data, id))
  }

  return { classes, saveClass, removeClass }
}

/** 수강을 고칠 때 화면에서 넘기는 내용 */
export interface EnrollmentPatch {
  startedOn: DateStr
  endedOn?: DateStr
  /** 듣는 요일. 반의 모든 수업을 들으면 undefined */
  weekdays?: Weekday[]
  /** 이 학생만 다른 수강료. 반 기본 수강료를 따르면 undefined */
  fee?: FeeRule
  startCredit: number
}

/** 학생을 반에 넣고 빼는 기능 */
export function useEnrollments() {
  const { data, apply } = useData()

  /** 학생들을 반에 넣습니다. 이미 다니는 학생은 건너뜁니다. */
  async function enroll(classId: string, studentIds: string[], startedOn: DateStr) {
    const now = nowIso()
    const todayStr = today()
    const changes: Change[] = []
    for (const studentId of studentIds) {
      const already = data.enrollments.some(
        (item) => item.classId === classId && item.studentId === studentId && isCurrentEnrollment(item, todayStr),
      )
      if (!already) changes.push({ type: 'put', collection: 'enrollments', item: newEnrollment(classId, studentId, startedOn, now) })
    }
    await apply(changes)
  }

  async function saveEnrollment(enrollment: Enrollment, patch: EnrollmentPatch) {
    const { endedOn: _endedOn, weekdays: _weekdays, fee: _fee, ...rest } = enrollment
    const item: Enrollment = {
      ...rest,
      startedOn: patch.startedOn,
      startCredit: patch.startCredit,
      ...(patch.endedOn ? { endedOn: patch.endedOn } : {}),
      ...(patch.weekdays ? { weekdays: patch.weekdays } : {}),
      ...(patch.fee ? { fee: patch.fee } : {}),
      updatedAt: nowIso(),
    }
    await apply([{ type: 'put', collection: 'enrollments', item }])
  }

  /** 잘못 넣은 수강을 기록째 지웁니다. */
  async function removeEnrollment(enrollment: Enrollment) {
    await apply(enrollmentRemovalChanges(data, enrollment))
  }

  return { enrollments: data.enrollments, enroll, saveEnrollment, removeEnrollment }
}
