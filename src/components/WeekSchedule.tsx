import { useMemo, useState, type CSSProperties } from 'react'
import { softColorVars } from '../data/colors'
import { useData } from '../data/DataProvider'
import { dayLessons, rollCounts, type LessonView } from '../data/lessons'
import { WEEKDAY_NAMES, addDays, dateParts, today, weekdayOf, type DateStr } from '../utils/date'
import { formatWeekRange, startOfWeek, weekDates } from '../utils/week'
import { BackIcon, ChevronRightIcon } from './icons'
import { lessonMembers } from './LessonCard'

interface WeekScheduleProps {
  /** 수업을 누르면 그 수업의 출석부를 엽니다. */
  onOpen(view: LessonView): void
}

/** 한 주의 전체 일정. 넓은 화면은 요일마다 한 칸, 좁은 화면은 날짜별 목록입니다. */
export default function WeekSchedule({ onOpen }: WeekScheduleProps) {
  const { index } = useData()
  const todayStr = today()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayStr))
  const days = useMemo(() => weekDates(weekStart).map((date) => ({ date, lessons: dayLessons(index, date, todayStr) })), [index, weekStart, todayStr])
  const total = days.reduce((sum, day) => sum + day.lessons.length, 0)
  const thisWeek = weekStart === startOfWeek(todayStr)

  return (
    <div className="week">
      <div className="cal-toolbar">
        <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="이전 주">
          <BackIcon />
        </button>
        <strong className="cal-title">{formatWeekRange(weekStart)}</strong>
        <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="다음 주">
          <ChevronRightIcon />
        </button>
        <span className="cal-meta">수업 {total}개</span>
        {!thisWeek && (
          <button type="button" className="btn btn-ghost btn-small cal-today" onClick={() => setWeekStart(startOfWeek(todayStr))}>
            이번 주
          </button>
        )}
      </div>
      <ol className="week-grid">
        {days.map(({ date, lessons }) => (
          <li key={date} className={`week-day${date === todayStr ? ' is-today' : ''}${lessons.length === 0 ? ' is-empty' : ''}`}>
            <div className="week-head">
              <span className={`week-weekday wd-${weekdayOf(date)}`}>{WEEKDAY_NAMES[weekdayOf(date)]}</span>
              <span className="week-date">{dateParts(date).day}</span>
            </div>
            {lessons.length === 0 ? (
              <p className="week-none">수업 없음</p>
            ) : (
              <ul className="week-items">
                {lessons.map((view) => (
                  <li key={view.key}>
                    <WeekItem view={view} todayStr={todayStr} date={date} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function WeekItem({ view, todayStr, date, onOpen }: { view: LessonView; todayStr: DateStr; date: DateStr; onOpen(view: LessonView): void }) {
  const counts = rollCounts(view)
  const members = lessonMembers(view)
  let state = ''
  if (view.cancelled) state = '휴강'
  else if (view.kind === 'makeup') state = '보강'
  else if (counts.total > 0 && counts.unchecked === 0) state = '출결 끝'
  else if (date < todayStr && counts.total > 0) state = '체크 전'
  const className = `week-item${view.cancelled ? ' is-cancelled' : ''}${view.kind === 'makeup' ? ' is-makeup' : ''}${state === '체크 전' ? ' is-unchecked' : ''}`
  return (
    <button type="button" className={className} style={softColorVars(view.cls.color) as CSSProperties} onClick={() => onOpen(view)}>
      <span className="week-time">{view.start}</span>
      <span className="week-name">
        {view.cls.name}
        {members && <span className="week-members"> ({members})</span>}
      </span>
      {state && <span className="week-state">{state}</span>}
    </button>
  )
}
