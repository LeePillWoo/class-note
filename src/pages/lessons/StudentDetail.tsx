import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import AttendanceCalendar from '../../components/AttendanceCalendar'
import Avatar from '../../components/Avatar'
import DateField from '../../components/DateField'
import EnrollSheet, { EnrollmentSheet, type EnrollTarget } from '../../components/EnrollSheet'
import { PencilIcon, PlusIcon } from '../../components/icons'
import MakeupSheet from '../../components/MakeupSheet'
import PageHeader from '../../components/PageHeader'
import PaymentSheet, { paymentTargetOf, type PaymentTarget } from '../../components/PaymentSheet'
import { RollLegend } from '../../components/RollTable'
import { DueRow, MakeupRow, PaidRow, TuitionRow } from '../../components/rows'
import Sheet from '../../components/Sheet'
import { latestSlots } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { isOpenState, makeupState, urgencyKey } from '../../data/makeupRules'
import { describeSlots } from '../../data/rules'
import { STUDENT_STATUS_LABELS, currentClasses, studentStatus } from '../../data/schedule'
import { describeBirthYear, openPause, useStudents } from '../../data/students'
import { dueNowOn, dueViews, tuitionState } from '../../data/tuition'
import type { Student } from '../../data/types'
import { WEEKDAY_NAMES, addDays, endOfMonth, formatDate, today, type DateStr } from '../../utils/date'

/** 전화·문자 주소에 넣을 번호 (숫자와 +만) */
function dial(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

function Contact({ label, phone }: { label: string; phone: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="contact">
        <span className="num">{phone}</span>
        <span className="contact-actions">
          <a className="pill-link" href={`tel:${dial(phone)}`} aria-label={`${label} 전화 걸기`}>전화</a>
          <a className="pill-link" href={`sms:${dial(phone)}`} aria-label={`${label} 문자 보내기`}>문자</a>
        </span>
      </dd>
    </>
  )
}

/** /lessons/student/:studentId — 1:1 레슨이 없는 학생(그룹 수업만 듣는 학생)의 화면 */
export function StudentDetailPage() {
  const { studentId = '' } = useParams()
  return <StudentDetail studentId={studentId} />
}

type StatusAction = 'pause' | 'resume' | 'leave' | 'rejoin'

/**
 * 학생 한 명: 연락처, 출결 달력, 듣는 수업과 수강료, 보강, 납부.
 * 1:1 레슨 화면도 이 화면입니다. (soloClassId가 있으면 고치기는 1:1 레슨 고치기로)
 */
export default function StudentDetail({ studentId, soloClassId }: { studentId: string; soloClassId?: string }) {
  const { data, index } = useData()
  const todayStr = today()
  const student = index.students.get(studentId)
  const [payment, setPayment] = useState<PaymentTarget | null>(null)
  const [makeupIds, setMakeupIds] = useState<string[] | null>(null)
  const [enrollTarget, setEnrollTarget] = useState<EnrollTarget | null>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null)

  const classes = useMemo(() => currentClasses(index, studentId, todayStr), [index, studentId, todayStr])
  const tuition = useMemo(() => {
    const classIds = [...new Set((index.enrollmentsByStudent.get(studentId) ?? []).map((item) => item.classId))]
    return classIds.flatMap((classId) => tuitionState(index, studentId, classId, todayStr) ?? [])
  }, [index, studentId, todayStr])
  const openMakeups = useMemo(
    () =>
      (index.makeupsByStudent.get(studentId) ?? [])
        .filter((makeup) => isOpenState(makeupState(makeup, todayStr)))
        .sort((a, b) => urgencyKey(a).localeCompare(urgencyKey(b))),
    [index, studentId, todayStr],
  )
  const dues = useMemo(() => dueViews(index, tuition, addDays(todayStr, 7), todayStr).filter((due) => due.studentId === studentId), [index, tuition, studentId, todayStr])
  const paid = useMemo(
    () =>
      data.payments
        .filter((item) => item.studentId === studentId && item.paidOn)
        .sort((a, b) => `${b.paidOn}${b.updatedAt}`.localeCompare(`${a.paidOn}${a.updatedAt}`)),
    [data.payments, studentId],
  )

  if (!student) {
    return (
      <section className="narrow">
        <PageHeader title="학생을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }

  const status = studentStatus(student, todayStr)
  const pause = openPause(student)
  const editPath = soloClassId ? `/lessons/${soloClassId}/edit` : `/lessons/student/${student.id}/edit`
  const subtitle = [describeBirthYear(student.birthYear), soloClassId ? '1:1 레슨' : '그룹 수업'].filter(Boolean).join(' · ')
  const statusClass = status === 'active' ? 'status-present' : status === 'paused' ? 'status-cancelled' : 'status-planned'

  return (
    <section className="detail">
      <PageHeader
        title={student.name}
        subtitle={subtitle}
        backTo="/lessons"
        actions={
          <Link to={editPath} className="btn btn-secondary btn-small">
            <PencilIcon />
            고치기
          </Link>
        }
      />

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card profile">
            <Avatar name={student.name} color={student.color} photo={student.photo} size="lg" />
            <div className="profile-text">
              <span className={`badge ${statusClass}`}>{STUDENT_STATUS_LABELS[status]}</span>
              <p className="muted">
                {status === 'paused' && pause && `${formatDate(pause.from)}부터 쉬는 중`}
                {status === 'left' && student.leftOn && `${formatDate(student.leftOn)}까지 다님`}
                {status === 'active' && `${formatDate(student.enrolledOn, { withYear: true })} 등록`}
                {status === 'active' && student.leftOn && ` · ${formatDate(student.leftOn)}까지 다닐 예정`}
                {status === 'active' && pause && ` · ${formatDate(pause.from)}부터 쉴 예정`}
              </p>
            </div>
            {(student.phone || student.guardians.length > 0 || student.memo) && (
              <dl className="kv profile-kv">
                {student.phone && <Contact label="학생" phone={student.phone} />}
                {student.guardians.map((guardian) => (
                  <Contact key={guardian.id} label={guardian.relation || '보호자'} phone={guardian.phone} />
                ))}
                {student.memo && (
                  <>
                    <dt>메모</dt>
                    <dd className="memo">{student.memo}</dd>
                  </>
                )}
              </dl>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">출결</h2>
            <AttendanceCalendar student={student} />
            <RollLegend />
          </div>
        </div>

        <div className="detail-side">
          <div className="card">
            <div className="card-head">
              <h2 className="card-title">수업과 수강료</h2>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setEnrollTarget({ studentId: student.id })}>
                <PlusIcon />
                그룹에 넣기
              </button>
            </div>
            {classes.length === 0 ? (
              <p className="muted">지금 듣는 수업이 없어요</p>
            ) : (
              <ul className="stack-list">
                {classes.map(({ cls, enrollment }) => {
                  const state = tuition.find((item) => item.classId === cls.id)
                  const days = enrollment.weekdays
                    ? `${enrollment.weekdays.map((day) => WEEKDAY_NAMES[day]).join('·')}요일만`
                    : describeSlots(latestSlots(cls))
                  return (
                    <li key={cls.id} className="lesson-fee">
                      <div className="lesson-fee-head">
                        <span className="dot" style={{ background: cls.color }} />
                        {cls.kind === 'group' ? <Link to={`/lessons/${cls.id}`} className="lesson-fee-name">{cls.name}</Link> : <span className="lesson-fee-name">1:1 레슨</span>}
                        <span className="muted">{days}</span>
                      </div>
                      {state && (
                        <TuitionRow state={state} label="수강료" />
                      )}
                      <div className="row">
                        {state && (
                          <button type="button" className="btn btn-secondary btn-small"
                            onClick={() => setPayment({ type: 'tuition', studentId: student.id, classId: cls.id, dueOn: dueNowOn(state, todayStr) })}>
                            수강료 받기
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => setEnrollmentId(enrollment.id)}>
                          수강 설정
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {openMakeups.length > 0 && (
            <div className="card">
              <h2 className="card-title">남은 보강 <span className="count">{openMakeups.length}</span></h2>
              <ul className="list flush">
                {openMakeups.map((makeup) => (
                  <li key={makeup.id}>
                    <MakeupRow makeup={makeup} showStudent={false} onClick={() => setMakeupIds([makeup.id])} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h2 className="card-title">납부</h2>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setPayment({ type: 'extra', studentId: student.id })}>
                <PlusIcon />
                추가 청구
              </button>
            </div>
            {dues.length === 0 && paid.length === 0 && <p className="muted">아직 납부 기록이 없어요</p>}
            {dues.length > 0 && (
              <ul className="list flush" aria-label="받을 돈">
                {dues.map((due) => (
                  <li key={due.key}>
                    <DueRow due={due} showStudent={false} onClick={() => setPayment(paymentTargetOf(due))} />
                  </li>
                ))}
              </ul>
            )}
            {paid.length > 0 && (
              <ul className="list flush" aria-label="받은 돈">
                {paid.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <PaidRow payment={item} showStudent={false} onClick={() => setPayment({ type: 'record', paymentId: item.id })} />
                  </li>
                ))}
              </ul>
            )}
            {paid.length > 6 && <p className="muted">최근 6건만 보여요. 전체는 납부 화면에서 달마다 볼 수 있어요</p>}
          </div>

          <div className="status-actions">
            {student.leftOn === undefined && !pause && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setStatusAction('pause')}>쉬기</button>
            )}
            {student.leftOn === undefined && pause && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setStatusAction('resume')}>다시 다니기</button>
            )}
            {student.leftOn === undefined ? (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setStatusAction('leave')}>그만두기</button>
            ) : (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setStatusAction('rejoin')}>다시 등록</button>
            )}
          </div>
        </div>
      </div>

      <PaymentSheet target={payment} onClose={() => setPayment(null)} />
      <MakeupSheet ids={makeupIds} onClose={() => setMakeupIds(null)} />
      <EnrollSheet target={enrollTarget} onClose={() => setEnrollTarget(null)} />
      <EnrollmentSheet enrollment={data.enrollments.find((item) => item.id === enrollmentId) ?? null} onClose={() => setEnrollmentId(null)} />
      <StatusSheet student={student} action={statusAction} onClose={() => setStatusAction(null)} />
    </section>
  )
}

const STATUS_COPY: Record<StatusAction, { title: string; label: string; hint: string; button: string }> = {
  pause: { title: '쉬기', label: '쉬기 시작하는 날', hint: '이날부터 수업 명단에서 빠지고, 남은 횟수는 그대로 남아요', button: '쉬는 것으로 저장' },
  resume: { title: '다시 다니기', label: '다시 나오는 날', hint: '이날부터 다시 수업 명단에 올라가요', button: '다시 다니는 것으로 저장' },
  leave: { title: '그만두기', label: '마지막으로 다닌 날', hint: '다음 날부터 수업 명단에서 빠져요. 지난 출결과 납부 기록은 그대로 남아요', button: '그만둔 것으로 저장' },
  rejoin: { title: '다시 등록', label: '다시 나오는 날', hint: '이날부터 다시 수업 명단에 올라가요. 그사이는 쉰 것으로 남아요', button: '다시 등록' },
}

function StatusSheet({ student, action, onClose }: { student: Student; action: StatusAction | null; onClose(): void }) {
  return (
    <Sheet open={action !== null} onClose={onClose} label="학생 상태">
      {action && <StatusEditor key={action} student={student} action={action} onDone={onClose} />}
    </Sheet>
  )
}

function StatusEditor({ student, action, onDone }: { student: Student; action: StatusAction; onDone(): void }) {
  const { pauseStudent, resumeStudent, leaveStudent, rejoinStudent } = useStudents()
  const [date, setDate] = useState<DateStr>(today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const copy = STATUS_COPY[action]
  // 다시 나오는 날은 쉬기 시작한 날(그만둔 다음 날)보다 앞일 수 없습니다.
  const min = action === 'resume' ? openPause(student)?.from : action === 'rejoin' && student.leftOn ? addDays(student.leftOn, 1) : undefined
  const last = action === 'leave' ? endOfMonth(date) : undefined

  async function save() {
    setBusy(true)
    try {
      if (action === 'pause') await pauseStudent(student, date)
      else if (action === 'resume') await resumeStudent(student, date)
      else if (action === 'leave') await leaveStudent(student, date)
      else await rejoinStudent(student, date)
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">{student.name} {copy.title}</h2>
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
        <button type="button" className="btn btn-primary" disabled={busy || (min !== undefined && date < min)} onClick={save}>
          {copy.button}
        </button>
      </div>
    </>
  )
}
