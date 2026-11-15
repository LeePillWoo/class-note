import { useData } from './DataProvider'
import { nowIso } from './id'
import type { AppSettings, BaseRecord, ClassGroup, Database } from './types'

export const SETTINGS_ID = 'app'

export type SettingsValues = Omit<AppSettings, keyof BaseRecord>

/**
 * 기본 규칙의 처음 값 (사용자와 정한 것)
 * - 결석한 수업은 회차로 세지 않고, 결석·휴강 모두 보강, 보강 기한은 없음
 * - 수강료는 선납, 납부 방법은 카드부터
 */
export function defaultSettings(): SettingsValues {
  return {
    sessionCount: 4,
    billing: 'prepaid',
    absenceCounting: 'never',
    makeupRule: { forAbsence: true, forCancellation: true, window: { type: 'none' } },
    method: 'card',
    lessonMinutes: 50,
    lessonStart: '16:00',
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
