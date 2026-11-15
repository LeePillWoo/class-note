import type { DateStr } from '../utils/date'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import type { Payment, PaymentKind, PaymentMethod } from './types'

/** 수강료를 받았을 때 적는 내용 */
export interface TuitionInput {
  studentId: string
  classId: string
  /** 이 돈으로 채워지는 수업 횟수 */
  sessions: number
  amount: number
  /** 받기로 한 날 (계산한 받을 날. 미리 받으면 받은 날과 같음) */
  dueOn: DateStr
  paidOn: DateStr
  method: PaymentMethod
  memo: string
}

/** 교재비 같은 추가 항목을 청구할 때 적는 내용 */
export interface ExtraInput {
  studentId: string
  classId?: string
  kind: Exclude<PaymentKind, 'tuition'>
  title: string
  amount: number
  dueOn: DateStr
  memo: string
  /** 이미 받았으면 받은 날과 방법 */
  paid?: { paidOn: DateStr; method: PaymentMethod }
}

export interface ReceivedInput {
  amount: number
  paidOn: DateStr
  method: PaymentMethod
  memo: string
  /** 수강료면 채워지는 횟수 */
  sessions?: number
}

/** 수강료 납부 기록 하나를 만듭니다. */
export function tuitionPayment(input: TuitionInput, id: string, now: string): Payment {
  return { id, kind: 'tuition', title: `${input.sessions}회분`, ...input, createdAt: now, updatedAt: now }
}

/** 납부 기록과 바꾸는 기능 */
export function usePayments() {
  const { data, apply } = useData()

  async function put(item: Payment) {
    await apply([{ type: 'put', collection: 'payments', item }])
  }

  /** 수강료를 받았다고 적습니다. 그 횟수만큼 남은 횟수가 채워집니다. */
  async function receiveTuition(input: TuitionInput) {
    await put(tuitionPayment(input, newId(), nowIso()))
  }

  /** 받은 기록을 고치거나, 청구해 둔 추가 항목을 받았다고 적습니다. */
  async function updatePayment(payment: Payment, patch: ReceivedInput) {
    const { sessions, ...fields } = patch
    await put({
      ...payment,
      ...fields,
      ...(payment.kind === 'tuition' && sessions ? { sessions, title: `${sessions}회분` } : {}),
      updatedAt: nowIso(),
    })
  }

  /** 교재비, 특강비 같은 추가 항목을 청구합니다. */
  async function addExtra(input: ExtraInput) {
    const now = nowIso()
    const { paid, ...fields } = input
    await put({ id: newId(), ...fields, ...(paid ?? {}), createdAt: now, updatedAt: now })
  }

  /** 추가 항목을 받지 않은 상태로 되돌립니다. */
  async function unreceive(payment: Payment) {
    const { paidOn: _paidOn, method: _method, ...rest } = payment
    await put({ ...rest, updatedAt: nowIso() })
  }

  /** 기록을 지웁니다. 수강료면 그 횟수만큼 남은 횟수가 다시 줄어듭니다. */
  async function removePayment(id: string) {
    await apply([{ type: 'remove', collection: 'payments', id }])
  }

  return { payments: data.payments, receiveTuition, updatePayment, addExtra, unreceive, removePayment }
}

/** 이 학생이 가장 최근에 낸 기록. 납부 창에서 방법을 미리 고르는 데 씁니다. */
export function latestPaid(payments: Payment[], studentId: string): Payment | undefined {
  return payments
    .filter((payment) => payment.studentId === studentId && payment.paidOn)
    .sort((a, b) => `${b.paidOn}${b.updatedAt}`.localeCompare(`${a.paidOn}${a.updatedAt}`))[0]
}

const METHOD_KEY = 'class-note:last-payment-method'

/** 마지막으로 쓴 납부 방법을 기억해 두었다가 다음 납부의 기본값으로 씁니다. */
export function rememberMethod(method: PaymentMethod) {
  try {
    localStorage.setItem(METHOD_KEY, method)
  } catch {
    // 저장이 막힌 환경이어도 납부 기록은 그대로 됩니다.
  }
}

export function lastMethod(): PaymentMethod {
  let value: string | null = null
  try {
    value = localStorage.getItem(METHOD_KEY)
  } catch {
    // 못 읽으면 기본값
  }
  return value === 'card' || value === 'transfer' || value === 'cash' || value === 'other' ? value : 'transfer'
}
