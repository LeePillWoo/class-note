import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import DateField from '../../components/DateField'
import { FeeFields, StudentFieldsEditor, feeDraftErrors, studentDraftErrors, studentDraftOf, studentFieldsOf, type FeeDraft, type StudentDraft } from '../../components/FormParts'
import PageHeader from '../../components/PageHeader'
import WeekdaySlotsEditor from '../../components/WeekdaySlotsEditor'
import { latestSlots, soloStudentId, useClasses } from '../../data/classes'
import { nextUnusedColor } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { sameSlots } from '../../data/rules'
import { useSettings } from '../../data/settings'
import { useStudents } from '../../data/students'
import type { ClassGroup, Student, TimeSlot } from '../../data/types'
import { useGoBack } from '../../hooks/useGoBack'
import { isValidTime, today, type DateStr } from '../../utils/date'
import { formatNumber, parseAmount } from '../../utils/money'
import { endTimeAfter } from './time'

/** 1:1 레슨 등록·고치기: 학생 정보와 수업을 한 화면에서 */
export default function SoloFormPage() {
  const { classId } = useParams()
  const { data, index } = useData()
  const cls = classId ? index.classes.get(classId) : undefined
  const studentId = cls ? soloStudentId(data, cls.id) : undefined
  const student = studentId ? index.students.get(studentId) : undefined
  if (classId && (!cls || !student)) {
    return (
      <section className="narrow">
        <PageHeader title="수업을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }
  return <SoloForm key={classId ?? 'new'} cls={cls} student={student} />
}

export function slotsError(slots: TimeSlot[]): string {
  if (slots.length === 0) return '수업 요일을 하나 이상 골라 주세요'
  if (slots.some((slot) => !isValidTime(slot.start) || !isValidTime(slot.end) || slot.end <= slot.start)) return '끝 시각은 시작 시각보다 늦어야 해요'
  return ''
}

function SoloForm({ cls, student }: { cls?: ClassGroup; student?: Student }) {
  const navigate = useNavigate()
  const goBack = useGoBack(cls ? `/lessons/${cls.id}` : '/lessons')
  const { saveSolo, removeClass } = useClasses()
  const { students, removeStudent } = useStudents()
  const { settings } = useSettings()
  const todayStr = today()
  const original = cls ? latestSlots(cls) : []
  const { index } = useData()
  const enrollment = cls ? index.enrollmentsByClass.get(cls.id)?.[0] : undefined

  const [draft, setDraft] = useState<StudentDraft>(() =>
    studentDraftOf(student ?? { color: nextUnusedColor(students.map((item) => item.color)) }),
  )
  const [subject, setSubject] = useState(cls?.subject ?? '')
  const [slots, setSlots] = useState<TimeSlot[]>(original)
  const [startedOn, setStartedOn] = useState<DateStr>(cls?.startedOn ?? todayStr)
  const [scheduleFrom, setScheduleFrom] = useState<DateStr>(todayStr)
  const [fee, setFee] = useState<FeeDraft>({
    countText: String(cls?.fee.sessionCount ?? settings.sessionCount),
    amountText: cls?.fee.amount ? formatNumber(cls.fee.amount) : '',
    billing: cls?.billing ?? settings.billing,
  })
  const [creditText, setCreditText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const studentErrors = studentDraftErrors(draft)
  const errors = [studentErrors.name, studentErrors.birthYear, slotsError(slots), feeDraftErrors(fee)].filter(Boolean)
  const scheduleChanged = !!cls && !sameSlots(original, slots)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.length > 0) return
    setBusy(true)
    try {
      const saved = await saveSolo({
        classId: cls?.id,
        studentId: student?.id,
        student: studentFieldsOf(draft, student?.enrolledOn ?? startedOn),
        lesson: {
          subject: subject.trim(),
          memo: cls?.memo ?? '',
          startedOn,
          slots,
          scheduleFrom,
          fee: { amount: parseAmount(fee.amountText) ?? 0, sessionCount: Number(fee.countText) },
          billing: fee.billing,
          endedOn: cls?.endedOn,
        },
        startCredit: Number(creditText || '0'),
      })
      navigate(`/lessons/${saved.id}`, { replace: true })
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  async function run(action: () => Promise<void>, confirmText: string) {
    if (!window.confirm(confirmText)) return
    setBusy(true)
    try {
      await action()
      navigate('/lessons', { replace: true })
    } catch {
      setError('지우지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <section className="narrow form-page">
      <PageHeader title={cls ? '1:1 레슨 고치기' : '1:1 레슨 등록'} backTo={cls ? `/lessons/${cls.id}` : '/lessons'} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="card form-section">
          <h2 className="section-title">학생</h2>
          <StudentFieldsEditor draft={draft} onChange={setDraft} submitted={submitted} />
        </div>

        <div className="card form-section">
          <h2 className="section-title">수업</h2>
          <div className="field">
            <label className="field-label" htmlFor="solo-subject">악기</label>
            <input id="solo-subject" className="input" value={subject} maxLength={20} autoComplete="off" list="subjects" placeholder="우쿨렐레"
              onChange={(event) => setSubject(event.target.value)} />
            <datalist id="subjects">
              <option value="우쿨렐레" />
              <option value="칼림바" />
            </datalist>
          </div>
          <div className="field">
            <span className="field-label">요일과 시간</span>
            <WeekdaySlotsEditor label="수업" slots={slots} onChange={setSlots} defaultStart={settings.lessonStart} defaultEnd={endTimeAfter(settings.lessonStart, settings.lessonMinutes)} />
            {submitted && slotsError(slots) && <p className="field-error" role="alert">{slotsError(slots)}</p>}
          </div>
          {scheduleChanged && (
            <div className="field">
              <label className="field-label" htmlFor="solo-schedule-from">바뀐 일정은 언제부터인가요?</label>
              <DateField id="solo-schedule-from" label="바뀐 일정은 언제부터인가요?" value={scheduleFrom} onChange={setScheduleFrom} />
              <p className="muted">그 전의 수업과 출결은 그대로 남아요</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="solo-started">{cls ? '수업 시작일' : '언제부터 수업하나요?'}</label>
            <DateField id="solo-started" label={cls ? '수업 시작일' : '언제부터 수업하나요?'} value={startedOn} onChange={setStartedOn} />
          </div>
        </div>

        <div className="card form-section">
          <h2 className="section-title">수강료</h2>
          <FeeFields draft={fee} onChange={setFee} submitted={submitted} />
          {!cls && (
            <div className="field">
              <label className="field-label" htmlFor="solo-credit">이미 받은 수강료로 남은 횟수</label>
              <div className="input-with-unit narrow-input">
                <input id="solo-credit" className="input" inputMode="numeric" autoComplete="off" placeholder="0" value={creditText}
                  onChange={(event) => setCreditText(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
                <span className="unit">회</span>
              </div>
              <p className="muted">전부터 다니던 학생만 적어요. 이어서 셉니다</p>
            </div>
          )}
          {cls && enrollment && enrollment.startCredit > 0 && <p className="muted">등록할 때 남아 있던 횟수 {enrollment.startCredit}회 (수강 설정에서 고쳐요)</p>}
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sticky-actions form-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>저장</button>
        </div>
      </form>
      {cls && student && (
        <div className="danger-zone">
          <button type="button" className="btn btn-ghost-danger btn-small" disabled={busy}
            onClick={() => run(() => removeClass(cls.id), `${student.name} 1:1 레슨을 지울까요?\n이 레슨의 출결, 보강, 수강료 기록이 지워져요. 학생 정보는 남아요.`)}>
            레슨 지우기
          </button>
          <button type="button" className="btn btn-ghost-danger btn-small" disabled={busy}
            onClick={() => run(() => removeStudent(student.id), `${student.name} 학생을 지울까요?\n모든 수업의 출결, 보강, 납부 기록이 지워져요. 그만둔 학생은 지우지 말고 학생 화면에서 '그만두기'를 쓰세요.`)}>
            학생 지우기
          </button>
        </div>
      )}
    </section>
  )
}
