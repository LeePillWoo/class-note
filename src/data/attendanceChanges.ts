import type { DateStr } from '../utils/date'
import { makeupDeadline } from './makeupRules'
import { attendanceId, buildIndex, makeupId, noteId, rosterOn, type DataIndex } from './schedule'
import { applyChanges } from './storage'
import type { Attendance, AttendanceStatus, Change, Database, LessonNote, Makeup } from './types'

/**
 * 한 수업(반+날짜)의 출결이나 휴강이 바뀐 뒤 보강을 맞춥니다. index는 **바뀐 뒤**의 데이터입니다.
 * - 보강 대상(설정의 보강 규칙에 맞는 결석, 휴강)이 되면 보강을 만듭니다.
 * - 결석 ↔ 휴강으로 바뀌면 이유만 고칩니다. (잡아 둔 날짜는 그대로)
 * - 보강 대상이 아니게 되면 그 보강을 지웁니다.
 */
export function makeupSyncChanges(index: DataIndex, classId: string, date: DateStr, now: string): Change[] {
  const cls = index.classes.get(classId)
  if (!cls) return []
  const rule = index.settings.makeupRule
  const cancelled = index.notes.get(noteId(classId, date))?.cancelled ?? false
  const wanted = new Map<string, Makeup['reason']>()
  for (const { student } of rosterOn(index, classId, date)) {
    if (cancelled) {
      if (rule.forCancellation) wanted.set(student.id, 'cancelled')
    } else if (rule.forAbsence && index.attendance.get(attendanceId(classId, date, student.id))?.status === 'absent') {
      wanted.set(student.id, 'absent')
    }
  }

  const changes: Change[] = []
  const existing = index.db.makeups.filter((makeup) => makeup.classId === classId && makeup.missedOn === date)
  for (const makeup of existing) {
    const reason = wanted.get(makeup.studentId)
    if (!reason) changes.push({ type: 'remove', collection: 'makeups', id: makeup.id })
    else if (reason !== makeup.reason) changes.push({ type: 'put', collection: 'makeups', item: { ...makeup, reason, updatedAt: now } })
    wanted.delete(makeup.studentId)
  }
  for (const [studentId, reason] of wanted) {
    const item: Makeup = {
      id: makeupId(classId, date, studentId),
      classId,
      studentId,
      missedOn: date,
      reason,
      deadline: makeupDeadline(rule, date),
      status: 'open',
      memo: '',
      createdAt: now,
      updatedAt: now,
    }
    changes.push({ type: 'put', collection: 'makeups', item })
  }
  return changes
}

/** 변경을 적용한 뒤의 데이터로 보강까지 맞춘 변경 목록 */
function withMakeupSync(db: Database, changes: Change[], classId: string, date: DateStr, now: string): Change[] {
  if (changes.length === 0) return []
  return [...changes, ...makeupSyncChanges(buildIndex(applyChanges(db, changes)), classId, date, now)]
}

/** 한 학생의 출결을 적습니다. status가 null이면 기록을 지워 '체크 전'으로 돌립니다. */
export function setAttendanceChanges(
  db: Database,
  classId: string,
  date: DateStr,
  studentId: string,
  status: AttendanceStatus | null,
  now: string,
): Change[] {
  const id = attendanceId(classId, date, studentId)
  const existing = db.attendance.find((record) => record.id === id)
  if (status === null) {
    return existing ? withMakeupSync(db, [{ type: 'remove', collection: 'attendance', id }], classId, date, now) : []
  }
  if (existing?.status === status) return []
  const item: Attendance = {
    id,
    classId,
    studentId,
    date,
    status,
    // 출결이 바뀌면 전에 적은 사유는 맞지 않으므로 비웁니다.
    memo: '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  return withMakeupSync(db, [{ type: 'put', collection: 'attendance', item }], classId, date, now)
}

/** 결석 사유 같은 메모를 고칩니다. 출결을 적은 학생만 됩니다. */
export function setAttendanceMemoChanges(db: Database, classId: string, date: DateStr, studentId: string, memo: string, now: string): Change[] {
  const existing = db.attendance.find((record) => record.id === attendanceId(classId, date, studentId))
  if (!existing || existing.memo === memo) return []
  return [{ type: 'put', collection: 'attendance', item: { ...existing, memo, updatedAt: now } }]
}

/** 아직 체크하지 않은 학생을 모두 출석으로 적습니다. 이미 적은 학생(결석 포함)은 그대로 둡니다. */
export function markAllPresentChanges(db: Database, classId: string, date: DateStr, now: string): Change[] {
  const index = buildIndex(db)
  const changes: Change[] = []
  for (const { student } of rosterOn(index, classId, date)) {
    const id = attendanceId(classId, date, student.id)
    if (index.attendance.has(id)) continue
    const item: Attendance = { id, classId, studentId: student.id, date, status: 'present', memo: '', createdAt: now, updatedAt: now }
    changes.push({ type: 'put', collection: 'attendance', item })
  }
  return withMakeupSync(db, changes, classId, date, now)
}

/** 수업 기록(휴강, 메모)을 고칩니다. 남길 것이 없으면 기록을 지웁니다. */
function lessonNoteChange(db: Database, classId: string, date: DateStr, patch: Partial<Pick<LessonNote, 'cancelled' | 'memo'>>, now: string): Change[] {
  const id = noteId(classId, date)
  const existing = db.lessonNotes.find((note) => note.id === id)
  const next: LessonNote = {
    id,
    classId,
    date,
    cancelled: existing?.cancelled ?? false,
    memo: existing?.memo ?? '',
    createdAt: existing?.createdAt ?? now,
    ...patch,
    updatedAt: now,
  }
  if (existing && existing.cancelled === next.cancelled && existing.memo === next.memo) return []
  if (!next.cancelled && !next.memo) return existing ? [{ type: 'remove', collection: 'lessonNotes', id }] : []
  return [{ type: 'put', collection: 'lessonNotes', item: next }]
}

/** 수업을 휴강으로 하거나 휴강을 취소합니다. 반 규칙에 따라 학생마다 보강이 생기거나 없어집니다. */
export function setCancelledChanges(db: Database, classId: string, date: DateStr, cancelled: boolean, now: string): Change[] {
  return withMakeupSync(db, lessonNoteChange(db, classId, date, { cancelled }, now), classId, date, now)
}

/** 수업 메모 (진도, 휴강 사유 등) */
export function setLessonMemoChanges(db: Database, classId: string, date: DateStr, memo: string, now: string): Change[] {
  return lessonNoteChange(db, classId, date, { memo }, now)
}
