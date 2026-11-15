import type { ClassGroup, Student } from './types'

/** 보호자에게 보내는 안내 문구 종류: 수강료, 결석, 보강 */
export type MessageKind = 'due' | 'absent' | 'makeup'

export const MESSAGE_KINDS: MessageKind[] = ['due', 'absent', 'makeup']

export const MESSAGE_LABELS: Record<MessageKind, string> = {
  due: '수강료 안내',
  absent: '결석 안내',
  makeup: '보강 안내',
}

/** 문구에 쓰는 칸. 보낼 때 {이름}처럼 적은 자리가 실제 값으로 바뀝니다. */
export const MESSAGE_FIELDS: Record<MessageKind, string[]> = {
  due: ['이름', '수업', '횟수', '금액', '날짜'],
  absent: ['이름', '수업', '날짜'],
  makeup: ['이름', '수업', '빠진날', '날짜', '시각'],
}

const ACADEMY = '마녀의 우쿨렐레 & 칼림바'

export function defaultMessages(): Record<MessageKind, string> {
  return {
    due: `안녕하세요, ${ACADEMY}입니다. {이름} 학생 {수업} 수강료 {횟수}회분 {금액} 안내드립니다. 받는 날은 {날짜}입니다. 감사합니다.`,
    absent: `안녕하세요, ${ACADEMY}입니다. {이름} 학생이 {날짜} {수업} 수업에 오지 않아 연락드립니다. 보강이 필요하시면 편하실 때 알려 주세요.`,
    makeup: `안녕하세요, ${ACADEMY}입니다. {이름} 학생의 {빠진날} {수업} 보강을 {날짜} {시각}에 진행합니다. 감사합니다.`,
  }
}

/** 문구의 {칸}을 값으로 바꿉니다. 값이 없는 칸은 지우고, 그래서 생긴 겹친 빈칸은 하나로 줄입니다. */
export function fillMessage(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{([^{}\s]+)\}/g, (whole, key: string) => (key in values ? values[key] : whole))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.])/g, '$1')
    .trim()
}

/** 안내 문구에 넣을 수업 이름: 그룹은 수업 이름, 1:1은 과목이 있으면 '우쿨렐레 레슨' */
export function lessonTitle(cls: Pick<ClassGroup, 'kind' | 'name' | 'subject'>): string {
  if (cls.kind === 'group') return cls.name
  return cls.subject ? `${cls.subject} 레슨` : '1:1 레슨'
}

/** 문자를 보낼 번호: 보호자가 먼저, 없으면 학생 */
export function messagePhone(student: Pick<Student, 'phone' | 'guardians'> | undefined): string {
  if (!student) return ''
  return student.guardians.find((guardian) => guardian.phone)?.phone ?? student.phone
}
