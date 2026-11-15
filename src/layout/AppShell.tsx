import { Link, NavLink, Outlet } from 'react-router'
import { useTodayTick } from '../hooks/useTodayTick'
import { navItems, settingsIcon } from './navItems'

export const APP_NAME = '마녀의 출석부'

// 화면 모양에 따라 메뉴 위치가 바뀝니다. (app.css 참고)
// - 세로 화면(휴대폰, 폴드 접은 화면, 폴드7 펼친 화면): 아래쪽 탭 메뉴. 설정은 위쪽 막대 오른쪽의 톱니 단추
// - 가로 화면(휴대폰 가로, 폴드8 펼친 화면, PC): 왼쪽 메뉴 (설정 포함)
// 배치는 모두 CSS로만 바꿉니다. 화면 크기가 바뀌어도(폴드를 접거나 펴도) 화면을 다시 만들지 않으므로 적던 내용이 남습니다.
export default function AppShell() {
  // 자정이 지나거나 앱으로 돌아오면 다시 그려서 "오늘"이 맞게 보이게 합니다.
  useTodayTick()

  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <Link to="/" className="nav-brand" aria-label={`${APP_NAME} 홈`}>
          <Logo />
        </Link>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={item.railOnly ? 'nav-item is-rail-only' : 'nav-item'}>
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
          <NavLink to="/settings" className="icon-btn topbar-settings" aria-label="설정">
            {settingsIcon}
          </NavLink>
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
  return <img className="logo" src="./brand/witch-face.png" alt="" width={36} height={36} />
}
