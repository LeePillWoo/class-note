import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { StudentFieldsEditor, studentDraftErrors, studentDraftOf, studentFieldsOf, type StudentDraft } from '../../components/FormParts'
import PageHeader from '../../components/PageHeader'
import { useData } from '../../data/DataProvider'
import { useStudents } from '../../data/students'
import type { Student } from '../../data/types'
import { useGoBack } from '../../hooks/useGoBack'

/** /lessons/student/:studentId/edit — 그룹 수업 학생의 정보 고치기 */
export default function StudentFormPage() {
  const { studentId = '' } = useParams()
  const { index } = useData()
  const student = index.students.get(studentId)
  if (!student) {
    return (
      <section className="narrow">
        <PageHeader title="학생을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }
  return <StudentForm key={student.id} student={student} />
}

function StudentForm({ student }: { student: Student }) {
  const navigate = useNavigate()
  const back = `/lessons/student/${student.id}`
  const goBack = useGoBack(back)
  const { saveStudent, removeStudent } = useStudents()
  const [draft, setDraft] = useState<StudentDraft>(() => studentDraftOf(student))
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const errors = studentDraftErrors(draft)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.name || errors.birthYear) return
    setBusy(true)
    try {
      await saveStudent(studentFieldsOf(draft, student.enrolledOn), student.id)
      navigate(back, { replace: true })
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`${student.name} 학생을 지울까요?\n모든 수업의 출결, 보강, 납부 기록이 지워져요. 그만둔 학생은 지우지 말고 학생 화면에서 '그만두기'를 쓰세요.`)) return
    setBusy(true)
    try {
      await removeStudent(student.id)
      navigate('/lessons', { replace: true })
    } catch {
      setError('지우지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <section className="narrow form-page">
      <PageHeader title="학생 정보 고치기" backTo={back} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="card form-section">
          <StudentFieldsEditor draft={draft} onChange={setDraft} submitted={submitted} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sticky-actions form-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>저장</button>
        </div>
      </form>
      <div className="danger-zone">
        <button type="button" className="btn btn-ghost-danger btn-small" onClick={remove} disabled={busy}>
          학생 지우기
        </button>
      </div>
    </section>
  )
}
