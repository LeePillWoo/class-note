import type { DateStr } from '../utils/date'
import {
  markAllPresentChanges,
  setAttendanceChanges,
  setAttendanceMemoChanges,
  setCancelledChanges,
  setLessonMemoChanges,
} from './attendanceChanges'
import { useData } from './DataProvider'
import { nowIso } from './id'
import type { AttendanceStatus } from './types'

/**
 * 출결을 적는 기능. 누르는 즉시 저장합니다. (저장 단추가 따로 없습니다)
 * 결석이나 휴강을 적으면 반 규칙에 따라 보강도 함께 생기고, 되돌리면 없어집니다.
 */
export function useAttendance() {
  const { update } = useData()
  return {
    /** status가 null이면 '체크 전'으로 되돌립니다. */
    setAttendance: (classId: string, date: DateStr, studentId: string, status: AttendanceStatus | null) =>
      update((db) => setAttendanceChanges(db, classId, date, studentId, status, nowIso())),
    setAttendanceMemo: (classId: string, date: DateStr, studentId: string, memo: string) =>
      update((db) => setAttendanceMemoChanges(db, classId, date, studentId, memo, nowIso())),
    markAllPresent: (classId: string, date: DateStr) => update((db) => markAllPresentChanges(db, classId, date, nowIso())),
    setCancelled: (classId: string, date: DateStr, cancelled: boolean) =>
      update((db) => setCancelledChanges(db, classId, date, cancelled, nowIso())),
    setLessonMemo: (classId: string, date: DateStr, memo: string) => update((db) => setLessonMemoChanges(db, classId, date, memo, nowIso())),
  }
}
