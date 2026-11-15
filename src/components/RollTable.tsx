import { useMemo } from 'react'
import { Link } from 'react-router'
import { useData } from '../data/DataProvider'
import { classLessons, compareStudents, rollStatus, rosterOn, type RollStatus } from '../data/schedule'
import type { ClassGroup, Student } from '../data/types'
import { WEEKDAY_NAMES, dateParts, endOfMonth, formatDate, startOfMonth, today, weekdayOf, type DateStr } from '../utils/date'
import { studentPath } from './paths'
import RollCheck, { useRollCycle } from './RollCheck'

interface RollTableProps {
  cls: ClassGroup
  /** 보여줄 달의 아무 날짜 */
  month: DateStr
}

/**
 * 한 달 출석부 표: 학생(줄) × 수업 날짜(칸). 칸을 누르면 출석 → 결석 → 처음 순서로 바뀝니다.
 * 좁은 화면에서는 표를 옆으로 밀어서 보고, 이름 칸은 왼쪽에 붙어 있습니다.
 */
export default function RollTable({ cls, month }: RollTableProps) {
  const { index } = useData()
  const cycle = useRollCycle()
  const todayStr = today()
  const { month: monthNumber } = dateParts(month)

  const { dates, students, cells } = useMemo(() => {
    const dates = classLessons(cls, startOfMonth(month), endOfMonth(month)).map((lesson) => lesson.date)
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

  if (dates.length === 0) return <p className="muted">{monthNumber}월에는 수업이 없어요</p>
  if (students.length === 0) return <p className="muted">{monthNumber}월에 이 수업을 들은 학생이 없어요</p>

  return (
    <div className="roll-table-wrap" tabIndex={0} role="region" aria-label={`${cls.name} ${monthNumber}월 출석부`}>
      <table className="roll-table">
        <thead>
          <tr>
            <th scope="col" className="name-col">이름</th>
            {dates.map((date) => (
              <th key={date} scope="col" className={date === todayStr ? 'is-today' : undefined}>
                <span className="th-day">{dateParts(date).day}</span>
                <span className="th-weekday">{WEEKDAY_NAMES[weekdayOf(date)]}</span>
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
                <th scope="row" className="name-col">
                  <Link to={studentPath(index, student.id)}>{student.name}</Link>
                </th>
                {dates.map((date) => {
                  const status = row.get(date)
                  return (
                    <td key={date} className={date === todayStr ? 'is-today' : undefined}>
                      {status ? (
                        <RollCheck
                          size="sm"
                          status={status}
                          label={`${student.name} ${formatDate(date)}`}
                          onPress={() => cycle(cls.id, date, student, status)}
                        />
                      ) : (
                        <span className="cell-none" aria-label="수업 없음" />
                      )}
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
  )
}

/** 체크 상자 읽는 법 */
export function RollLegend() {
  return (
    <p className="legend">
      <span><span className="legend-box is-present" aria-hidden="true" />출석</span>
      <span><span className="legend-box is-absent" aria-hidden="true" />결석</span>
      <span><span className="legend-box" aria-hidden="true" />체크 전</span>
      <span className="legend-hint">한 번 누르면 출석, 두 번 결석, 세 번 지움</span>
    </p>
  )
}
