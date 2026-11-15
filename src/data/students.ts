import { useMemo } from 'react'
import { addDays, type DateStr } from '../utils/date'
import { studentRemovalChanges } from './cascade'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { compareStudents } from './schedule'
import type { Change, Database, Enrollment, Guardian, PauseRange, Student } from './types'

/** 학생 정보 입력 (화면에서 넘기는 내용) */
export interface StudentFields {
  name: string
  color: string
  photo?: string
  birthYear?: number
  phone: string
  guardians: Guardian[]
  enrolledOn: DateStr
  memo: string
}

/** 학생 기록 하나를 만듭니다. 고치는 경우 쉰 기간과 그만둔 날은 그대로 둡니다. */
export function studentRecord(fields: StudentFields, existing: Student | undefined, now: string): Student {
  // 사진과 출생 연도는 지울 수 있게, 넘겨받은 값으로만 정합니다.
  const { photo: _photo, birthYear: _birthYear, ...kept }: Partial<Student> = existing ?? {}
  const { photo, birthYear, ...rest } = fields
  return {
    pauses: [],
    ...kept,
    ...rest,
    ...(photo ? { photo } : {}),
    ...(birthYear ? { birthYear } : {}),
    id: existing?.id ?? newId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

/** 새 수강 기록 하나 */
export function newEnrollment(classId: string, studentId: string, startedOn: DateStr, now: string): Enrollment {
  return { id: newId(), classId, studentId, startedOn, startCredit: 0, createdAt: now, updatedAt: now }
}

/** 쉬는 중이면 그 기간 (끝나지 않은 휴원) */
export function openPause(student: Student): PauseRange | undefined {
  return student.pauses.find((pause) => pause.to === undefined)
}

/** 쉬는 학생이 backOn부터 다시 다닐 때의 휴원 기록 */
export function pausesAfterResume(pauses: PauseRange[], backOn: DateStr): PauseRange[] {
  return pauses.flatMap((pause): PauseRange[] => {
    if (pause.to !== undefined) return [pause]
    // 쉬기 시작한 날에 바로 돌아오면 쉰 날이 없으므로 기록을 지웁니다.
    return backOn <= pause.from ? [] : [{ from: pause.from, to: addDays(backOn, -1) }]
  })
}

/** 그만둔 학생이 backOn부터 다시 다닐 때: 그사이를 쉰 기간으로 남겨 수업이 생기지 않게 합니다. */
export function pausesAfterRejoin(pauses: PauseRange[], leftOn: DateStr, backOn: DateStr): PauseRange[] {
  const from = addDays(leftOn, 1)
  const to = addDays(backOn, -1)
  return from <= to ? [...pauses, { from, to }] : pauses
}

/** 예: 2015 → '2015년생'. 없으면 빈 글자 */
export function describeBirthYear(birthYear?: number): string {
  return birthYear ? `${birthYear}년생` : ''
}

/** 학생 상태를 바꾸는 일: 쉬기, 다시 다니기(쉬다가), 그만두기, 다시 등록(그만뒀다가) */
export type StatusAction = 'pause' | 'resume' | 'leave' | 'rejoin'

/** 지금 이 학생에게 할 수 있는 일인지. (여러 명을 한 번에 바꿀 때 해당하는 학생만 고릅니다) */
export function canApplyStatus(student: Student, action: StatusAction): boolean {
  const pause = openPause(student)
  if (action === 'pause') return student.leftOn === undefined && !pause
  if (action === 'resume') return student.leftOn === undefined && !!pause
  if (action === 'leave') return student.leftOn === undefined
  return student.leftOn !== undefined
}

/** 상태를 바꾼 학생 기록. 해당하지 않는 학생이면 null (예: 이미 쉬는 학생을 또 쉬게 함) */
export function withStatus(student: Student, action: StatusAction, date: DateStr): Student | null {
  if (!canApplyStatus(student, action)) return null
  if (action === 'pause') return { ...student, pauses: [...student.pauses, { from: date }] }
  if (action === 'resume') return { ...student, pauses: pausesAfterResume(student.pauses, date) }
  if (action === 'leave') {
    // 쉬는 중에 그만두면 휴원은 그만둔 날로 닫습니다.
    const pauses = student.pauses.flatMap((pause): PauseRange[] => {
      if (pause.to !== undefined) return [pause]
      return pause.from > date ? [] : [{ from: pause.from, to: date }]
    })
    return { ...student, pauses, leftOn: date }
  }
  const { leftOn, ...rest } = student
  return { ...rest, pauses: pausesAfterRejoin(student.pauses, leftOn!, date) }
}

/** 다시 나오는 날로 고를 수 있는 가장 이른 날 (쉬기 시작한 날, 그만둔 다음 날). 제한이 없으면 undefined */
export function earliestStatusDate(student: Student, action: StatusAction): DateStr | undefined {
  if (action === 'resume') return openPause(student)?.from
  if (action === 'rejoin' && student.leftOn) return addDays(student.leftOn, 1)
  return undefined
}

/** 학생 여럿을 지울 때의 변경: 학생마다 수강, 출결, 보강, 납부 기록과 1:1 레슨까지 */
export function studentsRemovalChanges(db: Database, ids: string[]): Change[] {
  const targets = new Set(ids)
  const soloIds = new Set(db.enrollments.filter((enrollment) => targets.has(enrollment.studentId)).map((enrollment) => enrollment.classId))
  const solos = db.classes.filter((cls) => cls.kind === 'solo' && soloIds.has(cls.id))
  return [
    ...ids.flatMap((id) => studentRemovalChanges(db, id)),
    ...solos.flatMap((cls): Change[] => [
      ...db.lessonNotes.filter((note) => note.classId === cls.id).map((note): Change => ({ type: 'remove', collection: 'lessonNotes', id: note.id })),
      { type: 'remove', collection: 'classes', id: cls.id },
    ]),
  ]
}

/** 학생 목록(이름 순서)과 학생을 바꾸는 기능 */
export function useStudents() {
  const { data, apply } = useData()
  const students = useMemo(() => [...data.students].sort(compareStudents), [data.students])

  /** 학생 정보를 저장합니다. 이 학생의 1:1 레슨 이름과 색도 함께 맞춥니다. */
  async function saveStudent(fields: StudentFields, id?: string): Promise<Student> {
    const now = nowIso()
    const existing = id ? data.students.find((student) => student.id === id) : undefined
    const item = studentRecord(fields, existing, now)
    const changes: Change[] = [{ type: 'put', collection: 'students', item }]
    const soloIds = new Set(data.enrollments.filter((enrollment) => enrollment.studentId === item.id).map((enrollment) => enrollment.classId))
    for (const cls of data.classes) {
      if (cls.kind === 'solo' && soloIds.has(cls.id) && (cls.name !== item.name || cls.color !== item.color)) {
        changes.push({ type: 'put', collection: 'classes', item: { ...cls, name: item.name, color: item.color, updatedAt: now } })
      }
    }
    await apply(changes)
    return item
  }

  /** 학생을 지우면 그 학생의 수강, 출결, 보강, 납부 기록과 1:1 레슨도 함께 지웁니다. */
  async function removeStudent(id: string) {
    await apply(studentsRemovalChanges(data, [id]))
  }

  /** 학생 여럿을 한 번에 지웁니다. */
  async function removeStudents(ids: string[]) {
    await apply(studentsRemovalChanges(data, ids))
  }

  /**
   * 학생 여럿의 상태를 한 번에 바꿉니다. 해당하지 않는 학생은 건너뜁니다.
   * (이미 쉬는 학생에게 쉬기, 다시 나오는 날이 쉬기 시작한 날보다 앞인 경우 등) 바꾼 학생 수를 돌려줍니다.
   */
  async function changeStatus(targets: Student[], action: StatusAction, date: DateStr): Promise<number> {
    const now = nowIso()
    const changes = targets.flatMap((student): Change[] => {
      const min = earliestStatusDate(student, action)
      const item = min !== undefined && date < min ? null : withStatus(student, action, date)
      return item ? [{ type: 'put', collection: 'students', item: { ...item, updatedAt: now } }] : []
    })
    if (changes.length > 0) await apply(changes)
    return changes.length
  }

  return { students, saveStudent, removeStudent, removeStudents, changeStatus }
}
