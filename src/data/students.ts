import { useMemo } from 'react'
import { addDays, today, type DateStr } from '../utils/date'
import { studentRemovalChanges } from './cascade'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { compareStudents } from './schedule'
import type { Change, Enrollment, Guardian, PauseRange, Student } from './types'

/** 학생을 저장할 때 화면에서 넘기는 내용 (id가 없으면 새 학생) */
export interface StudentInput {
  id?: string
  name: string
  color: string
  school: string
  phone: string
  guardians: Guardian[]
  enrolledOn: DateStr
  memo: string
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

/** 학생 목록(이름 순서)과 학생을 바꾸는 기능 */
export function useStudents() {
  const { data, apply } = useData()
  const students = useMemo(() => [...data.students].sort(compareStudents), [data.students])

  /** 학생을 저장합니다. 새 학생이면 고른 반에 오늘부터 넣습니다. */
  async function saveStudent(input: StudentInput, classIds: string[] = []): Promise<Student> {
    const now = nowIso()
    const existing = input.id ? data.students.find((student) => student.id === input.id) : undefined
    const { id: _id, ...fields } = input
    const item: Student = {
      pauses: [],
      ...existing,
      ...fields,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    const changes: Change[] = [{ type: 'put', collection: 'students', item }]
    if (!existing) {
      for (const classId of classIds) {
        changes.push({ type: 'put', collection: 'enrollments', item: newEnrollment(classId, item.id, today(), now) })
      }
    }
    await apply(changes)
    return item
  }

  /** 학생을 지우면 그 학생의 수강, 출결, 보강, 납부 기록도 함께 지웁니다. */
  async function removeStudent(id: string) {
    await apply(studentRemovalChanges(data, id))
  }

  async function put(item: Student) {
    await apply([{ type: 'put', collection: 'students', item: { ...item, updatedAt: nowIso() } }])
  }

  /** from부터 쉽니다(휴원). 그날부터 수업 명단에서 빠지고 회차도 세지 않습니다. */
  async function pauseStudent(student: Student, from: DateStr) {
    if (openPause(student)) return
    await put({ ...student, pauses: [...student.pauses, { from }] })
  }

  /** 쉬던 학생이 backOn부터 다시 다닙니다. */
  async function resumeStudent(student: Student, backOn: DateStr) {
    await put({ ...student, pauses: pausesAfterResume(student.pauses, backOn) })
  }

  /** leftOn까지 다니고 그만둡니다. */
  async function leaveStudent(student: Student, leftOn: DateStr) {
    // 쉬는 중에 그만두면 휴원은 그만둔 날로 닫습니다.
    const pauses = student.pauses.flatMap((pause): PauseRange[] => {
      if (pause.to !== undefined) return [pause]
      return pause.from > leftOn ? [] : [{ from: pause.from, to: leftOn }]
    })
    await put({ ...student, pauses, leftOn })
  }

  /** 그만둔 학생이 backOn부터 다시 다닙니다. */
  async function rejoinStudent(student: Student, backOn: DateStr) {
    if (student.leftOn === undefined) return
    const { leftOn, ...rest } = student
    await put({ ...rest, pauses: pausesAfterRejoin(student.pauses, leftOn, backOn) })
  }

  return { students, saveStudent, removeStudent, pauseStudent, resumeStudent, leaveStudent, rejoinStudent }
}
