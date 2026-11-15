import type { ReactNode } from 'react'
import { NavLink, Outlet, useMatch } from 'react-router'
import Empty from '../../components/Empty'
import { AttendanceIcon, BackupIcon, ChevronRightIcon, DatabaseIcon, RosterIcon, SlidersIcon } from '../../components/icons'
import { useData } from '../../data/DataProvider'
import { BILLING_LABELS } from '../../data/rules'
import { studentStatus } from '../../data/schedule'
import type { AbsenceCounting } from '../../data/types'
import { useSettings } from '../../data/settings'
import { PAYMENT_METHOD_LABELS } from '../../data/tuition'
import { APP_NAME, Logo } from '../../layout/AppShell'
import SplitView from '../../layout/SplitView'
import { formatDate, today } from '../../utils/date'
import { lastBackupDate } from './BackupPage'
import { lengthLabel } from '../../components/TimeSelect'

/** 설정: 왼쪽(좁은 화면은 첫 화면) 메뉴 + 누르면 들어가는 화면 */
export default function SettingsLayout() {
  const atMenu = useMatch({ path: '/settings', end: true }) !== null
  return (
    <SplitView detailActive={!atMenu} list={<SettingsMenu />}>
      <Outlet />
    </SplitView>
  )
}

/** 메뉴를 고르지 않았을 때 오른쪽 칸 (넓은 화면에서만 보입니다) */
export function SettingsIndex() {
  return (
    <Empty plain title="바꿀 항목을 골라 주세요">
      기본 규칙은 새로 만드는 수업과 모든 출결·보강에 쓰여요.
    </Empty>
  )
}

/** 메뉴에 보여줄 결석 처리 한마디 */
const COUNTING_SHORT: Record<AbsenceCounting, string> = {
  never: '결석 안 셈',
  ifNoMakeup: '보강 안 하면 셈',
  always: '결석도 셈',
}

interface MenuItem {
  to: string
  title: string
  sub: string
  icon: ReactNode
}

function SettingsMenu() {
  const { settings } = useSettings()
  const { data: db } = useData()
  const lastBackup = lastBackupDate()
  const todayStr = today()
  const statusCounts = { active: 0, paused: 0, left: 0 }
  for (const student of db.students) statusCounts[studentStatus(student, todayStr)]++
  const studentSummary =
    db.students.length === 0
      ? '아직 학생이 없어요'
      : [`다니는 중 ${statusCounts.active}명`, statusCounts.paused > 0 && `쉬는 중 ${statusCounts.paused}명`, statusCounts.left > 0 && `그만둠 ${statusCounts.left}명`]
          .filter(Boolean)
          .join(' · ')
  const window = settings.makeupRule.window
  const makeupTargets = [settings.makeupRule.forAbsence && '결석', settings.makeupRule.forCancellation && '휴강'].filter(Boolean).join('·')

  const rules: MenuItem[] = [
    {
      to: '/settings/defaults',
      title: '수업 기본값',
      sub: `${settings.sessionCount}회 · ${BILLING_LABELS[settings.billing]} · ${PAYMENT_METHOD_LABELS[settings.method]} · ${settings.lessonStart}부터 ${lengthLabel(settings.lessonMinutes)}${settings.timeStep === 60 ? ' · 정각' : ''}`,
      icon: <SlidersIcon />,
    },
    {
      to: '/settings/attendance',
      title: '출결·보강',
      sub: `${COUNTING_SHORT[settings.absenceCounting]} · ${makeupTargets ? `${makeupTargets} 보강` : '보강 없음'} · ${window.type === 'none' ? '기한 없음' : '기한 있음'}`,
      icon: <AttendanceIcon />,
    },
  ]
  const people: MenuItem[] = [
    {
      to: '/settings/students',
      title: '학생 관리',
      sub: studentSummary,
      icon: <RosterIcon />,
    },
  ]
  const data: MenuItem[] = [
    {
      to: '/settings/backup',
      title: '백업과 복원',
      sub: lastBackup ? `마지막 백업 ${formatDate(lastBackup)}` : '아직 백업하지 않았어요',
      icon: <BackupIcon />,
    },
    {
      to: '/settings/data',
      title: '데이터 관리',
      sub: '예시 데이터 넣기, 모두 지우기',
      icon: <DatabaseIcon />,
    },
  ]

  const list = (label: string, items: MenuItem[]) => (
    <div className="list-group">
      <h2 className="list-label">{label}</h2>
      <ul className="list" aria-label={label}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className="person-row menu-row">
              <span className="menu-icon">{item.icon}</span>
              <span className="person-text">
                <span className="person-name">{item.title}</span>
                <span className="person-sub">{item.sub}</span>
              </span>
              <ChevronRightIcon />
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section>
      <div className="page-header">
        <div className="page-heading">
          <h1 className="page-title">설정</h1>
        </div>
      </div>
      {list('기본 규칙', rules)}
      {list('학생', people)}
      {list('데이터', data)}
      <div className="app-info">
        <Logo />
        <div>
          <p className="app-info-name">{APP_NAME}</p>
          <p className="muted">버전 {__APP_VERSION__} · 기록은 이 기기에만 저장돼요</p>
        </div>
      </div>
    </section>
  )
}
