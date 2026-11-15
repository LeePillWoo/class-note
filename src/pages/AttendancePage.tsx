import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BackIcon, ChevronRightIcon } from '../components/icons'
import LessonCard from '../components/LessonCard'
import MakeupSheet from '../components/MakeupSheet'
import MonthGrid from '../components/MonthGrid'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import { softColorVars } from '../data/colors'
import { useData } from '../data/DataProvider'
import { dayLessons, type LessonView } from '../data/lessons'
import { addDays, addMonths, dateParts, endOfMonth, formatDate, isValidDate, startOfMonth, today, type DateStr } from '../utils/date'
import { formatWeekRange, startOfWeek, weekDates } from '../utils/week'

type ViewMode = 'month' | 'week' | 'day'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
  { value: 'day', label: '일' },
]

const VIEW_KEY = 'class-note:attendance-view'

function savedView(): ViewMode {
  try {
    const value = localStorage.getItem(VIEW_KEY)
    if (value === 'month' || value === 'week' || value === 'day') return value
  } catch {
    // 못 읽으면 기본값
  }
  return 'month'
}

/** 달력 칸에 보여줄 칩의 최대 개수 (넘으면 '+2'처럼 줄임) */
const MAX_CHIPS = 3

/**
 * 출결: 달력(월·주·일)에서 날짜를 고르고, 그날 수업을 펼쳐 출결을 적습니다.
 * 보는 날짜와 보기 방식은 주소에 담습니다. (?view=week&date=2026-11-15) 화면 크기가 바뀌어도 그대로입니다.
 */
export default function AttendancePage() {
  const { data, index } = useData()
  const todayStr = today()
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const date: DateStr = dateParam && isValidDate(dateParam) ? dateParam : todayStr
  const viewParam = params.get('view')
  const view: ViewMode = viewParam === 'month' || viewParam === 'week' || viewParam === 'day' ? viewParam : savedView()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [makeupIds, setMakeupIds] = useState<string[] | null>(null)

  function go(nextDate: DateStr, nextView: ViewMode = view) {
    setParams({ view: nextView, date: nextDate }, { replace: true })
  }

  function changeView(next: ViewMode) {
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // 기억하지 못해도 보기는 바뀝니다.
    }
    go(date, next)
  }

  // 보이는 날짜들의 수업을 한 번에 계산합니다.
  const range = useMemo((): DateStr[] => {
    if (view === 'day') return [date]
    if (view === 'week') return weekDates(startOfWeek(date))
    const first = startOfMonth(date)
    const last = endOfMonth(date)
    const days: DateStr[] = []
    for (let day = first; day <= last; day = addDays(day, 1)) days.push(day)
    return days
  }, [view, date])
  const lessonsByDay = useMemo(() => new Map(range.map((day) => [day, dayLessons(index, day, todayStr)])), [index, range, todayStr])
  const lessonsOn = (day: DateStr) => lessonsByDay.get(day) ?? []

  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key))
  const cards = (lessons: LessonView[]) => (
    <ul className="lessons">
      {lessons.map((lesson) => (
        <LessonCard key={lesson.key} view={lesson} open={openKey === lesson.key} onToggle={() => toggle(lesson.key)} onOpenMakeup={setMakeupIds} />
      ))}
    </ul>
  )

  const { year, month } = dateParts(date)
  const step = (direction: 1 | -1) => {
    if (view === 'month') go(startOfMonth(addMonths(startOfMonth(date), direction)))
    else go(addDays(date, direction * (view === 'week' ? 7 : 1)))
  }
  const label = view === 'month' ? `${year}년 ${month}월` : view === 'week' ? formatWeekRange(startOfWeek(date)) : formatDate(date)
  const unit = view === 'month' ? '달' : view === 'week' ? '주' : '날'

  const toolbar = (
    <div className="calendar-toolbar">
      <div className="month-nav">
        <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label={`이전 ${unit}`}>
          <BackIcon />
        </button>
        <strong>{label}</strong>
        <button type="button" className="icon-btn" onClick={() => step(1)} aria-label={`다음 ${unit}`}>
          <ChevronRightIcon />
        </button>
      </div>
      <button type="button" className="btn btn-secondary btn-small today-btn" onClick={() => go(todayStr)} disabled={date === todayStr}>
        오늘
      </button>
    </div>
  )

  const dayPanel = (day: DateStr) => (
    <div className="day-panel">
      <h2 className="day-title section-heading">
        {formatDate(day)}
        {day === todayStr && <span className="badge status-today">오늘</span>}
      </h2>
      {lessonsOn(day).length === 0 ? (
        <div className="card">
          <p className="muted">수업이 없는 날이에요.</p>
        </div>
      ) : (
        cards(lessonsOn(day))
      )}
    </div>
  )

  return (
    <section>
      <PageHeader
        title="출결"
        subtitle="수업을 눌러 출석과 결석을 적어요."
        actions={<Segmented<ViewMode> label="달력 보기 방식" name="attendance-view" value={view} onChange={changeView} options={VIEW_OPTIONS} />}
      />

      {data.classes.length === 0 ? (
        <div className="card narrow">
          <p>
            아직 반이 없어요. <Link to="/classes/new">반을 만들면</Link> 수업 날마다 출석부가 생겨요.
          </p>
        </div>
      ) : view === 'month' ? (
        <div className="duo">
          <div className="duo-cols">
            <div className="duo-col">
              <div className="card calendar-card">
                {toolbar}
                <MonthGrid
                  className="is-calendar"
                  month={date}
                  selected={date}
                  onSelect={(day) => go(day)}
                  describeDay={(day) => lessonsOn(day).map((lesson) => lesson.cls.name).join(', ') || undefined}
                  renderDay={(day) => <DayChips lessons={lessonsOn(day)} />}
                />
              </div>
            </div>
            <div className="duo-col">{dayPanel(date)}</div>
          </div>
        </div>
      ) : view === 'week' ? (
        <>
          <div className="card calendar-card narrow">{toolbar}</div>
          <div className="week-list">
            {range.map((day) => (
              <div key={day} className="week-day">
                {dayPanel(day)}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="narrow">
          <div className="card calendar-card">{toolbar}</div>
          <div className="day-mode">{dayPanel(date)}</div>
        </div>
      )}
      <MakeupSheet ids={makeupIds} onClose={() => setMakeupIds(null)} />
    </section>
  )
}

/** 달력 칸 안의 수업 칩: 반 색. 휴강은 줄 긋기, 따로 잡은 보강은 점선 */
function DayChips({ lessons }: { lessons: LessonView[] }) {
  if (lessons.length === 0) return null
  const shown = lessons.length > MAX_CHIPS ? lessons.slice(0, MAX_CHIPS - 1) : lessons
  return (
    <span className="day-chips">
      {shown.map((lesson) => {
        const done = lesson.kind === 'makeup' && lesson.guests.every((guest) => guest.makeup.status === 'done')
        const className = `cal-chip${lesson.cancelled ? ' is-cancelled' : ''}${lesson.kind === 'makeup' ? ` is-makeup${done ? ' is-done' : ''}` : ''}`
        return (
          <span key={lesson.key} className={className} style={softColorVars(lesson.cls.color) as CSSProperties}>
            <span className="cal-chip-time">{lesson.start}</span>
            {lesson.kind === 'makeup' && <span className="cal-chip-tag">보강</span>}
            <span className="cal-chip-name">{lesson.cls.name}</span>
          </span>
        )
      })}
      {lessons.length > shown.length && <span className="cal-more">+{lessons.length - shown.length}</span>}
    </span>
  )
}
