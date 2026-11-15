import { useMemo, useState } from 'react'
import MakeupSheet from '../components/MakeupSheet'
import PageHeader from '../components/PageHeader'
import { MakeupRow } from '../components/rows'
import { useData } from '../data/DataProvider'
import { describeDeadline, isOpenState, makeupState, urgencyKey } from '../data/makeupRules'
import type { Makeup } from '../data/types'
import { formatDate, today } from '../utils/date'

/** 휴강 한 번으로 생긴 보강 묶음 (아직 날짜를 안 잡은 것들) */
interface CancelledGroup {
  key: string
  makeups: Makeup[]
}

/**
 * 보강: 날짜를 잡아야 하는 보강과 잡아 둔 보강을 급한 순서로 보여줍니다.
 * 휴강으로 생긴 보강은 반 학생들을 한 번에 같은 날로 잡을 수 있게 묶어 둡니다.
 */
export default function MakeupsPage() {
  const { data, index } = useData()
  const todayStr = today()
  const [ids, setIds] = useState<string[] | null>(null)

  const { pending, groups, scheduled, past } = useMemo(() => {
    const known = data.makeups.filter((makeup) => index.students.has(makeup.studentId) && index.classes.has(makeup.classId))
    const byUrgency = (a: Makeup, b: Makeup) => urgencyKey(a).localeCompare(urgencyKey(b))
    const open = known.filter((makeup) => isOpenState(makeupState(makeup, todayStr)))
    const waiting = open.filter((makeup) => !makeup.scheduledOn).sort(byUrgency)

    // 같은 휴강으로 생긴 대기 보강이 둘 이상이면 묶음으로
    const buckets = new Map<string, Makeup[]>()
    for (const makeup of waiting) {
      if (makeup.reason !== 'cancelled') continue
      const key = `${makeup.classId}|${makeup.missedOn}`
      buckets.set(key, [...(buckets.get(key) ?? []), makeup])
    }
    const groups: CancelledGroup[] = [...buckets.entries()].filter(([, list]) => list.length > 1).map(([key, makeups]) => ({ key, makeups }))
    const grouped = new Set(groups.flatMap((group) => group.makeups.map((makeup) => makeup.id)))

    return {
      pending: waiting.filter((makeup) => !grouped.has(makeup.id)),
      groups,
      scheduled: open.filter((makeup) => makeup.scheduledOn).sort(byUrgency),
      past: known
        .filter((makeup) => !isOpenState(makeupState(makeup, todayStr)))
        .sort((a, b) => (b.scheduledOn ?? b.missedOn).localeCompare(a.scheduledOn ?? a.missedOn)),
    }
  }, [data.makeups, index, todayStr])

  const nothing = pending.length + groups.length + scheduled.length + past.length === 0

  return (
    <section>
      <PageHeader title="보강" subtitle="결석이나 휴강을 적으면 여기에 보강이 생겨요." />
      {nothing ? (
        <div className="card narrow">
          <p className="muted">아직 보강이 없어요. 출결에서 결석이나 휴강을 적으면 반 규칙에 따라 보강이 생겨요.</p>
        </div>
      ) : (
        <div className="duo">
          <div className="duo-cols">
            <div className="duo-col">
              <div className="home-section">
                <h2 className="section-heading">
                  날짜를 잡아야 해요 <span className="muted">{pending.length + groups.reduce((sum, group) => sum + group.makeups.length, 0)}개</span>
                </h2>
                {pending.length + groups.length === 0 ? (
                  <div className="card">
                    <p className="muted">날짜를 기다리는 보강이 없어요.</p>
                  </div>
                ) : (
                  <ul className="list" aria-label="날짜를 잡아야 하는 보강">
                    {groups.map((group) => {
                      const first = group.makeups[0]
                      const cls = index.classes.get(first.classId)
                      return (
                        <li key={group.key}>
                          <button type="button" className="list-row list-button" onClick={() => setIds(group.makeups.map((makeup) => makeup.id))}>
                            <span className="dot" style={{ background: cls?.color }} />
                            <span className="list-text">
                              <span className="list-title">
                                {cls?.name} <span className="muted">{group.makeups.length}명 한 번에</span>
                              </span>
                              <span className="list-sub">{formatDate(first.missedOn)} 휴강분</span>
                              <span className="list-sub">{describeDeadline(first.deadline, todayStr)}</span>
                            </span>
                            <span className="badge makeup-pending">대기</span>
                          </button>
                        </li>
                      )
                    })}
                    {pending.map((makeup) => (
                      <li key={makeup.id}>
                        <MakeupRow makeup={makeup} onClick={() => setIds([makeup.id])} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="duo-col">
              <div className="home-section">
                <h2 className="section-heading">
                  잡아 둔 보강 <span className="muted">{scheduled.length}개</span>
                </h2>
                {scheduled.length === 0 ? (
                  <div className="card">
                    <p className="muted">날짜를 잡아 둔 보강이 없어요.</p>
                  </div>
                ) : (
                  <ul className="list" aria-label="잡아 둔 보강">
                    {scheduled.map((makeup) => (
                      <li key={makeup.id}>
                        <MakeupRow makeup={makeup} onClick={() => setIds([makeup.id])} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {past.length > 0 && (
                <details className="home-section">
                  <summary className="summary muted">끝난 보강 {past.length}개 (완료, 안 함, 기한 지남)</summary>
                  <ul className="list" aria-label="끝난 보강">
                    {past.slice(0, 50).map((makeup) => (
                      <li key={makeup.id}>
                        <MakeupRow makeup={makeup} onClick={() => setIds([makeup.id])} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
      <MakeupSheet ids={ids} onClose={() => setIds(null)} />
    </section>
  )
}
