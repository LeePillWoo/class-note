import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import ColorPicker from '../../components/ColorPicker'
import DateField from '../../components/DateField'
import { PlusIcon, TrashIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { latestSlots, useClasses } from '../../data/classes'
import { nextUnusedColor } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { newId } from '../../data/id'
import { describeFee, describeSlots } from '../../data/rules'
import { useStudents } from '../../data/students'
import type { Guardian, Student } from '../../data/types'
import { useGoBack } from '../../hooks/useGoBack'
import { today, type DateStr } from '../../utils/date'

/** 학생 추가, 수정 */
export default function StudentFormPage() {
  const { studentId } = useParams()
  const { data } = useData()
  const student = studentId ? data.students.find((item) => item.id === studentId) : undefined
  if (studentId && !student) {
    return (
      <section className="narrow">
        <PageHeader title="학생을 찾을 수 없어요" backTo="/students" />
      </section>
    )
  }
  // key: 다른 학생으로 바뀌면 입력 내용을 새로 시작합니다.
  return <StudentForm key={studentId ?? 'new'} student={student} />
}

function StudentForm({ student }: { student?: Student }) {
  const navigate = useNavigate()
  const goBack = useGoBack(student ? `/students/${student.id}` : '/students')
  const { students, saveStudent, removeStudent } = useStudents()
  const { classes } = useClasses()
  const todayStr = today()

  const [name, setName] = useState(student?.name ?? '')
  const [color, setColor] = useState(student?.color ?? nextUnusedColor(students.map((item) => item.color)))
  const [school, setSchool] = useState(student?.school ?? '')
  const [phone, setPhone] = useState(student?.phone ?? '')
  const [guardians, setGuardians] = useState<Guardian[]>(student?.guardians ?? [])
  const [enrolledOn, setEnrolledOn] = useState<DateStr>(student?.enrolledOn ?? todayStr)
  const [memo, setMemo] = useState(student?.memo ?? '')
  const [classIds, setClassIds] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const trimmed = name.trim()
  const nameError = trimmed ? '' : '이름을 적어 주세요.'
  const openClasses = classes.filter((cls) => !cls.endedOn || cls.endedOn >= todayStr)

  function updateGuardian(id: string, patch: Partial<Guardian>) {
    setGuardians((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (nameError) return
    setBusy(true)
    try {
      const saved = await saveStudent(
        {
          id: student?.id,
          name: trimmed,
          color,
          school: school.trim(),
          phone: phone.trim(),
          // 전화번호를 적지 않은 보호자 줄은 버립니다.
          guardians: guardians.map((item) => ({ ...item, relation: item.relation.trim(), phone: item.phone.trim() })).filter((item) => item.phone),
          enrolledOn,
          memo: memo.trim(),
        },
        classIds,
      )
      navigate(`/students/${saved.id}`, { replace: true })
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!student) return
    if (!window.confirm(`${student.name} 학생을 지울까요?\n출결, 보강, 납부 기록도 모두 지워져요. 그만둔 학생은 지우지 말고 학생 화면에서 '그만둠'으로 바꾸세요.`)) return
    setBusy(true)
    try {
      await removeStudent(student.id)
      navigate('/students', { replace: true })
    } catch {
      setError('지우지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title={student ? '학생 정보 고치기' : '학생 추가'} backTo={student ? `/students/${student.id}` : '/students'} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="student-name">이름</label>
            <input id="student-name" className="input" value={name} maxLength={20} autoComplete="off" placeholder="예: 김하준"
              aria-invalid={submitted && !!nameError} onChange={(event) => setName(event.target.value)} />
            {submitted && nameError && <p className="field-error" role="alert">{nameError}</p>}
          </div>
          <fieldset className="field">
            <legend className="field-label">표시 색</legend>
            <ColorPicker name="student-color" value={color} onChange={setColor} />
          </fieldset>
          <div className="field">
            <label className="field-label" htmlFor="student-school">학교·학년 (선택)</label>
            <input id="student-school" className="input" value={school} maxLength={30} autoComplete="off" placeholder="예: 한빛초 3학년, 성인"
              onChange={(event) => setSchool(event.target.value)} />
          </div>
        </div>

        <div className="card form-section">
          <h2 className="section-title">연락처</h2>
          <div className="field">
            <label className="field-label" htmlFor="student-phone">학생 전화번호 (선택)</label>
            <input id="student-phone" className="input" type="tel" inputMode="tel" value={phone} maxLength={20} autoComplete="off" placeholder="010-0000-0000"
              onChange={(event) => setPhone(event.target.value)} />
          </div>
          <fieldset className="field">
            <legend className="field-label">보호자 (선택)</legend>
            {guardians.map((guardian, position) => (
              <div key={guardian.id} className="guardian-row">
                <input className="input" value={guardian.relation} maxLength={10} autoComplete="off" placeholder="관계" aria-label={`보호자 ${position + 1} 관계`}
                  onChange={(event) => updateGuardian(guardian.id, { relation: event.target.value })} />
                <input className="input" type="tel" inputMode="tel" value={guardian.phone} maxLength={20} autoComplete="off" placeholder="010-0000-0000"
                  aria-label={`보호자 ${position + 1} 전화번호`} onChange={(event) => updateGuardian(guardian.id, { phone: event.target.value })} />
                <button type="button" className="icon-btn" aria-label={`보호자 ${position + 1} 지우기`}
                  onClick={() => setGuardians((current) => current.filter((item) => item.id !== guardian.id))}>
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-small"
              onClick={() => setGuardians((current) => [...current, { id: newId(), relation: current.length === 0 ? '어머니' : '아버지', phone: '' }])}>
              <PlusIcon />
              보호자 추가
            </button>
          </fieldset>
        </div>

        {!student && openClasses.length > 0 && (
          <div className="card form-section">
            <h2 className="section-title">들을 반 (선택)</h2>
            <ul className="pick-list" aria-label="들을 반">
              {openClasses.map((cls) => (
                <li key={cls.id}>
                  <label className="pick-row">
                    <input type="checkbox" checked={classIds.includes(cls.id)}
                      onChange={() => setClassIds((current) => (current.includes(cls.id) ? current.filter((id) => id !== cls.id) : [...current, cls.id]))} />
                    <span className="list-text">
                      <span className="list-title">{cls.name}</span>
                      <span className="list-sub">{describeSlots(latestSlots(cls))}, {describeFee(cls.fee)}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="muted">고른 반에 오늘부터 넣어요. 나중에 학생 화면에서도 넣을 수 있어요.</p>
          </div>
        )}

        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="student-enrolled">등록한 날</label>
            <DateField id="student-enrolled" label="등록한 날" value={enrolledOn} onChange={setEnrolledOn} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="student-memo">메모 (선택)</label>
            <textarea id="student-memo" className="input textarea" value={memo} maxLength={500} placeholder="예: 왼손잡이, 악기 대여 중"
              onChange={(event) => setMemo(event.target.value)} />
          </div>
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sticky-actions form-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>저장</button>
        </div>
      </form>
      {student && (
        <button type="button" className="btn btn-danger btn-block delete-btn" onClick={remove} disabled={busy}>
          학생 지우기
        </button>
      )}
    </section>
  )
}
