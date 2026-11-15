import { describe, expect, it } from 'vitest'
import { withScheduleChange } from './rules'
import { buildIndex, classLessons, currentMembers, lessonOn, rosterOn, studentLessons, studentStatus } from './schedule'
import { pausesAfterRejoin, pausesAfterResume } from './students'
import { makeClass, makeDatabase, makeEnrollment, makeStudent, slot } from './testkit'

// 2026년 11월: 1일이 일요일. 월요일은 2, 9, 16, 23, 30일 (다섯 번), 수요일은 4, 11, 18, 25일

describe('수업일', () => {
  it('주 1회: 달에 그 요일이 다섯 번이면 수업도 다섯 번', () => {
    const cls = makeClass('c', [slot(1)])
    expect(classLessons(cls, '2026-11-01', '2026-11-30').map((lesson) => lesson.date)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ])
  })

  it('주 2회, 요일마다 시간이 달라도 됨', () => {
    const cls = makeClass('c', [slot(1, '16:00', '17:00'), slot(3, '18:00', '19:00')])
    expect(classLessons(cls, '2026-11-02', '2026-11-04')).toEqual([
      { classId: 'c', date: '2026-11-02', start: '16:00', end: '17:00' },
      { classId: 'c', date: '2026-11-04', start: '18:00', end: '19:00' },
    ])
  })

  it('반 시작일 전과 닫은 날 뒤에는 수업이 없음', () => {
    const cls = makeClass('c', [slot(1)], { startedOn: '2026-11-09', endedOn: '2026-11-20' })
    expect(lessonOn(cls, '2026-11-02')).toBeNull()
    expect(lessonOn(cls, '2026-11-16')).not.toBeNull()
    expect(lessonOn(cls, '2026-11-23')).toBeNull()
  })

  it('일정을 바꾸면 적용일부터 새 요일, 그 전 수업은 그대로', () => {
    const cls = makeClass('c', [slot(1)])
    const changed = { ...cls, schedules: withScheduleChange(cls.schedules, [slot(3)], '2026-11-16', cls.startedOn, () => 'p1') }
    expect(classLessons(changed, '2026-11-01', '2026-11-30').map((lesson) => lesson.date)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-18',
      '2026-11-25',
    ])
    // 반 시작일이나 그 전부터 적용하면 통째로 바뀜
    const replaced = withScheduleChange(cls.schedules, [slot(3)], '2026-11-01', cls.startedOn, () => 'p1')
    expect(replaced).toHaveLength(1)
    expect(replaced[0].startsOn).toBe('2026-11-01')
  })
})

describe('명단', () => {
  const cls = makeClass('c', [slot(1), slot(3)])

  it('수강 시작일부터, 나간 날까지', () => {
    const db = makeDatabase({
      students: [makeStudent('가'), makeStudent('나')],
      classes: [cls],
      enrollments: [makeEnrollment('c', '가', '2026-11-01'), makeEnrollment('c', '나', '2026-11-09', { endedOn: '2026-11-16' })],
    })
    const index = buildIndex(db)
    const names = (date: string) => rosterOn(index, 'c', date).map((member) => member.student.name)
    expect(names('2026-11-02')).toEqual(['가'])
    expect(names('2026-11-09')).toEqual(['가', '나'])
    expect(names('2026-11-18')).toEqual(['가'])
  })

  it('주 2회 반에서 한 요일만 듣는 학생', () => {
    const db = makeDatabase({
      students: [makeStudent('가')],
      classes: [cls],
      enrollments: [makeEnrollment('c', '가', '2026-11-01', { weekdays: [3] })],
    })
    const index = buildIndex(db)
    expect(rosterOn(index, 'c', '2026-11-02')).toHaveLength(0)
    expect(rosterOn(index, 'c', '2026-11-04')).toHaveLength(1)
    expect(studentLessons(index, '가', 'c', '2026-11-01', '2026-11-15', '2026-11-15').map((lesson) => lesson.date)).toEqual([
      '2026-11-04',
      '2026-11-11',
    ])
  })

  it('쉬는 기간과 그만둔 뒤에는 명단에서 빠짐', () => {
    const paused = makeStudent('쉼', { pauses: [{ from: '2026-11-09', to: '2026-11-15' }] })
    const left = makeStudent('그만', { leftOn: '2026-11-09' })
    const db = makeDatabase({
      students: [paused, left],
      classes: [cls],
      enrollments: [makeEnrollment('c', '쉼', '2026-11-01'), makeEnrollment('c', '그만', '2026-11-01')],
    })
    const index = buildIndex(db)
    const names = (date: string) => rosterOn(index, 'c', date).map((member) => member.student.name)
    expect(names('2026-11-04')).toEqual(['그만', '쉼'])
    expect(names('2026-11-09')).toEqual(['그만'])
    expect(names('2026-11-11')).toEqual([])
    expect(names('2026-11-16')).toEqual(['쉼'])
    expect(studentStatus(paused, '2026-11-10')).toBe('paused')
    expect(studentStatus(paused, '2026-11-16')).toBe('active')
    // 그만둔 날까지는 다니는 중
    expect(studentStatus(left, '2026-11-09')).toBe('active')
    expect(studentStatus(left, '2026-11-10')).toBe('left')
    // 지금 다니는 학생 목록에는 쉬는 학생은 남고, 그만둔 학생은 빠짐
    expect(currentMembers(index, 'c', '2026-11-10').map((member) => member.student.name)).toEqual(['쉼'])
  })

  it('다시 다니기: 쉰 기간을 닫고, 그만뒀던 사이는 쉰 기간으로 남김', () => {
    expect(pausesAfterResume([{ from: '2026-11-09' }], '2026-11-16')).toEqual([{ from: '2026-11-09', to: '2026-11-15' }])
    // 쉬기 시작한 날 바로 돌아오면 쉰 날이 없음
    expect(pausesAfterResume([{ from: '2026-11-09' }], '2026-11-09')).toEqual([])
    expect(pausesAfterRejoin([], '2026-11-09', '2026-11-20')).toEqual([{ from: '2026-11-10', to: '2026-11-19' }])
    expect(pausesAfterRejoin([], '2026-11-09', '2026-11-10')).toEqual([])
  })
})
