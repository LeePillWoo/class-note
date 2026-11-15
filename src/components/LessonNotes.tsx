import { useMemo, useState } from 'react'
import { useData } from '../data/DataProvider'
import { formatDate } from '../utils/date'

const SHOWN = 5

/** 수업 기록: 수업마다 적어 둔 메모(진도, 숙제, 휴강 사유)를 최근 순서로 모아 보여줍니다. 메모는 수업 카드에서 적습니다. */
export default function LessonNotes({ classId }: { classId: string }) {
  const { data } = useData()
  const [all, setAll] = useState(false)
  const notes = useMemo(
    () => data.lessonNotes.filter((note) => note.classId === classId && note.memo).sort((a, b) => b.date.localeCompare(a.date)),
    [data.lessonNotes, classId],
  )
  const shown = all ? notes : notes.slice(0, SHOWN)

  return (
    <div className="card">
      <h2 className="card-title">
        수업 기록 {notes.length > 0 && <span className="count">{notes.length}</span>}
      </h2>
      {notes.length === 0 ? (
        <p className="muted">출석부에서 수업 메모에 진도나 숙제를 적으면 여기에 날짜순으로 모여요</p>
      ) : (
        <ul className="note-list" aria-label="수업 기록">
          {shown.map((note) => (
            <li key={note.id}>
              <span className="note-date">
                {formatDate(note.date)}
                {note.cancelled && <span className="tag">휴강</span>}
              </span>
              <span className="note-text">{note.memo}</span>
            </li>
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setAll(!all)}>
          {all ? '최근 것만 보기' : `지난 기록 ${notes.length - SHOWN}개 더 보기`}
        </button>
      )}
    </div>
  )
}
