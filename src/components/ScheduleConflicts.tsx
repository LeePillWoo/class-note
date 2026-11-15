import { useMemo } from 'react'
import { describeConflict, slotConflicts, type SlotConflict } from '../data/conflicts'
import { useData } from '../data/DataProvider'
import type { TimeSlot } from '../data/types'
import { formatDate, type DateStr } from '../utils/date'

/** 겹치는 수업을 알려줄 이름: 1:1 레슨은 '이서윤 1:1 레슨' */
function conflictText(conflict: SlotConflict): string {
  const name = conflict.cls.kind === 'solo' ? `${conflict.cls.name} 1:1 레슨` : conflict.cls.name
  return `${describeConflict(conflict, name)}${conflict.from ? ` (${formatDate(conflict.from)}부터)` : ''}`
}

/** 넣고 있는 일정과 겹치는 다른 수업. from 전의 지난 일정은 보지 않습니다. */
export function useSlotConflicts(slots: TimeSlot[], from: DateStr, excludeClassId?: string): SlotConflict[] {
  const { data } = useData()
  return useMemo(() => slotConflicts(data.classes, slots, from, excludeClassId), [data.classes, slots, from, excludeClassId])
}

/** 저장하기 전에 묻는 말. 겹치는 수업이 없으면 빈 글자 */
export function conflictConfirmText(conflicts: SlotConflict[]): string {
  if (conflicts.length === 0) return ''
  return `다른 수업과 시간이 겹쳐요.\n${conflicts.map(conflictText).join('\n')}\n\n그래도 저장할까요?`
}

/** 요일·시간 아래에 붙는 안내: 겹치는 수업이 있으면 바로 보여줍니다. (저장은 막지 않음) */
export default function ScheduleConflicts({ conflicts }: { conflicts: SlotConflict[] }) {
  if (conflicts.length === 0) return null
  return (
    <div className="warnings" role="status">
      <p>다른 수업과 시간이 겹쳐요. 시간을 바꾸거나, 같이 해도 되면 그대로 저장하세요.</p>
      <ul aria-label="겹치는 수업">
        {conflicts.map((conflict) => (
          <li key={`${conflict.cls.id}|${conflict.weekday}|${conflict.start}`}>{conflictText(conflict)}</li>
        ))}
      </ul>
    </div>
  )
}
