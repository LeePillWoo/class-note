import { useMemo } from 'react'
import { today, type DateStr, type Weekday } from '../utils/date'
import { classRemovalChanges, enrollmentRemovalChanges } from './cascade'
import { nextUnusedColor } from './colors'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { normalizePeriods, sameSlots, sortSlots, withScheduleChange } from './rules'
import { isCurrentEnrollment } from './schedule'
import { newEnrollment, studentRecord, type StudentFields } from './students'
import type { Billing, Change, ClassGroup, Database, Enrollment, FeeRule, LessonKind, Student, TimeSlot } from './types'

/** 수업을 저장할 때 화면에서 넘기는 내용 (id가 없으면 새 수업) */
export interface ClassInput {
  id?: string
  kind: LessonKind
  name: string
  subject: string
  color: string
  memo: string
  startedOn: DateStr
  /** 수업 요일과 시간 (지금 쓰는 일정) */
  slots: TimeSlot[]
  /** 요일이나 시간을 바꿨을 때 새 일정을 적용할 첫날. 없으면 오늘 */
  scheduleFrom?: DateStr
  fee: FeeRule
  billing: Billing
  /** 수업을 그만하면 마지막 수업 날. 없으면 계속하는 수업 */
  endedOn?: DateStr
}

/** 가장 나중에 시작하는 일정 (수업 설정 화면에서 고치는 일정) */
export function latestSlots(cls: ClassGroup): TimeSlot[] {
  return cls.schedules[cls.schedules.length - 1]?.value ?? []
}

/** 1:1 레슨의 학생 (수강 기록에서 찾음) */
export function soloStudentId(db: Database, classId: string): string | undefined {
  return db.enrollments.find((item) => item.classId === classId)?.studentId
}

/** 수업 기록 하나를 만듭니다. 고치는 경우 지난 일정은 그대로 두고 scheduleFrom부터 새 일정을 씁니다. */
function classRecord(input: ClassInput, existing: ClassGroup | undefined, order: number, now: string): ClassGroup {
  const { id: _id, slots, scheduleFrom, endedOn, ...fields } = input
  const schedules = existing
    ? sameSlots(latestSlots(existing), slots)
      ? normalizePeriods(existing.schedules, input.startedOn)
      : withScheduleChange(existing.schedules, slots, scheduleFrom ?? today(), input.startedOn, newId)
    : [{ id: newId(), startsOn: input.startedOn, value: sortSlots(slots) }]
  // 전에 닫았던 수업을 다시 열 수 있게, 닫은 날은 넘겨받은 값으로만 정합니다.
  const { endedOn: _wasEndedOn, ...kept }: Partial<ClassGroup> = existing ?? {}
  return {
    ...kept,
    ...fields,
    ...(endedOn ? { endedOn } : {}),
    schedules,
    id: existing?.id ?? newId(),
    order: existing?.order ?? order,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

/** 1:1 레슨을 저장할 때 넘기는 내용: 학생 정보와 수업 정보를 한 번에 */
export interface SoloInput {
  classId?: string
  studentId?: string
  student: StudentFields
  lesson: Omit<ClassInput, 'id' | 'kind' | 'name' | 'color'>
  /** 새로 만들 때: 전부터 다니던 학생이 이미 받은 수강료로 남아 있던 횟수 */
  startCredit?: number
}

/** 그룹 수업에 새로 넣을 학생 (이름과 출생 연도만) */
export interface QuickStudent {
  name: string
  birthYear?: number
}

/** 수업 목록(만든 순서)과 수업을 바꾸는 기능 */
export function useClasses() {
  const { data, apply } = useData()
  const classes = useMemo(() => [...data.classes].sort((a, b) => a.order - b.order), [data.classes])
  const nextOrder = () => classes.reduce((max, cls) => Math.max(max, cls.order), -1) + 1

  /** 그룹 수업을 저장합니다. 새 수업이면 고른 학생과 새로 적은 학생을 반 시작일(지났으면 오늘)부터 넣습니다. */
  async function saveGroup(input: ClassInput, studentIds: string[] = [], newStudents: QuickStudent[] = []): Promise<ClassGroup> {
    const now = nowIso()
    const existing = input.id ? data.classes.find((cls) => cls.id === input.id) : undefined
    const item = classRecord({ ...input, kind: 'group' }, existing, nextOrder(), now)
    const changes: Change[] = [{ type: 'put', collection: 'classes', item }]
    const startedOn = input.startedOn > today() ? input.startedOn : today()
    const used = data.students.map((student) => student.color)
    for (const quick of newStudents) {
      const color = nextUnusedColor(used)
      used.push(color)
      const student = studentRecord({ name: quick.name, birthYear: quick.birthYear, color, phone: '', guardians: [], memo: '', enrolledOn: today() }, undefined, now)
      changes.push({ type: 'put', collection: 'students', item: student })
      studentIds = [...studentIds, student.id]
    }
    for (const studentId of studentIds) {
      changes.push({ type: 'put', collection: 'enrollments', item: newEnrollment(item.id, studentId, startedOn, now) })
    }
    await apply(changes)
    return item
  }

  /** 1:1 레슨을 저장합니다. 학생과 수업, 수강 기록을 함께 만들거나 고칩니다. 수업 이름은 학생 이름을 따릅니다. */
  async function saveSolo(input: SoloInput): Promise<ClassGroup> {
    const now = nowIso()
    const existingClass = input.classId ? data.classes.find((cls) => cls.id === input.classId) : undefined
    const existingStudent = input.studentId ? data.students.find((student) => student.id === input.studentId) : undefined
    const student: Student = studentRecord(input.student, existingStudent, now)
    const cls = classRecord(
      { ...input.lesson, kind: 'solo', name: student.name, color: student.color },
      existingClass,
      nextOrder(),
      now,
    )
    const changes: Change[] = [
      { type: 'put', collection: 'students', item: student },
      { type: 'put', collection: 'classes', item: cls },
    ]
    if (!existingClass) {
      changes.push({ type: 'put', collection: 'enrollments', item: { ...newEnrollment(cls.id, student.id, cls.startedOn, now), startCredit: input.startCredit ?? 0 } })
    }
    await apply(changes)
    return cls
  }

  /** 수업을 지우면 그 수업의 수강, 출결, 보강, 납부 기록도 함께 지웁니다. (1:1 레슨의 학생 정보는 남습니다) */
  async function removeClass(id: string) {
    await apply(classRemovalChanges(data, id))
  }

  return { classes, saveGroup, saveSolo, removeClass }
}

/** 수강을 고칠 때 화면에서 넘기는 내용 */
export interface EnrollmentPatch {
  startedOn: DateStr
  endedOn?: DateStr
  /** 듣는 요일. 수업의 모든 요일을 들으면 undefined */
  weekdays?: Weekday[]
  /** 이 학생만 다른 수강료. 수업의 기본 수강료를 따르면 undefined */
  fee?: FeeRule
  startCredit: number
}

/** 학생을 수업에 넣고 빼는 기능 */
export function useEnrollments() {
  const { data, apply } = useData()

  /** 학생들을 수업에 넣습니다. 이미 다니는 학생은 건너뜁니다. 새 학생(이름만)도 함께 만들 수 있습니다. */
  async function enroll(classId: string, studentIds: string[], startedOn: DateStr, newStudents: QuickStudent[] = []) {
    const now = nowIso()
    const todayStr = today()
    const changes: Change[] = []
    const used = data.students.map((student) => student.color)
    const ids = [...studentIds]
    for (const quick of newStudents) {
      const color = nextUnusedColor(used)
      used.push(color)
      const student = studentRecord({ name: quick.name, birthYear: quick.birthYear, color, phone: '', guardians: [], memo: '', enrolledOn: todayStr }, undefined, now)
      changes.push({ type: 'put', collection: 'students', item: student })
      ids.push(student.id)
    }
    for (const studentId of ids) {
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
