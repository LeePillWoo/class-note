import { useData } from './DataProvider'
import { nowIso } from './id'
import type { AppSettings, BaseRecord, ClassGroup, Database, TimeStep } from './types'

export const SETTINGS_ID = 'app'

export type SettingsValues = Omit<AppSettings, keyof BaseRecord>

/**
 * 기본 규칙의 처음 값 (사용자와 정한 것)
 * - 결석한 수업은 회차로 세지 않고, 결석·휴강 모두 보강, 보강 기한은 없음
 * - 수강료는 선납, 납부 방법은 카드부터
 * - 수업 시각은 정각만 (1시간 단위)
 * - 납부 기능은 꺼 둠 (출결 관리가 먼저. 필요하면 설정에서 켬)
 */
export function defaultSettings(): SettingsValues {
  return {
    sessionCount: 4,
    billing: 'prepaid',
    absenceCounting: 'never',
    makeupRule: { forAbsence: true, forCancellation: true, window: { type: 'none' } },
    method: 'card',
    lessonMinutes: 60,
    lessonStart: '16:00',
    timeStep: 60,
    paymentsEnabled: false,
  }
}

/** 저장된 설정. 없거나 빠진 항목은 처음 값으로 채웁니다. */
export function settingsOf(db: Database): AppSettings {
  const saved = db.settings.find((item) => item.id === SETTINGS_ID)
  return { id: SETTINGS_ID, createdAt: '', updatedAt: '', ...defaultSettings(), ...saved }
}

/** 예전 버전에서 만든 기록에 새로 생긴 항목을 채웁니다. (불러올 때, 백업을 가져올 때) */
export function normalizeDatabase(db: Database): Database {
  return {
    ...db,
    classes: db.classes.map((cls): ClassGroup => ({ ...cls, kind: cls.kind ?? 'group', billing: cls.billing ?? 'prepaid', subject: cls.subject ?? '' })),
    students: db.students.map((student) => ({ ...student, pauses: student.pauses ?? [], guardians: student.guardians ?? [] })),
  }
}

/** 시각 단위에서 고를 수 있는 수업 시간(분). 정각 단위면 1·2·3시간 */
export function lessonLengths(step: TimeStep): number[] {
  if (step === 60) return [60, 120, 180]
  if (step === 30) return [30, 60, 90, 120, 150, 180]
  return [30, 40, 50, 60, 80, 90, 120]
}

/** 수업 시간을 시각 단위에 맞춥니다. (단위의 배수로 올림. 예: 정각 단위에서 50분 → 60분) */
export function snapLength(minutes: number, step: TimeStep): number {
  return Math.max(step, Math.ceil(minutes / step) * step)
}

/** 시각을 시각 단위에 맞춥니다. (단위로 내림. 예: 정각 단위에서 16:30 → 16:00) */
export function snapTime(time: string, step: TimeStep): string {
  const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  const snapped = Math.floor(minutes / step) * step
  return `${String(Math.floor(snapped / 60)).padStart(2, '0')}:${String(snapped % 60).padStart(2, '0')}`
}

/** 기본 규칙을 읽고 바꾸는 기능. 바꾸면 바로 저장합니다. */
export function useSettings() {
  const { data, update } = useData()
  const settings = settingsOf(data)

  function save(patch: Partial<SettingsValues>) {
    return update((db) => {
      const current = settingsOf(db)
      const now = nowIso()
      return [{ type: 'put', collection: 'settings', item: { ...current, ...patch, createdAt: current.createdAt || now, updatedAt: now } }]
    })
  }

  return { settings, save }
}

/** 납부 기능을 켰는지. 끄면 납부 메뉴, 받을 돈, 수강료·남은 횟수가 화면에서 숨습니다. (기록은 그대로 남음) */
export function usePaymentsEnabled(): boolean {
  return useSettings().settings.paymentsEnabled
}
