import { useState } from 'react'
import { latestSlots, useEnrollments, type EnrollmentPatch, type QuickStudent } from '../data/classes'
import { newId } from '../data/id'
import { describeBirthYear } from '../data/students'
import { useData } from '../data/DataProvider'
import { describeFee, describeSlots, sortSlots } from '../data/rules'
import { compareStudents, isCurrentEnrollment, studentStatus } from '../data/schedule'
import type { Enrollment } from '../data/types'
import { WEEKDAY_NAMES, formatDate, today, type DateStr, type Weekday } from '../utils/date'
import { formatNumber, parseAmount } from '../utils/money'
import AmountInput from './AmountInput'
import { parseBirthYear } from './FormParts'
import { PlusIcon, TrashIcon } from './icons'
import DateField from './DateField'
import Sheet from './Sheet'

/** 그룹 수업에 학생을 넣거나(classId), 학생을 그룹 수업에 넣습니다(studentId). */
export type EnrollTarget = { classId: string } | { studentId: string }

interface EnrollSheetProps {
  target: EnrollTarget | null
  onClose(): void
}

export default function EnrollSheet({ target, onClose }: EnrollSheetProps) {
  return (
    <Sheet open={target !== null} onClose={onClose} label="학생 추가">
      {target && <EnrollEditor key={'classId' in target ? target.classId : target.studentId} target={target} onDone={onClose} />}
    </Sheet>
  )
}

interface NewRow {
  key: string
  name: string
  birthYearText: string
}

function EnrollEditor({ target, onDone }: { target: EnrollTarget; onDone(): void }) {
  const { data, index } = useData()
  const { enroll } = useEnrollments()
  const todayStr = today()
  const [picked, setPicked] = useState<string[]>([])
  const [newRows, setNewRows] = useState<NewRow[]>(() => ('classId' in target ? [{ key: newId(), name: '', birthYearText: '' }] : []))
  const [startedOn, setStartedOn] = useState<DateStr>(todayStr)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const byClass = 'classId' in target
  const cls = byClass ? index.classes.get(target.classId) : undefined
  const student = byClass ? undefined : index.students.get(target.studentId)
  const isMember = (classId: string, studentId: string) =>
    data.enrollments.some((item) => item.classId === classId && item.studentId === studentId && isCurrentEnrollment(item, todayStr))

  // 고를 수 있는 것: 지금 다니는 학생 중 이 수업에 없는 학생 / 이 학생이 듣지 않는 그룹 수업
  const options = byClass
    ? [...data.students]
        .filter((item) => studentStatus(item, todayStr) !== 'left' && !isMember(target.classId, item.id))
        .sort(compareStudents)
        .map((item) => ({ id: item.id, title: item.name, sub: describeBirthYear(item.birthYear) }))
    : [...data.classes]
        .filter((item) => item.kind === 'group' && (!item.endedOn || item.endedOn >= todayStr) && !isMember(item.id, target.studentId))
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ id: item.id, title: item.name, sub: `${describeSlots(latestSlots(item))} · ${describeFee(item.fee)}` }))

  const quick: QuickStudent[] = newRows.filter((row) => row.name.trim()).map((row) => ({ name: row.name.trim(), birthYear: parseBirthYear(row.birthYearText) }))
  const badYear = newRows.some((row) => row.birthYearText && !parseBirthYear(row.birthYearText))
  const count = picked.length + quick.length

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function updateRow(key: string, patch: Partial<NewRow>) {
    setNewRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function save() {
    setBusy(true)
    try {
      if (byClass) await enroll(target.classId, picked, startedOn, quick)
      else for (const classId of picked) await enroll(classId, [target.studentId], startedOn)
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">{byClass ? `${cls?.name}에 학생 추가` : `${student?.name} 그룹 수업에 넣기`}</h2>
      </div>
      {byClass && (
        <div className="field">
          <span className="field-label">새 학생</span>
          {newRows.map((row, position) => (
            <div key={row.key} className="new-student-row">
              <input className="input" value={row.name} maxLength={20} autoComplete="off" placeholder="이름" aria-label={`새 학생 ${position + 1} 이름`}
                onChange={(event) => updateRow(row.key, { name: event.target.value })} />
              <input className="input" inputMode="numeric" value={row.birthYearText} autoComplete="off" placeholder="출생 연도" aria-label={`새 학생 ${position + 1} 출생 연도`}
                onChange={(event) => updateRow(row.key, { birthYearText: event.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
              <button type="button" className="icon-btn" aria-label={`새 학생 ${position + 1} 지우기`} onClick={() => setNewRows((rows) => rows.filter((item) => item.key !== row.key))}>
                <TrashIcon />
              </button>
            </div>
          ))}
          {badYear && <p className="field-error">출생 연도는 네 자리로 적어 주세요 (예: 2015)</p>}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setNewRows((rows) => [...rows, { key: newId(), name: '', birthYearText: '' }])}>
            <PlusIcon />
            한 명 더
          </button>
        </div>
      )}
      {options.length > 0 && (
        <div className="field">
          <span className="field-label">{byClass ? '등록된 학생' : '그룹 수업'}</span>
          <ul className="pick-list" aria-label={byClass ? '넣을 학생' : '넣을 수업'}>
            {options.map((option) => (
              <li key={option.id}>
                <label className="pick-row">
                  <input type="checkbox" checked={picked.includes(option.id)} onChange={() => toggle(option.id)} />
                  <span className="pick-name">{option.title}</span>
                  {option.sub && <span className="muted">{option.sub}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!byClass && options.length === 0 && <p className="muted">넣을 수 있는 그룹 수업이 없어요. 수업 화면에서 먼저 그룹 수업을 만들어 주세요</p>}
      <div className="field">
        <label className="field-label" htmlFor="enroll-start">언제부터 듣나요?</label>
        <DateField id="enroll-start" label="언제부터 듣나요?" value={startedOn} onChange={setStartedOn} />
        <p className="muted">이날부터 출결과 수업 횟수를 세어요</p>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || count === 0 || badYear} onClick={save}>
          {count > 0 ? `${count}${byClass ? '명' : '개 수업에'} 넣기` : '넣기'}
        </button>
      </div>
    </>
  )
}

interface EnrollmentSheetProps {
  /** 고칠 수강. null이면 창을 닫습니다. */
  enrollment: Enrollment | null
  onClose(): void
}

/** 한 학생의 한 수업 수강을 고치는 창: 시작일, 듣는 요일, 수강료, 남은 횟수, 그만둔 날 */
export function EnrollmentSheet({ enrollment, onClose }: EnrollmentSheetProps) {
  return (
    <Sheet open={enrollment !== null} onClose={onClose} label="수강 설정">
      {enrollment && <EnrollmentEditor key={enrollment.id} enrollment={enrollment} onDone={onClose} />}
    </Sheet>
  )
}

function EnrollmentEditor({ enrollment, onDone }: { enrollment: Enrollment; onDone(): void }) {
  const { index } = useData()
  const { saveEnrollment, removeEnrollment } = useEnrollments()
  const cls = index.classes.get(enrollment.classId)
  const student = index.students.get(enrollment.studentId)
  const classDays = cls ? sortSlots(latestSlots(cls)).map((slot) => slot.weekday) : []
  const classFee = cls?.fee ?? { amount: 0, sessionCount: 4 }

  const [startedOn, setStartedOn] = useState<DateStr>(enrollment.startedOn)
  const [weekdays, setWeekdays] = useState<Weekday[]>(enrollment.weekdays ?? classDays)
  const [ownFee, setOwnFee] = useState(Boolean(enrollment.fee))
  const [countText, setCountText] = useState(String(enrollment.fee?.sessionCount ?? classFee.sessionCount))
  const [amountText, setAmountText] = useState(formatNumber(enrollment.fee?.amount ?? classFee.amount))
  const [creditText, setCreditText] = useState(String(enrollment.startCredit))
  const [ended, setEnded] = useState(Boolean(enrollment.endedOn))
  const [endedOn, setEndedOn] = useState<DateStr>(enrollment.endedOn ?? today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!cls || !student) return null
  const count = Number(countText)
  const validFee = !ownFee || (Number.isInteger(count) && count >= 1 && count <= 99)
  const credit = Number(creditText || '0')
  const validCredit = Number.isInteger(credit) && credit >= 0 && credit <= 999
  const validEnd = !ended || endedOn >= startedOn
  const canSave = !busy && validFee && validCredit && validEnd && weekdays.length > 0

  function toggleDay(day: Weekday) {
    setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]))
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  function save() {
    const everyDay = classDays.every((day) => weekdays.includes(day))
    const patch: EnrollmentPatch = {
      startedOn,
      startCredit: credit,
      endedOn: ended ? endedOn : undefined,
      weekdays: everyDay ? undefined : classDays.filter((day) => weekdays.includes(day)),
      fee: ownFee ? { amount: parseAmount(amountText) ?? 0, sessionCount: count } : undefined,
    }
    void run(() => saveEnrollment(enrollment, patch))
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">
          <span className="dot" style={{ background: cls.color }} />
          {student.name}, {cls.name}
        </h2>
        <p className="muted">이 학생이 이 수업을 어떻게 듣는지 정해요</p>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="enrollment-start">듣기 시작한 날</label>
        <DateField id="enrollment-start" label="듣기 시작한 날" value={startedOn} onChange={setStartedOn} />
      </div>

      {classDays.length > 1 && (
        <div className="field">
          <span className="field-label">듣는 요일</span>
          <div className="weekday-toggles" role="group" aria-label="듣는 요일" style={{ gridTemplateColumns: `repeat(${classDays.length}, 1fr)` }}>
            {classDays.map((day) => (
              <button key={day} type="button" className={`weekday-toggle wd-${day}`} aria-pressed={weekdays.includes(day)} onClick={() => toggleDay(day)}>
                {WEEKDAY_NAMES[day]}
              </button>
            ))}
          </div>
          {weekdays.length === 0 && <p className="field-error">요일을 하나 이상 골라 주세요.</p>}
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="enrollment-credit">넣을 때 남아 있던 횟수</label>
        <div className="count-input">
          <input id="enrollment-credit" className="input" inputMode="numeric" autoComplete="off" value={creditText} aria-invalid={!validCredit}
            onChange={(event) => setCreditText(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
          <span className="unit">회</span>
        </div>
        <p className="muted">전부터 다니던 학생이면, 이미 받은 수강료로 남은 수업 횟수를 적어 주세요. 처음 온 학생은 0이에요.</p>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={ownFee} onChange={(event) => setOwnFee(event.target.checked)} />
        이 학생만 수강료를 다르게 (수업 기본: {describeFee(classFee)})
      </label>
      {ownFee && (
        <div className="field-pair">
          <div className="field">
            <label className="field-label" htmlFor="enrollment-count">횟수</label>
            <div className="count-input">
              <input id="enrollment-count" className="input" inputMode="numeric" autoComplete="off" value={countText} aria-invalid={!validFee}
                onChange={(event) => setCountText(event.target.value.replace(/[^\d]/g, '').slice(0, 2))} />
              <span className="unit">회마다</span>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enrollment-amount">금액</label>
            <AmountInput id="enrollment-amount" value={amountText} onChange={setAmountText} placeholder="예: 120,000" />
          </div>
        </div>
      )}

      <label className="check-row">
        <input type="checkbox" checked={ended} onChange={(event) => setEnded(event.target.checked)} />
        이 수업을 그만뒀어요
      </label>
      {ended && (
        <div className="field">
          <label className="field-label" htmlFor="enrollment-end">마지막 수업 날</label>
          <DateField id="enrollment-end" label="마지막 수업 날" value={endedOn} onChange={setEndedOn} min={startedOn} />
          {!validEnd && <p className="field-error">마지막 수업 날은 시작한 날({formatDate(startedOn)})보다 앞일 수 없어요.</p>}
        </div>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>저장</button>
      </div>
      <button type="button" className="link-btn is-danger" disabled={busy}
        onClick={() => {
          if (window.confirm(`${student.name} 학생의 ${cls.name} 수강을 지울까요?\n이 수업의 출결, 보강, 수강료 기록도 함께 지워져요. 그만둔 학생은 지우지 말고 '이 수업을 그만뒀어요'를 쓰세요.`)) {
            void run(() => removeEnrollment(enrollment))
          }
        }}>
        잘못 넣었어요 (수강 기록 지우기)
      </button>
    </>
  )
}
