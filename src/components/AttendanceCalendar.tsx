import { useMemo, useState, type CSSProperties } from 'react'
import { useData } from '../data/DataProvider'
import { studentLessons, type RollStatus } from '../data/schedule'
import type { ClassGroup, Makeup, Student } from '../data/types'
import { WEEKDAY_NAMES, addMonths, dateParts, daysInMonth, endOfMonth, formatDate, makeDate, startOfMonth, today, weekdayOf, type DateStr } from '../utils/date'
import { BackIcon, ChevronRightIcon } from './icons'
import RollCheck, { useRollCycle } from './RollCheck'

interface DayEntry {
  cls: ClassGroup
  status: RollStatus
}

/**
 * 한 학생의 한 달 출결 달력. 수업이 있는 날마다 체크 상자가 있어 바로 체크합니다.
 * 여러 수업을 듣는 학생은 상자 아래에 수업 색 띠가 붙습니다. 보강한 날(예정 포함)은 '보강'으로 보입니다.
 */
export default function AttendanceCalendar({ student }: { student: Student }) {
  const { index } = useData()
  const cycle = useRollCycle()
  const todayStr = today()
  const [month, setMonth] = useState(() => startOfMonth(todayStr))
  const { year, month: monthNumber } = dateParts(month)

  const { byDay, makeupsByDay, multiple, counts } = useMemo(() => {
    const from = startOfMonth(month)
    const to = endOfMonth(month)
    const classIds = [...new Set((index.enrollmentsByStudent.get(student.id) ?? []).map((item) => item.classId))]
    const byDay = new Map<DateStr, DayEntry[]>()
    const counts = { present: 0, absent: 0, unchecked: 0, makeup: 0 }
    for (const classId of classIds) {
      const cls = index.classes.get(classId)
      if (!cls) continue
      for (const lesson of studentLessons(index, student.id, classId, from, to, todayStr)) {
        byDay.set(lesson.date, [...(byDay.get(lesson.date) ?? []), { cls, status: lesson.status }])
        if (lesson.status === 'present') counts.present++
        else if (lesson.status === 'absent') counts.absent++
        else if (lesson.status === 'unchecked') counts.unchecked++
      }
    }
    const makeupsByDay = new Map<DateStr, Makeup[]>()
    for (const makeup of index.makeupsByStudent.get(student.id) ?? []) {
      if (!makeup.scheduledOn || makeup.scheduledOn < from || makeup.scheduledOn > to || makeup.status === 'skipped') continue
      makeupsByDay.set(makeup.scheduledOn, [...(makeupsByDay.get(makeup.scheduledOn) ?? []), makeup])
      if (makeup.status === 'done') counts.makeup++
    }
    return { byDay, makeupsByDay, multiple: classIds.length > 1, counts }
  }, [index, student.id, month, todayStr])

  const firstWeekday = weekdayOf(makeDate(year, monthNumber, 1))
  const days = Array.from({ length: daysInMonth(year, monthNumber) }, (_, i) => makeDate(year, monthNumber, i + 1))
  const trailing = (7 - ((firstWeekday + days.length) % 7)) % 7
  const cells: (DateStr | null)[] = [...Array<null>(firstWeekday).fill(null), ...days, ...Array<null>(trailing).fill(null)]
  const thisMonth = month === startOfMonth(todayStr)

  return (
    <div className="att-cal">
      <div className="cal-toolbar">
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
          <BackIcon />
        </button>
        <strong className="cal-title">{year}년 {monthNumber}월</strong>
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
          <ChevronRightIcon />
        </button>
        {!thisMonth && (
          <button type="button" className="btn btn-ghost btn-small cal-today" onClick={() => setMonth(startOfMonth(todayStr))}>
            이번 달
          </button>
        )}
      </div>
      <div className="att-grid" role="group" aria-label={`${student.name} ${monthNumber}월 출결`}>
        {WEEKDAY_NAMES.map((name, weekday) => (
          <div key={name} className={`att-weekday wd-${weekday}`} aria-hidden="true">
            {name}
          </div>
        ))}
        {cells.map((date, position) => {
          if (!date) return <div key={`blank-${position}`} className="att-day is-blank" />
          const entries = byDay.get(date) ?? []
          const makeups = makeupsByDay.get(date) ?? []
          const className = `att-day${date === todayStr ? ' is-today' : ''}${entries.length > 0 ? ' has-lesson' : ''}`
          return (
            <div key={date} className={className}>
              <span className={`att-num wd-${weekdayOf(date)}`}>{dateParts(date).day}</span>
              {entries.map((entry) => (
                <span key={entry.cls.id} className="att-entry" style={{ '--chip-solid': entry.cls.color } as CSSProperties}>
                  <RollCheck
                    size="sm"
                    status={entry.status}
                    label={`${multiple ? `${entry.cls.name} ` : ''}${formatDate(date)}`}
                    onPress={() => cycle(entry.cls.id, date, student, entry.status)}
                  />
                  {multiple && <span className="att-bar" aria-hidden="true" />}
                </span>
              ))}
              {makeups.map((makeup) => (
                <span key={makeup.id} className={makeup.status === 'done' ? 'att-makeup is-done' : 'att-makeup'}>
                  보강
                </span>
              ))}
            </div>
          )
        })}
      </div>
      <dl className="counts">
        <div><dt>출석</dt><dd>{counts.present}</dd></div>
        <div><dt>결석</dt><dd>{counts.absent}</dd></div>
        <div><dt>보강</dt><dd>{counts.makeup}</dd></div>
        <div><dt>체크 전</dt><dd>{counts.unchecked}</dd></div>
      </dl>
    </div>
  )
}
