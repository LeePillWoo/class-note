import { Link, NavLink, Outlet } from 'react-router'
import { useTodayTick } from '../hooks/useTodayTick'
import { usePaymentsEnabled } from '../data/settings'
import { navItems } from './navItems'

export const APP_NAME = '마녀의 출석부'

// 화면 너비에 따라 메뉴 위치가 바뀝니다. (styles.css 참고)
// - 휴대폰: 아래쪽 탭 메뉴, 위쪽에 앱 이름
// - 태블릿, 휴대폰 가로: 왼쪽 좁은 메뉴 (아이콘 아래 글자)
// - PC: 왼쪽 넓은 메뉴 (아이콘 옆 글자)
// 배치는 CSS로만 바꾸므로 화면 크기가 바뀌어도 화면을 다시 만들지 않아 적던 내용이 남습니다.
export default function AppShell() {
  // 자정이 지나거나 앱으로 돌아오면 다시 그려서 "오늘"이 맞게 보이게 합니다.
  useTodayTick()
  // 납부 기능을 끄면 납부 메뉴를 숨깁니다.
  const paymentsEnabled = usePaymentsEnabled()
  const items = navItems.filter((item) => paymentsEnabled || item.to !== '/payments')

  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <Link to="/" className="nav-brand" aria-label={`${APP_NAME} 홈`}>
          <Logo />
          <span className="nav-brand-name">{APP_NAME}</span>
        </Link>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <Link to="/" className="topbar-brand">
            <Logo />
            <span>{APP_NAME}</span>
          </Link>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** 로고: 학원 그림에서 모자와 얼굴만 자른 것 */
export function Logo() {
  return <img className="logo" src="./brand/witch-face.png" alt="" width={32} height={32} />
}
