import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup, restoreChanges, serializeBackup } from './backup'
import { classRemovalChanges, enrollmentRemovalChanges, studentRemovalChanges } from './cascade'
import { dayLessons, uncheckedLessons } from './lessons'
import { isOpenState, makeupState } from './makeupRules'
import { buildSampleDatabase } from './sample'
import { buildIndex } from './schedule'
import { applyChanges, collectionNames, emptyDatabase } from './storage'
import { allTuitionStates, dueViews } from './tuition'
import { addDays } from '../utils/date'
import type { Database } from './types'

function sample(today: string): Database {
  let count = 0
  return buildSampleDatabase(today, () => `id${count++}`, '2026-11-15T00:00:00.000Z')
}

/** 모든 기록이 있는 학생과 반을 가리키는지 */
function expectNoDanglingReferences(db: Database) {
  const students = new Set(db.students.map((item) => item.id))
  const classes = new Set(db.classes.map((item) => item.id))
  for (const name of ['enrollments', 'attendance', 'makeups'] as const) {
    for (const record of db[name]) {
      expect(students.has(record.studentId), `${name} 학생`).toBe(true)
      expect(classes.has(record.classId), `${name} 반`).toBe(true)
    }
  }
  for (const note of db.lessonNotes) expect(classes.has(note.classId)).toBe(true)
  for (const payment of db.payments) {
    expect(students.has(payment.studentId)).toBe(true)
    if (payment.classId) expect(classes.has(payment.classId)).toBe(true)
  }
}

describe('예시 데이터', () => {
  // 어느 요일에 넣어도 같은 모양이 나오는지 일주일을 모두 확인합니다.
  const days = Array.from({ length: 7 }, (_, offset) => addDays('2026-11-15', offset))

  it.each(days)('%s에 넣어도 출결, 보강, 받을 돈이 골고루 있음', (today) => {
    const db = sample(today)
    expectNoDanglingReferences(db)
    const index = buildIndex(db)
    expect(db.students).toHaveLength(8)
    expect(db.classes).toHaveLength(5)
    expect(db.classes.filter((cls) => cls.kind === 'solo')).toHaveLength(2)

    // 오늘 수업이 하나는 있음 (1:1 레슨)
    expect(dayLessons(index, today, today).length).toBeGreaterThanOrEqual(1)
    // 출결을 안 적은 지난 수업이 있음
    expect(uncheckedLessons(index, addDays(today, -14), addDays(today, -1), today).length).toBeGreaterThanOrEqual(1)

    // 보강: 대기, 예정, 완료가 모두 있음
    const states = db.makeups.map((makeup) => makeupState(makeup, today))
    expect(states).toContain('pending')
    expect(states).toContain('scheduled')
    expect(states).toContain('done')
    expect(states.filter(isOpenState).length).toBeGreaterThanOrEqual(3)

    // 받을 돈: 밀린 수강료와 교재비가 있고, 대부분은 밀리지 않음
    const tuition = allTuitionStates(index, today)
    const dues = dueViews(index, tuition, today, today)
    expect(dues.some((due) => due.kind === 'tuition' && due.status === 'overdue')).toBe(true)
    expect(dues.some((due) => due.kind === 'textbook')).toBe(true)
    expect(tuition.filter((item) => item.remaining > 0).length).toBeGreaterThanOrEqual(4)
  })
})

describe('지우기', () => {
  const db = sample('2026-11-15')

  it('학생을 지우면 그 학생의 수강, 출결, 보강, 납부도 지워짐', () => {
    const target = db.students.find((item) => item.name === '박지호')!
    const next = applyChanges(db, studentRemovalChanges(db, target.id))
    expect(next.students).toHaveLength(7)
    for (const name of ['enrollments', 'attendance', 'makeups', 'payments'] as const) {
      expect(next[name].some((record) => record.studentId === target.id), name).toBe(false)
    }
    expectNoDanglingReferences(next)
  })

  it('반을 지우면 그 반의 기록이 모두 지워짐', () => {
    const target = db.classes.find((item) => item.name === '칼림바 취미반')!
    const next = applyChanges(db, classRemovalChanges(db, target.id))
    expect(next.classes).toHaveLength(4)
    for (const name of ['enrollments', 'lessonNotes', 'attendance', 'makeups'] as const) {
      expect(next[name].some((record) => record.classId === target.id), name).toBe(false)
    }
    expect(next.payments.some((payment) => payment.classId === target.id)).toBe(false)
    expectNoDanglingReferences(next)
  })

  it('수강을 지우면 그 학생이 그 반에 남긴 기록만 지워짐', () => {
    const student = db.students.find((item) => item.name === '최예린')!
    const cls = db.classes.find((item) => item.name === '우쿨렐레 토요반')!
    const enrollment = db.enrollments.find((item) => item.studentId === student.id && item.classId === cls.id)!
    const next = applyChanges(db, enrollmentRemovalChanges(db, enrollment))
    const mine = (record: { studentId: string; classId?: string }) => record.studentId === student.id
    expect(next.attendance.some((record) => mine(record) && record.classId === cls.id)).toBe(false)
    // 다른 반(초급반) 기록은 그대로
    expect(next.attendance.filter(mine).length).toBeGreaterThan(0)
    expect(next.enrollments.filter(mine)).toHaveLength(1)
  })
})

describe('백업과 복원', () => {
  const db = sample('2026-11-15')

  it('내보낸 파일을 다시 읽으면 같은 데이터', () => {
    const text = serializeBackup(createBackup(db, '2026-11-15T01:00:00.000Z'))
    const parsed = parseBackup(text)
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.backup.data).toEqual(db)
    expect(parsed.summary.total).toBe(collectionNames().reduce((sum, name) => sum + db[name].length, 0))
    // 빈 앱에 덮어쓰면 그대로 들어감
    expect(applyChanges(emptyDatabase(), restoreChanges(emptyDatabase(), parsed.backup.data, 'replace'))).toEqual(db)
  })

  it('다른 앱의 파일이나 깨진 파일은 받지 않음', () => {
    expect(parseBackup('안녕')).toHaveProperty('error')
    expect(parseBackup(JSON.stringify({ app: 'academy-note', version: 1, data: {} }))).toHaveProperty('error')
    expect(parseBackup(JSON.stringify({ app: 'class-note', version: 99, data: {} }))).toHaveProperty('error')
  })

  it('합치기: 백업에만 있거나 백업이 더 최신인 기록만 넣음', () => {
    const older = { ...db.students[0], name: '옛 이름', updatedAt: '2020-01-01T00:00:00.000Z' }
    const newer = { ...db.students[1], name: '새 이름', updatedAt: '2030-01-01T00:00:00.000Z' }
    const imported: Database = { ...emptyDatabase(), students: [older, newer] }
    const changes = restoreChanges(db, imported, 'merge')
    expect(changes).toHaveLength(1)
    const merged = applyChanges(db, changes)
    expect(merged.students.find((item) => item.id === newer.id)!.name).toBe('새 이름')
    expect(merged.students.find((item) => item.id === older.id)!.name).not.toBe('옛 이름')
  })
})
