import type { DateStr, TimeStr } from '../utils/date'
import { useData } from './DataProvider'
import { nowIso } from './id'
import type { Change, Database, Makeup } from './types'

/** 보강을 언제 할지 */
export interface MakeupPlan {
  date: DateStr
  start: TimeStr
  end: TimeStr
  /** 다른 수업 시간에 같이 듣게 하면 그 반 */
  joinClassId?: string
}

/** 예정 날짜와 시각을 뺀 보강. 예정을 취소할 때 씁니다. */
export function withoutPlan(makeup: Makeup): Makeup {
  const { scheduledOn: _scheduledOn, start: _start, end: _end, joinClassId: _joinClassId, ...rest } = makeup
  return rest
}

export function withPlan(makeup: Makeup, plan: MakeupPlan): Makeup {
  return {
    ...withoutPlan(makeup),
    scheduledOn: plan.date,
    start: plan.start,
    end: plan.end,
    ...(plan.joinClassId ? { joinClassId: plan.joinClassId } : {}),
  }
}

/** 여러 보강을 한 번에 고칩니다. (휴강 보강은 반 학생 모두를 같은 날로 잡는 일이 많아서) */
function editMany(db: Database, ids: string[], edit: (makeup: Makeup) => Makeup, now: string): Change[] {
  return db.makeups
    .filter((makeup) => ids.includes(makeup.id))
    .map((makeup): Change => ({ type: 'put', collection: 'makeups', item: { ...edit(makeup), updatedAt: now } }))
}

/** 보강 목록과 보강을 바꾸는 기능 */
export function useMakeups() {
  const { data, update } = useData()

  return {
    makeups: data.makeups,
    /** 보강 날짜를 잡거나 바꿉니다. (예정) */
    schedule: (ids: string[], plan: MakeupPlan, memo: string) =>
      update((db) => editMany(db, ids, (makeup) => ({ ...withPlan(makeup, plan), status: 'open', memo }), nowIso())),
    /** 예정을 취소합니다. (대기로) */
    unschedule: (ids: string[]) => update((db) => editMany(db, ids, (makeup) => ({ ...withoutPlan(makeup), status: 'open' }), nowIso())),
    /** 보강을 했다고 적습니다. 그날 수업으로 세고 달력에도 보입니다. */
    complete: (ids: string[], plan: MakeupPlan, memo: string) =>
      update((db) => editMany(db, ids, (makeup) => ({ ...withPlan(makeup, plan), status: 'done', memo }), nowIso())),
    /** 완료를 취소합니다. (날짜는 그대로 둔 예정으로) */
    uncomplete: (ids: string[]) => update((db) => editMany(db, ids, (makeup) => ({ ...makeup, status: 'open' }), nowIso())),
    /** 보강을 하지 않기로 합니다. */
    skip: (ids: string[], memo: string) =>
      update((db) => editMany(db, ids, (makeup) => ({ ...withoutPlan(makeup), status: 'skipped', memo }), nowIso())),
    /** '보강 안 함'을 되돌립니다. (대기로) */
    reopen: (ids: string[]) => update((db) => editMany(db, ids, (makeup) => ({ ...makeup, status: 'open' }), nowIso())),
  }
}
