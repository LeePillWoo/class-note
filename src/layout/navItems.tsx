import type { ReactNode } from 'react'
import { Icon } from '../components/icons'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

// 톱니바퀴 (Lucide 'settings' 아이콘 모양, ISC 사용 허가)
export const settingsIcon = (
  <Icon>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const navItems: NavItem[] = [
  {
    to: '/',
    label: '홈',
    icon: <Icon><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Icon>,
  },
  {
    to: '/lessons',
    label: '수업',
    // 사람과 음표
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 11.6-4" />
        <path d="M18 18V10l3-1" />
        <circle cx="16.5" cy="18" r="1.8" />
      </Icon>
    ),
  },
  {
    to: '/makeups',
    label: '보강',
    icon: <Icon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></Icon>,
  },
  {
    to: '/payments',
    label: '납부',
    icon: <Icon><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></Icon>,
  },
  {
    to: '/settings',
    label: '설정',
    icon: settingsIcon,
  },
]
