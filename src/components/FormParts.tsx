import { newId } from '../data/id'
import { BILLING_HINTS, BILLING_LABELS, perSessionText } from '../data/rules'
import type { StudentFields } from '../data/students'
import type { Billing, Guardian } from '../data/types'
import { formatWon, parseAmount } from '../utils/money'
import AmountInput from './AmountInput'
import { PlusIcon, TrashIcon } from './icons'
import PhotoField from './PhotoField'
import Segmented from './Segmented'

/** 출생 연도 입력 글자 → 숫자 (1900~올해만) */
export function parseBirthYear(text: string): number | undefined {
  const year = Number(text)
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() ? year : undefined
}

/** 학생 정보 입력칸의 값 (입력 중이라 글자 그대로) */
export interface StudentDraft {
  name: string
  color: string
  photo?: string
  birthYearText: string
  phone: string
  guardians: Guardian[]
  memo: string
}

export function studentDraftOf(fields: Partial<StudentFields> & { color: string }): StudentDraft {
  return {
    name: fields.name ?? '',
    color: fields.color,
    photo: fields.photo,
    birthYearText: fields.birthYear ? String(fields.birthYear) : '',
    phone: fields.phone ?? '',
    guardians: fields.guardians ?? [],
    memo: fields.memo ?? '',
  }
}

/** 입력한 값을 저장할 학생 정보로 바꿉니다. 전화번호를 적지 않은 보호자 줄은 버립니다. */
export function studentFieldsOf(draft: StudentDraft, enrolledOn: string): StudentFields {
  return {
    name: draft.name.trim(),
    color: draft.color,
    photo: draft.photo,
    birthYear: parseBirthYear(draft.birthYearText),
    phone: draft.phone.trim(),
    guardians: draft.guardians.map((item) => ({ ...item, relation: item.relation.trim(), phone: item.phone.trim() })).filter((item) => item.phone),
    enrolledOn,
    memo: draft.memo.trim(),
  }
}

export function studentDraftErrors(draft: StudentDraft): { name: string; birthYear: string } {
  return {
    name: draft.name.trim() ? '' : '이름을 적어 주세요',
    birthYear: draft.birthYearText && !parseBirthYear(draft.birthYearText) ? '네 자리 연도로 적어 주세요 (예: 2015)' : '',
  }
}

/** 학생 정보 입력: 사진(또는 색), 이름, 출생 연도, 연락처, 보호자, 메모 */
export function StudentFieldsEditor({ draft, onChange, submitted }: { draft: StudentDraft; onChange(draft: StudentDraft): void; submitted: boolean }) {
  const errors = studentDraftErrors(draft)
  const set = (patch: Partial<StudentDraft>) => onChange({ ...draft, ...patch })
  const setGuardian = (id: string, patch: Partial<Guardian>) => set({ guardians: draft.guardians.map((item) => (item.id === id ? { ...item, ...patch } : item)) })

  return (
    <>
      <PhotoField name={draft.name} photo={draft.photo} color={draft.color} onPhoto={(photo) => set({ photo })} onColor={(color) => set({ color })} />
      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor="student-name">이름</label>
          <input id="student-name" className="input" value={draft.name} maxLength={20} autoComplete="off"
            aria-invalid={submitted && !!errors.name} onChange={(event) => set({ name: event.target.value })} />
          {submitted && errors.name && <p className="field-error" role="alert">{errors.name}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="student-birth">출생 연도</label>
          <div className="input-with-unit">
            <input id="student-birth" className="input" inputMode="numeric" autoComplete="off" placeholder="2015" value={draft.birthYearText}
              aria-invalid={!!errors.birthYear} onChange={(event) => set({ birthYearText: event.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
            <span className="unit">년생</span>
          </div>
          {errors.birthYear && <p className="field-error">{errors.birthYear}</p>}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="student-phone">학생 전화번호</label>
        <input id="student-phone" className="input" type="tel" inputMode="tel" value={draft.phone} maxLength={20} autoComplete="off" placeholder="선택"
          onChange={(event) => set({ phone: event.target.value })} />
      </div>
      <fieldset className="field">
        <legend className="field-label">보호자</legend>
        {draft.guardians.map((guardian, position) => (
          <div key={guardian.id} className="guardian-row">
            <input className="input" value={guardian.relation} maxLength={10} autoComplete="off" placeholder="관계" aria-label={`보호자 ${position + 1} 관계`}
              onChange={(event) => setGuardian(guardian.id, { relation: event.target.value })} />
            <input className="input" type="tel" inputMode="tel" value={guardian.phone} maxLength={20} autoComplete="off" placeholder="010-0000-0000"
              aria-label={`보호자 ${position + 1} 전화번호`} onChange={(event) => setGuardian(guardian.id, { phone: event.target.value })} />
            <button type="button" className="icon-btn" aria-label={`보호자 ${position + 1} 지우기`}
              onClick={() => set({ guardians: draft.guardians.filter((item) => item.id !== guardian.id) })}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-small"
          onClick={() => set({ guardians: [...draft.guardians, { id: newId(), relation: draft.guardians.length === 0 ? '어머니' : '아버지', phone: '' }] })}>
          <PlusIcon />
          보호자 추가
        </button>
      </fieldset>
      <div className="field">
        <label className="field-label" htmlFor="student-memo">메모</label>
        <textarea id="student-memo" className="input textarea" value={draft.memo} maxLength={500} placeholder="학교·학년, 특이사항 등"
          onChange={(event) => set({ memo: event.target.value })} />
      </div>
    </>
  )
}

/** 수강료 입력칸의 값 */
export interface FeeDraft {
  countText: string
  amountText: string
  billing: Billing
}

export function feeDraftErrors(draft: FeeDraft): string {
  const count = Number(draft.countText)
  return Number.isInteger(count) && count >= 1 && count <= 99 ? '' : '횟수는 1부터 99까지 적어 주세요'
}

/** 수강료 입력: 몇 회에 얼마, 1회 금액, 선납/후납 */
export function FeeFields({ draft, onChange, submitted }: { draft: FeeDraft; onChange(draft: FeeDraft): void; submitted: boolean }) {
  const error = feeDraftErrors(draft)
  const count = Number(draft.countText)
  const amount = parseAmount(draft.amountText) ?? 0
  const per = !error ? perSessionText({ amount, sessionCount: count }) : ''
  return (
    <>
      <div className="fee-pair">
        <div className="field">
          <label className="field-label" htmlFor="fee-count">횟수</label>
          <div className="input-with-unit">
            <input id="fee-count" className="input" inputMode="numeric" autoComplete="off" value={draft.countText} aria-invalid={submitted && !!error}
              onChange={(event) => onChange({ ...draft, countText: event.target.value.replace(/[^\d]/g, '').slice(0, 2) })} />
            <span className="unit">회</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="fee-amount">수강료</label>
          <AmountInput id="fee-amount" value={draft.amountText} onChange={(amountText) => onChange({ ...draft, amountText })} placeholder="160,000" hint={false} />
        </div>
      </div>
      {submitted && error && <p className="field-error" role="alert">{error}</p>}
      <p className={per ? 'per-session' : 'per-session is-empty'} aria-live="polite">
        {per ? `${draft.countText}회 ${formatWon(amount)} · ${per}` : '금액을 적으면 1회 금액이 보여요'}
      </p>
      <div className="field">
        <span className="field-label">받는 때</span>
        <Segmented<Billing>
          label="수강료 받는 때"
          name="fee-billing"
          value={draft.billing}
          onChange={(billing) => onChange({ ...draft, billing })}
          options={[
            { value: 'prepaid', label: BILLING_LABELS.prepaid },
            { value: 'postpaid', label: BILLING_LABELS.postpaid },
          ]}
        />
        <p className="muted">{BILLING_HINTS[draft.billing]}</p>
      </div>
    </>
  )
}
