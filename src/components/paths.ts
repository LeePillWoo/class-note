import { isCurrentEnrollment, type DataIndex } from '../data/schedule'
import { today } from '../utils/date'

/** 학생 화면 주소. 1:1 레슨이 있으면 그 레슨 화면(학생 정보가 함께 나옴), 없으면 학생 화면 */
export function studentPath(index: DataIndex, studentId: string): string {
  const todayStr = today()
  const solo = (index.enrollmentsByStudent.get(studentId) ?? []).find(
    (enrollment) => index.classes.get(enrollment.classId)?.kind === 'solo' && isCurrentEnrollment(enrollment, todayStr),
  )
  return solo ? `/lessons/${solo.classId}` : `/lessons/student/${studentId}`
}

/** 수업 화면 주소 */
export function lessonPath(classId: string): string {
  return `/lessons/${classId}`
}
