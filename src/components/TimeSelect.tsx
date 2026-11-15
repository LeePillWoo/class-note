/** 'HH:MM' → 분 */
export function toMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}

/** 분 → 'HH:MM' (23:55를 넘지 않게) */
export function fromMinutes(minutes: number): string {
  const total = Math.max(0, Math.min(minutes, 23 * 60 + 55))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** 예: '09:30' → '오전 9:30', '13:00' → '오후 1:00', '12:10' → '오후 12:10' */
export function timeLabel(time: string): string {
  const hours = Number(time.slice(0, 2))
  const minutes = time.slice(3, 5)
  const half = hours < 12 ? '오전' : '오후'
  const shown = hours % 12 === 0 ? 12 : hours % 12
  return `${half} ${shown}:${minutes}`
}

/** 고를 수 있는 시각: 오전 6시부터 오후 11시 50분까지 10분마다 (오전이 먼저) */
const TIMES = Array.from({ length: (24 - 6) * 6 }, (_, step) => fromMinutes(6 * 60 + step * 10))

interface TimeSelectProps {
  value: string
  onChange(value: string): void
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '수업 월요일 시작 시각' */
  label: string
  id?: string
  disabled?: boolean
}

/**
 * 시각 고르기. 기기마다 모양이 다른 기본 시각 입력 대신, 오전부터 차례로 나오는 목록에서 고릅니다.
 * 목록에 없는 시각(예전에 적은 16:45 등)도 그대로 보여줍니다.
 */
export default function TimeSelect({ value, onChange, label, id, disabled }: TimeSelectProps) {
  const times = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES
  return (
    <select id={id} className="input time-select" value={value} aria-label={label} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {times.map((time) => (
        <option key={time} value={time}>
          {timeLabel(time)}
        </option>
      ))}
    </select>
  )
}
