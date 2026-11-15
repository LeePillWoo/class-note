import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Avatar from '../../components/Avatar'
import DateField from '../../components/DateField'
import Empty from '../../components/Empty'
import { ChevronRightIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { studentPath } from '../../components/paths'
import Segmented from '../../components/Segmented'
import Sheet from '../../components/Sheet'
import StatusSheet, { STATUS_COPY } from '../../components/StatusSheet'
import { latestSlots, useEnrollments } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { describeSlots } from '../../data/rules'
import { STUDENT_STATUS_LABELS, currentClasses, isCurrentEnrollment, studentStatus, type StudentStatus } from '../../data/schedule'
import { canApplyStatus, describeBirthYear, useStudents, type StatusAction } from '../../data/students'
import type { ClassGroup, Student } from '../../data/types'
import { today, type DateStr } from '../../utils/date'

type Filter = 'all' | StudentStatus

const STATUS_BADGE: Record<StudentStatus, string> = {
  active: 'status-present',
  paused: 'status-cancelled',
  left: 'status-planned',
}

const ACTIONS: StatusAction[] = ['pause', 'resume', 'leave', 'rejoin']

/** 한 일을 알려주는 말. 예: '3명을 쉬는 것으로 바꿨어요' */
const DONE_COPY: Record<StatusAction, string> = {
  pause: '쉬는 것으로 바꿨어요',
  resume: '다시 다니는 것으로 바꿨어요',
  leave: '그만둔 것으로 바꿨어요',
  rejoin: '다시 등록했어요',
}

/**
 * 설정 > 학생 관리: 모든 학생을 한 화면에서 보고, 여럿을 골라 한 번에 바꿉니다.
 * (쉬기, 다시 다니기, 그만두기, 다시 등록, 그룹 수업에 넣기, 지우기)
 */
export default function StudentsPage() {
  const { index } = useData()
  const { students, removeStudents } = useStudents()
  const todayStr = today()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [action, setAction] = useState<StatusAction | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const rows = useMemo(
    () =>
      students.map((student) => ({
        student,
        status: studentStatus(student, todayStr),
        lessons: currentClasses(index, student.id, todayStr).map(({ cls }) => (cls.kind === 'solo' ? '1:1 레슨' : cls.name)),
      })),
    [students, index, todayStr],
  )
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: rows.length, active: 0, paused: 0, left: 0 }
    for (const row of rows) result[row.status]++
    return result
  }, [rows])

  const keyword = query.trim()
  const shown = rows.filter((row) => (filter === 'all' || row.status === filter) && (!keyword || row.student.name.includes(keyword)))
  // 고른 학생은 지금 목록에 보이는 학생만 셉니다. (걸러서 안 보이는 학생이 함께 바뀌지 않게)
  const selected = shown.filter((row) => picked.has(row.student.id)).map((row) => row.student)
  const allPicked = shown.length > 0 && selected.length === shown.length

  function toggle(id: string) {
    setNotice('')
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleAll() {
    setNotice('')
    setPicked(allPicked ? new Set() : new Set(shown.map((row) => row.student.id)))
  }

  function finish(message: string) {
    setPicked(new Set())
    setNotice(message)
  }

  async function remove() {
    const names = selected.map((student) => student.name).join(', ')
    if (!window.confirm(`${selected.length}명(${names})을 지울까요?\n모든 수업의 출결, 보강, 납부 기록이 함께 지워져요. 그만둔 학생은 지우지 말고 '그만두기'를 쓰세요.`)) return
    setBusy(true)
    try {
      const count = selected.length
      await removeStudents(selected.map((student) => student.id))
      finish(`${count}명을 지웠어요`)
    } catch {
      setNotice('지우지 못했어요. 다시 시도해 주세요')
    }
    setBusy(false)
  }

  // 그룹 수업에는 그만두지 않은 학생만 넣습니다.
  const enrollable = selected.filter((student) => studentStatus(student, todayStr) !== 'left')

  return (
    <section className="manage">
      <PageHeader title="학생 관리" subtitle="여러 학생을 골라 한 번에 쉬게 하거나, 그만둔 것으로 바꾸거나, 그룹 수업에 넣어요" backTo="/settings" />

      {rows.length === 0 ? (
        <Empty art="students" title="아직 학생이 없어요" action={<Link to="/lessons" className="btn btn-primary btn-small">수업 등록하러 가기</Link>}>
          1:1 레슨이나 그룹 수업을 등록하면 학생이 여기에 모여요.
        </Empty>
      ) : (
        <>
          <div className="list-tools manage-tools">
            <Segmented<Filter>
              label="학생 상태"
              name="manage-filter"
              value={filter}
              onChange={setFilter}
              options={(['all', 'active', 'paused', 'left'] as Filter[]).map((value) => ({
                value,
                label: (
                  <>
                    {value === 'all' ? '전체' : STUDENT_STATUS_LABELS[value]} <span className="count">{counts[value]}</span>
                  </>
                ),
              }))}
            />
            <input className="input search" type="search" value={query} autoComplete="off" placeholder="이름 찾기" aria-label="이름 찾기"
              onChange={(event) => setQuery(event.target.value)} />
          </div>

          {shown.length === 0 ? (
            <p className="empty-line">{keyword ? `'${keyword}' 학생이 없어요` : '여기에 해당하는 학생이 없어요'}</p>
          ) : (
            <>
              <div className="manage-head">
                <label className="check-row">
                  <input type="checkbox" checked={allPicked} onChange={toggleAll} />
                  모두 고르기
                </label>
                <span className="muted" aria-live="polite">{selected.length > 0 ? `${selected.length}명 고름` : `${shown.length}명`}</span>
              </div>
              <ul className="list manage-list" aria-label="학생 목록">
                {shown.map(({ student, status, lessons }) => (
                  <li key={student.id} className={picked.has(student.id) ? 'manage-item is-picked' : 'manage-item'}>
                    <label className="manage-row">
                      <input type="checkbox" checked={picked.has(student.id)} onChange={() => toggle(student.id)} aria-label={`${student.name} 고르기`} />
                      <Avatar name={student.name} color={student.color} photo={student.photo} />
                      <span className="person-text">
                        <span className="person-name">{student.name}</span>
                        <span className="person-sub">
                          {[describeBirthYear(student.birthYear), lessons.length > 0 ? lessons.join(', ') : '듣는 수업 없음'].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className={`badge ${STATUS_BADGE[status]}`}>{STUDENT_STATUS_LABELS[status]}</span>
                    </label>
                    <Link to={studentPath(index, student.id)} className="icon-btn" aria-label={`${student.name} 화면 열기`}>
                      <ChevronRightIcon />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="saved-note" role="status">{notice}</p>

          {selected.length > 0 && (
            <div className="sticky-actions bulk-bar" role="group" aria-label={`고른 학생 ${selected.length}명에게 할 일`}>
              <strong className="bulk-count">{selected.length}명</strong>
              {ACTIONS.map((item) => {
                const count = selected.filter((student) => canApplyStatus(student, item)).length
                return (
                  count > 0 && (
                    <button key={item} type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => setAction(item)}>
                      {STATUS_COPY[item].title}
                    </button>
                  )
                )
              })}
              {enrollable.length > 0 && (
                <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => setEnrolling(true)}>
                  그룹에 넣기
                </button>
              )}
              <button type="button" className="btn btn-ghost-danger btn-small" disabled={busy} onClick={() => void remove()}>
                지우기
              </button>
            </div>
          )}
        </>
      )}

      <StatusSheet
        students={selected}
        action={action}
        onClose={() => setAction(null)}
        onSaved={(count) => action && finish(`${count}명을 ${DONE_COPY[action]}`)}
      />
      <Sheet open={enrolling} onClose={() => setEnrolling(false)} label="그룹 수업에 넣기">
        {enrolling && <BulkEnroll students={enrollable} onDone={() => setEnrolling(false)} onSaved={(count, name) => finish(`${count}명을 ${name}에 넣었어요`)} />}
      </Sheet>
    </section>
  )
}

/** 고른 학생들을 그룹 수업 하나에 한 번에 넣습니다. 이미 듣는 학생은 건너뜁니다. */
function BulkEnroll({ students, onDone, onSaved }: { students: Student[]; onDone(): void; onSaved(count: number, className: string): void }) {
  const { data } = useData()
  const { enroll } = useEnrollments()
  const todayStr = today()
  const groups = useMemo(
    () => data.classes.filter((cls) => cls.kind === 'group' && (!cls.endedOn || cls.endedOn >= todayStr)).sort((a, b) => a.order - b.order),
    [data.classes, todayStr],
  )
  const [classId, setClassId] = useState(groups[0]?.id ?? '')
  const [startedOn, setStartedOn] = useState<DateStr>(todayStr)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cls: ClassGroup | undefined = groups.find((item) => item.id === classId)
  const isMember = (studentId: string) =>
    data.enrollments.some((item) => item.classId === classId && item.studentId === studentId && isCurrentEnrollment(item, todayStr))
  const targets = students.filter((student) => !isMember(student.id))

  async function save() {
    if (!cls) return
    setBusy(true)
    try {
      await enroll(cls.id, targets.map((student) => student.id), startedOn)
      onSaved(targets.length, cls.name)
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">{students.length}명 그룹 수업에 넣기</h2>
        <p className="muted">{students.map((student) => student.name).join(', ')}</p>
      </div>
      {groups.length === 0 ? (
        <p className="note">그룹 수업이 아직 없어요. 수업 메뉴에서 그룹 수업을 먼저 만들어 주세요.</p>
      ) : (
        <>
          <div className="field">
            <label className="field-label" htmlFor="bulk-class">그룹 수업</label>
            <select id="bulk-class" className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({describeSlots(latestSlots(item))})</option>
              ))}
            </select>
            {targets.length < students.length && (
              <p className="muted">
                {targets.length === 0 ? '고른 학생이 모두 이미 이 수업을 듣고 있어요' : `이미 듣는 ${students.length - targets.length}명은 그대로 두고 ${targets.length}명만 넣어요`}
              </p>
            )}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="bulk-start">시작하는 날</label>
            <DateField id="bulk-start" label="시작하는 날" value={startedOn} onChange={setStartedOn} />
            <p className="muted">이날부터 출결과 회차를 세요</p>
          </div>
        </>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || !cls || targets.length === 0} onClick={save}>
          {targets.length > 0 ? `${targets.length}명 넣기` : '넣기'}
        </button>
      </div>
    </>
  )
}
