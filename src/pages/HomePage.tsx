import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import LessonCard from '../components/LessonCard'
import LessonSheet, { type LessonRef } from '../components/LessonSheet'
import MakeupSheet from '../components/MakeupSheet'
import PaymentSheet, { paymentTargetOf, type PaymentTarget } from '../components/PaymentSheet'
import { DueRow, MakeupRow } from '../components/rows'
import WeekSchedule from '../components/WeekSchedule'
import { useData } from '../data/DataProvider'
import { dayLessons, uncheckedLessons, type LessonView } from '../data/lessons'
import { isOpenState, makeupState, urgencyKey } from '../data/makeupRules'
import { useSampleData } from '../data/sampleActions'
import { usePaymentsEnabled } from '../data/settings'
import { allTuitionStates, dueViews } from '../data/tuition'
import { APP_NAME } from '../layout/AppShell'
import { WEEKDAY_NAMES, addDays, dateParts, formatDate, today, weekdayOf, type DateStr } from '../utils/date'
import { copula } from '../utils/korean'

/** 지금 시각 'HH:MM' */
function nowTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** 예: '11월 15일 일요일' */
function longDate(date: DateStr): string {
  const { month, day } = dateParts(date)
  return `${month}월 ${day}일 ${WEEKDAY_NAMES[weekdayOf(date)]}요일`
}

export default function HomePage() {
  const { data, index } = useData()
  const todayStr = today()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [makeupIds, setMakeupIds] = useState<string[] | null>(null)
  const [payment, setPayment] = useState<PaymentTarget | null>(null)
  const [sheetLesson, setSheetLesson] = useState<LessonRef | null>(null)

  const todayLessons = useMemo(() => dayLessons(index, todayStr, todayStr), [index, todayStr])
  // 출결을 안 적은 지난 수업 (2주 안)
  const unchecked = useMemo(() => uncheckedLessons(index, addDays(todayStr, -14), addDays(todayStr, -1), todayStr), [index, todayStr])
  // 남은 보강(대기, 예정)을 급한 순서로
  const openMakeups = useMemo(
    () =>
      data.makeups
        .filter((makeup) => isOpenState(makeupState(makeup, todayStr)) && index.students.has(makeup.studentId))
        .sort((a, b) => urgencyKey(a).localeCompare(urgencyKey(b))),
    [data.makeups, index, todayStr],
  )
  // 받을 날이 지났거나 일주일 안에 받을 돈
  const paymentsEnabled = usePaymentsEnabled()
  const dues = useMemo(() => (paymentsEnabled ? dueViews(index, allTuitionStates(index, todayStr), addDays(todayStr, 7), todayStr) : []), [index, todayStr, paymentsEnabled])

  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key))
  const cards = (lessons: LessonView[], showDate = false) => (
    <ul className="lessons">
      {lessons.map((view) => (
        <LessonCard key={view.key} view={view} open={openKey === view.key} onToggle={() => toggle(view.key)} onOpenMakeup={setMakeupIds} showDate={showDate} />
      ))}
    </ul>
  )

  if (data.classes.length === 0 && data.students.length === 0) return <Welcome />

  return (
    <section className="home">
      <h1 className="visually-hidden">홈</h1>
      <Hero lessons={todayLessons} />
      <div className="home-grid">
        <div className="home-main">
          <section className="block" aria-labelledby="today-heading">
            <h2 className="block-title" id="today-heading">오늘 수업</h2>
            {todayLessons.length === 0 ? <p className="empty-line">오늘은 수업이 없어요</p> : cards(todayLessons)}
          </section>
          {unchecked.length > 0 && (
            <section className="block" aria-labelledby="unchecked-heading">
              <h2 className="block-title" id="unchecked-heading">
                출결을 안 적은 수업 <span className="count">{unchecked.length}</span>
              </h2>
              {cards(unchecked.slice(0, 5), true)}
            </section>
          )}
          <section className="block" aria-labelledby="week-heading">
            <h2 className="block-title" id="week-heading">주간 일정</h2>
            <div className="card">
              <WeekSchedule onOpen={(view) => setSheetLesson({ date: view.date, key: view.key })} />
            </div>
          </section>
        </div>
        <aside className="home-aside">
          <section className="block" aria-labelledby="makeup-heading">
            <h2 className="block-title" id="makeup-heading">
              남은 보강 {openMakeups.length > 0 && <span className="count">{openMakeups.length}</span>}
            </h2>
            {openMakeups.length === 0 ? (
              <p className="empty-line">잡아야 할 보강이 없어요</p>
            ) : (
              <ul className="list">
                {openMakeups.slice(0, 5).map((makeup) => (
                  <li key={makeup.id}>
                    <MakeupRow makeup={makeup} onClick={() => setMakeupIds([makeup.id])} />
                  </li>
                ))}
              </ul>
            )}
            {openMakeups.length > 5 && <Link to="/makeups" className="block-link">보강 모두 보기</Link>}
          </section>
          {paymentsEnabled && <section className="block" aria-labelledby="due-heading">
            <h2 className="block-title" id="due-heading">
              받을 돈 {dues.length > 0 && <span className="count">{dues.length}</span>}
            </h2>
            {dues.length === 0 ? (
              <p className="empty-line">일주일 안에 받을 돈이 없어요</p>
            ) : (
              <ul className="list">
                {dues.slice(0, 5).map((due) => (
                  <li key={due.key}>
                    <DueRow due={due} onClick={() => setPayment(paymentTargetOf(due))} />
                  </li>
                ))}
              </ul>
            )}
            {dues.length > 5 && <Link to="/payments" className="block-link">납부 모두 보기</Link>}
          </section>}
        </aside>
      </div>
      <LessonSheet target={sheetLesson} onClose={() => setSheetLesson(null)} onOpenMakeup={setMakeupIds} />
      <MakeupSheet ids={makeupIds} onClose={() => setMakeupIds(null)} />
      <PaymentSheet target={payment} onClose={() => setPayment(null)} />
    </section>
  )
}

/** 홈 맨 위: 오늘 날짜와 오늘 수업을 한 문장으로, 학원 그림과 함께 */
function Hero({ lessons }: { lessons: LessonView[] }) {
  const { index } = useData()
  const todayStr = today()
  const active = lessons.filter((lesson) => !lesson.cancelled)

  let title: string
  let sub: string
  if (active.length === 0) {
    title = '오늘은 수업이 없어요'
    let next: LessonView | undefined
    for (let offset = 1; offset <= 14 && !next; offset++) {
      next = dayLessons(index, addDays(todayStr, offset), todayStr).find((lesson) => !lesson.cancelled)
    }
    sub = next ? `다음 수업은 ${formatDate(next.date)} ${next.start} ${next.cls.name}${copula(next.cls.name)}` : '수업을 등록하면 여기에 보여요'
  } else {
    title = `오늘 수업 ${active.length}개`
    const now = nowTime()
    const current = active.find((lesson) => lesson.start <= now && now < lesson.end)
    const upcoming = active.find((lesson) => lesson.start > now)
    if (current) sub = `지금은 ${current.cls.name} 시간이에요`
    else if (upcoming) sub = `${upcoming.start} ${upcoming.cls.name}${upcoming === active[0] ? '부터 시작해요' : ' 수업이 남았어요'}`
    else if (active.some((lesson) => lesson.roll.some((entry) => entry.status === 'planned' || entry.status === 'unchecked'))) sub = '오늘 수업이 끝났어요. 출결을 체크해 주세요'
    else sub = '오늘 수업을 모두 마쳤어요'
  }

  return (
    <div className="hero">
      <div className="hero-text">
        <p className="hero-date">{longDate(todayStr)}</p>
        <p className="hero-title">{title}</p>
        <p className="hero-sub">{sub}</p>
      </div>
      <img className="hero-art" src="./brand/witch.png" alt="" width={339} height={261} />
    </div>
  )
}

/** 처음 켰을 때: 무엇부터 하면 되는지 */
function Welcome() {
  const { loadSample } = useSampleData()
  const [busy, setBusy] = useState(false)
  return (
    <section className="home welcome">
      <h1 className="visually-hidden">홈</h1>
      <div className="hero">
        <div className="hero-text">
          <p className="hero-date">{longDate(today())}</p>
          <p className="hero-title">{APP_NAME}</p>
          <p className="hero-sub">출결, 수강료, 보강을 한곳에서</p>
        </div>
        <img className="hero-art" src="./brand/witch.png" alt="" width={339} height={261} />
      </div>
      <div className="welcome-actions">
        <div className="card welcome-card">
          <h2 className="card-title">첫 수업 등록</h2>
          <p className="muted">1:1 레슨은 학생 정보와 수업을 한 번에, 여러 명이 듣는 수업은 그룹 수업으로 만들어요</p>
          <div className="row">
            <Link to="/lessons/new/solo" className="btn btn-primary">
              <PlusIcon />
              1:1 레슨
            </Link>
            <Link to="/lessons/new/group" className="btn btn-secondary">
              <PlusIcon />
              그룹 수업
            </Link>
          </div>
        </div>
        <div className="card welcome-card">
          <h2 className="card-title">먼저 둘러보기</h2>
          <p className="muted">지어낸 학생과 수업으로 채운 예시를 넣어요. 설정에서 언제든 모두 지울 수 있어요</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void loadSample().finally(() => {
                  setBusy(false)
                  window.scrollTo(0, 0)
                })
              }}
            >
              예시 데이터 넣기
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
