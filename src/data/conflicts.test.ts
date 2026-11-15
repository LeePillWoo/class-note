import { describe, expect, it } from 'vitest'
import { describeConflict, slotConflicts } from './conflicts'
import type { ClassGroup, TimeSlot } from './types'

const slot = (weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6, start: string, end: string): TimeSlot => ({ weekday, start, end })

function cls(id: string, periods: [string, TimeSlot[]][], endedOn?: string): ClassGroup {
  return {
    id,
    kind: 'group',
    name: id,
    subject: '',
    color: '#000',
    memo: '',
    order: 0,
    startedOn: periods[0][0],
    ...(endedOn ? { endedOn } : {}),
    schedules: periods.map(([startsOn, value], position) => ({ id: `${id}-${position}`, startsOn, value })),
    fee: { amount: 0, sessionCount: 4 },
    billing: 'prepaid',
    createdAt: '',
    updatedAt: '',
  }
}

describe('slotConflicts', () => {
  const beginner = cls('초급반', [['2026-09-01', [slot(1, '16:00', '16:50'), slot(3, '16:00', '16:50')]]])

  it('같은 요일에 시간이 겹치면 알려줌', () => {
    const conflicts = slotConflicts([beginner], [slot(1, '16:30', '17:30')], '2026-11-15')
    expect(conflicts.map((item) => describeConflict(item))).toEqual(['월 16:00~16:50 초급반'])
  })

  it('끝과 시작이 맞닿기만 하면 겹치지 않음', () => {
    expect(slotConflicts([beginner], [slot(1, '16:50', '17:50'), slot(3, '15:00', '16:00')], '2026-11-15')).toEqual([])
  })

  it('다른 요일은 겹치지 않음', () => {
    expect(slotConflicts([beginner], [slot(2, '16:00', '16:50')], '2026-11-15')).toEqual([])
  })

  it('고치는 중인 수업 자신은 빼고 봄', () => {
    expect(slotConflicts([beginner], [slot(1, '16:00', '16:50')], '2026-11-15', '초급반')).toEqual([])
  })

  it('이미 끝난 수업은 보지 않지만, 시작일 뒤에 끝나는 수업은 봄', () => {
    const closed = cls('끝난반', [['2026-01-01', [slot(1, '16:00', '17:00')]]], '2026-10-31')
    expect(slotConflicts([closed], [slot(1, '16:00', '17:00')], '2026-11-15')).toEqual([])
    const closing = cls('곧끝반', [['2026-01-01', [slot(1, '16:00', '17:00')]]], '2026-11-30')
    expect(slotConflicts([closing], [slot(1, '16:00', '17:00')], '2026-11-15')).toHaveLength(1)
  })

  it('일정이 바뀐 수업: 지난 일정은 보지 않고, 앞으로 바뀔 일정은 언제부터인지 함께 알려줌', () => {
    const moved = cls('옮긴반', [
      ['2026-01-01', [slot(1, '16:00', '17:00')]],
      ['2026-11-01', [slot(2, '16:00', '17:00')]],
      ['2026-12-01', [slot(4, '18:00', '19:00')]],
    ])
    expect(slotConflicts([moved], [slot(1, '16:00', '17:00')], '2026-11-15')).toEqual([])
    expect(slotConflicts([moved], [slot(2, '16:30', '17:30')], '2026-11-15')).toHaveLength(1)
    const later = slotConflicts([moved], [slot(4, '18:00', '19:00')], '2026-11-15')
    expect(later).toHaveLength(1)
    expect(later[0].from).toBe('2026-12-01')
  })

  it('월요일부터 요일 순서로', () => {
    const many = cls('여러날', [['2026-01-01', [slot(0, '10:00', '11:00'), slot(6, '10:00', '11:00'), slot(1, '10:00', '11:00')]]])
    const conflicts = slotConflicts([many], [slot(0, '10:00', '11:00'), slot(6, '10:00', '11:00'), slot(1, '10:00', '11:00')], '2026-11-15')
    expect(conflicts.map((item) => item.weekday)).toEqual([1, 6, 0])
  })
})
