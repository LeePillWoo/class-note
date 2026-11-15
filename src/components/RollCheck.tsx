import { useAttendance } from '../data/attendance'
import { useData } from '../data/DataProvider'
import { ROLL_STATUS_LABELS, makeupId, type RollStatus } from '../data/schedule'
import type { AttendanceStatus, Student } from '../data/types'
import { formatDate, type DateStr } from '../utils/date'

/** 누를 때마다: (체크 전) → 출석 → 결석 → (체크 전) */
export function nextRollStatus(status: RollStatus): AttendanceStatus | null {
  if (status === 'present') return 'absent'
  if (status === 'absent') return null
  return 'present'
}

/**
 * 출결 칸을 누르는 기능. 결석을 지우면 그 결석으로 생긴 보강도 없어지므로,
 * 날짜를 잡았거나 끝낸 보강이 있으면 먼저 물어봅니다.
 */
export function useRollCycle() {
  const { index } = useData()
  const { setAttendance } = useAttendance()
  return (classId: string, date: DateStr, student: Student, status: RollStatus) => {
    if (status === 'cancelled') return
    if (status === 'absent') {
      const makeup = index.makeups.get(makeupId(classId, date, student.id))
      if (makeup && (makeup.status !== 'open' || makeup.scheduledOn)) {
        if (!window.confirm(`${student.name} 학생의 ${formatDate(date)} 결석을 지우면 날짜를 잡았거나 끝낸 보강도 지워져요. 지울까요?`)) return
      }
    }
    void setAttendance(classId, date, student.id, nextRollStatus(status))
  }
}

interface RollCheckProps {
  status: RollStatus
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '김하준 11월 15일 (일)' */
  label: string
  onPress(): void
  size?: 'md' | 'sm'
}

/** 출결 체크 상자. 한 번 누르면 출석, 두 번 누르면 결석, 세 번 누르면 처음으로 */
export default function RollCheck({ status, label, onPress, size = 'md' }: RollCheckProps) {
  const cancelled = status === 'cancelled'
  const state = status === 'present' || status === 'absent' || cancelled ? status : 'empty'
  return (
    <button
      type="button"
      className={`check check-${size} is-${state}`}
      aria-label={`${label}: ${ROLL_STATUS_LABELS[status]}`}
      disabled={cancelled}
      onClick={onPress}
    >
      <span className="check-box" aria-hidden="true">
        {state === 'present' && (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        )}
        {state === 'absent' && (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
          </svg>
        )}
        {cancelled && '휴'}
      </span>
    </button>
  )
}
