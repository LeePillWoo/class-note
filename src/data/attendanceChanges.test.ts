import { describe, expect, it } from 'vitest'
import { markAllPresentChanges, setAttendanceChanges, setAttendanceMemoChanges, setCancelledChanges, setLessonMemoChanges } from './attendanceChanges'
import { dayLessons, rollCounts, uncheckedLessons } from './lessons'
import { defaultMakeupTime, makeupState, scheduleWarnings } from './makeupRules'
import { withPlan } from './makeups'
import { buildIndex, makeupId } from './schedule'
import { makeClass, makeDatabase, makeEnrollment, makeStudent, NOW, run, slot } from './testkit'
import type { Database } from './types'

const TODAY = '2026-11-15'

function base(patch: Parameters<typeof makeClass>[2] = {}): Database {
  return makeDatabase({
    students: [makeStudent('가'), makeStudent('나'), makeStudent('다')],
    classes: [makeClass('c', [slot(1), slot(3)], patch), makeClass('d', [slot(6, '11:00', '12:00')], { order: 1 })],
    enrollments: [makeEnrollment('c', '가', '2026-11-01'), makeEnrollment('c', '나', '2026-11-01'), makeEnrollment('d', '다', '2026-11-01')],
  })
}

describe('출결과 보강', () => {
  it('결석을 적으면 보강이 생기고, 출석으로 바꾸면 없어짐', () => {
    let db = run(base(), (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW))
    expect(db.attendance).toHaveLength(1)
    expect(db.makeups).toHaveLength(1)
    expect(db.makeups[0]).toMatchObject({
      id: makeupId('c', '2026-11-09', '가'),
      studentId: '가',
      reason: 'absent',
      // 빠진 날부터 14일 안 (기본 규칙)
      deadline: '2026-11-23',
      status: 'open',
    })
    expect(makeupState(db.makeups[0], TODAY)).toBe('pending')

    db = run(db, (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'present', NOW))
    expect(db.attendance[0].status).toBe('present')
    expect(db.makeups).toHaveLength(0)

    // 체크 전으로 되돌리면 기록도 없어짐
    db = run(db, (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', null, NOW))
    expect(db.attendance).toHaveLength(0)
  })

  it('결석 보강을 하지 않는 반은 보강이 생기지 않음', () => {
    const db = run(
      base({ makeupRule: { forAbsence: false, forCancellation: true, window: { type: 'none' } } }),
      (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW),
    )
    expect(db.makeups).toHaveLength(0)
  })

  it('모두 출석: 체크하지 않은 학생만 출석으로, 결석은 그대로', () => {
    const db = run(
      base(),
      (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW),
      (current) => markAllPresentChanges(current, 'c', '2026-11-09', NOW),
    )
    expect(db.attendance.map((record) => [record.studentId, record.status]).sort()).toEqual([
      ['가', 'absent'],
      ['나', 'present'],
    ])
    expect(db.makeups).toHaveLength(1)
    // 한 번 더 눌러도 바뀌는 것이 없음
    expect(markAllPresentChanges(db, 'c', '2026-11-09', NOW)).toEqual([])
  })

  it('휴강: 명단의 학생마다 보강이 생기고, 휴강을 취소하면 없어짐', () => {
    let db = run(base(), (current) => setCancelledChanges(current, 'c', '2026-11-11', true, NOW))
    expect(db.lessonNotes).toHaveLength(1)
    expect(db.makeups.map((makeup) => [makeup.studentId, makeup.reason]).sort()).toEqual([
      ['가', 'cancelled'],
      ['나', 'cancelled'],
    ])
    db = run(db, (current) => setCancelledChanges(current, 'c', '2026-11-11', false, NOW))
    expect(db.lessonNotes).toHaveLength(0)
    expect(db.makeups).toHaveLength(0)
  })

  it('결석한 수업이 휴강으로 바뀌면 보강은 이유만 바뀌고 잡아 둔 날짜는 그대로', () => {
    let db = run(base(), (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW))
    db = { ...db, makeups: db.makeups.map((makeup) => withPlan(makeup, { date: '2026-11-14', start: '10:00', end: '11:00' })) }
    db = run(db, (current) => setCancelledChanges(current, 'c', '2026-11-09', true, NOW))
    const mine = db.makeups.find((makeup) => makeup.studentId === '가')!
    expect(mine.reason).toBe('cancelled')
    expect(mine.scheduledOn).toBe('2026-11-14')
    expect(db.makeups).toHaveLength(2)
    // 휴강을 취소하면 가는 다시 결석 보강, 나는 보강 없음
    db = run(db, (current) => setCancelledChanges(current, 'c', '2026-11-09', false, NOW))
    expect(db.makeups.map((makeup) => [makeup.studentId, makeup.reason])).toEqual([['가', 'absent']])
  })

  it('메모: 결석 사유는 출결을 적은 학생만, 수업 메모는 비우면 기록이 없어짐', () => {
    let db = run(base(), (current) => setAttendanceMemoChanges(current, 'c', '2026-11-09', '가', '감기', NOW))
    expect(db.attendance).toHaveLength(0)
    db = run(
      db,
      (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW),
      (current) => setAttendanceMemoChanges(current, 'c', '2026-11-09', '가', '감기', NOW),
    )
    expect(db.attendance[0].memo).toBe('감기')
    db = run(db, (current) => setLessonMemoChanges(current, 'c', '2026-11-09', '2단원', NOW))
    expect(db.lessonNotes[0]).toMatchObject({ cancelled: false, memo: '2단원' })
    db = run(db, (current) => setLessonMemoChanges(current, 'c', '2026-11-09', '', NOW))
    expect(db.lessonNotes).toHaveLength(0)
  })
})

describe('보강 날짜 잡기', () => {
  // c반: 월·수 16:00~17:00, d반: 토 11:00~12:00
  const db = base()
  const [c] = db.classes

  it('기본 시각: 그날 그 반 수업이 있으면 끝난 바로 뒤, 없으면 빠진 날의 수업 시각', () => {
    expect(defaultMakeupTime(c, '2026-11-11', '2026-11-09')).toEqual({ start: '17:00', end: '18:00' })
    expect(defaultMakeupTime(c, '2026-11-14', '2026-11-09')).toEqual({ start: '16:00', end: '17:00' })
  })

  it('기한을 넘기거나 다른 수업과 시간이 겹치면 알려줌 (같이 듣는 수업은 겹쳐도 됨)', () => {
    const makeups = run(db, (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'absent', NOW)).makeups
    const index = buildIndex(db)
    expect(scheduleWarnings({ index, makeups, date: '2026-11-14', start: '14:00', end: '15:00' })).toEqual([])
    expect(scheduleWarnings({ index, makeups, date: '2026-11-14', start: '11:30', end: '12:30' })).toEqual(['d 수업(11:00~12:00)과 시간이 겹쳐요.'])
    expect(scheduleWarnings({ index, makeups, date: '2026-11-14', start: '11:00', end: '12:00', joinClassId: 'd' })).toEqual([])
    // 기한은 11월 23일
    expect(scheduleWarnings({ index, makeups, date: '2026-11-24', start: '10:00', end: '11:00' })[0]).toContain('보강 기한')
  })
})

describe('그날의 수업', () => {
  it('명단과 출결: 지난 수업은 체크 전, 오늘과 앞으로는 예정', () => {
    const db = run(base(), (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'present', NOW))
    const index = buildIndex(db)
    const [past] = dayLessons(index, '2026-11-09', TODAY)
    expect(past.roll.map((entry) => [entry.student.name, entry.status])).toEqual([
      ['가', 'present'],
      ['나', 'unchecked'],
    ])
    expect(rollCounts(past)).toEqual({ total: 2, present: 1, absent: 0, unchecked: 1 })
    const [future] = dayLessons(index, '2026-11-16', TODAY)
    expect(future.roll.every((entry) => entry.status === 'planned')).toBe(true)
    // 수업이 없는 날
    expect(dayLessons(index, '2026-11-10', TODAY)).toEqual([])
  })

  it('보강: 다른 반 수업에 같이 듣는 학생은 그 수업 명단에, 따로 잡은 보강은 보강 수업으로 묶임', () => {
    let db = run(base(), (current) => setCancelledChanges(current, 'c', '2026-11-11', true, NOW))
    // 가: 토요일 d반 수업에 같이 / 나: 토요일 14:00에 따로
    db = {
      ...db,
      makeups: db.makeups.map((makeup) =>
        makeup.studentId === '가'
          ? withPlan(makeup, { date: '2026-11-14', start: '11:00', end: '12:00', joinClassId: 'd' })
          : withPlan(makeup, { date: '2026-11-14', start: '14:00', end: '15:00' }),
      ),
    }
    const lessons = dayLessons(buildIndex(db), '2026-11-14', TODAY)
    expect(lessons.map((lesson) => [lesson.kind, lesson.cls.id, lesson.start])).toEqual([
      ['class', 'd', '11:00'],
      ['makeup', 'c', '14:00'],
    ])
    expect(lessons[0].roll.map((entry) => entry.student.name)).toEqual(['다'])
    expect(lessons[0].guests.map((guest) => guest.student.name)).toEqual(['가'])
    expect(lessons[1].guests.map((guest) => guest.student.name)).toEqual(['나'])
    // 휴강한 날의 수업은 휴강으로 보이고, 출결을 적을 학생이 없음
    const [cancelled] = dayLessons(buildIndex(db), '2026-11-11', TODAY)
    expect(cancelled.cancelled).toBe(true)
    expect(cancelled.roll.every((entry) => entry.status === 'cancelled')).toBe(true)
    expect(rollCounts(cancelled).unchecked).toBe(0)
  })

  it('출결을 안 적은 지난 수업: 최근 것부터, 휴강과 다 적은 수업은 빠짐', () => {
    const db = run(
      base(),
      (current) => markAllPresentChanges(current, 'c', '2026-11-02', NOW),
      (current) => setCancelledChanges(current, 'c', '2026-11-04', true, NOW),
      (current) => setAttendanceChanges(current, 'c', '2026-11-09', '가', 'present', NOW),
    )
    const list = uncheckedLessons(buildIndex(db), '2026-11-01', '2026-11-14', TODAY)
    expect(list.map((lesson) => [lesson.cls.id, lesson.date])).toEqual([
      ['d', '2026-11-14'],
      ['c', '2026-11-11'],
      ['c', '2026-11-09'],
      ['d', '2026-11-07'],
    ])
  })
})
