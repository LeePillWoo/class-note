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
export const CloseIcon = () => <Icon size={20}><path d="M6 6l12 12M18 6L6 18" /></Icon>

// 아래 아이콘은 Codex와 함께 만든 묶음(design/codex/icons)에서 가져왔습니다. 굵기와 끝 모양은 위와 같습니다.
export const CopyIcon = () => <Icon size={20}><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 5V3H4v13h1" /></Icon>
export const CameraIcon = () => <Icon size={20}><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></Icon>
export const NoteIcon = () => <Icon size={20}><path d="M5 3h10l5 5v13H5zM15 3v5h5M9 12h7M9 16h5" /></Icon>
export const MessageIcon = () => <Icon size={20}><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2zM7 9h10M7 13h7" /></Icon>
/** 수업: 악보 공책 */
export const LessonsIcon = ({ size = 24 }: { size?: number }) => <Icon size={size}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v18M16 8v6" /><ellipse cx="14" cy="14.5" rx="2" ry="1.5" /></Icon>
export const SlidersIcon = () => <Icon size={20}><path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2" /><circle cx="14" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></Icon>
/** 학생 관리: 학생 명부 */
export const RosterIcon = () => <Icon size={20}><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="9" r="2.5" /><path d="M8 17a4 4 0 0 1 8 0M2 7h3M2 12h3M2 17h3" /></Icon>
export const AttendanceIcon = () => <Icon size={20}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 15l3 3 5-5" /></Icon>
export const BackupIcon = () => <Icon size={20}><path d="M8 15V3M4 7l4-4 4 4M16 3v12M12 11l4 4 4-4M3 17v4h18v-4" /></Icon>
export const DatabaseIcon = () => <Icon size={20}><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 4 16 4 16 0v-13M4 12c0 4 16 4 16 0" /></Icon>
export const MinusIcon = () => <Icon size={20}><path d="M5 12h14" /></Icon>
