import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import ColorPicker from '../../components/ColorPicker'
import DateField from '../../components/DateField'
import { FeeFields, feeDraftErrors, parseBirthYear, type FeeDraft } from '../../components/FormParts'
import { PlusIcon, TrashIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import WeekdaySlotsEditor from '../../components/WeekdaySlotsEditor'
import { latestSlots, useClasses, type QuickStudent } from '../../data/classes'
import { nextUnusedColor } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { newId } from '../../data/id'
import { sameSlots } from '../../data/rules'
import { studentStatus } from '../../data/schedule'
import { useSettings } from '../../data/settings'
import { describeBirthYear, useStudents } from '../../data/students'
import type { ClassGroup, TimeSlot } from '../../data/types'
import { useGoBack } from '../../hooks/useGoBack'
import { formatDate, today, type DateStr } from '../../utils/date'
import { formatNumber, parseAmount } from '../../utils/money'
import { slotsError } from './SoloFormPage'

/** 새로 적는 학생 한 줄 (이름, 출생 연도) */
interface NewStudentRow {
  key: string
  name: string
  birthYearText: string
}

/** 그룹 수업 만들기·고치기 */
export default function GroupFormPage() {
  const { classId } = useParams()
  const { index } = useData()
  const cls = classId ? index.classes.get(classId) : undefined
  if (classId && !cls) {
    return (
      <section className="narrow">
        <PageHeader title="수업을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }
  return <GroupForm key={classId ?? 'new'} cls={cls} />
}

function GroupForm({ cls }: { cls?: ClassGroup }) {
  const navigate = useNavigate()
  const goBack = useGoBack(cls ? `/lessons/${cls.id}` : '/lessons')
  const { classes, saveGroup, removeClass } = useClasses()
  const { students } = useStudents()
  const { settings } = useSettings()
  const todayStr = today()
  const original = cls ? latestSlots(cls) : []

  const [name, setName] = useState(cls?.name ?? '')
  const [subject, setSubject] = useState(cls?.subject ?? '')
  const [color, setColor] = useState(cls?.color ?? nextUnusedColor(classes.map((item) => item.color)))
  const [slots, setSlots] = useState<TimeSlot[]>(original)
  const [startedOn, setStartedOn] = useState<DateStr>(cls?.startedOn ?? todayStr)
  const [scheduleFrom, setScheduleFrom] = useState<DateStr>(todayStr)
  const [fee, setFee] = useState<FeeDraft>({
    countText: String(cls?.fee.sessionCount ?? settings.sessionCount),
    amountText: cls?.fee.amount ? formatNumber(cls.fee.amount) : '',
    billing: cls?.billing ?? settings.billing,
  })
  const [memo, setMemo] = useState(cls?.memo ?? '')
  const [closed, setClosed] = useState(Boolean(cls?.endedOn))
  const [endedOn, setEndedOn] = useState<DateStr>(cls?.endedOn ?? todayStr)
  const [picked, setPicked] = useState<string[]>([])
  const [newRows, setNewRows] = useState<NewStudentRow[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nameError = name.trim() ? '' : '수업 이름을 적어 주세요'
  const endError = closed && endedOn < startedOn ? `마지막 수업 날은 시작일(${formatDate(startedOn)})보다 앞일 수 없어요` : ''
  const rowError = newRows.some((row) => row.birthYearText && !parseBirthYear(row.birthYearText)) ? '출생 연도는 네 자리로 적어 주세요 (예: 2015)' : ''
  const errors = [nameError, slotsError(slots), feeDraftErrors(fee), endError, rowError].filter(Boolean)
  const scheduleChanged = !!cls && !sameSlots(original, slots)
  const activeStudents = students.filter((student) => studentStatus(student, todayStr) !== 'left')

  function updateRow(key: string, patch: Partial<NewStudentRow>) {
    setNewRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.length > 0) return
    setBusy(true)
    try {
      const quick: QuickStudent[] = newRows
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), birthYear: parseBirthYear(row.birthYearText) }))
      const saved = await saveGroup(
        {
          id: cls?.id,
          kind: 'group',
          name: name.trim(),
          subject: subject.trim(),
          color,
          memo: memo.trim(),
          startedOn,
          slots,
          scheduleFrom,
          fee: { amount: parseAmount(fee.amountText) ?? 0, sessionCount: Number(fee.countText) },
          billing: fee.billing,
          ...(closed ? { endedOn } : {}),
        },
        picked,
        quick,
      )
      navigate(`/lessons/${saved.id}`, { replace: true })
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  async function remove() {
    if (!cls) return
    if (!window.confirm(`${cls.name} 수업을 지울까요?\n이 수업의 출결, 보강, 납부 기록이 모두 지워져요. 수업을 그만할 때는 지우지 말고 '수업을 그만해요'를 쓰세요.`)) return
    setBusy(true)
    try {
      await removeClass(cls.id)
      navigate('/lessons', { replace: true })
    } catch {
      setError('지우지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <section className="narrow form-page">
      <PageHeader title={cls ? '그룹 수업 고치기' : '그룹 수업 만들기'} backTo={cls ? `/lessons/${cls.id}` : '/lessons'} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="group-name">수업 이름</label>
            <input id="group-name" className="input" value={name} maxLength={30} autoComplete="off" placeholder="우쿨렐레 초급반"
              aria-invalid={submitted && !!nameError} onChange={(event) => setName(event.target.value)} />
            {submitted && nameError && <p className="field-error" role="alert">{nameError}</p>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="group-subject">악기</label>
            <input id="group-subject" className="input" value={subject} maxLength={20} autoComplete="off" list="group-subjects" placeholder="우쿨렐레"
              onChange={(event) => setSubject(event.target.value)} />
            <datalist id="group-subjects">
              <option value="우쿨렐레" />
              <option value="칼림바" />
            </datalist>
          </div>
          <fieldset className="field">
            <legend className="field-label">표시 색</legend>
            <ColorPicker name="group-color" value={color} onChange={setColor} />
          </fieldset>
        </div>

        <div className="card form-section">
          <h2 className="section-title">요일과 시간</h2>
          <WeekdaySlotsEditor label="수업" slots={slots} onChange={setSlots} defaultStart={settings.lessonStart} duration={settings.lessonMinutes} />
          {submitted && slotsError(slots) && <p className="field-error" role="alert">{slotsError(slots)}</p>}
          {scheduleChanged && (
            <div className="field">
              <label className="field-label" htmlFor="group-schedule-from">바뀐 일정은 언제부터인가요?</label>
              <DateField id="group-schedule-from" label="바뀐 일정은 언제부터인가요?" value={scheduleFrom} onChange={setScheduleFrom} />
              <p className="muted">그 전의 수업과 출결은 그대로 남아요</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="group-started">{cls ? '수업 시작일' : '언제부터 수업하나요?'}</label>
            <DateField id="group-started" label={cls ? '수업 시작일' : '언제부터 수업하나요?'} value={startedOn} onChange={setStartedOn} />
          </div>
        </div>

        <div className="card form-section">
          <h2 className="section-title">수강료</h2>
          <FeeFields draft={fee} onChange={setFee} submitted={submitted} />
        </div>

        {!cls && (
          <div className="card form-section">
            <h2 className="section-title">학생</h2>
            {activeStudents.length > 0 && (
              <ul className="pick-list" aria-label="넣을 학생">
                {activeStudents.map((student) => (
                  <li key={student.id}>
                    <label className="pick-row">
                      <input type="checkbox" checked={picked.includes(student.id)}
                        onChange={() => setPicked((current) => (current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id]))} />
                      <span className="pick-name">{student.name}</span>
                      <span className="muted">{describeBirthYear(student.birthYear)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {newRows.map((row, position) => (
              <div key={row.key} className="new-student-row">
                <input className="input" value={row.name} maxLength={20} autoComplete="off" placeholder="새 학생 이름" aria-label={`새 학생 ${position + 1} 이름`}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })} />
                <input className="input" inputMode="numeric" value={row.birthYearText} autoComplete="off" placeholder="출생 연도" aria-label={`새 학생 ${position + 1} 출생 연도`}
                  onChange={(event) => updateRow(row.key, { birthYearText: event.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
                <button type="button" className="icon-btn" aria-label={`새 학생 ${position + 1} 지우기`} onClick={() => setNewRows((rows) => rows.filter((item) => item.key !== row.key))}>
                  <TrashIcon />
                </button>
              </div>
            ))}
            {submitted && rowError && <p className="field-error" role="alert">{rowError}</p>}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setNewRows((rows) => [...rows, { key: newId(), name: '', birthYearText: '' }])}>
              <PlusIcon />
              새 학생 적기
            </button>
            <p className="muted">새 학생은 이름만 적어 두고, 연락처는 나중에 학생 화면에서 채워요</p>
          </div>
        )}

        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="group-memo">메모</label>
            <textarea id="group-memo" className="input textarea" value={memo} maxLength={500} onChange={(event) => setMemo(event.target.value)} />
          </div>
          {cls && (
            <>
              <label className="check-row">
                <input type="checkbox" checked={closed} onChange={(event) => setClosed(event.target.checked)} />
                수업을 그만해요
              </label>
              {closed && (
                <div className="field">
                  <label className="field-label" htmlFor="group-ended">마지막 수업 날</label>
                  <DateField id="group-ended" label="마지막 수업 날" value={endedOn} onChange={setEndedOn} />
                  {endError && <p className="field-error" role="alert">{endError}</p>}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sticky-actions form-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>저장</button>
        </div>
      </form>
      {cls && (
        <div className="danger-zone">
          <button type="button" className="btn btn-ghost-danger btn-small" onClick={remove} disabled={busy}>
            수업 지우기
          </button>
        </div>
      )}
    </section>
  )
}
