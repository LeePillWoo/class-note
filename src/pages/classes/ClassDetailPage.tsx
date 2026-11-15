import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import Avatar from '../../components/Avatar'
import EnrollSheet, { EnrollmentSheet } from '../../components/EnrollSheet'
import { BackIcon, ChevronRightIcon, PencilIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import PaymentSheet, { type PaymentTarget } from '../../components/PaymentSheet'
import RollTable from '../../components/RollTable'
import { TuitionRow } from '../../components/rows'
import { latestSlots } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { ABSENCE_COUNTING_LABELS, describeFee, describeMakeupRule, describeSlots } from '../../data/rules'
import { compareStudents, currentMembers, isCurrentEnrollment, studentStatus } from '../../data/schedule'
import { dueNowOn, tuitionState } from '../../data/tuition'
import { WEEKDAY_NAMES, addMonths, dateParts, formatDate, startOfMonth, today } from '../../utils/date'

/** 반 하나: 수업 정보, 학생과 남은 횟수, 한 달 출석부 */
export default function ClassDetailPage() {
  const { classId = '' } = useParams()
  const { data, index } = useData()
  const todayStr = today()
  const cls = index.classes.get(classId)
  const [month, setMonth] = useState(() => startOfMonth(todayStr))
  const [enrolling, setEnrolling] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentTarget | null>(null)

  const members = useMemo(() => currentMembers(index, classId, todayStr), [index, classId, todayStr])
  // 이 반을 그만둔 학생 (수강이 끝났거나 학원을 그만둠)
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

  if (!cls) {
    return (
      <section className="narrow">
        <PageHeader title="반을 찾을 수 없어요" backTo="/classes" />
      </section>
    )
  }

  const slots = latestSlots(cls)
  const { year, month: monthNumber } = dateParts(month)
  // 앞으로 바뀔 일정이 있으면 알려줍니다.
  const upcomingChange = cls.schedules.length > 1 && cls.schedules[cls.schedules.length - 1].startsOn > todayStr ? cls.schedules[cls.schedules.length - 1].startsOn : undefined

  return (
    <section>
      <PageHeader
        title={cls.name}
        subtitle={cls.subject || undefined}
        backTo="/classes"
        actions={
          <Link to={`/classes/${cls.id}/edit`} className="btn btn-secondary btn-small">
            <PencilIcon />
            고치기
          </Link>
        }
      />

      <div className="card">
        <div className="detail-head">
          <Avatar name={cls.name} color={cls.color} large square />
          <div className="detail-title">
            <p><strong>{describeSlots(slots)}</strong></p>
            <p className="muted">
              {upcomingChange ? `${formatDate(upcomingChange)}부터 이 일정이에요` : cls.place}
              {cls.endedOn && ` ${formatDate(cls.endedOn)}까지 수업`}
            </p>
          </div>
        </div>
        <dl className="kv">
          <dt>수강료</dt>
          <dd>{describeFee(cls.fee)}</dd>
          <dt>결석한 수업</dt>
          <dd>{ABSENCE_COUNTING_LABELS[cls.absenceCounting]}</dd>
          <dt>보강</dt>
          <dd>{describeMakeupRule(cls.makeupRule)}</dd>
          {cls.memo && (
            <>
              <dt>메모</dt>
              <dd>{cls.memo}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="card-title">
            학생 <span className="muted">{members.length}명</span>
          </h2>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setEnrolling(true)}>
            <PlusIcon />
            학생 넣기
          </button>
        </div>
        {members.length === 0 ? (
          <p className="muted">아직 학생이 없어요. 학생을 넣으면 수업 날마다 출석부에 이름이 올라가요.</p>
        ) : (
          <ul className="list" aria-label="이 반 학생">
            {members.map(({ student, enrollment }) => {
              const state = tuitionState(index, student.id, cls.id, todayStr)
              const paused = studentStatus(student, todayStr) === 'paused'
              const notStarted = enrollment.startedOn > todayStr
              return (
                <li key={student.id}>
                  {state && (
                    <TuitionRow
                      state={state}
                      label={
                        <>
                          {student.name}
                          {paused && <span className="tag is-warn">쉬는 중</span>}
                          {notStarted && <span className="tag is-neutral">{formatDate(enrollment.startedOn)}부터</span>}
                          {enrollment.weekdays && <span className="tag is-neutral">{enrollment.weekdays.map((day) => WEEKDAY_NAMES[day]).join('·')}만</span>}
                          {enrollment.endedOn && <span className="tag is-neutral">{formatDate(enrollment.endedOn)}까지</span>}
                        </>
                      }
                      onClick={() => setPayment({ type: 'tuition', studentId: student.id, classId: cls.id, dueOn: dueNowOn(state, todayStr) })}
                    />
                  )}
                  <div className="row" style={{ padding: '0 0.75rem 0.5rem' }}>
                    <Link to={`/students/${student.id}`} className="pill-link">학생 보기</Link>
                    <button type="button" className="link-btn" onClick={() => setEnrollmentId(enrollment.id)}>수강 설정</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="muted">학생을 누르면 수강료를 받은 것으로 적어요.</p>
        {former.length > 0 && (
          <details>
            <summary className="summary muted">그만둔 학생 {former.length}명</summary>
            <ul className="list">
              {former.map(({ student, enrollment }) => (
                <li key={student.id} className="list-row">
                  <span className="list-text">
                    <span className="list-title">{student.name}</span>
                    <span className="list-sub">
                      {formatDate(enrollment.startedOn, { withYear: true })}부터
                      {isCurrentEnrollment(enrollment, todayStr) ? '' : ` ${formatDate(enrollment.endedOn!, { withYear: true })}까지`}
                    </span>
                  </span>
                  <button type="button" className="link-btn" onClick={() => setEnrollmentId(enrollment.id)}>수강 설정</button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">출석부</h2>
        <div className="calendar-toolbar">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
              <BackIcon />
            </button>
            <strong>{year}년 {monthNumber}월</strong>
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
              <ChevronRightIcon />
            </button>
          </div>
          <button type="button" className="btn btn-secondary btn-small today-btn" onClick={() => setMonth(startOfMonth(todayStr))}
            disabled={month === startOfMonth(todayStr)}>
            이번 달
          </button>
        </div>
        <RollTable cls={cls} month={month} />
      </div>

      <EnrollSheet target={enrolling ? { classId: cls.id } : null} onClose={() => setEnrolling(false)} />
      <EnrollmentSheet enrollment={data.enrollments.find((item) => item.id === enrollmentId) ?? null} onClose={() => setEnrollmentId(null)} />
      <PaymentSheet target={payment} onClose={() => setPayment(null)} />
    </section>
  )
}
