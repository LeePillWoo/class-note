import { describe, expect, it } from 'vitest'
import { canApplyStatus, earliestStatusDate, studentsRemovalChanges, withStatus } from './students'
import { monthlyPaidTotals } from './tuition'
import type { Database, Payment, Student } from './types'

function student(patch: Partial<Student> = {}): Student {
  return { id: 's1', name: '가', color: '#000', phone: '', guardians: [], enrolledOn: '2026-01-01', pauses: [], memo: '', createdAt: '', updatedAt: '', ...patch }
}

describe('학생 상태 바꾸기', () => {
  it('다니는 학생은 쉬기와 그만두기만 할 수 있음', () => {
    const active = student()
    expect(canApplyStatus(active, 'pause')).toBe(true)
    expect(canApplyStatus(active, 'leave')).toBe(true)
    expect(canApplyStatus(active, 'resume')).toBe(false)
    expect(canApplyStatus(active, 'rejoin')).toBe(false)
  })

  it('쉬기 → 다시 다니기: 쉰 기간이 남음', () => {
    const paused = withStatus(student(), 'pause', '2026-11-10')!
    expect(paused.pauses).toEqual([{ from: '2026-11-10' }])
    expect(canApplyStatus(paused, 'pause')).toBe(false)
    expect(earliestStatusDate(paused, 'resume')).toBe('2026-11-10')
    expect(withStatus(paused, 'resume', '2026-11-20')!.pauses).toEqual([{ from: '2026-11-10', to: '2026-11-19' }])
  })

  it('쉬는 중에 그만두면 쉰 기간을 그만둔 날로 닫음', () => {
    const paused = withStatus(student(), 'pause', '2026-11-10')!
    const left = withStatus(paused, 'leave', '2026-11-15')!
    expect(left.leftOn).toBe('2026-11-15')
    expect(left.pauses).toEqual([{ from: '2026-11-10', to: '2026-11-15' }])
  })

  it('그만둔 학생은 다시 등록만 할 수 있고, 그사이는 쉰 기간으로 남음', () => {
    const left = student({ leftOn: '2026-10-31' })
    expect(withStatus(left, 'pause', '2026-11-10')).toBeNull()
    expect(earliestStatusDate(left, 'rejoin')).toBe('2026-11-01')
    const back = withStatus(left, 'rejoin', '2026-11-10')!
    expect(back.leftOn).toBeUndefined()
    expect(back.pauses).toEqual([{ from: '2026-11-01', to: '2026-11-09' }])
  })
})

describe('학생 여럿 지우기', () => {
  it('학생마다 수강과 1:1 레슨까지 지우고, 남은 학생의 것은 그대로', () => {
    const base = { createdAt: '', updatedAt: '' }
    const db = {
      students: [student({ id: 's1' }), student({ id: 's2' }), student({ id: 's3' })],
      classes: [
        { id: 'solo1', kind: 'solo' },
        { id: 'group', kind: 'group' },
      ],
      enrollments: [
        { id: 'e1', classId: 'solo1', studentId: 's1' },
        { id: 'e2', classId: 'group', studentId: 's2' },
        { id: 'e3', classId: 'group', studentId: 's3' },
      ],
      lessonNotes: [{ id: 'solo1:2026-11-01', classId: 'solo1', ...base }],
      attendance: [],
      makeups: [],
      payments: [{ id: 'p1', studentId: 's2' }],
      settings: [],
    } as unknown as Database
    const removed = studentsRemovalChanges(db, ['s1', 's2']).map((change) => `${change.collection}:${change.type === 'remove' ? change.id : ''}`)
    expect(removed.sort()).toEqual(['classes:solo1', 'enrollments:e1', 'enrollments:e2', 'lessonNotes:solo1:2026-11-01', 'payments:p1', 'students:s1', 'students:s2'])
  })
})

describe('monthlyPaidTotals', () => {
  it('받은 날의 달마다 합치고, 못 받은 것과 범위 밖은 빼고, 없는 달은 0', () => {
    const paid = (paidOn: string | undefined, amount: number) => ({ paidOn, amount }) as Payment
    const payments = [paid('2026-11-03', 100), paid('2026-11-20', 50), paid('2026-09-01', 30), paid(undefined, 999), paid('2026-05-01', 7)]
    expect(monthlyPaidTotals(payments, ['2026-09', '2026-10', '2026-11'])).toEqual([30, 0, 150])
  })
})
