import type { ReactNode } from 'react'

// 아이콘은 Lucide 아이콘 모양을 따라 직접 그렸습니다. (ISC 사용 허가)
export function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const BackIcon = () => <Icon><path d="M15 5l-7 7 7 7" /></Icon>
export const ChevronRightIcon = () => <Icon size={20}><path d="M9 5l7 7-7 7" /></Icon>
export const ChevronDownIcon = () => <Icon size={20}><path d="M5 9l7 7 7-7" /></Icon>
export const PlusIcon = () => <Icon size={20}><path d="M12 5v14M5 12h14" /></Icon>
export const CalendarIcon = () => <Icon size={20}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>
export const CheckIcon = () => <Icon size={20}><path d="M5 12l5 5 9-10" /></Icon>
export const TrashIcon = () => <Icon size={20}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>
export const SearchIcon = () => <Icon size={20}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
export const PencilIcon = () => <Icon size={20}><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></Icon>
