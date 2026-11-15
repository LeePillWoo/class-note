import { useMemo } from 'react'
import { useAttendance } from '../data/attendance'
import { useData } from '../data/DataProvider'
import { ROLL_STATUS_LABELS, classLessons, compareStudents, makeupId, rollStatus, rosterOn, type RollStatus } from '../data/schedule'
import type { AttendanceStatus, ClassGroup, Student } from '../data/types'
import { WEEKDAY_NAMES, dateParts, endOfMonth, formatDate, startOfMonth, today, weekdayOf, type DateStr } from '../utils/date'

interface RollTableProps {
  cls: ClassGroup
  /** 보여줄 달의 아무 날짜 */
  month: DateStr
}

const MARKS: Record<RollStatus, string> = {
  present: '○',
  absent: '×',
  unchecked: '·',
  planned: '',
  cancelled: '휴',
}

/** 칸을 누를 때마다: (체크 전) → 출석 → 결석 → (체크 전) */
function nextStatus(status: RollStatus): AttendanceStatus | null {
  if (status === 'present') return 'absent'
  if (status === 'absent') return null
  return 'present'
}

/**
 * 한 달 출석부 표: 학생(줄) × 수업 날짜(칸). 종이 출석부처럼 한눈에 보고, 칸을 눌러 바로 고칩니다.
 * 좁은 화면에서는 표를 옆으로 밀어서 보고, 이름 칸은 왼쪽에 붙어 있습니다.
 */
export default function RollTable({ cls, month }: RollTableProps) {
  const { index } = useData()
  const { setAttendance } = useAttendance()
  const todayStr = today()
  const { month: monthNumber } = dateParts(month)

  const { dates, students, cells } = useMemo(() => {
    const lessons = classLessons(cls, startOfMonth(month), endOfMonth(month))
    const dates = lessons.map((lesson) => lesson.date)
    const members = new Map<string, Student>()
    // cells: 학생 → 날짜 → 상태 (그날 명단에 없으면 칸이 비어 있음)
    const cells = new Map<string, Map<DateStr, RollStatus>>()
    for (const date of dates) {
      for (const { student } of rosterOn(index, cls.id, date)) {
        members.set(student.id, student)
        let row = cells.get(student.id)
        if (!row) cells.set(student.id, (row = new Map()))
        row.set(date, rollStatus(index, cls.id, date, student.id, todayStr))
      }
    }
    return { dates, students: [...members.values()].sort(compareStudents), cells }
  }, [cls, month, index, todayStr])

  if (dates.length === 0) return <p className="muted">{monthNumber}월에는 수업이 없어요.</p>
  if (students.length === 0) return <p className="muted">{monthNumber}월에 이 반을 들은 학생이 없어요.</p>

  function press(student: Student, date: DateStr, status: RollStatus) {
    const next = nextStatus(status)
    // 결석을 지우면 그 결석으로 생긴 보강도 없어지므로, 날짜를 잡았거나 끝낸 보강이 있으면 먼저 물어봅니다.
    if (status === 'absent') {
      const makeup = index.makeups.get(makeupId(cls.id, date, student.id))
      if (makeup && (makeup.status !== 'open' || makeup.scheduledOn)) {
        if (!window.confirm(`${student.name} 학생의 ${formatDate(date)} 결석을 지우면 날짜를 잡았거나 끝낸 보강도 지워져요. 지울까요?`)) return
      }
    }
    void setAttendance(cls.id, date, student.id, next)
  }

  return (
    <>
      <div className="roll-table-wrap" tabIndex={0} role="region" aria-label={`${cls.name} ${monthNumber}월 출석부`}>
        <table className="roll-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              {dates.map((date) => (
                <th key={date} scope="col" className={date === todayStr ? 'is-today' : undefined}>
                  {dateParts(date).day}
                  <small>{WEEKDAY_NAMES[weekdayOf(date)]}</small>
                </th>
              ))}
              <th scope="col" className="total">출석</th>
              <th scope="col" className="total">결석</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const row = cells.get(student.id)!
              const statuses = [...row.values()]
              return (
                <tr key={student.id}>
                  <th scope="row">{student.name}</th>
                  {dates.map((date) => {
                    const status = row.get(date)
                    if (!status) return <td key={date} aria-label="수업 없음" />
                    return (
                      <td key={date}>
                        <button
                          type="button"
                          className={`mark is-${status}`}
                          disabled={status === 'cancelled'}
                          aria-label={`${student.name} ${formatDate(date)} ${ROLL_STATUS_LABELS[status]}`}
                          onClick={() => press(student, date, status)}
                        >
                          {MARKS[status]}
                        </button>
                      </td>
                    )
                  })}
                  <td className="total">{statuses.filter((status) => status === 'present').length}</td>
                  <td className="total">{statuses.filter((status) => status === 'absent').length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="legend">
        <span>○ 출석</span>
        <span>× 결석</span>
        <span>· 체크 전</span>
        <span>휴 휴강</span>
        <span>칸을 누르면 출석, 결석, 지움 순서로 바뀌어요.</span>
      </p>
    </>
  )
}
