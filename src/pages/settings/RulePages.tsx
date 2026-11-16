import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import { ABSENCE_COUNTING_HINTS, ABSENCE_COUNTING_LABELS, BILLING_HINTS, BILLING_LABELS } from '../../data/rules'
import { lessonLengths, snapLength, snapTime, useSettings } from '../../data/settings'
import { PAYMENT_METHOD_LABELS } from '../../data/tuition'
import type { AbsenceCounting, Billing, MakeupWindow, PaymentMethod, TimeStep } from '../../data/types'
import TimeSelect, { lengthLabel } from '../../components/TimeSelect'

// 설정 > 기본 규칙의 화면들. 바꾸면 바로 저장합니다.

export function SavedNote() {
  return <p className="muted saved-note">바꾸면 바로 저장돼요</p>
}

const STEP_LABELS: Record<TimeStep, string> = { 60: '정각', 30: '30분', 10: '10분' }

/** 수업 기본값: 새 수업의 시각 단위, 시작 시각, 수업 시간 */
export function LessonDefaultsPage() {
  const { settings, save } = useSettings()
  return (
    <section className="narrow">
      <PageHeader title="수업 기본값" subtitle="새 수업을 만들 때 먼저 채워지는 값이에요. 수업마다 바꿀 수 있어요" backTo="/settings" />
      <div className="card form-section">
        <h2 className="section-title">수업 시간</h2>
        <div className="field">
          <span className="field-label">시각 단위</span>
          <Segmented<string>
            label="시각 단위"
            name="rule-step"
            value={String(settings.timeStep)}
            onChange={(value) => {
              const timeStep = Number(value) as TimeStep
              // 바꾼 단위에 맞게 기본 시작 시각과 수업 시간도 맞춥니다.
              void save({ timeStep, lessonStart: snapTime(settings.lessonStart, timeStep), lessonMinutes: snapLength(settings.lessonMinutes, timeStep) })
            }}
            options={([60, 30, 10] as TimeStep[]).map((step) => ({ value: String(step), label: STEP_LABELS[step] }))}
          />
          <p className="muted">
            {settings.timeStep === 60 ? '수업은 정각에 시작해 정각에 끝나요. (예: 오후 4:00 ~ 5:00)' : `시각을 ${settings.timeStep}분마다 고를 수 있어요`}
          </p>
        </div>
        <div className="field-pair">
          <div className="field">
            <label className="field-label" htmlFor="rule-start">시작 시각</label>
            <TimeSelect id="rule-start" label="시작 시각" value={settings.lessonStart} onChange={(value) => void save({ lessonStart: value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rule-minutes">수업 시간</label>
            <select id="rule-minutes" className="input" value={settings.lessonMinutes} onChange={(event) => void save({ lessonMinutes: Number(event.target.value) })}>
              {lessonLengths(settings.timeStep).map((minutes) => (
                <option key={minutes} value={minutes}>{lengthLabel(minutes)}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted">요일을 고르면 이 시각이 먼저 채워지고, 끝 시각은 수업 시간만큼 뒤로 맞춰져요</p>
      </div>
      <SavedNote />
    </section>
  )
}

/** 납부 관리: 납부 기능을 켜고 끄기, 켰을 때 새 수업의 수강료 횟수·받는 때·먼저 고를 납부 방법 */
export function PaymentSettingsPage() {
  const { settings, save } = useSettings()
  const [countText, setCountText] = useState(String(settings.sessionCount))
  const enabled = settings.paymentsEnabled
  return (
    <section className="narrow">
      <PageHeader title="납부 관리" subtitle="처음에는 출결만 관리해요. 수강료와 납부도 함께 관리하려면 켜 주세요" backTo="/settings" />
      <div className="card form-section">
        <label className="switch-row">
          <span className="pick-text">
            <span className="pick-name">납부 기능 쓰기</span>
            <span className="muted">
              {enabled
                ? '납부 메뉴, 홈의 받을 돈, 학생마다 수강료와 남은 횟수가 보여요'
                : '꺼져 있어요. 켜면 납부 메뉴, 받을 돈, 수강료와 남은 횟수가 보여요'}
            </span>
          </span>
          <input type="checkbox" role="switch" className="switch" checked={enabled} aria-label="납부 기능 쓰기"
            onChange={(event) => void save({ paymentsEnabled: event.target.checked })} />
        </label>
        <p className="muted">꺼도 적어 둔 수강료와 납부 기록은 지워지지 않아요. 다시 켜면 그대로 보여요</p>
      </div>
      {enabled && (
        <div className="card form-section">
          <h2 className="section-title">새 수업의 수강료</h2>
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
      )}
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
      {/* 결석한 수업을 회차로 셀지는 수강료 계산에만 쓰여서, 납부 기능을 켰을 때만 보여줍니다. */}
      {settings.paymentsEnabled && <div className="card form-section">
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
      </div>}
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
