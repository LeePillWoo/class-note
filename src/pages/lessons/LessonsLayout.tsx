import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useMatch } from 'react-router'
import Avatar from '../../components/Avatar'
import Empty from '../../components/Empty'
import { PlusIcon } from '../../components/icons'
import Segmented from '../../components/Segmented'
import { latestSlots } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { describeSlots } from '../../data/rules'
import { compareStudents, currentMembers, isCurrentEnrollment, studentStatus } from '../../data/schedule'
import { usePaymentsEnabled } from '../../data/settings'
import { describeBirthYear } from '../../data/students'
import { namesSummary } from '../../data/lessons'
import { describeRemaining, isBehind, tuitionState } from '../../data/tuition'
import type { ClassGroup, Student } from '../../data/types'
import SplitView from '../../layout/SplitView'
import { today } from '../../utils/date'

type Filter = 'all' | 'solo' | 'group'

/** 수업: 왼쪽 목록(1:1 레슨과 그룹 수업) + 오른쪽 자세히. 좁은 화면은 한 칸씩 */
export default function LessonsLayout() {
  const atList = useMatch({ path: '/lessons', end: true }) !== null
  return (
    <SplitView detailActive={!atList} list={<LessonList />}>
      <Outlet />
    </SplitView>
  )
}

/** 수업을 고르지 않았을 때 자세히 칸 (두 칸 화면에서만 보입니다) */
export function LessonsIndex() {
  const { data } = useData()
  if (data.classes.length === 0) return null
  return (
    <Empty plain title="수업을 골라 주세요">
      1:1 레슨은 학생 정보와 출결 달력이, 그룹 수업은 학생 명단과 출석부가 여기에 보여요.
    </Empty>
  )
}

interface SoloRow {
  cls: ClassGroup
  student: Student
}

function LessonList() {
  const { data, index } = useData()
  const todayStr = today()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const keyword = query.trim()

  const { solos, groups, pastSolos, pastGroups, loose } = useMemo(() => {
    const classes = [...data.classes].sort((a, b) => a.order - b.order)
    const solos: SoloRow[] = []
    const pastSolos: SoloRow[] = []
    const groups: ClassGroup[] = []
    const pastGroups: ClassGroup[] = []
    const inSolo = new Set<string>()
    for (const cls of classes) {
      const closed = cls.endedOn !== undefined && cls.endedOn < todayStr
      if (cls.kind === 'group') {
        ;(closed ? pastGroups : groups).push(cls)
        continue
      }
      const enrollment = index.enrollmentsByClass.get(cls.id)?.[0]
      const student = enrollment && index.students.get(enrollment.studentId)
      if (!student) continue
      inSolo.add(student.id)
      const active = !closed && isCurrentEnrollment(enrollment, todayStr) && studentStatus(student, todayStr) !== 'left'
      ;(active ? solos : pastSolos).push({ cls, student })
    }
    solos.sort((a, b) => compareStudents(a.student, b.student))
    // 1:1 레슨이 없는 학생 중 지금 어느 수업에도 없는 학생 (그만둔 학생 등)
    const loose = data.students
      .filter((student) => !inSolo.has(student.id))
      .filter((student) => !(index.enrollmentsByStudent.get(student.id) ?? []).some((item) => isCurrentEnrollment(item, todayStr) && studentStatus(student, todayStr) !== 'left'))
      .sort(compareStudents)
    return { solos, groups, pastSolos, pastGroups, loose }
  }, [data.classes, data.students, index, todayStr])

  const match = (text: string) => !keyword || text.includes(keyword)
  // 찾을 때는 그룹 수업에 들어 있는 학생도 따로 보여줍니다.
  const members = keyword
    ? data.students.filter((student) => match(student.name) && !solos.some((row) => row.student.id === student.id)).sort(compareStudents)
    : []
  const shownSolos = filter === 'group' ? [] : solos.filter((row) => match(row.student.name))
  const shownGroups = filter === 'solo' ? [] : groups.filter((cls) => match(cls.name))
  const pastCount = pastSolos.length + pastGroups.length + loose.length

  return (
    <section className="lesson-list">
      <div className="page-header">
        <div className="page-heading">
          <h1 className="page-title">수업</h1>
          <p className="page-subtitle">1:1 {solos.length}명 · 그룹 {groups.length}개</p>
        </div>
      </div>
      <div className="add-row">
        <Link to="/lessons/new/solo" className="btn btn-primary btn-small">
          <PlusIcon />
          1:1 레슨
        </Link>
        <Link to="/lessons/new/group" className="btn btn-secondary btn-small">
          <PlusIcon />
          그룹 수업
        </Link>
      </div>

      {data.classes.length === 0 ? (
        <Empty art="lessons" title="아직 수업이 없어요">
          1:1 레슨은 학생 정보와 수업을 한 번에 등록해요. 여러 명이 함께 듣는 수업은 그룹 수업으로 만들어요.
        </Empty>
      ) : (
        <>
          <div className="list-tools">
            <input className="input search" type="search" value={query} autoComplete="off" placeholder="이름 찾기" aria-label="이름 찾기"
              onChange={(event) => setQuery(event.target.value)} />
            <Segmented<Filter>
              label="수업 종류"
              name="lesson-filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'solo', label: '1:1' },
                { value: 'group', label: '그룹' },
              ]}
            />
          </div>

          {shownSolos.length > 0 && (
            <div className="list-group">
              <h2 className="list-label">1:1 레슨</h2>
              <ul className="list" aria-label="1:1 레슨">
                {shownSolos.map((row) => (
                  <li key={row.cls.id}>
                    <SoloLink row={row} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shownGroups.length > 0 && (
            <div className="list-group">
              <h2 className="list-label">그룹 수업</h2>
              <ul className="list" aria-label="그룹 수업">
                {shownGroups.map((cls) => (
                  <li key={cls.id}>
                    <GroupLink cls={cls} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {members.length > 0 && filter !== 'solo' && (
            <div className="list-group">
              <h2 className="list-label">학생</h2>
              <ul className="list" aria-label="찾은 학생">
                {members.map((student) => (
                  <li key={student.id}>
                    <NavLink to={`/lessons/student/${student.id}`} className="person-row">
                      <Avatar name={student.name} color={student.color} photo={student.photo} />
                      <span className="person-text">
                        <span className="person-name">{student.name}</span>
                        <span className="person-sub">{groupsOf(student.id).join(', ') || '수업 없음'}</span>
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {keyword && shownSolos.length + shownGroups.length + members.length === 0 && <p className="muted list-empty">'{keyword}'(으)로 찾은 수업이 없어요</p>}

          {!keyword && pastCount > 0 && (
            <details className="list-group past">
              <summary className="list-label summary">지난 수업 {pastCount}</summary>
              <ul className="list" aria-label="지난 수업">
                {pastSolos.map((row) => (
                  <li key={row.cls.id}>
                    <SoloLink row={row} />
                  </li>
                ))}
                {pastGroups.map((cls) => (
                  <li key={cls.id}>
                    <GroupLink cls={cls} />
                  </li>
                ))}
                {loose.map((student) => (
                  <li key={student.id}>
                    <NavLink to={`/lessons/student/${student.id}`} className="person-row">
                      <Avatar name={student.name} color={student.color} photo={student.photo} />
                      <span className="person-text">
                        <span className="person-name">{student.name}</span>
                        <span className="person-sub">수업 없음</span>
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )

  function groupsOf(studentId: string): string[] {
    return (index.enrollmentsByStudent.get(studentId) ?? [])
      .filter((item) => isCurrentEnrollment(item, todayStr))
      .flatMap((item) => index.classes.get(item.classId)?.name ?? [])
  }
}

function SoloLink({ row }: { row: SoloRow }) {
  const { index } = useData()
  const todayStr = today()
  const { cls, student } = row
  const state = usePaymentsEnabled() ? tuitionState(index, student.id, cls.id, todayStr) : null
  const status = studentStatus(student, todayStr)
  return (
    <NavLink to={`/lessons/${cls.id}`} className="person-row">
      <Avatar name={student.name} color={student.color} photo={student.photo} />
      <span className="person-text">
        <span className="person-name">
          {student.name}
          {status === 'paused' && <span className="tag is-warn">쉬는 중</span>}
          {status === 'left' && <span className="tag">그만둠</span>}
        </span>
        <span className="person-sub">{[describeBirthYear(student.birthYear), describeSlots(latestSlots(cls))].filter(Boolean).join(' · ')}</span>
      </span>
      {state && state.current && <span className={isBehind(state, todayStr) ? 'person-meta is-behind' : 'person-meta'}>{describeRemaining(state)}</span>}
    </NavLink>
  )
}

function GroupLink({ cls }: { cls: ClassGroup }) {
  const { index } = useData()
  const todayStr = today()
  const members = currentMembers(index, cls.id, todayStr)
  return (
    <NavLink to={`/lessons/${cls.id}`} className="person-row">
      <Avatar name={cls.name} color={cls.color} square />
      <span className="person-text">
        <span className="person-name">
          {cls.name}
          {members.length > 0 && <span className="person-members"> ({namesSummary(members.map((member) => member.student.name))})</span>}
          {cls.endedOn && cls.endedOn < todayStr && <span className="tag">닫음</span>}
        </span>
        <span className="person-sub">{describeSlots(latestSlots(cls))}</span>
      </span>
    </NavLink>
  )
}
