import { describe, expect, it } from 'vitest'
import { setAttendanceChanges, setCancelledChanges } from './attendanceChanges'
import { withPlan } from './makeups'
import { tuitionPayment } from './payments'
import { buildIndex } from './schedule'
import { makeClass, makeDatabase, makeEnrollment, makeStudent, NOW, run, slot } from './testkit'
import { allTuitionStates, bundleProgress, describeRemaining, dueViews, feeFor, paidInMonth, sessionMarks, tuitionState } from './tuition'
import type { AbsenceCounting, Change, Database, Makeup } from './types'

// 2026년 11월: 월요일은 2, 9, 16, 23, 30일 (다섯 번). 12월 월요일은 7, 14, 21, 28일

function weekly(patch: Parameters<typeof makeClass>[2] = {}, enrollment: Parameters<typeof makeEnrollment>[3] = {}): Database {
  return makeDatabase({
    students: [makeStudent('가')],
    classes: [makeClass('c', [slot(1)], patch)],
    enrollments: [makeEnrollment('c', '가', '2026-11-01', enrollment)],
  })
}

/** 수강료를 받은 기록 */
function paid(db: Database, sessions: number, paidOn: string): Database {
  const change: Change = {
    type: 'put',
    collection: 'payments',
    item: tuitionPayment(
      { studentId: '가', classId: 'c', sessions, amount: 100_000, dueOn: paidOn, paidOn, method: 'transfer', memo: '' },
      `pay-${db.payments.length}`,
      NOW,
    ),
  }
  return run(db, () => [change])
}

function state(db: Database, today: string) {
  return tuitionState(buildIndex(db), '가', 'c', today)!
}

function editMakeup(db: Database, edit: (makeup: Makeup) => Makeup): Database {
  return { ...db, makeups: db.makeups.map(edit) }
}

describe('횟수로 받는 수강료', () => {
  it('받은 횟수를 다 쓰면 그다음 수업 날이 받을 날. 수업이 다섯 번인 달도 따로 할 일이 없음', () => {
    // 아직 받은 적이 없으면 첫 수업 날이 받을 날
    let db = weekly()
    const fresh = state(db, '2026-11-01')
    expect(fresh.dues[0]).toMatchObject({ dueOn: '2026-11-02', sessions: 4, amount: 100_000 })
    expect(describeRemaining(fresh)).toBe('받기 전')
    expect(bundleProgress(fresh)).toEqual({ filled: 0, size: 4 })

    // 4회분을 받음: 11월 2, 9, 16, 23일을 듣고, 다섯 번째 월요일(30일)이 다음 받을 날
    db = paid(db, 4, '2026-11-02')
    const current = state(db, '2026-11-15')
    expect(current).toMatchObject({ covered: 4, used: 2, remaining: 2 })
    expect(current.dues.slice(0, 2).map((due) => due.dueOn)).toEqual(['2026-11-30', '2026-12-28'])
    expect(bundleProgress(current)).toEqual({ filled: 2, size: 4 })
    expect(describeRemaining(current)).toBe('2회 남음')
  })

  it('받지 못한 채 수업이 이어지면 밀린 횟수와 밀린 수강료가 쌓임', () => {
    const current = state(weekly(), '2026-12-10')
    // 11월 2일~12월 7일: 여섯 번
    expect(current).toMatchObject({ covered: 0, used: 6, remaining: -6 })
    expect(current.dues.filter((due) => due.dueOn <= '2026-12-10').map((due) => due.dueOn)).toEqual(['2026-11-02', '2026-11-30'])
    expect(bundleProgress(current)).toEqual({ filled: 4, size: 4 })
    expect(describeRemaining(current)).toBe('6회 밀림')
  })

  it('오늘 수업은 출결을 적어야 한 것으로 셈', () => {
    let db = paid(weekly(), 4, '2026-11-02')
    expect(state(db, '2026-11-16').used).toBe(2)
    db = run(db, (current) => setAttendanceChanges(current, 'c', '2026-11-16', '가', 'present', NOW))
    expect(state(db, '2026-11-16').used).toBe(3)
    // 다음 날이 되면 적지 않았어도 한 것으로 봄
    expect(state(paid(weekly(), 4, '2026-11-02'), '2026-11-17').used).toBe(3)
  })

  it('앱에 넣을 때 남아 있던 횟수(8회 중 3회 남음)부터 이어서 셈', () => {
    const db = weekly({ fee: { amount: 200_000, sessionCount: 8 } }, { startCredit: 3 })
    const current = state(db, '2026-11-01')
    expect(current).toMatchObject({ covered: 3, used: 0, remaining: 3 })
    expect(bundleProgress(current)).toEqual({ filled: 5, size: 8 })
    // 2, 9, 16일을 듣고 23일이 받을 날
    expect(current.dues[0]).toMatchObject({ dueOn: '2026-11-23', sessions: 8, amount: 200_000 })
  })

  it('미리 여러 묶음을 받으면 받을 날이 그만큼 뒤로 가고, 받은 기록을 지우면 돌아옴', () => {
    let db = paid(weekly(), 8, '2026-11-02')
    expect(state(db, '2026-11-15').dues[0].dueOn).toBe('2026-12-28')
    expect(bundleProgress(state(db, '2026-11-15'))).toEqual({ filled: 2, size: 4 })
    db = { ...db, payments: [] }
    expect(state(db, '2026-11-15').dues[0].dueOn).toBe('2026-11-02')
  })

  it('학생만 다른 수강료, 쉬는 기간은 세지 않음', () => {
    const db = makeDatabase({
      students: [makeStudent('가', { pauses: [{ from: '2026-11-09', to: '2026-11-22' }] })],
      classes: [makeClass('c', [slot(1)])],
      enrollments: [makeEnrollment('c', '가', '2026-11-01', { fee: { amount: 70_000, sessionCount: 2 }, startCredit: 2 })],
    })
    const index = buildIndex(db)
    expect(feeFor(index, '가', 'c')).toEqual({ amount: 70_000, sessionCount: 2 })
    // 2일, (9·16일 쉼), 23일을 듣고 30일이 받을 날
    expect(sessionMarks(index, '가', 'c', '2026-11-30', '2026-11-01').map((mark) => mark.date)).toEqual(['2026-11-02', '2026-11-23', '2026-11-30'])
    expect(tuitionState(index, '가', 'c', '2026-11-01')!.dues[0]).toMatchObject({ dueOn: '2026-11-30', amount: 70_000, sessions: 2 })
  })
})

describe('결석과 보강의 회차', () => {
  /** 4회분을 받고 11월 9일에 결석 */
  function absent(counting: AbsenceCounting): Database {
    return run(paid(weekly({ absenceCounting: counting }), 4, '2026-11-02'), (current) =>
      setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW),
    )
  }
  const nextDue = (db: Database, today = '2026-11-15') => state(db, today).dues[0].dueOn
  const done = (makeup: Makeup): Makeup => ({ ...withPlan(makeup, { date: '2026-11-12', start: '16:00', end: '17:00' }), status: 'done' })
  const skipped = (makeup: Makeup): Makeup => ({ ...makeup, status: 'skipped' })

  it('보강하면 안 세고 안 하면 셈: 보강을 기다리는 동안은 한 번 밀리고, 결과에 따라 정해짐', () => {
    const db = absent('ifNoMakeup')
    // 대기: 결석을 세지 않아 받을 날이 한 주 밀림
    expect(nextDue(db)).toBe('2026-12-07')
    expect(state(db, '2026-11-15').undecidedMakeups).toBe(1)
    // 보강을 함: 보강한 날에 한 번 셈 → 다섯 번째 월요일이 받을 날
    expect(nextDue(editMakeup(db, done))).toBe('2026-11-30')
    expect(state(editMakeup(db, done), '2026-11-15').used).toBe(2)
    // 보강을 안 하기로 함: 결석한 날에 셈
    expect(nextDue(editMakeup(db, skipped))).toBe('2026-11-30')
    // 기한(11월 23일)이 지나도록 날짜를 못 잡음: 결석한 날에 셈
    expect(nextDue(db, '2026-11-24')).toBe('2026-11-30')
    expect(state(db, '2026-11-24').undecidedMakeups).toBe(0)
  })

  it('결석해도 셈: 보강을 해도 회차는 더 늘지 않음', () => {
    const db = absent('always')
    expect(nextDue(db)).toBe('2026-11-30')
    expect(nextDue(editMakeup(db, done))).toBe('2026-11-30')
    expect(state(editMakeup(db, done), '2026-11-15').used).toBe(2)
  })

  it('결석은 안 셈: 보강을 안 해도 횟수가 남고, 보강을 하면 그날 셈', () => {
    const db = absent('never')
    expect(nextDue(db)).toBe('2026-12-07')
    expect(nextDue(editMakeup(db, skipped))).toBe('2026-12-07')
    expect(nextDue(editMakeup(db, done))).toBe('2026-11-30')
  })

  it('휴강은 세지 않고, 휴강 보강을 하면 그날 셈 (어느 방식이든)', () => {
    for (const counting of ['ifNoMakeup', 'always', 'never'] as const) {
      const db = run(paid(weekly({ absenceCounting: counting }), 4, '2026-11-02'), (current) =>
        setCancelledChanges(current, 'c', '2026-11-09', true, NOW),
      )
      expect(nextDue(db), counting).toBe('2026-12-07')
      expect(nextDue(editMakeup(db, done)), counting).toBe('2026-11-30')
    }
  })
})

describe('받을 돈 목록', () => {
  it('수강료와 교재비를 받을 날 순서로, 받은 것은 빠짐', () => {
    let db = makeDatabase({
      students: [makeStudent('가'), makeStudent('나')],
      classes: [makeClass('c', [slot(1)]), makeClass('d', [slot(3)], { order: 1 })],
      enrollments: [makeEnrollment('c', '가', '2026-11-01'), makeEnrollment('d', '나', '2026-11-01'), makeEnrollment('c', '나', '2026-11-01')],
    })
    const extra = (id: string, paidOn?: string): Change => ({
      type: 'put',
      collection: 'payments',
      item: { id, studentId: '가', kind: 'textbook', title: '교본', amount: 15_000, dueOn: '2026-11-03', paidOn, memo: '', createdAt: NOW, updatedAt: NOW },
    })
    db = run(db, () => [extra('book'), extra('book-paid', '2026-11-03')])
    const index = buildIndex(db)
    const states = allTuitionStates(index, '2026-11-10')
    expect(states.map((item) => [item.classId, item.studentId])).toEqual([
      ['c', '가'],
      ['c', '나'],
      ['d', '나'],
    ])
    const views = dueViews(index, states, '2026-11-17', '2026-11-10')
    expect(views.map((view) => [view.dueOn, view.studentId, view.kind, view.status])).toEqual([
      ['2026-11-02', '가', 'tuition', 'overdue'],
      ['2026-11-02', '나', 'tuition', 'overdue'],
      ['2026-11-03', '가', 'textbook', 'overdue'],
      ['2026-11-04', '나', 'tuition', 'overdue'],
    ])
    expect(views[0].title).toBe('4회분')
    expect(paidInMonth(db.payments, '2026-11').map((payment) => payment.id)).toEqual(['book-paid'])
    expect(paidInMonth(db.payments, '2026-12')).toEqual([])
  })

  it('그만둔 학생은 다니는 중이 아니지만 밀린 수강료는 남음', () => {
    const db = makeDatabase({
      students: [makeStudent('가', { leftOn: '2026-11-10' })],
      classes: [makeClass('c', [slot(1)])],
      enrollments: [makeEnrollment('c', '가', '2026-11-01')],
    })
    const current = tuitionState(buildIndex(db), '가', 'c', '2026-11-20')!
    expect(current.current).toBe(false)
    expect(current.used).toBe(2)
    expect(current.dues.map((due) => due.dueOn)).toEqual(['2026-11-02'])
  })
})
