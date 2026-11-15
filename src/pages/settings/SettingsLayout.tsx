import type { ReactNode } from 'react'
import { NavLink, Outlet, useMatch } from 'react-router'
import Empty from '../../components/Empty'
import { ChevronRightIcon, Icon } from '../../components/icons'
import { BILLING_LABELS } from '../../data/rules'
import type { AbsenceCounting } from '../../data/types'
import { useSettings } from '../../data/settings'
import { PAYMENT_METHOD_LABELS } from '../../data/tuition'
import { APP_NAME, Logo } from '../../layout/AppShell'
import SplitView from '../../layout/SplitView'
import { formatDate } from '../../utils/date'
import { lastBackupDate } from './BackupPage'

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
  const lastBackup = lastBackupDate()
  const window = settings.makeupRule.window
  const makeupTargets = [settings.makeupRule.forAbsence && '결석', settings.makeupRule.forCancellation && '휴강'].filter(Boolean).join('·')

  const rules: MenuItem[] = [
    {
      to: '/settings/fees',
      title: '수강료 납부',
      sub: `${settings.sessionCount}회 · ${BILLING_LABELS[settings.billing]} · ${PAYMENT_METHOD_LABELS[settings.method]}`,
      icon: <Icon size={20}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></Icon>,
    },
    {
      to: '/settings/lessons',
      title: '수업·학생 추가',
      sub: `${settings.lessonStart}부터 ${settings.lessonMinutes}분`,
      icon: <Icon size={20}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 11.6-4M19 14v6M16 17h6" /></Icon>,
    },
    {
      to: '/settings/attendance',
      title: '출결·보강',
      sub: `${COUNTING_SHORT[settings.absenceCounting]} · ${makeupTargets ? `${makeupTargets} 보강` : '보강 없음'} · ${window.type === 'none' ? '기한 없음' : '기한 있음'}`,
      icon: <Icon size={20}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4" /></Icon>,
    },
  ]
  const data: MenuItem[] = [
    {
      to: '/settings/backup',
      title: '백업과 복원',
      sub: lastBackup ? `마지막 백업 ${formatDate(lastBackup)}` : '아직 백업하지 않았어요',
      icon: <Icon size={20}><path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></Icon>,
    },
    {
      to: '/settings/data',
      title: '데이터 관리',
      sub: '예시 데이터 넣기, 모두 지우기',
      icon: <Icon size={20}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Icon>,
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
