import { useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import {
  backupFileName,
  MAX_BACKUP_BYTES,
  COLLECTION_LABELS,
  createBackup,
  parseBackup,
  restoreChanges,
  serializeBackup,
  type BackupFile,
  type BackupSummary,
  type RestoreMode,
} from '../../data/backup'
import { useData } from '../../data/DataProvider'
import { collectionNames } from '../../data/storage'
import { exportTextFile } from '../../native/files'
import { formatDate, type DateStr } from '../../utils/date'

const LAST_BACKUP_KEY = 'class-note:last-backup'

/** 마지막 백업 날짜 ('YYYY-MM-DD'). 없으면 null */
export function lastBackupDate(): DateStr | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY)
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
  } catch {
    return null
  }
}

/** 설정 > 백업과 복원: 모든 기록을 파일 하나로 내보내고, 파일에서 되돌립니다. */
export default function BackupPage() {
  const { data, apply } = useData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(lastBackupDate())
  const [exportMessage, setExportMessage] = useState('')
  const [parsed, setParsed] = useState<{ backup: BackupFile; summary: BackupSummary; fileName: string } | null>(null)
  const [importError, setImportError] = useState('')
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [busy, setBusy] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  const total = collectionNames().reduce((sum, collection) => sum + data[collection].length, 0)

  async function exportBackup() {
    setExportMessage('')
    try {
      const backup = createBackup(data)
      const how = await exportTextFile(backupFileName(), serializeBackup(backup), '마녀의 출석부 백업')
      const date = backup.exportedAt.slice(0, 10)
      try {
        localStorage.setItem(LAST_BACKUP_KEY, date)
      } catch {
        // 날짜를 기억하지 못해도 백업 파일은 만들어집니다.
      }
      setLastBackup(date)
      setExportMessage(how === 'shared' ? '백업 파일을 보냈어요. 보낸 곳(카카오톡 나에게, 드라이브 등)에 잘 저장됐는지 확인해 주세요' : '백업 파일을 내려받았어요. (내려받기 폴더)')
    } catch {
      setExportMessage('백업 파일을 만들지 못했어요. 다시 시도해 주세요')
    }
  }

  async function pickFile(file: File | undefined) {
    setImportMessage('')
    setImportError('')
    setParsed(null)
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError('파일이 너무 커요. 마녀의 출석부 백업 파일(.json)인지 확인하세요.')
      return
    }
    const result = parseBackup(await file.text())
    if ('error' in result) {
      setImportError(result.error)
      return
    }
    setParsed({ ...result, fileName: file.name })
  }

  async function restore() {
    if (!parsed) return
    const label = mode === 'replace' ? '지금 데이터를 모두 지우고 백업으로 바꿔요.' : '백업에만 있거나 더 최신인 기록을 넣어요.'
    if (!window.confirm(`${label}\n계속할까요?`)) return
    setBusy(true)
    try {
      const changes = restoreChanges(data, parsed.backup.data, mode)
      await apply(changes)
      setImportMessage(`가져왔어요. (바뀐 기록 ${changes.length}개)`)
      setParsed(null)
      if (fileInput.current) fileInput.current.value = ''
    } catch {
      setImportError('가져오지 못했어요. 다시 시도해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title="백업과 복원" subtitle="다른 기기로 옮기거나 만일을 대비해 보관해요" backTo="/settings" />
      <div className="card">
        <h2 className="card-title">백업 파일 내보내기</h2>
        <p>학생, 수업, 출결, 보강, 납부 기록 {total}개를 파일 하나(.json)로 만들어요. 다른 기기로 옮기거나 만일을 대비해 보관하세요.</p>
        <p className="note">백업 파일에는 학생 이름과 연락처가 들어 있어요. 믿을 수 있는 곳에만 보관하세요.</p>
        <p className="muted">마지막 백업: {lastBackup ? formatDate(lastBackup, { withYear: true }) : '아직 없음'}</p>
        <button type="button" className="btn btn-primary" onClick={() => void exportBackup()} disabled={busy || total === 0}>
          백업 파일 내보내기
        </button>
        {exportMessage && <p className="note" role="status">{exportMessage}</p>}
      </div>

      <div className="card">
        <h2 className="card-title">백업 파일 가져오기</h2>
        <p>전에 내보낸 백업 파일을 고르세요. 내용을 확인한 뒤 가져와요.</p>
        <input ref={fileInput} type="file" accept=".json,application/json" className="file-input" aria-label="백업 파일 고르기"
          onChange={(event) => pickFile(event.target.files?.[0])} />
        <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          백업 파일 고르기
        </button>
        {importError && <p className="field-error" role="alert">{importError}</p>}
        {importMessage && <p className="note" role="status">{importMessage}</p>}

        {parsed && (
          <div className="restore-panel">
            <p>
              <strong>{parsed.fileName}</strong>
              {parsed.summary.exportedAt && <span className="muted"> {formatDate(parsed.summary.exportedAt.slice(0, 10), { withYear: true })}에 내보냄</span>}
            </p>
            <dl className="summary-grid">
              {collectionNames().map((collection) => (
                <div key={collection}>
                  <dt>{COLLECTION_LABELS[collection]}</dt>
                  <dd>{parsed.summary.counts[collection]}개</dd>
                </div>
              ))}
            </dl>
            {parsed.summary.skipped > 0 && (
              <p className="warnings" role="note">모양이 맞지 않는 기록 {parsed.summary.skipped}개는 빼고 가져와요. 다른 앱에서 고친 파일이면 원래 백업 파일을 써 주세요.</p>
            )}
            <Segmented<RestoreMode>
              label="가져오는 방법"
              name="restore-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: '합치기' },
                { value: 'replace', label: '덮어쓰기' },
              ]}
            />
            <p className="muted">
              {mode === 'merge'
                ? '지금 데이터는 두고, 백업에만 있거나 백업이 더 최신인 기록만 넣어요.'
                : '지금 데이터를 모두 지우고 백업 그대로 바꿔요.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={restore} disabled={busy}>
              {mode === 'merge' ? '합쳐서 가져오기' : '덮어써서 가져오기'}
            </button>
          </div>
        )}
      </div>

    </section>
  )
}
