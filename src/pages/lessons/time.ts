/** 'HH:MM'에 분을 더한 시각. 자정을 넘기면 23:59 */
export function endTimeAfter(start: string, minutes: number): string {
  const [hours, mins] = start.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
