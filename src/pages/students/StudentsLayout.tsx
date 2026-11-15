import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useMatch } from 'react-router'
import Avatar from '../../components/Avatar'
import Empty from '../../components/Empty'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useData } from '../../data/DataProvider'
import { STUDENT_STATUS_LABELS, currentClasses, studentStatus, type StudentStatus } from '../../data/schedule'
import { useStudents } from '../../data/students'
import SplitView from '../../layout/SplitView'
import { today } from '../../utils/date'

const STATUSES: StudentStatus[] = ['active', 'paused', 'left']

/** 학생: 왼쪽 목록 + 오른쪽 자세히 (좁은 화면은 한 칸씩) */
export default function StudentsLayout() {
  const atList = useMatch({ path: '/students', end: true }) !== null
  return (
    <SplitView detailActive={!atList} list={<StudentList />}>
      <Outlet />
    </SplitView>
  )
}

/** 학생을 고르지 않았을 때 자세히 칸에 보이는 안내 (두 칸 화면에서만 보입니다) */
export function StudentsIndex() {
  const { data } = useData()
  if (data.students.length === 0) return null
  return (
    <Empty plain title="학생을 골라 주세요">
      왼쪽 목록에서 학생을 누르면 연락처, 출결, 남은 횟수가 여기에 보여요.
    </Empty>
  )
}

function StudentList() {
  const { index } = useData()
  const { students } = useStudents()
  const todayStr = today()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StudentStatus>('active')

  const rows = useMemo(
    () =>
      students.map((student) => ({
        student,
        status: studentStatus(student, todayStr),
        classes: currentClasses(index, student.id, todayStr).map((item) => item.cls.name),
      })),
    [students, index, todayStr],
  )
  const counts = (status: StudentStatus) => rows.filter((row) => row.status === status).length
  const keyword = query.trim()
  // 찾는 중에는 상태와 상관없이 모든 학생에서 찾습니다.
  const shown = rows.filter((row) => (keyword ? row.student.name.includes(keyword) || row.student.school.includes(keyword) : row.status === filter))

  return (
    <section>
      <PageHeader
        title="학생"
        subtitle={`다니는 학생 ${counts('active')}명`}
        actions={
          <Link to="/students/new" className="btn btn-primary btn-small">
            <PlusIcon />
            학생 추가
          </Link>
        }
      />
      {students.length === 0 ? (
        <Empty
          title="아직 학생이 없어요"
          action={
            <Link to="/students/new" className="btn btn-primary">
              <PlusIcon />
              학생 추가
            </Link>
          }
        >
          학생을 추가하고 반에 넣으면 출석부에 이름이 올라가요.
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <input
              className="input search-field"
              type="search"
              value={query}
              autoComplete="off"
              placeholder="이름이나 학교로 찾기"
              aria-label="학생 찾기"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {!keyword && (
            <div className="chips filter-chips" role="group" aria-label="학생 상태">
              {STATUSES.map((status) => (
                <button key={status} type="button" className="chip" aria-pressed={filter === status} onClick={() => setFilter(status)}>
                  {STUDENT_STATUS_LABELS[status]} {counts(status)}
                </button>
              ))}
            </div>
          )}
          {shown.length === 0 ? (
            <div className="card">
              <p className="muted">{keyword ? `'${keyword}'(으)로 찾은 학생이 없어요.` : `${STUDENT_STATUS_LABELS[filter]}인 학생이 없어요.`}</p>
            </div>
          ) : (
            <ul className="list" aria-label="학생 목록">
              {shown.map(({ student, status, classes }) => (
                <li key={student.id}>
                  <NavLink to={`/students/${student.id}`} className="person-row">
                    <Avatar name={student.name} color={student.color} />
                    <span className="list-text">
                      <span className="list-title">
                        {student.name}
                        {status !== 'active' && <span className={status === 'paused' ? 'tag is-warn' : 'tag is-neutral'}>{STUDENT_STATUS_LABELS[status]}</span>}
                      </span>
                      <span className="list-sub">{[student.school, classes.join(', ')].filter(Boolean).join(' · ') || '반 없음'}</span>
                    </span>
                    <ChevronRightIcon />
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
