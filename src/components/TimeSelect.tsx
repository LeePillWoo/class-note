import { useSettings } from '../data/settings'
import type { TimeStep } from '../data/types'

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

/** 수업 길이. 예: 60 → '1시간', 90 → '1시간 30분', 40 → '40분' */
export function lengthLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours > 0 && `${hours}시간`, rest > 0 && `${rest}분`].filter(Boolean).join(' ')
}

/** 고를 수 있는 시각: 오전 6시부터 밤까지 시각 단위(정각, 30분, 10분)마다 (오전이 먼저) */
export function timeOptions(step: TimeStep): string[] {
  return Array.from({ length: ((24 - 6) * 60) / step }, (_, position) => fromMinutes(6 * 60 + position * step))
}

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
 * 목록은 설정의 시각 단위(처음 값은 정각)를 따릅니다. 목록에 없는 시각(예전에 적은 16:50 등)도 그대로 보여줍니다.
 */
export default function TimeSelect({ value, onChange, label, id, disabled }: TimeSelectProps) {
  const { settings } = useSettings()
  const options = timeOptions(settings.timeStep)
  const times = value && !options.includes(value) ? [...options, value].sort() : options
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
