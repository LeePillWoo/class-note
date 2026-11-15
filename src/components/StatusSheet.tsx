import { useState } from 'react'
import { canApplyStatus, earliestStatusDate, useStudents, type StatusAction } from '../data/students'
import type { Student } from '../data/types'
import { endOfMonth, formatDate, today, type DateStr } from '../utils/date'
import DateField from './DateField'
import Sheet from './Sheet'

export const STATUS_COPY: Record<StatusAction, { title: string; label: string; hint: string; button: string }> = {
  pause: { title: '쉬기', label: '쉬기 시작하는 날', hint: '이날부터 수업 명단에서 빠지고, 남은 횟수는 그대로 남아요', button: '쉬는 것으로 저장' },
  resume: { title: '다시 다니기', label: '다시 나오는 날', hint: '이날부터 다시 수업 명단에 올라가요', button: '다시 다니는 것으로 저장' },
  leave: { title: '그만두기', label: '마지막으로 다닌 날', hint: '다음 날부터 수업 명단에서 빠져요. 지난 출결과 납부 기록은 그대로 남아요', button: '그만둔 것으로 저장' },
  rejoin: { title: '다시 등록', label: '다시 나오는 날', hint: '이날부터 다시 수업 명단에 올라가요. 그사이는 쉰 것으로 남아요', button: '다시 등록' },
}

interface StatusSheetProps {
  /** 상태를 바꿀 학생들. 한 명이면 학생 화면에서, 여러 명이면 학생 관리에서 엽니다. */
  students: Student[]
  action: StatusAction | null
  onClose(): void
  /** 저장한 뒤 (바꾼 학생 수) */
  onSaved?(count: number): void
}

/** 쉬기, 다시 다니기, 그만두기, 다시 등록: 날짜를 고르고 저장합니다. */
export default function StatusSheet({ students, action, onClose, onSaved }: StatusSheetProps) {
  return (
    <Sheet open={action !== null} onClose={onClose} label="학생 상태">
      {action && <StatusEditor key={action} students={students} action={action} onDone={onClose} onSaved={onSaved} />}
    </Sheet>
  )
}

function StatusEditor({ students, action, onDone, onSaved }: { students: Student[]; action: StatusAction; onDone(): void; onSaved?(count: number): void }) {
  const { changeStatus } = useStudents()
  const [date, setDate] = useState<DateStr>(today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const copy = STATUS_COPY[action]
  // 고른 학생 중 이 일을 할 수 있는 학생만 바뀝니다. (이미 쉬는 학생에게 쉬기는 건너뜀)
  const targets = students.filter((student) => canApplyStatus(student, action))
  const single = students.length === 1 ? students[0] : undefined
  // 다시 나오는 날은 쉬기 시작한 날(그만둔 다음 날)보다 앞일 수 없습니다. 여러 명이면 가장 늦은 날에 맞춥니다.
  const min = targets.reduce<DateStr | undefined>((latest, student) => {
    const earliest = earliestStatusDate(student, action)
    return earliest !== undefined && (latest === undefined || earliest > latest) ? earliest : latest
  }, undefined)
  const last = action === 'leave' ? endOfMonth(date) : undefined

  async function save() {
    setBusy(true)
    try {
      const count = await changeStatus(targets, action, date)
      onSaved?.(count)
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">{single ? `${single.name} ${copy.title}` : `${targets.length}명 ${copy.title}`}</h2>
        {!single && (
          <p className="muted">
            {targets.map((student) => student.name).join(', ')}
            {targets.length < students.length && ` · 고른 ${students.length}명 중 ${students.length - targets.length}명은 해당하지 않아 그대로 둬요`}
          </p>
        )}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="status-date">{copy.label}</label>
        <DateField id="status-date" label={copy.label} value={date} onChange={setDate} min={min} />
        <p className="muted">{copy.hint}</p>
        {last && date !== last && (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setDate(last)}>
            이번 달 말({formatDate(last)})까지 다녀요
          </button>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || targets.length === 0 || (min !== undefined && date < min)} onClick={save}>
          {copy.button}
        </button>
      </div>
    </>
  )
}
