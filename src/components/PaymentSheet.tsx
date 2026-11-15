import { useState } from 'react'
import { useData } from '../data/DataProvider'
import { lastMethod, latestPaid, rememberMethod, usePayments } from '../data/payments'
import { describeFee } from '../data/rules'
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, describeRemaining, tuitionState, type DueView } from '../data/tuition'
import type { Payment, PaymentKind, PaymentMethod, Student } from '../data/types'
import { formatDate, today, type DateStr } from '../utils/date'
import { formatNumber, parseAmount } from '../utils/money'
import AmountInput from './AmountInput'
import DateField from './DateField'
import Segmented from './Segmented'
import Sheet from './Sheet'

export const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

/** 납부 창에서 다룰 것 */
export type PaymentTarget =
  /** 수강료 받기. dueOn이 있으면 계산한 받을 날의 수강료, 없으면 미리 받기 */
  | { type: 'tuition'; studentId: string; classId: string; dueOn?: DateStr }
  /** 저장된 기록: 받은 수강료를 고치거나, 청구해 둔 교재비 등을 받기 */
  | { type: 'record'; paymentId: string }
  /** 교재비, 특강비 같은 추가 항목 청구하기. studentId가 있으면 그 학생으로 */
  | { type: 'extra'; studentId?: string }

/** 받을 돈 한 줄을 눌렀을 때 열 창: 계산한 수강료면 받기, 청구해 둔 추가 항목이면 그 기록 */
export function paymentTargetOf(due: DueView): PaymentTarget {
  if (due.record) return { type: 'record', paymentId: due.record.id }
  return { type: 'tuition', studentId: due.studentId, classId: due.classId ?? '', dueOn: due.dueOn }
}

interface PaymentSheetProps {
  target: PaymentTarget | null
  onClose(): void
}

/** 받은 돈을 적는 창 */
export default function PaymentSheet({ target, onClose }: PaymentSheetProps) {
  const { data } = useData()
  const record = target?.type === 'record' ? data.payments.find((payment) => payment.id === target.paymentId) : undefined
  return (
    <Sheet open={target !== null} onClose={onClose} label="납부">
      {target?.type === 'tuition' && (
        <TuitionEditor key={`${target.studentId}|${target.classId}|${target.dueOn ?? ''}`} target={target} onDone={onClose} />
      )}
      {record && <RecordEditor key={record.id} payment={record} onDone={onClose} />}
      {target?.type === 'extra' && <ExtraEditor key={target.studentId ?? 'new'} studentId={target.studentId} onDone={onClose} />}
    </Sheet>
  )
}

function useRun(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function TuitionEditor({ target, onDone }: { target: Extract<PaymentTarget, { type: 'tuition' }>; onDone(): void }) {
  const { index, data } = useData()
  const { receiveTuition } = usePayments()
  const { busy, error, run } = useRun(onDone)
  const todayStr = today()
  const student = index.students.get(target.studentId)
  const cls = index.classes.get(target.classId)
  const state = tuitionState(index, target.studentId, target.classId, todayStr)
  const fee = state?.fee ?? { amount: 0, sessionCount: 1 }

  const [sessionsText, setSessionsText] = useState(String(fee.sessionCount))
  const [amountText, setAmountText] = useState(fee.amount ? formatNumber(fee.amount) : '')
  const [paidOn, setPaidOn] = useState<DateStr>(todayStr)
  const [method, setMethod] = useState<PaymentMethod>(latestPaid(data.payments, target.studentId)?.method ?? lastMethod())
  const [memo, setMemo] = useState('')

  if (!student || !cls || !state) return null
  const sessions = Number(sessionsText)
  const validSessions = Number.isInteger(sessions) && sessions >= 1 && sessions <= 999
  const amount = parseAmount(amountText)

  /** 횟수를 바꾸면 금액도 같은 비율로 맞춥니다. (8회 16만 원인 반에서 16회를 받으면 32만 원) */
  function changeSessions(text: string) {
    const digits = text.replace(/[^\d]/g, '').slice(0, 3)
    setSessionsText(digits)
    const count = Number(digits)
    if (count >= 1 && fee.amount > 0) setAmountText(formatNumber(Math.round((fee.amount * count) / fee.sessionCount)))
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">
          <span className="dot" style={{ background: cls.color }} />
          {student.name} 수강료
        </h2>
        <p className="muted">
          {cls.name}, {describeFee(fee)}
        </p>
        <p className="muted">
          지금 {describeRemaining(state)}
          {target.dueOn ? `, 받을 날 ${formatDate(target.dueOn)}` : ', 미리 받는 수강료'}
        </p>
      </div>

      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor="payment-sessions">횟수</label>
          <div className="count-input">
            <input id="payment-sessions" className="input" inputMode="numeric" autoComplete="off" value={sessionsText}
              aria-invalid={!validSessions} onChange={(event) => changeSessions(event.target.value)} />
            <span className="unit">회분</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="payment-amount">금액</label>
          <AmountInput id="payment-amount" value={amountText} onChange={setAmountText} placeholder="예: 160,000" />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-paid-on">받은 날</label>
        <DateField id="payment-paid-on" label="받은 날" value={paidOn} onChange={setPaidOn} />
      </div>
      <div className="field">
        <span className="field-label">방법</span>
        <Segmented<PaymentMethod> label="납부 방법" name="payment-method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-memo">메모 (선택)</label>
        <input id="payment-memo" className="input" value={memo} maxLength={100} autoComplete="off"
          placeholder="예: 형제 할인" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || !validSessions || amount === null}
          onClick={() =>
            amount !== null &&
            run(async () => {
              rememberMethod(method)
              await receiveTuition({
                studentId: target.studentId,
                classId: target.classId,
                sessions,
                amount,
                dueOn: target.dueOn ?? paidOn,
                paidOn,
                method,
                memo: memo.trim(),
              })
            })
          }>
          받았어요
        </button>
      </div>
    </>
  )
}

/** 저장된 기록: 받은 것은 고치거나 지우고, 아직 못 받은 추가 항목은 받았다고 적습니다. */
function RecordEditor({ payment, onDone }: { payment: Payment; onDone(): void }) {
  const { index } = useData()
  const { updatePayment, unreceive, removePayment } = usePayments()
  const { busy, error, run } = useRun(onDone)
  const student = index.students.get(payment.studentId)
  const cls = payment.classId ? index.classes.get(payment.classId) : undefined
  const paid = Boolean(payment.paidOn)
  const tuition = payment.kind === 'tuition'

  const [sessionsText, setSessionsText] = useState(String(payment.sessions ?? ''))
  const [amountText, setAmountText] = useState(payment.amount ? formatNumber(payment.amount) : '')
  const [paidOn, setPaidOn] = useState<DateStr>(payment.paidOn ?? today())
  const [method, setMethod] = useState<PaymentMethod>(payment.method ?? lastMethod())
  const [memo, setMemo] = useState(payment.memo)

  const sessions = Number(sessionsText)
  const validSessions = !tuition || (Number.isInteger(sessions) && sessions >= 1 && sessions <= 999)
  const amount = parseAmount(amountText)
  const name = tuition ? `수강료 ${payment.title}` : `${PAYMENT_KIND_LABELS[payment.kind]}${payment.title ? ` ${payment.title}` : ''}`

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">
          {cls && <span className="dot" style={{ background: cls.color }} />}
          {student?.name} {name}
        </h2>
        <p className="muted">
          {cls && `${cls.name}, `}
          {paid ? `${formatDate(payment.paidOn!)}에 받음` : `받기로 한 날 ${formatDate(payment.dueOn)}`}
        </p>
      </div>

      <div className="field-pair">
        {tuition && (
          <div className="field">
            <label className="field-label" htmlFor="payment-sessions">횟수</label>
            <div className="count-input">
              <input id="payment-sessions" className="input" inputMode="numeric" autoComplete="off" value={sessionsText}
                aria-invalid={!validSessions} onChange={(event) => setSessionsText(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
              <span className="unit">회분</span>
            </div>
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor="payment-amount">금액</label>
          <AmountInput id="payment-amount" value={amountText} onChange={setAmountText} />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-paid-on">받은 날</label>
        <DateField id="payment-paid-on" label="받은 날" value={paidOn} onChange={setPaidOn} />
      </div>
      <div className="field">
        <span className="field-label">방법</span>
        <Segmented<PaymentMethod> label="납부 방법" name="payment-method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-memo">메모 (선택)</label>
        <input id="payment-memo" className="input" value={memo} maxLength={100} autoComplete="off" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || !validSessions || amount === null}
          onClick={() =>
            amount !== null &&
            run(async () => {
              rememberMethod(method)
              await updatePayment(payment, { amount, paidOn, method, memo: memo.trim(), sessions: tuition ? sessions : undefined })
            })
          }>
          {paid ? '고친 내용 저장' : '받았어요'}
        </button>
      </div>
      <div className="link-actions">
        {paid && !tuition && (
          <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => unreceive(payment))}>
            받은 것 취소
          </button>
        )}
        <button type="button" className="link-btn is-danger" disabled={busy}
          onClick={() => {
            const message = tuition
              ? `${student?.name} ${name} 기록을 지울까요? 남은 횟수가 ${payment.sessions ?? 0}회 줄어들어요.`
              : `${student?.name} ${name} 항목을 지울까요?`
            if (window.confirm(message)) void run(() => removePayment(payment.id))
          }}>
          {tuition ? '받은 기록 지우기' : '항목 지우기'}
        </button>
      </div>
    </>
  )
}

type ExtraKind = Exclude<PaymentKind, 'tuition'>

const EXTRA_KIND_OPTIONS: { value: ExtraKind; label: string }[] = [
  { value: 'textbook', label: PAYMENT_KIND_LABELS.textbook },
  { value: 'special', label: PAYMENT_KIND_LABELS.special },
  { value: 'other', label: PAYMENT_KIND_LABELS.other },
]

/** 교재비, 특강비 같은 추가 항목을 청구합니다. */
function ExtraEditor({ studentId, onDone }: { studentId?: string; onDone(): void }) {
  const { data } = useData()
  const { addExtra } = usePayments()
  const { busy, error, run } = useRun(onDone)
  const students = [...data.students].sort((a: Student, b: Student) => a.name.localeCompare(b.name, 'ko'))

  const [who, setWho] = useState(studentId ?? '')
  const [kind, setKind] = useState<ExtraKind>('textbook')
  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueOn, setDueOn] = useState<DateStr>(today())
  const [received, setReceived] = useState(false)
  const [memo, setMemo] = useState('')
  const amount = parseAmount(amountText)

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">추가 항목 청구</h2>
        <p className="muted">교재비, 특강비처럼 수강료와 따로 받는 돈이에요.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-student">학생</label>
        <select id="extra-student" className="input" value={who} onChange={(event) => setWho(event.target.value)}>
          <option value="">학생을 고르세요</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <span className="field-label">종류</span>
        <Segmented<ExtraKind> label="종류" name="extra-kind" value={kind} onChange={setKind} options={EXTRA_KIND_OPTIONS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-title">이름 (선택)</label>
        <input id="extra-title" className="input" value={title} maxLength={40} autoComplete="off" placeholder="예: 우쿨렐레 교본 1권"
          onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-amount">금액</label>
        <AmountInput id="extra-amount" value={amountText} onChange={setAmountText} placeholder="예: 15,000" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-due">{received ? '받은 날' : '받기로 한 날'}</label>
        <DateField id="extra-due" label={received ? '받은 날' : '받기로 한 날'} value={dueOn} onChange={setDueOn} />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={received} onChange={(event) => setReceived(event.target.checked)} />
        이미 받았어요
      </label>
      <div className="field">
        <label className="field-label" htmlFor="extra-memo">메모 (선택)</label>
        <input id="extra-memo" className="input" value={memo} maxLength={100} autoComplete="off" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || !who || amount === null}
          onClick={() =>
            amount !== null &&
            run(() =>
              addExtra({
                studentId: who,
                kind,
                title: title.trim(),
                amount,
                dueOn,
                memo: memo.trim(),
                paid: received ? { paidOn: dueOn, method: lastMethod() } : undefined,
              }),
            )
          }>
          청구하기
        </button>
      </div>
    </>
  )
}
