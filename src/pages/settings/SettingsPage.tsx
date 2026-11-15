import { useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import {
  backupFileName,
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
import { ABSENCE_COUNTING_HINTS, ABSENCE_COUNTING_LABELS, BILLING_HINTS, BILLING_LABELS } from '../../data/rules'
import { useSampleData } from '../../data/sampleActions'
import { useSettings } from '../../data/settings'
import { PAYMENT_METHOD_LABELS } from '../../data/tuition'
import type { AbsenceCounting, Billing, MakeupWindow, PaymentMethod } from '../../data/types'
import { collectionNames } from '../../data/storage'
import { APP_NAME, Logo } from '../../layout/AppShell'
import { formatDate, type DateStr } from '../../utils/date'

const LAST_BACKUP_KEY = 'class-note:last-backup'

/** 마지막 백업 날짜 ('YYYY-MM-DD'). 없으면 null */
function lastBackupDate(): DateStr | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY)
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
  } catch {
    return null
  }
}

/** 글자 파일을 내려받기 폴더에 저장합니다. */
function downloadTextFile(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const WINDOW_OPTIONS: { value: string; label: string; window: MakeupWindow }[] = [
  { value: 'none', label: '기한 없음', window: { type: 'none' } },
  { value: 'days:7', label: '빠진 날부터 7일 안', window: { type: 'days', days: 7 } },
  { value: 'days:14', label: '빠진 날부터 14일 안', window: { type: 'days', days: 14 } },
  { value: 'days:30', label: '빠진 날부터 30일 안', window: { type: 'days', days: 30 } },
  { value: 'sameMonth', label: '같은 달 안', window: { type: 'sameMonth' } },
  { value: 'nextMonthEnd', label: '다음 달 말까지', window: { type: 'nextMonthEnd' } },
]

function windowValue(window: MakeupWindow): string {
  return window.type === 'days' ? `days:${window.days}` : window.type
}

const COUNTING_ORDER: AbsenceCounting[] = ['never', 'ifNoMakeup', 'always']
const MINUTES = [30, 40, 50, 60, 90]

/** 기본 규칙: 새 수업의 기본값과, 모든 수업에 함께 적용하는 결석·보강 규칙. 바꾸면 바로 저장합니다. */
function RulesCard() {
  const { settings, save } = useSettings()
  const [countText, setCountText] = useState(String(settings.sessionCount))
  const rule = settings.makeupRule
  return (
    <div className="card form-section" aria-labelledby="rules-title">
      <div className="card-head">
        <h2 className="card-title" id="rules-title">기본 규칙</h2>
        <span className="muted">바꾸면 바로 저장돼요</span>
      </div>

      <h3 className="sub-title">새 수업을 만들 때</h3>
      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor="rule-count">수강료 횟수</label>
          <div className="input-with-unit">
            <input id="rule-count" className="input" inputMode="numeric" autoComplete="off" value={countText}
              onChange={(event) => {
                const text = event.target.value.replace(/[^\d]/g, '').slice(0, 2)
                setCountText(text)
                const count = Number(text)
                if (count >= 1 && count <= 99) void save({ sessionCount: count })
              }} />
            <span className="unit">회</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rule-minutes">수업 시간</label>
          <select id="rule-minutes" className="input" value={settings.lessonMinutes} onChange={(event) => void save({ lessonMinutes: Number(event.target.value) })}>
            {MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes}분</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <span className="field-label">수강료 받는 때</span>
        <Segmented<Billing>
          label="수강료 받는 때"
          name="rule-billing"
          value={settings.billing}
          onChange={(billing) => void save({ billing })}
          options={[
            { value: 'prepaid', label: BILLING_LABELS.prepaid },
            { value: 'postpaid', label: BILLING_LABELS.postpaid },
          ]}
        />
        <p className="muted">{BILLING_HINTS[settings.billing]} 수업마다 바꿀 수 있어요</p>
      </div>
      <div className="field">
        <span className="field-label">납부 방법</span>
        <Segmented<PaymentMethod>
          label="먼저 고를 납부 방법"
          name="rule-method"
          value={settings.method}
          onChange={(method) => void save({ method })}
          options={(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))}
        />
      </div>

      <h3 className="sub-title">모든 수업에 적용</h3>
      <fieldset className="field">
        <legend className="field-label">결석한 수업</legend>
        {COUNTING_ORDER.map((value) => (
          <label key={value} className="pick-row">
            <input type="radio" name="rule-counting" checked={settings.absenceCounting === value} onChange={() => void save({ absenceCounting: value })} />
            <span className="pick-text">
              <span className="pick-name">{ABSENCE_COUNTING_LABELS[value]}</span>
              {settings.absenceCounting === value && <span className="muted">{ABSENCE_COUNTING_HINTS[value]}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="field">
        <legend className="field-label">보강</legend>
        <label className="check-row">
          <input type="checkbox" checked={rule.forAbsence} onChange={(event) => void save({ makeupRule: { ...rule, forAbsence: event.target.checked } })} />
          결석하면 보강
        </label>
        <label className="check-row">
          <input type="checkbox" checked={rule.forCancellation} onChange={(event) => void save({ makeupRule: { ...rule, forCancellation: event.target.checked } })} />
          휴강하면 보강
        </label>
      </fieldset>
      <div className="field">
        <label className="field-label" htmlFor="rule-window">보강 기한</label>
        <select id="rule-window" className="input" value={windowValue(rule.window)}
          onChange={(event) => {
            const option = WINDOW_OPTIONS.find((item) => item.value === event.target.value)
            if (option) void save({ makeupRule: { ...rule, window: option.window } })
          }}>
          {WINDOW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="muted">바꾼 규칙은 앞으로 생기는 보강부터 적용돼요</p>
      </div>
    </div>
  )
}

/** 설정: 기본 규칙, 백업과 복원, 예시 데이터, 앱 정보 */
export default function SettingsPage() {
  const { data, apply } = useData()
  const { loadSample, clearAll } = useSampleData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(lastBackupDate())
  const [exportMessage, setExportMessage] = useState('')
  const [parsed, setParsed] = useState<{ backup: BackupFile; summary: BackupSummary; fileName: string } | null>(null)
  const [importError, setImportError] = useState('')
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [busy, setBusy] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [dataMessage, setDataMessage] = useState('')

  const total = collectionNames().reduce((sum, collection) => sum + data[collection].length, 0)

  function exportBackup() {
    setExportMessage('')
    try {
      const backup = createBackup(data)
      downloadTextFile(backupFileName(), serializeBackup(backup))
      const date = backup.exportedAt.slice(0, 10)
      try {
        localStorage.setItem(LAST_BACKUP_KEY, date)
      } catch {
        // 날짜를 기억하지 못해도 백업 파일은 만들어집니다.
      }
      setLastBackup(date)
      setExportMessage('백업 파일을 내려받았어요. (내려받기 폴더)')
    } catch {
      setExportMessage('백업 파일을 만들지 못했어요. 다시 시도해 주세요.')
    }
  }

  async function pickFile(file: File | undefined) {
    setImportMessage('')
    setImportError('')
    setParsed(null)
    if (!file) return
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
      setImportError('가져오지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true)
    setDataMessage('')
    try {
      await action()
      setDataMessage(done)
    } catch {
      setDataMessage('하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title="설정" subtitle="기본 규칙, 백업, 예시 데이터" />
      <RulesCard />

      <div className="card">
        <h2 className="card-title">백업 파일 내보내기</h2>
        <p>학생, 수업, 출결, 보강, 납부 기록 {total}개를 파일 하나(.json)로 만들어요. 다른 기기로 옮기거나 만일을 대비해 보관하세요.</p>
        <p className="note">백업 파일에는 학생 이름과 연락처가 들어 있어요. 믿을 수 있는 곳에만 보관하세요.</p>
        <p className="muted">마지막 백업: {lastBackup ? formatDate(lastBackup, { withYear: true }) : '아직 없음'}</p>
        <button type="button" className="btn btn-primary" onClick={exportBackup} disabled={busy || total === 0}>
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

      <div className="card">
        <h2 className="card-title">예시 데이터</h2>
        <p>지어낸 학생 8명과 수업 5개(1:1 2개, 그룹 3개)로 채운 예시예요. 화면을 둘러볼 때 쓰고, 실제로 쓰기 전에 모두 지우세요.</p>
        <div className="row">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(loadSample, '예시 데이터를 넣었어요.')}>
            예시 데이터 넣기
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy || total === 0}
            onClick={() => {
              if (window.confirm(`기록 ${total}개를 모두 지울까요? 되돌릴 수 없어요.\n필요하면 먼저 백업 파일을 내보내세요.`)) void run(clearAll, '모두 지웠어요.')
            }}
          >
            모든 데이터 지우기
          </button>
        </div>
        {dataMessage && <p className="note" role="status">{dataMessage}</p>}
      </div>

      <div className="card">
        <div className="detail-head">
          <Logo />
          <div className="detail-title">
            <h2 className="card-title">{APP_NAME}</h2>
            <p className="muted">버전 {__APP_VERSION__}</p>
          </div>
        </div>
        <p>마녀의 우쿨렐레 &amp; 칼림바 선생님을 위한 출결, 수강료, 보강 관리 앱이에요.</p>
        <p className="muted">
          기록은 이 기기의 브라우저에만 저장하고 서버로 보내지 않아요. 브라우저의 사이트 데이터를 지우면 기록도 함께 지워지니, 백업 파일을 자주 내보내 두세요.
        </p>
      </div>
    </section>
  )
}
