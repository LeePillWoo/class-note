import { formatNumber, formatWon, parseAmount } from '../utils/money'

interface AmountInputProps {
  id: string
  value: string
  onChange(value: string): void
  placeholder?: string
  /** 아래에 '25만 원'처럼 읽기 쉬운 금액을 보여줄지 (기본 true) */
  hint?: boolean
}

/** 금액 입력: 입력하는 대로 쉼표를 넣고, 아래에 '25만 원'처럼 읽기 쉬운 금액을 보여줍니다. */
export default function AmountInput({ id, value, onChange, placeholder = '예: 250,000', hint = true }: AmountInputProps) {
  const amount = parseAmount(value)
  return (
    <>
      <div className="input-with-unit">
        <input
          id={id}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const parsed = parseAmount(event.target.value)
            onChange(parsed === null ? '' : formatNumber(parsed))
          }}
        />
        <span className="unit">원</span>
      </div>
      {hint && amount !== null && amount >= 10_000 && <p className="muted">{formatWon(amount)}</p>}
    </>
  )
}
