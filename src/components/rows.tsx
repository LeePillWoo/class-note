import type { CSSProperties, ReactNode } from 'react'
import { useData } from '../data/DataProvider'
import { BILLING_LABELS, describeFee, perSessionText } from '../data/rules'
import { MAKEUP_REASON_LABELS, MAKEUP_STATE_LABELS, describeDeadline, makeupState } from '../data/makeupRules'
import { DUE_STATUS_LABELS, PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, bundleProgress, describeRemaining, isBehind, type DueView, type TuitionState } from '../data/tuition'
import type { ClassGroup, Makeup, Payment } from '../data/types'
import { formatDate, today } from '../utils/date'
import { formatFee } from '../utils/money'

// 여러 화면(홈, 학생, 수업, 보강, 납부)에서 같이 쓰는 목록 한 줄들

/** 목록에 보여줄 수업 이름: 그룹은 수업 이름, 1:1은 '1:1 레슨' */
function lessonLabel(cls: ClassGroup): string {
  return cls.kind === 'solo' ? '1:1 레슨' : cls.name
}

/** 수강료 진행 한 줄: 남은 횟수와 막대, 다음 받을 날. onClick이 있으면 누르는 줄(수강료 받기 창)이 됩니다. */
export function TuitionRow({ state, label, onClick }: { state: TuitionState; label: ReactNode; onClick?(): void }) {
  const todayStr = today()
  const { filled, size } = bundleProgress(state)
  const behind = isBehind(state, todayStr)
  const next = state.dues[0]
  let when = ''
  if (next) {
    if (next.dueOn < todayStr) when = `받을 날 ${formatDate(next.dueOn)} 지남`
    else if (next.dueOn === todayStr) when = '오늘 받을 날'
    else when = `다음 받을 날 ${formatDate(next.dueOn)}`
  }
  const per = perSessionText(state.fee)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag {...(onClick ? { type: 'button' as const, onClick } : {})} className={onClick ? 'tuition is-button' : 'tuition'}>
      <span className="tuition-name">{label}</span>
      <span className={behind ? 'tuition-count is-behind' : 'tuition-count'}>{describeRemaining(state)}</span>
      <span className={behind ? 'progress is-behind' : 'progress'} role="img" aria-label={`${size}회 중 ${filled}회`}>
        <span style={{ transform: `scaleX(${filled / size})` } as CSSProperties} />
      </span>
      <span className="tuition-meta">
        <span>{describeFee(state.fee)}{per && ` · ${per}`} · {BILLING_LABELS[state.billing]}</span>
        {when && <span className={behind ? 'is-behind' : undefined}>{when}</span>}
      </span>
      {state.undecidedMakeups > 0 && <span className="tuition-note">보강 {state.undecidedMakeups}건에 따라 달라져요</span>}
    </Tag>
  )
}

/** 보강 한 줄. 누르면 보강 창이 열립니다. */
export function MakeupRow({ makeup, onClick, showStudent = true }: { makeup: Makeup; onClick(): void; showStudent?: boolean }) {
  const { index } = useData()
  const todayStr = today()
  const student = index.students.get(makeup.studentId)
  const cls = index.classes.get(makeup.classId)
  const state = makeupState(makeup, todayStr)
  const missed = `${formatDate(makeup.missedOn)} ${MAKEUP_REASON_LABELS[makeup.reason]}`
  let plan: string
  if (makeup.scheduledOn) {
    const join = makeup.joinClassId && makeup.joinClassId !== makeup.classId ? index.classes.get(makeup.joinClassId)?.name : undefined
    plan = `${formatDate(makeup.scheduledOn)} ${makeup.start ?? ''}${join ? ` ${join} 수업에 같이` : ''}`
    if (state === 'scheduled' && makeup.scheduledOn < todayStr) plan += ' (날짜 지남)'
  } else if (state === 'skipped') {
    plan = '하지 않기로 했어요'
  } else {
    plan = describeDeadline(makeup.deadline, todayStr)
  }
  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
      <span className="dot" style={{ background: cls?.color }} />
      <span className="list-text">
        <span className="list-title">
          {showStudent ? student?.name : cls && lessonLabel(cls)} {showStudent && cls && <span className="muted">{lessonLabel(cls)}</span>}
        </span>
        <span className="list-sub">{missed}분</span>
        <span className="list-sub">{plan}</span>
      </span>
      <span className={`badge makeup-${state}`}>{MAKEUP_STATE_LABELS[state]}</span>
    </button>
  )
}

/** 받을 돈 한 줄. 누르면 받았다고 적는 창이 열립니다. */
export function DueRow({ due, onClick, showStudent = true }: { due: DueView; onClick(): void; showStudent?: boolean }) {
  const { index } = useData()
  const student = index.students.get(due.studentId)
  const cls = due.classId ? index.classes.get(due.classId) : undefined
  const what = due.kind === 'tuition' ? `수강료 ${due.title}` : `${PAYMENT_KIND_LABELS[due.kind]}${due.title ? ` ${due.title}` : ''}`
  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
      <span className="dot" style={{ background: cls?.color ?? 'var(--color-border)' }} />
      <span className="list-text">
        {showStudent ? (
          <>
            <span className="list-title">
              {student?.name} {cls && <span className="muted">{lessonLabel(cls)}</span>}
            </span>
            <span className="list-sub">{what}</span>
          </>
        ) : (
          <span className="list-title">
            {what} {cls?.kind === 'group' && <span className="muted">{cls.name}</span>}
          </span>
        )}
        <span className="list-sub">{formatDate(due.dueOn)}</span>
      </span>
      <span className="amount-col">
        <span className="amount">{formatFee(due.amount)}</span>
        <span className={`badge due-${due.status}`}>{DUE_STATUS_LABELS[due.status]}</span>
      </span>
    </button>
  )
}

/** 받은 돈 한 줄. 누르면 고치거나 지우는 창이 열립니다. */
export function PaidRow({ payment, onClick, showStudent = true }: { payment: Payment; onClick(): void; showStudent?: boolean }) {
  const { index } = useData()
  const student = index.students.get(payment.studentId)
  const cls = payment.classId ? index.classes.get(payment.classId) : undefined
  const what = payment.kind === 'tuition' ? `수강료 ${payment.title}` : `${PAYMENT_KIND_LABELS[payment.kind]}${payment.title ? ` ${payment.title}` : ''}`
  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
      <span className="dot" style={{ background: cls?.color ?? 'var(--color-border)' }} />
      <span className="list-text">
        {showStudent ? (
          <>
            <span className="list-title">
              {student?.name} {cls && <span className="muted">{lessonLabel(cls)}</span>}
            </span>
            <span className="list-sub">{what}</span>
          </>
        ) : (
          <span className="list-title">
            {what} {cls?.kind === 'group' && <span className="muted">{cls.name}</span>}
          </span>
        )}
        <span className="list-sub">
          {payment.paidOn && formatDate(payment.paidOn)}
          {payment.method && `, ${PAYMENT_METHOD_LABELS[payment.method]}`}
          {payment.memo && `, ${payment.memo}`}
        </span>
      </span>
      <span className="amount-col">
        <span className="amount">{formatFee(payment.amount)}</span>
        <span className="badge due-paid">받음</span>
      </span>
    </button>
  )
}
