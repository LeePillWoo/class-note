import { sortSlots } from '../data/rules'
import { snapLength, snapTime, useSettings } from '../data/settings'
import type { TimeSlot } from '../data/types'
import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, type Weekday } from '../utils/date'
import TimeSelect, { fromMinutes, toMinutes } from './TimeSelect'

interface WeekdaySlotsEditorProps {
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '수업' */
  label: string
  slots: TimeSlot[]
  onChange(slots: TimeSlot[]): void
  /** 요일을 처음 고를 때 넣을 시작 시각 */
  defaultStart: string
  /** 수업 시간(분). 시작 시각을 고르면 끝 시각이 이만큼 뒤로 자동으로 바뀝니다. */
  duration: number
}

/**
 * 요일을 고르고(월~일), 고른 요일마다 시작·끝 시각을 고릅니다.
 * 시작 시각을 바꾸면 끝 시각은 수업 시간만큼 뒤로 자동으로 맞춰지고, 그 뒤에 끝 시각만 따로 고칠 수 있습니다.
 */
export default function WeekdaySlotsEditor({ label, slots, onChange, defaultStart: rawStart, duration: rawDuration }: WeekdaySlotsEditorProps) {
  const { settings } = useSettings()
  // 기본 시각과 수업 시간도 시각 단위에 맞춥니다. (정각 단위면 정각에 시작해 정각에 끝남)
  const defaultStart = snapTime(rawStart, settings.timeStep)
  const duration = snapLength(rawDuration, settings.timeStep)
  const sorted = sortSlots(slots)

  function toggle(weekday: Weekday) {
    if (slots.some((slot) => slot.weekday === weekday)) {
      onChange(slots.filter((slot) => slot.weekday !== weekday))
      return
    }
    // 새 요일은 마지막 요일의 시간을 그대로 씁니다. (월·수 같은 시간이 대부분이라서)
    const last = sorted[sorted.length - 1]
    const start = last?.start ?? defaultStart
    const end = last?.end ?? fromMinutes(toMinutes(defaultStart) + duration)
    onChange(sortSlots([...slots, { weekday, start, end }]))
  }

  function setStart(weekday: Weekday, start: string) {
    onChange(slots.map((slot) => (slot.weekday === weekday ? { ...slot, start, end: fromMinutes(toMinutes(start) + duration) } : slot)))
  }

  function setEnd(weekday: Weekday, end: string) {
    onChange(slots.map((slot) => (slot.weekday === weekday ? { ...slot, end } : slot)))
  }

  return (
    <div className="slots-editor">
      <div className="weekday-toggles" role="group" aria-label={`${label} 요일`}>
        {WEEKDAYS_FROM_MONDAY.map((weekday) => (
          <button key={weekday} type="button" className={`weekday-toggle wd-${weekday}`}
            aria-pressed={slots.some((slot) => slot.weekday === weekday)} onClick={() => toggle(weekday)}>
            {WEEKDAY_NAMES[weekday]}
          </button>
        ))}
      </div>
      {sorted.map((slot) => {
        const day = WEEKDAY_NAMES[slot.weekday]
        return (
          <div key={slot.weekday} className="slot-row">
            <span className={`slot-day wd-${slot.weekday}`}>{day}</span>
            <TimeSelect value={slot.start} onChange={(value) => setStart(slot.weekday, value)} label={`${label} ${day}요일 시작 시각`} />
            <span className="slot-sep" aria-hidden="true">~</span>
            <TimeSelect value={slot.end} onChange={(value) => setEnd(slot.weekday, value)} label={`${label} ${day}요일 끝 시각`} />
          </div>
        )
      })}
    </div>
  )
}
