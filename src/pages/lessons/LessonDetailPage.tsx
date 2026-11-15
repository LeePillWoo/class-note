import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import Avatar from '../../components/Avatar'
import EnrollSheet, { EnrollmentSheet } from '../../components/EnrollSheet'
import { BackIcon, ChevronRightIcon, PencilIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { studentPath } from '../../components/paths'
import PaymentSheet, { type PaymentTarget } from '../../components/PaymentSheet'
import RollTable, { RollLegend } from '../../components/RollTable'
import { latestSlots, soloStudentId } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { BILLING_LABELS, describeFee, describeSlots, perSessionText } from '../../data/rules'
import { compareStudents, currentMembers, studentStatus } from '../../data/schedule'
import { describeBirthYear } from '../../data/students'
import { describeRemaining, dueNowOn, isBehind, tuitionState } from '../../data/tuition'
import { WEEKDAY_NAMES, addMonths, dateParts, formatDate, startOfMonth, today } from '../../utils/date'
import StudentDetail from './StudentDetail'

/** /lessons/:classId — 1:1 레슨이면 학생 화면, 그룹 수업이면 명단과 출석부 */
export default function LessonDetailPage() {
  const { classId = '' } = useParams()
  const { data, index } = useData()
  const cls = index.classes.get(classId)
  if (!cls) {
    return (
      <section className="narrow">
        <PageHeader title="수업을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }
  if (cls.kind === 'solo') {
    const studentId = soloStudentId(data, cls.id)
    return studentId ? <StudentDetail key={studentId} studentId={studentId} soloClassId={cls.id} /> : null
  }
  return <GroupDetail key={cls.id} classId={cls.id} />
}

/** 그룹 수업: 수업 정보, 학생과 남은 횟수, 한 달 출석부 */
function GroupDetail({ classId }: { classId: string }) {
  const { data, index } = useData()
  const todayStr = today()
  const cls = index.classes.get(classId)!
  const [month, setMonth] = useState(() => startOfMonth(todayStr))
  const [enrolling, setEnrolling] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentTarget | null>(null)

  const members = useMemo(() => currentMembers(index, classId, todayStr), [index, classId, todayStr])
  // 이 수업을 그만둔 학생
  const former = useMemo(() => {
    const current = new Set(members.map((member) => member.student.id))
    const seen = new Set<string>()
    return (index.enrollmentsByClass.get(classId) ?? [])
      .flatMap((enrollment) => {
        const student = index.students.get(enrollment.studentId)
        if (!student || current.has(student.id) || seen.has(student.id)) return []
        seen.add(student.id)
        return [{ student, enrollment }]
      })
      .sort((a, b) => compareStudents(a.student, b.student))
  }, [index, classId, members])

  const slots = latestSlots(cls)
  const { year, month: monthNumber } = dateParts(month)
  const last = cls.schedules[cls.schedules.length - 1]
  const upcomingChange = cls.schedules.length > 1 && last.startsOn > todayStr ? last.startsOn : undefined
  const per = perSessionText(cls.fee)

  return (
    <section className="detail">
      <PageHeader
        title={cls.name}
        subtitle={['그룹 수업', cls.subject].filter(Boolean).join(' · ')}
        backTo="/lessons"
        actions={
          <Link to={`/lessons/${cls.id}/edit`} className="btn btn-secondary btn-small">
            <PencilIcon />
            고치기
          </Link>
        }
      />

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card profile">
            <Avatar name={cls.name} color={cls.color} size="lg" square />
            <div className="profile-text">
              <p className="profile-lead">{describeSlots(slots)}</p>
              <p className="muted">
                {upcomingChange ? `${formatDate(upcomingChange)}부터 이 일정` : `${formatDate(cls.startedOn, { withYear: true })} 시작`}
                {cls.endedOn && ` · ${formatDate(cls.endedOn)}까지 수업`}
              </p>
            </div>
            <dl className="kv profile-kv">
              <dt>수강료</dt>
              <dd>
                {describeFee(cls.fee)}
                {per && <span className="muted"> · {per}</span>}
              </dd>
              <dt>받는 때</dt>
              <dd>{BILLING_LABELS[cls.billing]}</dd>
              {cls.memo && (
                <>
                  <dt>메모</dt>
                  <dd className="memo">{cls.memo}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="card">
            <div className="card-head">
              <h2 className="card-title">출석부</h2>
              <div className="cal-toolbar compact">
                <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
                  <BackIcon />
                </button>
                <strong className="cal-title">{year}년 {monthNumber}월</strong>
                <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
            <RollTable cls={cls} month={month} />
            <RollLegend />
          </div>
        </div>

        <div className="detail-side">
          <div className="card">
            <div className="card-head">
              <h2 className="card-title">학생 <span className="count">{members.length}</span></h2>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setEnrolling(true)}>
                <PlusIcon />
                학생 추가
              </button>
            </div>
            {members.length === 0 ? (
              <p className="muted">아직 학생이 없어요. 학생을 넣으면 수업 날마다 출석부에 이름이 올라가요</p>
            ) : (
              <ul className="list flush" aria-label="이 수업 학생">
                {members.map(({ student, enrollment }) => {
                  const state = tuitionState(index, student.id, cls.id, todayStr)
                  const paused = studentStatus(student, todayStr) === 'paused'
                  return (
                    <li key={student.id} className="member-row">
                      <Link to={studentPath(index, student.id)} className="person-row">
                        <Avatar name={student.name} color={student.color} photo={student.photo} size="sm" />
                        <span className="person-text">
                          <span className="person-name">
                            {student.name}
                            {paused && <span className="tag is-warn">쉬는 중</span>}
                          </span>
                          <span className="person-sub">
                            {[
                              describeBirthYear(student.birthYear),
                              enrollment.weekdays && `${enrollment.weekdays.map((day) => WEEKDAY_NAMES[day]).join('·')}만`,
                              enrollment.startedOn > todayStr && `${formatDate(enrollment.startedOn)}부터`,
                              enrollment.endedOn && `${formatDate(enrollment.endedOn)}까지`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        {state && <span className={isBehind(state, todayStr) ? 'person-meta is-behind' : 'person-meta'}>{describeRemaining(state)}</span>}
                      </Link>
                      <div className="member-actions">
                        {state && (
                          <button type="button" className="btn btn-ghost btn-small"
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
            {former.length > 0 && (
              <details className="past">
                <summary className="summary muted">그만둔 학생 {former.length}명</summary>
                <ul className="list flush">
                  {former.map(({ student, enrollment }) => (
                    <li key={student.id} className="list-row">
                      <span className="list-text">
                        <span className="list-title">{student.name}</span>
                        <span className="list-sub">
                          {formatDate(enrollment.startedOn, { withYear: true })}부터
                          {enrollment.endedOn ? ` ${formatDate(enrollment.endedOn, { withYear: true })}까지` : ''}
                        </span>
                      </span>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setEnrollmentId(enrollment.id)}>수강 설정</button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>

      <EnrollSheet target={enrolling ? { classId: cls.id } : null} onClose={() => setEnrolling(false)} />
      <EnrollmentSheet enrollment={data.enrollments.find((item) => item.id === enrollmentId) ?? null} onClose={() => setEnrollmentId(null)} />
      <PaymentSheet target={payment} onClose={() => setPayment(null)} />
    </section>
  )
}
