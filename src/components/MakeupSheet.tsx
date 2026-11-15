import { useMemo, useState } from 'react'
import { useData } from '../data/DataProvider'
import { dayLessons, type LessonView } from '../data/lessons'
import {
  MAKEUP_REASON_LABELS,
  MAKEUP_STATE_LABELS,
  defaultMakeupTime,
  describeDeadline,
  makeupState,
  scheduleWarnings,
} from '../data/makeupRules'
import { useMakeups, type MakeupPlan } from '../data/makeups'
import type { Makeup } from '../data/types'
import { formatDate, isValidTime, today, type DateStr } from '../utils/date'
import DateField from './DateField'
import Sheet from './Sheet'
import TimeSelect, { fromMinutes, toMinutes } from './TimeSelect'

interface MakeupSheetProps {
  /** 열 보강들. 여러 개면 한 번에 같은 날로 잡습니다. (휴강 보강) null이면 창을 닫습니다. */
  ids: string[] | null
  onClose(): void
}

/** 보강을 관리하는 창: 날짜 잡기(예정), 끝냄(완료), 보강 안 함 */
export default function MakeupSheet({ ids, onClose }: MakeupSheetProps) {
  const { index } = useData()
  const makeups = (ids ?? []).flatMap((id) => index.makeups.get(id) ?? [])
  return (
    <Sheet open={ids !== null} onClose={onClose} label="보강">
      {makeups.length > 0 && <MakeupEditor key={makeups.map((makeup) => makeup.id).join('|')} makeups={makeups} onDone={onClose} />}
    </Sheet>
  )
}

function MakeupEditor({ makeups, onDone }: { makeups: Makeup[]; onDone(): void }) {
  const { index } = useData()
  const actions = useMakeups()
  const todayStr = today()
  const first = makeups[0]
  const cls = index.classes.get(first.classId)
  const single = makeups.length === 1
  const state = makeupState(first, todayStr)
  const ids = makeups.map((makeup) => makeup.id)

  const [date, setDate] = useState<DateStr>(first.scheduledOn ?? '')
  const [start, setStart] = useState(first.start ?? '')
  const [end, setEnd] = useState(first.end ?? '')
  const [joinClassId, setJoinClassId] = useState<string | undefined>(first.joinClassId)
  // 시각을 직접 고쳤는지. 고치지 않았으면 날짜를 바꿀 때 그 날짜의 기본 시각으로 다시 채웁니다.
  const [timeEdited, setTimeEdited] = useState(!!first.start)
  const [memo, setMemo] = useState(first.memo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 그날의 수업. 이 학생들이 이미 듣는 수업은 같이 들을 수업에서 뺍니다.
  const studentIds = useMemo(() => new Set(makeups.map((makeup) => makeup.studentId)), [makeups])
  const lessons = useMemo(
    () => (date ? dayLessons(index, date, todayStr).filter((lesson) => lesson.kind === 'class' && !lesson.cancelled) : []),
    [index, date, todayStr],
  )
  const joinable = (lesson: LessonView) => !lesson.roll.some((entry) => studentIds.has(entry.student.id))

  if (!cls) return null
  const names = makeups.map((makeup) => index.students.get(makeup.studentId)?.name ?? '').join(', ')

  const timeError = date && (!isValidTime(start) || !isValidTime(end) || end <= start) ? '끝 시각은 시작 시각보다 늦어야 해요.' : ''
  const warnings = date && !timeError ? scheduleWarnings({ index, makeups, date, start, end, joinClassId }) : []
  const canSave = !!date && !timeError && !busy
  // 오늘이나 지난 날짜면 바로 끝낸 것으로 적을 수 있습니다.
  const canComplete = canSave && date <= todayStr
  const plan: MakeupPlan = { date, start, end, joinClassId }

  function pickDate(value: DateStr) {
    setDate(value)
    setJoinClassId(undefined)
    if (!timeEdited) {
      const defaults = defaultMakeupTime(cls!, value, first.missedOn)
      setStart(defaults.start)
      setEnd(defaults.end)
    }
  }

  function toggleJoin(lesson: LessonView) {
    if (joinClassId === lesson.cls.id) {
      setJoinClassId(undefined)
      return
    }
    setJoinClassId(lesson.cls.id)
    setStart(lesson.start)
    setEnd(lesson.end)
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      onDone()
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  const header = (
    <div className="sheet-header">
      <h2 className="sheet-title">
        <span className="dot" style={{ background: cls.color }} />
        {single ? `${names} 보강` : `${cls.name} 보강 ${makeups.length}명`}
      </h2>
      {!single && <p>{names}</p>}
      <p className="muted">
        {single && `${cls.name}, `}
        {formatDate(first.missedOn)} {MAKEUP_REASON_LABELS[first.reason]}분
      </p>
      <p className="row">
        <span className={`badge makeup-${state}`}>{MAKEUP_STATE_LABELS[state]}</span>
        <span className="muted">기한: {describeDeadline(first.deadline, todayStr)}</span>
      </p>
    </div>
  )

  if (single && (state === 'done' || state === 'skipped')) {
    return (
      <>
        {header}
        <p>
          {state === 'done'
            ? `${formatDate(first.scheduledOn!)} ${first.start ?? ''}~${first.end ?? ''}에 보강했어요.`
            : '보강하지 않기로 했어요.'}
        </p>
        {first.memo && <p className="muted">메모: {first.memo}</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onDone}>닫기</button>
          <button type="button" className="btn btn-secondary" disabled={busy}
            onClick={() => run(() => (state === 'done' ? actions.uncomplete(ids) : actions.reopen(ids)))}>
            {state === 'done' ? '완료 취소' : '다시 보강하기'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="field">
        <label className="field-label" htmlFor="makeup-date">보강 날짜</label>
        <DateField id="makeup-date" label="보강 날짜" value={date} onChange={pickDate} />
      </div>
      {date && (
        <>
          {lessons.length > 0 && (
            <div className="field">
              <span className="field-label">그날 수업</span>
              <ul className="option-list">
                {lessons.map((lesson) =>
                  joinable(lesson) ? (
                    <li key={lesson.key}>
                      <button type="button" className="option" aria-pressed={joinClassId === lesson.cls.id} onClick={() => toggleJoin(lesson)}>
                        <span className="dot" style={{ background: lesson.cls.color }} />
                        <span className="option-text">
                          {lesson.start}~{lesson.end} {lesson.cls.name}
                        </span>
                        <span className="muted">{joinClassId === lesson.cls.id ? '같이 들어요' : '같이 듣기'}</span>
                      </button>
                    </li>
                  ) : (
                    <li key={lesson.key} className="muted">
                      {lesson.start}~{lesson.end} {lesson.cls.name} (원래 듣는 수업)
                    </li>
                  ),
                )}
              </ul>
              {lessons.some(joinable) && (
                <p className="muted">다른 수업 시간에 같이 듣게 하려면 그 수업을 누르세요. 따로 시간을 잡으려면 아래 시각만 정하면 돼요.</p>
              )}
            </div>
          )}
          <div className="slot-row">
            <span className="slot-day slot-label">시각</span>
            <TimeSelect value={start} label="보강 시작 시각" disabled={!!joinClassId}
              onChange={(value) => {
                // 시작을 바꾸면 끝은 수업 시간만큼 뒤로 따라옵니다. 끝은 그 뒤에 따로 고칠 수 있습니다.
                const length = start && end && end > start ? toMinutes(end) - toMinutes(start) : 60
                setStart(value)
                setEnd(fromMinutes(toMinutes(value) + length))
                setTimeEdited(true)
              }} />
            <span className="slot-sep" aria-hidden="true">~</span>
            <TimeSelect value={end} label="보강 끝 시각" disabled={!!joinClassId}
              onChange={(value) => { setEnd(value); setTimeEdited(true) }} />
          </div>
        </>
      )}
      {timeError && <p className="field-error">{timeError}</p>}
      {warnings.length > 0 && (
        <ul className="warnings" aria-label="확인할 점">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <div className="field">
        <label className="field-label" htmlFor="makeup-memo">메모 (선택)</label>
        <input id="makeup-memo" className="input" value={memo} maxLength={100} autoComplete="off"
          placeholder="예: 어머니와 통화함" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        {canComplete ? (
          <button type="button" className="btn btn-primary" onClick={() => run(() => actions.complete(ids, plan, memo.trim()))}>
            보강했어요
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={() => run(() => actions.schedule(ids, plan, memo.trim()))}>
            날짜 저장
          </button>
        )}
      </div>
      {canComplete && (
        <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => run(() => actions.schedule(ids, plan, memo.trim()))}>
          날짜만 저장 (아직 안 함)
        </button>
      )}
      <div className="link-actions">
        {makeups.some((makeup) => makeup.scheduledOn) && (
          <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => actions.unschedule(ids))}>
            날짜 취소
          </button>
        )}
        <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => actions.skip(ids, memo.trim()))}>
          보강 안 함
        </button>
      </div>
    </>
  )
}
