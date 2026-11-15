import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import AmountInput from '../../components/AmountInput'
import ColorPicker from '../../components/ColorPicker'
import DateField from '../../components/DateField'
import PageHeader from '../../components/PageHeader'
import WeekdaySlotsEditor from '../../components/WeekdaySlotsEditor'
import { latestSlots, useClasses } from '../../data/classes'
import { nextUnusedColor } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { ABSENCE_COUNTING_HINTS, ABSENCE_COUNTING_LABELS, defaultFee, defaultMakeupRule, sameSlots } from '../../data/rules'
import { studentStatus } from '../../data/schedule'
import { useStudents } from '../../data/students'
import type { AbsenceCounting, ClassGroup, MakeupWindow, TimeSlot } from '../../data/types'
import { useGoBack } from '../../hooks/useGoBack'
import { formatDate, isValidTime, today, type DateStr } from '../../utils/date'
import { formatNumber, parseAmount } from '../../utils/money'

const COUNTING_ORDER: AbsenceCounting[] = ['ifNoMakeup', 'always', 'never']

/** 보강 기한 고르기: 고르는 값 ↔ 저장하는 값 */
const WINDOW_OPTIONS: { value: string; label: string; window: MakeupWindow }[] = [
  { value: 'days:7', label: '빠진 날부터 7일 안', window: { type: 'days', days: 7 } },
  { value: 'days:14', label: '빠진 날부터 14일 안', window: { type: 'days', days: 14 } },
  { value: 'days:30', label: '빠진 날부터 30일 안', window: { type: 'days', days: 30 } },
  { value: 'sameMonth', label: '같은 달 안', window: { type: 'sameMonth' } },
  { value: 'nextMonthEnd', label: '다음 달 말까지', window: { type: 'nextMonthEnd' } },
  { value: 'none', label: '기한 없음', window: { type: 'none' } },
]

function windowValue(window: MakeupWindow): string {
  return window.type === 'days' ? `days:${window.days}` : window.type
}

/** 반 만들기, 고치기 */
export default function ClassFormPage() {
  const { classId } = useParams()
  const { data } = useData()
  const cls = classId ? data.classes.find((item) => item.id === classId) : undefined
  if (classId && !cls) {
    return (
      <section className="narrow">
        <PageHeader title="반을 찾을 수 없어요" backTo="/classes" />
      </section>
    )
  }
  return <ClassForm key={classId ?? 'new'} cls={cls} />
}

function ClassForm({ cls }: { cls?: ClassGroup }) {
  const navigate = useNavigate()
  const goBack = useGoBack(cls ? `/classes/${cls.id}` : '/classes')
  const { classes, saveClass, removeClass } = useClasses()
  const { students } = useStudents()
  const todayStr = today()
  const original = cls ? latestSlots(cls) : []
  const rule = cls?.makeupRule ?? defaultMakeupRule()
  const fee = cls?.fee ?? defaultFee()

  const [name, setName] = useState(cls?.name ?? '')
  const [subject, setSubject] = useState(cls?.subject ?? '')
  const [color, setColor] = useState(cls?.color ?? nextUnusedColor(classes.map((item) => item.color)))
  const [place, setPlace] = useState(cls?.place ?? '')
  const [startedOn, setStartedOn] = useState<DateStr>(cls?.startedOn ?? todayStr)
  const [slots, setSlots] = useState<TimeSlot[]>(original)
  const [scheduleFrom, setScheduleFrom] = useState<DateStr>(todayStr)
  const [countText, setCountText] = useState(String(fee.sessionCount))
  const [amountText, setAmountText] = useState(fee.amount ? formatNumber(fee.amount) : '')
  const [counting, setCounting] = useState<AbsenceCounting>(cls?.absenceCounting ?? 'ifNoMakeup')
  const [forAbsence, setForAbsence] = useState(rule.forAbsence)
  const [forCancellation, setForCancellation] = useState(rule.forCancellation)
  const [windowKey, setWindowKey] = useState(windowValue(rule.window))
  const [memo, setMemo] = useState(cls?.memo ?? '')
  const [closed, setClosed] = useState(Boolean(cls?.endedOn))
  const [endedOn, setEndedOn] = useState<DateStr>(cls?.endedOn ?? todayStr)
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const trimmed = name.trim()
  const count = Number(countText)
  const errors = {
    name: trimmed ? '' : '반 이름을 적어 주세요.',
    slots:
      slots.length === 0
        ? '수업 요일을 하나 이상 골라 주세요.'
        : slots.some((slot) => !isValidTime(slot.start) || !isValidTime(slot.end) || slot.end <= slot.start)
          ? '끝 시각은 시작 시각보다 늦어야 해요.'
          : '',
    count: Number.isInteger(count) && count >= 1 && count <= 99 ? '' : '횟수는 1부터 99까지 적어 주세요.',
    endedOn: closed && endedOn < startedOn ? `마지막 수업 날은 시작일(${formatDate(startedOn)})보다 앞일 수 없어요.` : '',
  }
  const hasError = Object.values(errors).some(Boolean)
  const scheduleChanged = !!cls && !sameSlots(original, slots)
  const subjects = [...new Set(['우쿨렐레', '칼림바', ...classes.map((item) => item.subject).filter(Boolean)])]
  const options = WINDOW_OPTIONS.some((option) => option.value === windowValue(rule.window))
    ? WINDOW_OPTIONS
    : [...WINDOW_OPTIONS, { value: windowValue(rule.window), label: `빠진 날부터 ${rule.window.type === 'days' ? rule.window.days : ''}일 안`, window: rule.window }]
  const activeStudents = students.filter((student) => studentStatus(student, todayStr) !== 'left')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasError) return
    setBusy(true)
    try {
      const saved = await saveClass(
        {
          id: cls?.id,
          name: trimmed,
          subject: subject.trim(),
          color,
          place: place.trim(),
          memo: memo.trim(),
          startedOn,
          slots,
          scheduleFrom,
          fee: { amount: parseAmount(amountText) ?? 0, sessionCount: count },
          absenceCounting: counting,
          makeupRule: { forAbsence, forCancellation, window: options.find((option) => option.value === windowKey)?.window ?? rule.window },
          ...(closed ? { endedOn } : {}),
        },
        studentIds,
      )
      navigate(`/classes/${saved.id}`, { replace: true })
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!cls) return
    if (!window.confirm(`${cls.name} 반을 지울까요?\n이 반의 출결, 보강, 납부 기록도 모두 지워져요. 수업을 그만하는 반은 지우지 말고 '수업을 그만하는 반'으로 표시하세요.`)) return
    setBusy(true)
    try {
      await removeClass(cls.id)
      navigate('/classes', { replace: true })
    } catch {
      setError('지우지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title={cls ? '반 고치기' : '반 만들기'} backTo={cls ? `/classes/${cls.id}` : '/classes'} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="class-name">반 이름</label>
            <input id="class-name" className="input" value={name} maxLength={30} autoComplete="off" placeholder="예: 우쿨렐레 초급반, 김하준 1:1 레슨"
              aria-invalid={submitted && !!errors.name} onChange={(event) => setName(event.target.value)} />
            {submitted && errors.name && <p className="field-error" role="alert">{errors.name}</p>}
          </div>
          <div className="field-pair">
            <div className="field">
              <label className="field-label" htmlFor="class-subject">과목 (선택)</label>
              <input id="class-subject" className="input" value={subject} maxLength={20} autoComplete="off" list="class-subjects" placeholder="예: 우쿨렐레"
                onChange={(event) => setSubject(event.target.value)} />
              <datalist id="class-subjects">
                {subjects.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="class-place">장소 (선택)</label>
              <input id="class-place" className="input" value={place} maxLength={20} autoComplete="off" placeholder="예: 1교실"
                onChange={(event) => setPlace(event.target.value)} />
            </div>
          </div>
          <fieldset className="field">
            <legend className="field-label">표시 색</legend>
            <ColorPicker name="class-color" value={color} onChange={setColor} />
          </fieldset>
        </div>

        <div className="card form-section">
          <h2 className="section-title">수업 요일과 시간</h2>
          <WeekdaySlotsEditor label="수업" slots={slots} onChange={setSlots} defaultStart="16:00" defaultEnd="17:00" />
          {submitted && errors.slots && <p className="field-error" role="alert">{errors.slots}</p>}
          <p className="muted">주 1회면 요일 하나, 주 2회면 둘을 고르세요. 요일마다 시간이 달라도 돼요.</p>
          {scheduleChanged && (
            <div className="field">
              <label className="field-label" htmlFor="class-schedule-from">바뀐 일정은 언제부터인가요?</label>
              <DateField id="class-schedule-from" label="바뀐 일정은 언제부터인가요?" value={scheduleFrom} onChange={setScheduleFrom} />
              <p className="muted">이날부터 새 요일과 시간으로 수업이 생겨요. 그 전의 수업과 출결은 그대로 남아요.</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="class-started">{cls ? '반 시작일' : '언제부터 수업하나요?'}</label>
            <DateField id="class-started" label={cls ? '반 시작일' : '언제부터 수업하나요?'} value={startedOn} onChange={setStartedOn} />
            {!cls && <p className="muted">이날부터 수업 날이 생겨요. 전부터 하던 반도 오늘로 두면 돼요.</p>}
          </div>
        </div>

        <div className="card form-section">
          <h2 className="section-title">수강료</h2>
          <div className="field-pair">
            <div className="field">
              <label className="field-label" htmlFor="class-count">몇 회마다 받나요?</label>
              <div className="count-input">
                <input id="class-count" className="input" inputMode="numeric" autoComplete="off" value={countText} aria-invalid={submitted && !!errors.count}
                  onChange={(event) => setCountText(event.target.value.replace(/[^\d]/g, '').slice(0, 2))} />
                <span className="unit">회마다</span>
              </div>
              {submitted && errors.count && <p className="field-error" role="alert">{errors.count}</p>}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="class-amount">금액 (선택)</label>
              <AmountInput id="class-amount" value={amountText} onChange={setAmountText} placeholder="예: 160,000" />
            </div>
          </div>
          <p className="muted">
            수강료는 횟수로 셉니다. 받은 횟수를 다 쓰면 그다음 수업 날이 새 수강료를 받을 날이 돼요. 한 달에 수업이 다섯 번 있어도 따로 할 일이 없어요.
          </p>
          <fieldset className="field">
            <legend className="field-label">결석한 수업은 어떻게 세나요?</legend>
            {COUNTING_ORDER.map((value) => (
              <label key={value} className="pick-row">
                <input type="radio" name="class-counting" value={value} checked={counting === value} onChange={() => setCounting(value)} />
                <span className="list-text">
                  <span className="list-title">{ABSENCE_COUNTING_LABELS[value]}</span>
                  {counting === value && <span className="list-sub">{ABSENCE_COUNTING_HINTS[value]}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="card form-section">
          <h2 className="section-title">보강</h2>
          <label className="check-row">
            <input type="checkbox" checked={forAbsence} onChange={(event) => setForAbsence(event.target.checked)} />
            학생이 결석하면 보강해요
          </label>
          <label className="check-row">
            <input type="checkbox" checked={forCancellation} onChange={(event) => setForCancellation(event.target.checked)} />
            휴강하면 보강해요
          </label>
          {(forAbsence || forCancellation) && (
            <div className="field">
              <label className="field-label" htmlFor="class-window">보강 기한</label>
              <select id="class-window" className="input" value={windowKey} onChange={(event) => setWindowKey(event.target.value)}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!cls && activeStudents.length > 0 && (
          <div className="card form-section">
            <h2 className="section-title">학생 (선택)</h2>
            <ul className="pick-list" aria-label="넣을 학생">
              {activeStudents.map((student) => (
                <li key={student.id}>
                  <label className="pick-row">
                    <input type="checkbox" checked={studentIds.includes(student.id)}
                      onChange={() => setStudentIds((current) => (current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id]))} />
                    <span className="list-text">
                      <span className="list-title">{student.name}</span>
                      {student.school && <span className="list-sub">{student.school}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="muted">나중에 반 화면에서도 넣을 수 있어요.</p>
          </div>
        )}

        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="class-memo">메모 (선택)</label>
            <textarea id="class-memo" className="input textarea" value={memo} maxLength={500} onChange={(event) => setMemo(event.target.value)} />
          </div>
          {cls && (
            <>
              <label className="check-row">
                <input type="checkbox" checked={closed} onChange={(event) => setClosed(event.target.checked)} />
                수업을 그만하는 반이에요
              </label>
              {closed && (
                <div className="field">
                  <label className="field-label" htmlFor="class-ended">마지막 수업 날</label>
                  <DateField id="class-ended" label="마지막 수업 날" value={endedOn} onChange={setEndedOn} />
                  {errors.endedOn && <p className="field-error" role="alert">{errors.endedOn}</p>}
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
        <button type="button" className="btn btn-danger btn-block delete-btn" onClick={remove} disabled={busy}>
          반 지우기
        </button>
      )}
    </section>
  )
}
