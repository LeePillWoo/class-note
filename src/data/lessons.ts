import { addDays, type DateStr, type TimeStr } from '../utils/date'
import { attendanceId, compareStudents, lessonOn, makeupId, noteId, rollStatus, rosterOn, type DataIndex, type RollStatus } from './schedule'
import type { Attendance, ClassGroup, LessonNote, Makeup, Student } from './types'

/** 출석부의 한 줄: 그 수업을 원래 듣는 학생 */
export interface RollEntry {
  student: Student
  status: RollStatus
  attendance?: Attendance
  /** 이 수업을 빠져서(결석·휴강) 생긴 보강 */
  makeup?: Makeup
}

/** 출석부의 한 줄: 보강으로 온 학생 */
export interface GuestEntry {
  student: Student
  makeup: Makeup
  /** 원래 반 (다른 반 수업에 같이 듣는 경우 이름을 보여줌) */
  homeClass?: ClassGroup
}

/** 선생님이 보는 수업 하나: 정규 수업이거나, 따로 잡은 보강 수업 */
export interface LessonView {
  key: string
  kind: 'class' | 'makeup'
  cls: ClassGroup
  date: DateStr
  start: TimeStr
  end: TimeStr
  cancelled: boolean
  note?: LessonNote
  roll: RollEntry[]
  guests: GuestEntry[]
}

export function lessonKey(classId: string, date: DateStr): string {
  return `${classId}|${date}`
}

function guestOf(index: DataIndex, makeup: Makeup): GuestEntry | null {
  const student = index.students.get(makeup.studentId)
  return student ? { student, makeup, homeClass: index.classes.get(makeup.classId) } : null
}

function sortGuests(guests: GuestEntry[]): GuestEntry[] {
  return guests.sort((a, b) => compareStudents(a.student, b.student))
}

/**
 * 그날의 수업 목록 (시작 시각 순서).
 * - 반마다 일정에 있는 수업 하나: 명단과 출결, 그 수업에 같이 듣는 보강 학생
 * - 따로 시간을 잡은 보강: 같은 반·같은 시간끼리 묶어 '보강 수업' 하나로
 */
export function dayLessons(index: DataIndex, date: DateStr, todayStr: DateStr): LessonView[] {
  const views: LessonView[] = []
  const scheduled = (index.makeupsByDay.get(date) ?? []).filter((makeup) => makeup.status !== 'skipped')
  const joined = new Set<string>()

  const classes = [...index.db.classes].sort((a, b) => a.order - b.order)
  for (const cls of classes) {
    const lesson = lessonOn(cls, date)
    if (!lesson) continue
    const note = index.notes.get(noteId(cls.id, date))
    const roll = rosterOn(index, cls.id, date).map(({ student }): RollEntry => ({
      student,
      status: rollStatus(index, cls.id, date, student.id, todayStr),
      attendance: index.attendance.get(attendanceId(cls.id, date, student.id)),
      makeup: index.makeups.get(makeupId(cls.id, date, student.id)),
    }))
    const guests: GuestEntry[] = []
    for (const makeup of scheduled) {
      if (makeup.joinClassId !== cls.id) continue
      const guest = guestOf(index, makeup)
      if (guest) {
        guests.push(guest)
        joined.add(makeup.id)
      }
    }
    views.push({
      key: lessonKey(cls.id, date),
      kind: 'class',
      cls,
      date,
      start: lesson.start,
      end: lesson.end,
      cancelled: note?.cancelled ?? false,
      note,
      roll,
      guests: sortGuests(guests),
    })
  }

  // 따로 잡은 보강 (같이 들을 수업이 그날 없어진 경우도 여기로)
  const sessions = new Map<string, LessonView>()
  for (const makeup of scheduled) {
    if (joined.has(makeup.id)) continue
    const cls = index.classes.get(makeup.classId)
    const guest = guestOf(index, makeup)
    if (!cls || !guest) continue
    const start = makeup.start ?? '00:00'
    const end = makeup.end ?? start
    const key = `makeup|${cls.id}|${date}|${start}|${end}`
    const view = sessions.get(key)
    if (view) view.guests.push(guest)
    else sessions.set(key, { key, kind: 'makeup', cls, date, start, end, cancelled: false, roll: [], guests: [guest] })
  }
  for (const view of sessions.values()) {
    sortGuests(view.guests)
    views.push(view)
  }

  const order = new Map(classes.map((cls, position) => [cls.id, position]))
  return views.sort(
    (a, b) => a.start.localeCompare(b.start) || (order.get(a.cls.id) ?? 0) - (order.get(b.cls.id) ?? 0) || a.kind.localeCompare(b.kind),
  )
}

export interface RollCounts {
  /** 출결을 적을 학생 수 (정규 학생 + 보강 학생) */
  total: number
  present: number
  absent: number
  /** 아직 체크하지 않은 학생 수 */
  unchecked: number
}

export function rollCounts(view: LessonView): RollCounts {
  const counts: RollCounts = { total: view.roll.length + view.guests.length, present: 0, absent: 0, unchecked: 0 }
  if (view.cancelled) return { ...counts, total: view.guests.length, present: view.guests.filter((guest) => guest.makeup.status === 'done').length }
  for (const entry of view.roll) {
    if (entry.status === 'present') counts.present++
    else if (entry.status === 'absent') counts.absent++
    else counts.unchecked++
  }
  for (const guest of view.guests) {
    if (guest.makeup.status === 'done') counts.present++
    else counts.unchecked++
  }
  return counts
}

/** from~to 사이의 지난 수업 중 아직 출결을 다 적지 않은 수업 (최근 것부터). 휴강은 뺍니다. */
export function uncheckedLessons(index: DataIndex, from: DateStr, to: DateStr, todayStr: DateStr): LessonView[] {
  const result: LessonView[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    for (const view of dayLessons(index, date, todayStr)) {
      if (view.kind !== 'class' || view.cancelled) continue
      if (view.roll.some((entry) => entry.status === 'unchecked')) result.push(view)
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date) || a.start.localeCompare(b.start))
}
