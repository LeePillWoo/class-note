import { useData } from '../data/DataProvider'
import { dayLessons } from '../data/lessons'
import { formatDate, today, type DateStr } from '../utils/date'
import { LessonBody, lessonSummary } from './LessonCard'
import Sheet from './Sheet'

/** 열 수업: 날짜와 수업 열쇠 (데이터가 바뀌면 다시 찾아 늘 최신으로 보여줍니다) */
export interface LessonRef {
  date: DateStr
  key: string
}

interface LessonSheetProps {
  target: LessonRef | null
  onClose(): void
  onOpenMakeup(ids: string[]): void
}

/** 수업 하나의 출석부를 창으로 엽니다. (주간 일정에서) */
export default function LessonSheet({ target, onClose, onOpenMakeup }: LessonSheetProps) {
  const { index } = useData()
  const todayStr = today()
  const view = target ? dayLessons(index, target.date, todayStr).find((lesson) => lesson.key === target.key) : undefined
  return (
    <Sheet open={target !== null} onClose={onClose} label="수업 출석부">
      {view && (
        <>
          <div className="sheet-header">
            <h2 className="sheet-title">
              <span className="dot" style={{ background: view.cls.color }} />
              {view.cls.name}
            </h2>
            <p className="muted">
              {formatDate(view.date)} {view.start}~{view.end} · {lessonSummary(view, todayStr).summary}
            </p>
          </div>
          <LessonBody key={view.key} view={view} onOpenMakeup={onOpenMakeup} />
          <div className="sheet-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
