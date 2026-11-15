import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import { ABSENCE_COUNTING_HINTS, ABSENCE_COUNTING_LABELS, BILLING_HINTS, BILLING_LABELS } from '../../data/rules'
import { useSettings } from '../../data/settings'
import { PAYMENT_METHOD_LABELS } from '../../data/tuition'
import type { AbsenceCounting, Billing, MakeupWindow, PaymentMethod } from '../../data/types'
import { isValidTime } from '../../utils/date'

// 설정 > 기본 규칙의 화면들. 바꾸면 바로 저장합니다.

function SavedNote() {
  return <p className="muted saved-note">바꾸면 바로 저장돼요</p>
}

/** 수강료 납부: 새 수업의 수강료 횟수, 받는 때, 납부 창에서 먼저 고를 방법 */
export function FeeSettingsPage() {
  const { settings, save } = useSettings()
  const [countText, setCountText] = useState(String(settings.sessionCount))
  return (
    <section className="narrow">
      <PageHeader title="수강료 납부" subtitle="새 수업을 만들 때의 기본값이에요. 수업마다 바꿀 수 있어요" backTo="/settings" />
      <div className="card form-section">
        <div className="field">
          <label className="field-label" htmlFor="rule-count">수강료 횟수</label>
          <div className="input-with-unit narrow-input">
            <input id="rule-count" className="input" inputMode="numeric" autoComplete="off" value={countText}
              onChange={(event) => {
                const text = event.target.value.replace(/[^\d]/g, '').slice(0, 2)
                setCountText(text)
                const count = Number(text)
                if (count >= 1 && count <= 99) void save({ sessionCount: count })
              }} />
            <span className="unit">회</span>
          </div>
        </div>
        <div className="field">
          <span className="field-label">받는 때</span>
          <Segmented<Billing>
            label="수강료 받는 때"
            name="rule-billing"
            value={settings.billing}
            onChange={(billing) => void save({ billing })}
            options={[
              { value: 'prepaid', label: BILLING_LABELS.prepaid },
              { value: 'postpaid', label: BILLING_LABELS.postpaid },
            ]}
          />
          <p className="muted">{BILLING_HINTS[settings.billing]}</p>
        </div>
        <div className="field">
          <span className="field-label">납부 방법</span>
          <Segmented<PaymentMethod>
            label="먼저 고를 납부 방법"
            name="rule-method"
            value={settings.method}
            onChange={(method) => void save({ method })}
            options={(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))}
          />
          <p className="muted">수강료를 받을 때 이 방법이 먼저 골라져 있어요</p>
        </div>
      </div>
      <SavedNote />
    </section>
  )
}

const MINUTES = [30, 40, 50, 60, 90]

/** 수업·학생 추가: 새 1:1 레슨·그룹 수업의 기본 시작 시각과 수업 시간 */
export function LessonSettingsPage() {
  const { settings, save } = useSettings()
  const [start, setStart] = useState(settings.lessonStart)
  return (
    <section className="narrow">
      <PageHeader title="수업·학생 추가" subtitle="1:1 레슨이나 그룹 수업을 새로 만들 때, 요일을 고르면 이 시간이 먼저 채워져요" backTo="/settings" />
      <div className="card form-section">
        <div className="field-pair">
          <div className="field">
            <label className="field-label" htmlFor="rule-start">시작 시각</label>
            <input id="rule-start" type="time" className="input time-input" step={300} value={start}
              onChange={(event) => {
                setStart(event.target.value)
                if (isValidTime(event.target.value)) void save({ lessonStart: event.target.value })
              }} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rule-minutes">수업 시간</label>
            <select id="rule-minutes" className="input" value={settings.lessonMinutes} onChange={(event) => void save({ lessonMinutes: Number(event.target.value) })}>
              {MINUTES.map((minutes) => (
                <option key={minutes} value={minutes}>{minutes}분</option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted">수강료 횟수와 받는 때는 '수강료 납부'에서 정해요</p>
      </div>
      <SavedNote />
    </section>
  )
}

const WINDOW_OPTIONS: { value: string; label: string; window: MakeupWindow }[] = [
  { value: 'none', label: '기한 없음', window: { type: 'none' } },
  { value: 'days:7', label: '빠진 날부터 7일 안', window: { type: 'days', days: 7 } },
  { value: 'days:14', label: '빠진 날부터 14일 안', window: { type: 'days', days: 14 } },
  { value: 'days:30', label: '빠진 날부터 30일 안', window: { type: 'days', days: 30 } },
  { value: 'sameMonth', label: '같은 달 안', window: { type: 'sameMonth' } },
  { value: 'nextMonthEnd', label: '다음 달 말까지', window: { type: 'nextMonthEnd' } },
]

function windowValue(window: MakeupWindow): string {
  return window.type === 'days' ? `days:${window.days}` : window.type
}

const COUNTING_ORDER: AbsenceCounting[] = ['never', 'ifNoMakeup', 'always']

/** 출결·보강: 결석한 수업을 세는 방법, 보강 대상과 기한 (모든 수업에 함께 적용) */
export function AttendanceSettingsPage() {
  const { settings, save } = useSettings()
  const rule = settings.makeupRule
  return (
    <section className="narrow">
      <PageHeader title="출결·보강" subtitle="모든 수업에 함께 적용돼요" backTo="/settings" />
      <div className="card form-section">
        <fieldset className="field">
          <legend className="field-label">결석한 수업</legend>
          {COUNTING_ORDER.map((value) => (
            <label key={value} className="pick-row">
              <input type="radio" name="rule-counting" checked={settings.absenceCounting === value} onChange={() => void save({ absenceCounting: value })} />
              <span className="pick-text">
                <span className="pick-name">{ABSENCE_COUNTING_LABELS[value]}</span>
                {settings.absenceCounting === value && <span className="muted">{ABSENCE_COUNTING_HINTS[value]}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="card form-section">
        <fieldset className="field">
          <legend className="field-label">보강</legend>
          <label className="check-row">
            <input type="checkbox" checked={rule.forAbsence} onChange={(event) => void save({ makeupRule: { ...rule, forAbsence: event.target.checked } })} />
            결석하면 보강
          </label>
          <label className="check-row">
            <input type="checkbox" checked={rule.forCancellation} onChange={(event) => void save({ makeupRule: { ...rule, forCancellation: event.target.checked } })} />
            휴강하면 보강
          </label>
        </fieldset>
        <div className="field">
          <label className="field-label" htmlFor="rule-window">보강 기한</label>
          <select id="rule-window" className="input" value={windowValue(rule.window)}
            onChange={(event) => {
              const option = WINDOW_OPTIONS.find((item) => item.value === event.target.value)
              if (option) void save({ makeupRule: { ...rule, window: option.window } })
            }}>
            {WINDOW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="muted">바꾼 규칙은 앞으로 생기는 보강부터 적용돼요</p>
        </div>
      </div>
      <SavedNote />
    </section>
  )
}
