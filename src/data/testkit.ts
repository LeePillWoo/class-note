import type { DateStr, Weekday } from '../utils/date'
import { defaultSettings, SETTINGS_ID, type SettingsValues } from './settings'
import { applyChanges, emptyDatabase } from './storage'
import type { AppSettings, Change, ClassGroup, Database, Enrollment, Student, TimeSlot } from './types'

/** 테스트에서 쓰는 작은 데이터 만들기 도구. (앱 코드에서는 쓰지 않습니다) */

export const NOW = '2026-11-01T00:00:00.000Z'

export function makeStudent(id: string, patch: Partial<Student> = {}): Student {
  return {
    id,
    name: id,
    color: '#000000',
    phone: '',
    guardians: [],
    enrolledOn: '2026-11-01',
    pauses: [],
    memo: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  }
}

export function slot(weekday: Weekday, start = '16:00', end = '17:00'): TimeSlot {
  return { weekday, start, end }
}

export function makeClass(id: string, slots: TimeSlot[], patch: Partial<ClassGroup> = {}): ClassGroup {
  const startedOn = patch.startedOn ?? '2026-11-01'
  return {
    id,
    kind: 'group',
    name: id,
    subject: '',
    color: '#000000',
    memo: '',
    order: 0,
    startedOn,
    schedules: [{ id: `${id}-p0`, startsOn: startedOn, value: slots }],
    fee: { amount: 100_000, sessionCount: 4 },
    billing: 'prepaid',
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  }
}

export function makeEnrollment(classId: string, studentId: string, startedOn: DateStr, patch: Partial<Enrollment> = {}): Enrollment {
  return { id: `${classId}-${studentId}-${startedOn}`, classId, studentId, startedOn, startCredit: 0, createdAt: NOW, updatedAt: NOW, ...patch }
}

/** 기본 규칙 기록. patch로 일부만 바꿉니다. */
export function makeSettings(patch: Partial<SettingsValues> = {}): AppSettings {
  return { id: SETTINGS_ID, createdAt: NOW, updatedAt: NOW, ...defaultSettings(), ...patch }
}

/** 학생, 수업, 수강, 기본 규칙을 넣은 데이터 */
export function makeDatabase(input: { students?: Student[]; classes?: ClassGroup[]; enrollments?: Enrollment[]; settings?: Partial<SettingsValues> }): Database {
  return {
    ...emptyDatabase(),
    students: input.students ?? [],
    classes: input.classes ?? [],
    enrollments: input.enrollments ?? [],
    settings: input.settings ? [makeSettings(input.settings)] : [],
  }
}

/** 변경을 차례로 적용합니다. 각 단계는 그때까지의 데이터로 변경을 만듭니다. */
export function run(db: Database, ...steps: ((db: Database) => Change[])[]): Database {
  return steps.reduce((current, step) => applyChanges(current, step(current)), db)
}
