import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Empty from '../components/Empty'
import { PlusIcon } from '../components/icons'
import LessonCard from '../components/LessonCard'
import MakeupSheet from '../components/MakeupSheet'
import PaymentSheet, { paymentTargetOf, type PaymentTarget } from '../components/PaymentSheet'
import { DueRow, MakeupRow } from '../components/rows'
import { useData } from '../data/DataProvider'
import { dayLessons, uncheckedLessons, type LessonView } from '../data/lessons'
import { isOpenState, makeupState, urgencyKey } from '../data/makeupRules'
import { useSampleData } from '../data/sampleActions'
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
  const dues = useMemo(() => dueViews(index, allTuitionStates(index, todayStr), addDays(todayStr, 7), todayStr), [index, todayStr])

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
    <section>
      <h1 className="visually-hidden">홈</h1>
      <Hero lessons={todayLessons} />
      <div className="duo">
        <div className="duo-cols">
          <div className="duo-col">
            <div className="home-section">
              <h2 className="section-heading">오늘 수업</h2>
              {todayLessons.length === 0 ? (
                <div className="card">
                  <p className="muted">오늘은 수업이 없어요.</p>
                </div>
              ) : (
                cards(todayLessons)
              )}
              <Link to="/attendance" className="section-link">다른 날 수업 보기</Link>
            </div>
            {unchecked.length > 0 && (
              <div className="home-section">
                <h2 className="section-heading">
                  출결을 안 적은 수업 <span className="muted">{unchecked.length}개</span>
                </h2>
                {cards(unchecked.slice(0, 5), true)}
                {unchecked.length > 5 && <Link to="/attendance?view=week" className="section-link">출결에서 모두 보기</Link>}
              </div>
            )}
          </div>
          <div className="duo-col">
            <div className="home-section">
              <h2 className="section-heading">
                남은 보강 {openMakeups.length > 0 && <span className="muted">{openMakeups.length}개</span>}
              </h2>
              {openMakeups.length === 0 ? (
                <div className="card">
                  <p className="muted">잡아야 할 보강이 없어요.</p>
                </div>
              ) : (
                <ul className="list">
                  {openMakeups.slice(0, 5).map((makeup) => (
                    <li key={makeup.id}>
                      <MakeupRow makeup={makeup} onClick={() => setMakeupIds([makeup.id])} />
                    </li>
                  ))}
                </ul>
              )}
              {openMakeups.length > 0 && <Link to="/makeups" className="section-link">보강 모두 보기</Link>}
            </div>
            <div className="home-section">
              <h2 className="section-heading">
                받을 돈 {dues.length > 0 && <span className="muted">{dues.length}개</span>}
              </h2>
              {dues.length === 0 ? (
                <div className="card">
                  <p className="muted">일주일 안에 받을 돈이 없어요.</p>
                </div>
              ) : (
                <ul className="list">
                  {dues.slice(0, 5).map((due) => (
                    <li key={due.key}>
                      <DueRow due={due} onClick={() => setPayment(paymentTargetOf(due))} />
                    </li>
                  ))}
                </ul>
              )}
              {dues.length > 0 && <Link to="/payments" className="section-link">납부 모두 보기</Link>}
            </div>
          </div>
        </div>
      </div>
      <MakeupSheet ids={makeupIds} onClose={() => setMakeupIds(null)} />
      <PaymentSheet target={payment} onClose={() => setPayment(null)} />
    </section>
  )
}

/** 홈 맨 위의 큰 그림: 오늘 날짜와 오늘 수업을 한 문장으로 */
function Hero({ lessons }: { lessons: LessonView[] }) {
  const { index } = useData()
  const todayStr = today()
  const active = lessons.filter((lesson) => !lesson.cancelled)

  let title: string
  let sub: string
  if (active.length === 0) {
    title = '오늘은 수업이 없어요'
    // 앞으로 2주 안의 첫 수업
    let next: LessonView | undefined
    for (let offset = 1; offset <= 14 && !next; offset++) {
      next = dayLessons(index, addDays(todayStr, offset), todayStr).find((lesson) => !lesson.cancelled)
    }
    sub = next ? `다음 수업은 ${formatDate(next.date)} ${next.start} ${next.cls.name}${copula(next.cls.name)}` : '반을 만들면 수업이 여기에 보여요'
  } else {
    title = `오늘 수업은 ${active.length}개예요`
    const now = nowTime()
    const current = active.find((lesson) => lesson.start <= now && now < lesson.end)
    const upcoming = active.find((lesson) => lesson.start > now)
    if (current) sub = `지금은 ${current.cls.name} 시간이에요`
    else if (upcoming) sub = `${upcoming.start}에 ${upcoming.cls.name}${upcoming === active[0] ? '부터 시작해요' : ' 수업이 있어요'}`
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
    <section className="narrow">
      <h1 className="visually-hidden">홈</h1>
      <div className="hero">
        <div className="hero-text">
          <p className="hero-date">{longDate(today())}</p>
          <p className="hero-title">{APP_NAME}</p>
          <p className="hero-sub">출결, 수강료, 보강을 한곳에서</p>
        </div>
        <img className="hero-art" src="./brand/witch.png" alt="" width={339} height={261} />
      </div>
      <Empty
        title="반부터 만들어 볼까요?"
        action={
          <Link to="/classes/new" className="btn btn-primary">
            <PlusIcon />
            반 만들기
          </Link>
        }
      >
        반을 만들고 학생을 넣으면, 수업 날마다 출석부가 생겨요. 1:1 레슨도 학생이 한 명인 반으로 만들면 돼요.
      </Empty>
      <div className="card">
        <h2 className="card-title">먼저 둘러보고 싶다면</h2>
        <p>지어낸 학생과 반으로 채운 예시를 넣어 볼 수 있어요. 설정에서 언제든 모두 지울 수 있어요.</p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            // 예시가 들어가면 홈이 채워지므로 맨 위(오늘 수업)부터 보여줍니다.
            void loadSample().finally(() => {
              setBusy(false)
              window.scrollTo(0, 0)
            })
          }}
        >
          예시 데이터 넣기
        </button>
      </div>
    </section>
  )
}
