import { WEEKDAY_NAMES, type DateStr, type Weekday } from '../utils/date'
import { timesOverlap } from './makeupRules'
import type { ClassGroup, TimeSlot } from './types'

/** 새 일정과 시간이 겹치는 다른 수업 하나 */
export interface SlotConflict {
  weekday: Weekday
  cls: ClassGroup
  start: string
  end: string
  /** 겹치는 다른 수업의 일정이 이날부터 쓰일 때 (지금 일정이 아니라 앞으로 바뀔 일정과 겹치는 경우) */
  from?: DateStr
}

/**
 * 수업 일정(요일·시간)을 넣을 때, from부터 이미 있는 다른 수업과 시간이 겹치는지 찾습니다.
 * - 끝난 수업(from 전에 닫힌 수업)과 from 전에 끝난 일정 기간은 보지 않습니다.
 * - 같은 수업(고치는 중인 수업)은 빼고 봅니다.
 * - 선생님 한 명이 모든 수업을 하므로, 학생이 달라도 시간이 겹치면 알려줍니다.
 */
export function slotConflicts(classes: ClassGroup[], slots: TimeSlot[], from: DateStr, excludeClassId?: string): SlotConflict[] {
  const conflicts: SlotConflict[] = []
  for (const cls of classes) {
    if (cls.id === excludeClassId) continue
    if (cls.endedOn !== undefined && cls.endedOn < from) continue
    cls.schedules.forEach((period, position) => {
      const next = cls.schedules[position + 1]
      // 이 기간이 from 전에 끝났으면 건너뜁니다.
      if (next && next.startsOn <= from) return
      for (const slot of slots) {
        for (const other of period.value) {
          if (other.weekday !== slot.weekday || !timesOverlap(slot.start, slot.end, other.start, other.end)) continue
          const already = conflicts.some((item) => item.cls.id === cls.id && item.weekday === other.weekday && item.start === other.start && item.end === other.end)
          if (!already) conflicts.push({ weekday: other.weekday, cls, start: other.start, end: other.end, ...(period.startsOn > from ? { from: period.startsOn } : {}) })
        }
      }
    })
  }
  return conflicts.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start))
}

/** 예: '월 16:00~16:50 우쿨렐레 초급반' */
export function describeConflict(conflict: SlotConflict, name: string = conflict.cls.name): string {
  return `${WEEKDAY_NAMES[conflict.weekday]} ${conflict.start}~${conflict.end} ${name}`
}
