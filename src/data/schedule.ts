import { addDays, weekdayOf, type DateStr, type TimeStr } from '../utils/date'
import { periodAt } from './rules'
import type { Attendance, ClassGroup, Database, Enrollment, LessonNote, Makeup, Payment, Student } from './types'

// ===== 기록을 찾는 열쇠 =====

export function noteId(classId: string, date: DateStr): string {
  return `${classId}:${date}`
}

export function attendanceId(classId: string, date: DateStr, studentId: string): string {
  return `${classId}:${date}:${studentId}`
}

/** 보강은 "어느 반, 어느 날 수업을, 어느 학생이 빠졌는지"로 하나씩입니다. */
export function makeupId(classId: string, missedOn: DateStr, studentId: string): string {
  return `${classId}:${missedOn}:${studentId}`
}

/** 수강료는 학생과 반 한 쌍마다 따로 셉니다. */
export function pairKey(studentId: string, classId: string): string {
  return `${studentId}|${classId}`
}

/**
 * 화면에서 자주 찾는 것들을 미리 묶어 둔 찾아보기. 데이터가 바뀔 때 한 번 만듭니다.
 * 달력처럼 하루하루를 여러 번 계산하는 화면에서 매번 목록을 뒤지지 않게 합니다.
 */
export interface DataIndex {
  db: Database
  students: Map<string, Student>
  classes: Map<string, ClassGroup>
  enrollmentsByClass: Map<string, Enrollment[]>
  enrollmentsByStudent: Map<string, Enrollment[]>
  notes: Map<string, LessonNote>
  attendance: Map<string, Attendance>
  makeups: Map<string, Makeup>
  /** 예정일(또는 한 날)별 보강 */
  makeupsByDay: Map<DateStr, Makeup[]>
  makeupsByStudent: Map<string, Makeup[]>
  /** 받은 수강료 (학생|반 별) */
  tuitionByPair: Map<string, Payment[]>
  /** 반마다 계산해 둔 수업 날. 같은 반 학생들의 회차를 셀 때 수업 날을 학생 수만큼 다시 계산하지 않게 합니다. */
  lessonCache: Map<string, { to: DateStr; lessons: ClassLesson[] }>
}

function groupBy<T>(items: T[], keyOf: (item: T) => string | undefined): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    if (key === undefined) continue
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

export function buildIndex(db: Database): DataIndex {
  const byStart = (a: Enrollment, b: Enrollment) => a.startedOn.localeCompare(b.startedOn)
  const enrollmentsByClass = groupBy(db.enrollments, (item) => item.classId)
  const enrollmentsByStudent = groupBy(db.enrollments, (item) => item.studentId)
  enrollmentsByClass.forEach((list) => list.sort(byStart))
  enrollmentsByStudent.forEach((list) => list.sort(byStart))
  return {
    db,
    students: new Map(db.students.map((item) => [item.id, item])),
    classes: new Map(db.classes.map((item) => [item.id, item])),
    enrollmentsByClass,
    enrollmentsByStudent,
    notes: new Map(db.lessonNotes.map((item) => [item.id, item])),
    attendance: new Map(db.attendance.map((item) => [item.id, item])),
    makeups: new Map(db.makeups.map((item) => [item.id, item])),
    makeupsByDay: groupBy(db.makeups, (item) => item.scheduledOn),
    makeupsByStudent: groupBy(db.makeups, (item) => item.studentId),
    tuitionByPair: groupBy(db.payments, (item) =>
      item.kind === 'tuition' && item.classId && item.paidOn ? pairKey(item.studentId, item.classId) : undefined,
    ),
    lessonCache: new Map(),
  }
}

// ===== 수업일 =====

/** 반 일정에서 계산한 수업 하나 */
export interface ClassLesson {
  classId: string
  date: DateStr
  start: TimeStr
  end: TimeStr
}

/** 그 날짜에 이 반 수업이 있으면 그 수업. 반 시작일 전과 닫은 날 뒤는 없습니다. */
export function lessonOn(cls: ClassGroup, date: DateStr): ClassLesson | null {
  if (date < cls.startedOn || (cls.endedOn !== undefined && date > cls.endedOn)) return null
  const weekday = weekdayOf(date)
  const slot = periodAt(cls.schedules, date).find((item) => item.weekday === weekday)
  return slot ? { classId: cls.id, date, start: slot.start, end: slot.end } : null
}

/** from~to 사이의 수업일 (날짜 순서) */
export function classLessons(cls: ClassGroup, from: DateStr, to: DateStr): ClassLesson[] {
  const result: ClassLesson[] = []
  const first = from > cls.startedOn ? from : cls.startedOn
  const last = cls.endedOn && cls.endedOn < to ? cls.endedOn : to
  for (let date = first; date <= last; date = addDays(date, 1)) {
    const lesson = lessonOn(cls, date)
    if (lesson) result.push(lesson)
  }
  return result
}

/** classLessons와 같지만, 반 시작일부터 계산해 둔 것을 다시 씁니다. (찾아보기는 데이터가 바뀔 때마다 새로 만들어집니다) */
function cachedClassLessons(index: DataIndex, cls: ClassGroup, from: DateStr, to: DateStr): ClassLesson[] {
  let cached = index.lessonCache.get(cls.id)
  if (!cached || cached.to < to) {
    cached = { to, lessons: classLessons(cls, cls.startedOn, to) }
    index.lessonCache.set(cls.id, cached)
  }
  return cached.lessons.filter((lesson) => lesson.date >= from && lesson.date <= to)
}

// ===== 학생이 그 수업을 듣는지 =====

/** 그 날짜에 쉬는 중(휴원)인지 */
export function isPaused(student: Student, date: DateStr): boolean {
  return student.pauses.some((pause) => pause.from <= date && (pause.to === undefined || date <= pause.to))
}

/** 그 날짜에 학원에 나오지 않는지 (쉬는 중이거나 그만둔 뒤) */
export function isAway(student: Student, date: DateStr): boolean {
  return (student.leftOn !== undefined && date > student.leftOn) || isPaused(student, date)
}

export type StudentStatus = 'active' | 'paused' | 'left'

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: '다니는 중',
  paused: '쉬는 중',
  left: '그만둠',
}

export function studentStatus(student: Student, todayStr: DateStr): StudentStatus {
  if (student.leftOn !== undefined && todayStr > student.leftOn) return 'left'
  return isPaused(student, todayStr) ? 'paused' : 'active'
}

/** 수강 기간 안이고 듣는 요일인지 */
export function enrollmentCovers(enrollment: Enrollment, date: DateStr): boolean {
  if (date < enrollment.startedOn || (enrollment.endedOn !== undefined && date > enrollment.endedOn)) return false
  return !enrollment.weekdays || enrollment.weekdays.includes(weekdayOf(date))
}

/** 지금 듣고 있거나 앞으로 들을 수강인지 (끝난 수강은 false) */
export function isCurrentEnrollment(enrollment: Enrollment, todayStr: DateStr): boolean {
  return enrollment.endedOn === undefined || enrollment.endedOn >= todayStr
}

export interface RosterMember {
  student: Student
  enrollment: Enrollment
}

/** 학생은 이름 순서(가나다)로 보여줍니다. 이름이 같으면 먼저 등록한 학생이 앞 */
export function compareStudents(a: Student, b: Student): number {
  return a.name.localeCompare(b.name, 'ko') || a.createdAt.localeCompare(b.createdAt)
}

function byStudentOrder(a: RosterMember, b: RosterMember) {
  return compareStudents(a.student, b.student)
}

/** 그날 그 반 수업을 듣는 학생들 (이름 순서) */
export function rosterOn(index: DataIndex, classId: string, date: DateStr): RosterMember[] {
  const members: RosterMember[] = []
  for (const enrollment of index.enrollmentsByClass.get(classId) ?? []) {
    if (!enrollmentCovers(enrollment, date)) continue
    const student = index.students.get(enrollment.studentId)
    if (!student || isAway(student, date)) continue
    // 같은 학생이 한 반에 두 번 들어가 있어도 한 번만
    if (!members.some((member) => member.student.id === student.id)) members.push({ student, enrollment })
  }
  return members.sort(byStudentOrder)
}

/** 지금 이 반에 다니는 학생들 (수강이 끝나지 않은 학생. 쉬는 학생 포함) */
export function currentMembers(index: DataIndex, classId: string, todayStr: DateStr): RosterMember[] {
  const members: RosterMember[] = []
  for (const enrollment of index.enrollmentsByClass.get(classId) ?? []) {
    if (!isCurrentEnrollment(enrollment, todayStr)) continue
    const student = index.students.get(enrollment.studentId)
    if (!student || studentStatus(student, todayStr) === 'left') continue
    if (!members.some((member) => member.student.id === student.id)) members.push({ student, enrollment })
  }
  return members.sort(byStudentOrder)
}

/** 학생이 지금 다니는 반들 (반 순서대로) */
export function currentClasses(index: DataIndex, studentId: string, todayStr: DateStr): { cls: ClassGroup; enrollment: Enrollment }[] {
  const result: { cls: ClassGroup; enrollment: Enrollment }[] = []
  for (const enrollment of index.enrollmentsByStudent.get(studentId) ?? []) {
    if (!isCurrentEnrollment(enrollment, todayStr)) continue
    const cls = index.classes.get(enrollment.classId)
    if (cls && !result.some((item) => item.cls.id === cls.id)) result.push({ cls, enrollment })
  }
  return result.sort((a, b) => a.cls.order - b.cls.order)
}

// ===== 출결 상태 =====

/**
 * 한 학생의 한 수업 상태
 * - present, absent: 체크한 것
 * - unchecked: 지난 수업인데 아직 체크하지 않음
 * - planned: 오늘이나 앞으로의 수업 (아직 체크 전)
 * - cancelled: 휴강
 */
export type RollStatus = 'present' | 'absent' | 'unchecked' | 'planned' | 'cancelled'

export const ROLL_STATUS_LABELS: Record<RollStatus, string> = {
  present: '출석',
  absent: '결석',
  unchecked: '체크 전',
  planned: '예정',
  cancelled: '휴강',
}

export function rollStatus(index: DataIndex, classId: string, date: DateStr, studentId: string, todayStr: DateStr): RollStatus {
  if (index.notes.get(noteId(classId, date))?.cancelled) return 'cancelled'
  const record = index.attendance.get(attendanceId(classId, date, studentId))
  if (record) return record.status
  return date < todayStr ? 'unchecked' : 'planned'
}

/** 한 학생이 한 반에서 듣는 수업 하나 */
export interface StudentLesson {
  classId: string
  studentId: string
  date: DateStr
  start: TimeStr
  end: TimeStr
  status: RollStatus
}

/** 한 학생이 한 반에서 from~to 사이에 듣는 수업들 (날짜 순서). 쉬는 기간과 듣지 않는 요일은 뺍니다. */
export function studentLessons(
  index: DataIndex,
  studentId: string,
  classId: string,
  from: DateStr,
  to: DateStr,
  todayStr: DateStr,
): StudentLesson[] {
  const cls = index.classes.get(classId)
  const student = index.students.get(studentId)
  if (!cls || !student) return []
  const enrollments = (index.enrollmentsByStudent.get(studentId) ?? []).filter((item) => item.classId === classId)
  const result: StudentLesson[] = []
  for (const lesson of cachedClassLessons(index, cls, from, to)) {
    if (isAway(student, lesson.date) || !enrollments.some((item) => enrollmentCovers(item, lesson.date))) continue
    result.push({ ...lesson, studentId, status: rollStatus(index, classId, lesson.date, studentId, todayStr) })
  }
  return result
}
