import { useMemo } from 'react'
import { useData } from '../data/DataProvider'
import { dayLessons, rollCounts, type LessonView } from '../data/lessons'
import { classLessons } from '../data/schedule'
import type { ClassGroup } from '../data/types'
import { WEEKDAY_NAMES, dateParts, daysInMonth, endOfMonth, formatDate, makeDate, startOfMonth, today, weekdayOf, type DateStr } from '../utils/date'

interface GroupCalendarProps {
  cls: ClassGroup
  /** 보여줄 달의 첫날 */
  month: DateStr
  /** 수업 날을 누르면 그날 출석부 창을 엽니다. */
  onOpen(view: LessonView): void
}

/** 날짜 칸에 보여줄 상태: 휴강, 출결 끝, 체크 전(지난 수업), 예정 */
function dayState(view: LessonView, todayStr: DateStr): { className: string; text: string; label: string } {
  const counts = rollCounts(view)
  if (view.cancelled) return { className: 'is-cancelled', text: '휴강', label: '휴강' }
  if (counts.total === 0) return { className: 'is-planned', text: '-', label: '학생 없음' }
  const checked = counts.present + counts.absent
  if (counts.unchecked === 0) {
    return { className: counts.absent > 0 ? 'is-done has-absent' : 'is-done', text: `${counts.present}/${counts.total}`, label: `출석 ${counts.present}명, 결석 ${counts.absent}명` }
  }
  if (view.date < todayStr) {
    return { className: 'is-unchecked', text: checked > 0 ? `${counts.present}/${counts.total}` : '체크 전', label: `체크 전 ${counts.unchecked}명` }
  }
  return { className: 'is-planned', text: `${counts.total}명`, label: `예정 ${counts.total}명` }
}

/**
 * 그룹 수업의 한 달 달력. 학생이 많아도 칸 크기가 같도록 날짜 칸에는 숫자(출석/전체)만 보여주고,
 * 누르면 그날 출석부 창에서 학생마다 체크합니다.
 */
export default function GroupCalendar({ cls, month, onOpen }: GroupCalendarProps) {
  const { index } = useData()
  const todayStr = today()
  const { year, month: monthNumber } = dateParts(month)

  const { byDay, counts } = useMemo(() => {
    const byDay = new Map<DateStr, LessonView>()
    const counts = { present: 0, absent: 0, unchecked: 0, cancelled: 0 }
    for (const lesson of classLessons(cls, startOfMonth(month), endOfMonth(month))) {
      const view = dayLessons(index, lesson.date, todayStr).find((item) => item.kind === 'class' && item.cls.id === cls.id)
      if (!view) continue
      byDay.set(lesson.date, view)
      if (view.cancelled) {
        counts.cancelled++
        continue
      }
      const day = rollCounts(view)
      counts.present += day.present
      counts.absent += day.absent
      if (view.date < todayStr) counts.unchecked += day.unchecked
    }
    return { byDay, counts }
  }, [cls, month, index, todayStr])

  const firstWeekday = weekdayOf(makeDate(year, monthNumber, 1))
  const days = Array.from({ length: daysInMonth(year, monthNumber) }, (_, i) => makeDate(year, monthNumber, i + 1))
  const trailing = (7 - ((firstWeekday + days.length) % 7)) % 7
  const cells: (DateStr | null)[] = [...Array<null>(firstWeekday).fill(null), ...days, ...Array<null>(trailing).fill(null)]

  return (
    <div className="att-cal">
      <div className="att-grid group-cal" role="group" aria-label={`${cls.name} ${monthNumber}월 출결`}>
        {WEEKDAY_NAMES.map((name, weekday) => (
          <div key={name} className={`att-weekday wd-${weekday}`} aria-hidden="true">
            {name}
          </div>
        ))}
        {cells.map((date, position) => {
          if (!date) return <div key={`blank-${position}`} className="att-day is-blank" />
          const view = byDay.get(date)
          const className = `att-day${date === todayStr ? ' is-today' : ''}${view ? ' has-lesson' : ''}`
          const state = view && dayState(view, todayStr)
          return (
            <div key={date} className={className}>
              <span className={`att-num wd-${weekdayOf(date)}`}>{dateParts(date).day}</span>
              {view && state && (
                <button type="button" className={`day-roll ${state.className}`} aria-label={`${formatDate(date)} ${view.start} 출석부 열기, ${state.label}`} onClick={() => onOpen(view)}>
                  {state.text}
                </button>
              )}
              {view && view.guests.length > 0 && <span className="att-makeup">보강 {view.guests.length}</span>}
            </div>
          )
        })}
      </div>
      <dl className="counts">
        <div><dt>출석</dt><dd>{counts.present}</dd></div>
        <div><dt>결석</dt><dd>{counts.absent}</dd></div>
        <div><dt>휴강</dt><dd>{counts.cancelled}</dd></div>
        <div><dt>체크 전</dt><dd>{counts.unchecked}</dd></div>
      </dl>
    </div>
  )
}
