import type { Change, CollectionName, Database, Enrollment } from './types'

function removals<K extends CollectionName>(db: Database, collection: K, match: (item: Database[K][number]) => boolean): Change[] {
  return (db[collection] as Database[K][number][]).filter(match).map((item): Change => ({ type: 'remove', collection, id: item.id }))
}

/** 학생을 지울 때 함께 지울 것들: 수강, 출결, 보강, 납부 */
export function studentRemovalChanges(db: Database, studentId: string): Change[] {
  return [
    ...removals(db, 'enrollments', (item) => item.studentId === studentId),
    ...removals(db, 'attendance', (item) => item.studentId === studentId),
    ...removals(db, 'makeups', (item) => item.studentId === studentId),
    ...removals(db, 'payments', (item) => item.studentId === studentId),
    { type: 'remove', collection: 'students', id: studentId },
  ]
}

/** 반을 지울 때 함께 지울 것들: 수강, 수업 기록, 출결, 보강, 그 반의 납부 */
export function classRemovalChanges(db: Database, classId: string): Change[] {
  return [
    ...removals(db, 'enrollments', (item) => item.classId === classId),
    ...removals(db, 'lessonNotes', (item) => item.classId === classId),
    ...removals(db, 'attendance', (item) => item.classId === classId),
    ...removals(db, 'makeups', (item) => item.classId === classId),
    ...removals(db, 'payments', (item) => item.classId === classId),
    { type: 'remove', collection: 'classes', id: classId },
  ]
}

/**
 * 수강을 통째로 지울 때(잘못 넣은 경우): 그 학생이 그 반에 남긴 출결, 보강, 수강료 기록까지 지웁니다.
 * 같은 학생이 그 반에 다른 수강 기록을 더 갖고 있으면 수강만 지웁니다.
 */
export function enrollmentRemovalChanges(db: Database, enrollment: Enrollment): Change[] {
  const samePair = (item: { studentId: string; classId?: string }) =>
    item.studentId === enrollment.studentId && item.classId === enrollment.classId
  const others = db.enrollments.some((item) => item.id !== enrollment.id && samePair(item))
  return [
    ...(others
      ? []
      : [...removals(db, 'attendance', samePair), ...removals(db, 'makeups', samePair), ...removals(db, 'payments', samePair)]),
    { type: 'remove', collection: 'enrollments', id: enrollment.id },
  ]
}
