import { useMemo, useState } from 'react'
import { BackIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import PaymentSheet, { paymentTargetOf, type PaymentTarget } from '../components/PaymentSheet'
import { DueRow, PaidRow, TuitionRow } from '../components/rows'
import { useData } from '../data/DataProvider'
import { allTuitionStates, dueNowOn, dueViews, paidInMonth, sumAmounts } from '../data/tuition'
import { addDays, addMonths, dateParts, endOfMonth, startOfMonth, today } from '../utils/date'
import { formatWon } from '../utils/money'

/**
 * 납부: 받을 돈(밀린 것과 곧 받을 것), 학생마다 남은 횟수, 달마다 받은 돈.
 * 수강료는 횟수로 세므로 "남은 횟수"가 0이 되는 다음 수업 날이 받을 날입니다.
 */
export default function PaymentsPage() {
  const { data, index } = useData()
  const todayStr = today()
  const [month, setMonth] = useState(() => startOfMonth(todayStr))
  const [target, setTarget] = useState<PaymentTarget | null>(null)

  const states = useMemo(() => allTuitionStates(index, todayStr), [index, todayStr])
  // 받을 날이 지났거나 일주일 안인 것
  const dues = useMemo(() => dueViews(index, states, addDays(todayStr, 7), todayStr), [index, states, todayStr])
  const overdue = dues.filter((due) => due.status !== 'upcoming')
  // 이번 달 말까지 더 받을 예정인 것
  const upcoming = useMemo(
    () => dueViews(index, states, endOfMonth(todayStr), todayStr).filter((due) => due.status === 'upcoming'),
    [index, states, todayStr],
  )
  const paid = useMemo(() => paidInMonth(data.payments, month.slice(0, 7)), [data.payments, month])
  const current = states.filter((state) => state.current)

  const { year, month: monthNumber } = dateParts(month)
  const thisMonth = month === startOfMonth(todayStr)

  return (
    <section>
      <PageHeader
        title="납부"
        subtitle="수강료는 횟수로 세요. 남은 횟수를 다 쓰면 받을 날이에요."
        actions={
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setTarget({ type: 'extra' })}>
            <PlusIcon />
            추가 청구
          </button>
        }
      />

      {data.students.length === 0 ? (
        <div className="card narrow">
          <p className="muted">학생을 반에 넣으면 수강료와 남은 횟수가 여기에 보여요.</p>
        </div>
      ) : (
        <div className="duo">
          <div className="duo-cols">
            <div className="duo-col">
              <div className="card">
                <dl className="stats">
                  <div>
                    <dt>지금 받을 돈</dt>
                    <dd className={overdue.length > 0 ? 'is-due' : undefined}>{formatWon(sumAmounts(overdue))}</dd>
                  </div>
                  <div>
                    <dt>이달 더 받을 돈</dt>
                    <dd>{formatWon(sumAmounts(upcoming))}</dd>
                  </div>
                  <div>
                    <dt>{thisMonth ? '이달' : `${monthNumber}월`} 받은 돈</dt>
                    <dd>{formatWon(sumAmounts(paid))}</dd>
                  </div>
                </dl>
              </div>

              <div className="block">
                <h2 className="block-title">
                  받을 돈 <span className="count">{dues.length}</span>
                </h2>
                {dues.length === 0 ? (
                  <p className="empty-line">일주일 안에 받을 돈이 없어요</p>
                ) : (
                  <ul className="list" aria-label="받을 돈">
                    {dues.map((due) => (
                      <li key={due.key}>
                        <DueRow due={due} onClick={() => setTarget(paymentTargetOf(due))} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="block">
                <h2 className="block-title">받은 돈</h2>
                <div className="card">
                  <div className="cal-toolbar">
                      <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
                        <BackIcon />
                      </button>
                      <strong className="cal-title">{year}년 {monthNumber}월</strong>
                      <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달" disabled={thisMonth}>
                        <ChevronRightIcon />
                      </button>
                    <span className="amount cal-meta">{formatWon(sumAmounts(paid))}</span>
                  </div>
                </div>
                {paid.length === 0 ? (
                  <p className="empty-line">{monthNumber}월에 받은 돈이 없어요</p>
                ) : (
                  <ul className="list" aria-label="받은 돈">
                    {paid.map((payment) => (
                      <li key={payment.id}>
                        <PaidRow payment={payment} onClick={() => setTarget({ type: 'record', paymentId: payment.id })} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="duo-col">
              <div className="block">
                <h2 className="block-title">
                  남은 횟수 <span className="count">{current.length}</span>
                </h2>
                {current.length === 0 ? (
                  <p className="empty-line">수업에 넣은 학생이 없어요</p>
                ) : (
                  <ul className="list" aria-label="남은 횟수">
                    {current.map((state) => {
                      const student = index.students.get(state.studentId)
                      const cls = index.classes.get(state.classId)
                      return (
                        <li key={`${state.studentId}|${state.classId}`}>
                          <TuitionRow
                            state={state}
                            label={<>{student?.name} <span className="muted">{cls?.kind === 'solo' ? '1:1 레슨' : cls?.name}</span></>}
                            onClick={() => setTarget({ type: 'tuition', studentId: state.studentId, classId: state.classId, dueOn: dueNowOn(state, todayStr) })}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="muted">학생을 누르면 수강료를 받은 것으로 적어요. 받을 날 전에 미리 받아도 돼요.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <PaymentSheet target={target} onClose={() => setTarget(null)} />
    </section>
  )
}
