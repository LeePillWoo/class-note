import { Link, NavLink, Outlet, useMatch } from 'react-router'
import Avatar from '../../components/Avatar'
import Empty from '../../components/Empty'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { latestSlots, useClasses } from '../../data/classes'
import { useData } from '../../data/DataProvider'
import { describeFee, describeSlots } from '../../data/rules'
import { currentMembers } from '../../data/schedule'
import SplitView from '../../layout/SplitView'
import { today } from '../../utils/date'

/** 반: 왼쪽 목록 + 오른쪽 자세히 (좁은 화면은 한 칸씩) */
export default function ClassesLayout() {
  const atList = useMatch({ path: '/classes', end: true }) !== null
  return (
    <SplitView detailActive={!atList} list={<ClassList />}>
      <Outlet />
    </SplitView>
  )
}

/** 반을 고르지 않았을 때 자세히 칸에 보이는 안내 (두 칸 화면에서만 보입니다) */
export function ClassesIndex() {
  const { data } = useData()
  if (data.classes.length === 0) return null
  return (
    <Empty plain title="반을 골라 주세요">
      왼쪽 목록에서 반을 누르면 학생과 이번 달 출석부가 여기에 보여요.
    </Empty>
  )
}

function ClassList() {
  const { index } = useData()
  const { classes } = useClasses()
  const todayStr = today()
  const open = classes.filter((cls) => !cls.endedOn || cls.endedOn >= todayStr)
  const closed = classes.filter((cls) => cls.endedOn && cls.endedOn < todayStr)

  const row = (cls: (typeof classes)[number]) => {
    const members = currentMembers(index, cls.id, todayStr).length
    return (
      <li key={cls.id}>
        <NavLink to={`/classes/${cls.id}`} className="person-row">
          <Avatar name={cls.name} color={cls.color} square />
          <span className="list-text">
            <span className="list-title">
              {cls.name}
              {cls.endedOn && cls.endedOn < todayStr && <span className="tag is-neutral">닫음</span>}
            </span>
            <span className="list-sub">{describeSlots(latestSlots(cls))}</span>
            <span className="list-sub">
              학생 {members}명, {describeFee(cls.fee)}
            </span>
          </span>
          <ChevronRightIcon />
        </NavLink>
      </li>
    )
  }

  return (
    <section>
      <PageHeader
        title="반"
        subtitle={`수업하는 반 ${open.length}개`}
        actions={
          <Link to="/classes/new" className="btn btn-primary btn-small">
            <PlusIcon />
            반 만들기
          </Link>
        }
      />
      {classes.length === 0 ? (
        <Empty
          title="아직 반이 없어요"
          action={
            <Link to="/classes/new" className="btn btn-primary">
              <PlusIcon />
              반 만들기
            </Link>
          }
        >
          수업 요일과 시간, 수강료를 정해 반을 만들어요. 1:1 레슨도 학생이 한 명인 반으로 만들면 돼요.
        </Empty>
      ) : (
        <>
          {open.length > 0 && <ul className="list" aria-label="반 목록">{open.map(row)}</ul>}
          {closed.length > 0 && (
            <details>
              <summary className="summary muted">닫은 반 {closed.length}개</summary>
              <ul className="list" aria-label="닫은 반 목록">{closed.map(row)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}
