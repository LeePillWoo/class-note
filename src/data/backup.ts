import { today, type DateStr } from '../utils/date'
import { normalizeDatabase } from './settings'
import { allPutChanges, allRemovalChanges, collectionNames, emptyDatabase } from './storage'
import type { BaseRecord, Change, CollectionName, Database } from './types'
import { validateRecord } from './validate'

export const BACKUP_APP = 'class-note'
/** 백업 파일 형식 번호. 데이터 구조가 크게 바뀌면 올립니다. */
export const BACKUP_VERSION = 1

/** 백업 파일 한 개 (.json) */
export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  data: Database
}

export interface BackupSummary {
  exportedAt: string
  counts: Record<CollectionName, number>
  total: number
  /** 모양이 틀려서 버린 기록 수 */
  skipped: number
}

/** 가져올 수 있는 백업 파일의 가장 큰 크기. 사진이 많아도 이보다 크지 않습니다. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export function createBackup(data: Database, exportedAt = new Date().toISOString()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, data }
}

export function backupFileName(date: DateStr = today()): string {
  return `class-note-backup-${date}.json`
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 백업 파일 글자를 읽어 검사합니다. 모르는 데이터 종류는 버리고, 모양이 틀린 기록은 건너뜁니다. (validate.ts)
 * 밖에서 들어오는 파일이라 믿지 않고 하나하나 확인합니다. 틀린 기록이 들어가 화면이 멈추는 일이 없게 합니다.
 */
export function parseBackup(text: string): { backup: BackupFile; summary: BackupSummary } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: '파일을 읽지 못했어요. 마녀의 출석부 백업 파일(.json)인지 확인하세요.' }
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP || !isRecord(raw.data)) {
    return { error: '마녀의 출석부 백업 파일이 아니에요.' }
  }
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > BACKUP_VERSION) {
    return { error: '이 백업은 더 새로운 앱에서 만든 거예요. 앱을 새로 고친 뒤 다시 가져오세요.' }
  }

  const data = emptyDatabase()
  const counts = {} as Record<CollectionName, number>
  let total = 0
  let skipped = 0
  for (const collection of collectionNames()) {
    const list = raw.data[collection]
    const records: BaseRecord[] = []
    const seen = new Set<string>()
    if (Array.isArray(list)) {
      for (const item of list) {
        const record = validateRecord(collection, item)
        // 같은 id가 두 번 나오면 처음 것만 씁니다.
        if (!record || seen.has(record.id)) {
          skipped++
          continue
        }
        seen.add(record.id)
        records.push(record)
      }
    }
    ;(data[collection] as BaseRecord[]) = records
    counts[collection] = records.length
    total += records.length
  }

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : ''
  return { backup: { app: BACKUP_APP, version, exportedAt, data: normalizeDatabase(data) }, summary: { exportedAt, counts, total, skipped } }
}

/** 덮어쓰기: 지금 것을 모두 지우고 백업으로 바꿈 / 합치기: 백업에만 있거나 백업이 더 최신인 기록만 넣음 */
export type RestoreMode = 'replace' | 'merge'

export function restoreChanges(current: Database, imported: Database, mode: RestoreMode): Change[] {
  if (mode === 'replace') return [...allRemovalChanges(current), ...allPutChanges(imported)]
  const changes: Change[] = []
  for (const collection of collectionNames()) {
    const existing = new Map((current[collection] as BaseRecord[]).map((record) => [record.id, record]))
    for (const record of imported[collection] as BaseRecord[]) {
      const mine = existing.get(record.id)
      if (!mine || record.updatedAt > mine.updatedAt) changes.push({ type: 'put', collection, item: record } as Change)
    }
  }
  return changes
}

export const COLLECTION_LABELS: Record<CollectionName, string> = {
  students: '학생',
  classes: '반',
  enrollments: '수강',
  lessonNotes: '수업 기록',
  attendance: '출결',
  makeups: '보강',
  payments: '납부',
  settings: '기본 규칙',
}
