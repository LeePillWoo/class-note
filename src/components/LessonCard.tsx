import { useId, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { useAttendance } from '../data/attendance'
import { softColorVars } from '../data/colors'
import { rollCounts, type GuestEntry, type LessonView, type RollEntry } from '../data/lessons'
import { MAKEUP_STATE_LABELS, describeDeadline, makeupState } from '../data/makeupRules'
import { useMakeups } from '../data/makeups'
import type { AttendanceStatus, Makeup } from '../data/types'
import { formatDate, today } from '../utils/date'
import { ChevronDownIcon } from './icons'

interface LessonCardProps {
  view: LessonView
  open: boolean
  onToggle(): void
  /** 보강 창을 엽니다. (결석한 학생의 보강 잡기, 보강 날짜 바꾸기) */
  onOpenMakeup(ids: string[]): void
  /** 날짜를 함께 보여줄지 (여러 날의 수업이 섞인 목록) */
  showDate?: boolean
}

/** 잡아 둔 날짜가 있거나 끝낸 보강인지. 이런 보강이 지워지는 일은 먼저 물어봅니다. */
function hasProgress(makeup: Makeup | undefined): boolean {
  return !!makeup && (makeup.status !== 'open' || !!makeup.scheduledOn)
}

/**
 * 수업 하나. 누르면 그 자리에서 펼쳐져 출결을 적습니다.
 * 출석·결석 단추는 누르는 즉시 저장합니다. 그래서 창을 닫거나 폴드를 접어도 잃어버릴 것이 없습니다.
 */
export default function LessonCard({ view, open, onToggle, onOpenMakeup, showDate }: LessonCardProps) {
  const bodyId = useId()
  const todayStr = today()
  const counts = rollCounts(view)
  const future = view.date > todayStr

  let badge: { className: string; label: string }
  if (view.cancelled) badge = { className: 'status-cancelled', label: '휴강' }
  else if (view.kind === 'makeup') badge = { className: 'status-makeup', label: '보강' }
  else if (counts.total === 0) badge = { className: 'status-planned', label: '학생 없음' }
  else if (counts.unchecked === 0) badge = { className: 'status-present', label: '출결 끝' }
  else if (view.date < todayStr) badge = { className: 'status-unchecked', label: '체크 전' }
  else badge = { className: 'status-planned', label: '예정' }

  let summary: string
  if (view.cancelled) summary = `학생 ${view.roll.length}명`
  else if (counts.total === 0) summary = view.cls.place
  else if (counts.present + counts.absent === 0) summary = `${counts.total}명`
  else {
    summary = [`출석 ${counts.present}`, counts.absent > 0 && `결석 ${counts.absent}`, counts.unchecked > 0 && `체크 전 ${counts.unchecked}`]
      .filter(Boolean)
      .join(', ')
  }

  const className = `lesson${open ? ' is-open' : ''}${view.cancelled ? ' is-cancelled' : ''}`
  return (
    <li className={className} style={softColorVars(view.cls.color) as CSSProperties}>
      <button type="button" className="lesson-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="lesson-time">
          {view.start}
          <small>~{view.end}</small>
        </span>
        <span className="lesson-main">
          <span className="lesson-name">{view.cls.name}</span>
          <span className="lesson-sub">
            {showDate && `${formatDate(view.date)} `}
            {summary}
          </span>
        </span>
        <span className={`badge ${badge.className}`}>{badge.label}</span>
        <span className="lesson-chevron">
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div className="lesson-body" id={bodyId}>
          <LessonBody view={view} future={future} onOpenMakeup={onOpenMakeup} />
        </div>
      )}
    </li>
  )
}

function LessonBody({ view, future, onOpenMakeup }: { view: LessonView; future: boolean; onOpenMakeup(ids: string[]): void }) {
  const { setCancelled, markAllPresent, setLessonMemo } = useAttendance()
  const classId = view.cls.id
  const [memo, setMemo] = useState(view.note?.memo ?? '')

  if (view.kind === 'makeup') {
    return (
      <>
        <p className="muted">따로 시간을 잡은 보강 수업이에요. 온 학생은 출석을 눌러 주세요.</p>
        <ul className="roll">
          {view.guests.map((guest) => (
            <GuestRow key={guest.makeup.id} guest={guest} view={view} onOpenMakeup={onOpenMakeup} />
          ))}
        </ul>
      </>
    )
  }

  const lessonMemo = (
    <input
      className="input"
      value={memo}
      maxLength={100}
      autoComplete="off"
      aria-label={`${view.cls.name} 수업 메모`}
      placeholder={view.cancelled ? '휴강 사유 (예: 학원 행사)' : '수업 메모 (예: 3단원까지 진도)'}
      onChange={(event) => setMemo(event.target.value)}
      onBlur={() => setLessonMemo(classId, view.date, memo.trim())}
    />
  )

  if (view.cancelled) {
    const makeups = view.roll.flatMap((entry) => (entry.makeup ? [entry.makeup] : []))
    const pending = makeups.filter((makeup) => makeup.status === 'open' && !makeup.scheduledOn)
    return (
      <>
        <p className="note">
          휴강한 수업이에요.{' '}
          {makeups.length > 0 ? `학생 ${makeups.length}명에게 보강이 생겼어요.` : '이 반은 휴강 보강을 하지 않아요.'}
        </p>
        {view.guests.length > 0 && (
          // 이 수업에 같이 듣기로 한 보강 학생은 수업이 없어졌으니 날짜를 다시 잡아야 합니다.
          <p className="warnings" role="note">
            이 수업에 같이 듣기로 한 보강 {view.guests.length}명({view.guests.map((guest) => guest.student.name).join(', ')})은 날짜를 다시 잡아 주세요.{' '}
            <button type="button" className="link-btn inline" onClick={() => onOpenMakeup(view.guests.map((guest) => guest.makeup.id))}>
              다시 잡기
            </button>
          </p>
        )}
        {lessonMemo}
        <div className="lesson-actions">
          {pending.length > 0 && (
            <button type="button" className="btn btn-primary btn-small" onClick={() => onOpenMakeup(pending.map((makeup) => makeup.id))}>
              보강 날짜 잡기
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              const lost = makeups.filter(hasProgress).length
              if (lost > 0 && !window.confirm(`휴강을 취소하면 날짜를 잡았거나 끝낸 보강 ${lost}건이 지워져요. 취소할까요?`)) return
              void setCancelled(classId, view.date, false)
            }}
          >
            휴강 취소
          </button>
        </div>
      </>
    )
  }

  const unchecked = view.roll.filter((entry) => entry.status === 'unchecked' || entry.status === 'planned').length
  return (
    <>
      {view.roll.length === 0 && view.guests.length === 0 ? (
        <p className="muted">
          이 수업을 듣는 학생이 없어요. <Link to={`/classes/${classId}`}>반 화면</Link>에서 학생을 넣어 주세요.
        </p>
      ) : (
        <ul className="roll">
          {view.roll.map((entry) => (
            <RollRow key={entry.student.id} entry={entry} view={view} onOpenMakeup={onOpenMakeup} />
          ))}
          {view.guests.map((guest) => (
            <GuestRow key={guest.makeup.id} guest={guest} view={view} onOpenMakeup={onOpenMakeup} />
          ))}
        </ul>
      )}
      {lessonMemo}
      <div className="lesson-actions">
        {view.roll.length > 0 && !future && (
          <button type="button" className="btn btn-primary btn-small" disabled={unchecked === 0} onClick={() => void markAllPresent(classId, view.date)}>
            모두 출석
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => {
            if (!window.confirm(`${formatDate(view.date)} ${view.cls.name} 수업을 휴강으로 할까요?`)) return
            void setCancelled(classId, view.date, true)
          }}
        >
          휴강으로
        </button>
      </div>
    </>
  )
}

/** 원래 이 수업을 듣는 학생 한 줄: 출석·결석 단추, 결석이면 사유와 보강 */
function RollRow({ entry, view, onOpenMakeup }: { entry: RollEntry; view: LessonView; onOpenMakeup(ids: string[]): void }) {
  const { setAttendance, setAttendanceMemo } = useAttendance()
  const todayStr = today()
  const { student, status, makeup } = entry
  const [memo, setMemo] = useState(entry.attendance?.memo ?? '')

  function press(next: AttendanceStatus) {
    // 같은 단추를 한 번 더 누르면 '체크 전'으로 돌아갑니다.
    const target = status === next ? null : next
    if (status === 'absent' && hasProgress(makeup)) {
      if (!window.confirm(`${student.name} 학생의 결석을 바꾸면 날짜를 잡았거나 끝낸 보강이 지워져요. 바꿀까요?`)) return
    }
    if (target !== 'absent') setMemo('')
    void setAttendance(view.cls.id, view.date, student.id, target)
  }

  const makeupLabel = makeup ? MAKEUP_STATE_LABELS[makeupState(makeup, todayStr)] : ''
  return (
    <li className="roll-row">
      <Link className="roll-name" to={`/students/${student.id}`}>
        {student.name}
      </Link>
      <div className="roll-buttons" role="group" aria-label={`${student.name} 출결`}>
        <button type="button" className="roll-btn is-present" aria-pressed={status === 'present'} onClick={() => press('present')}>
          출석
        </button>
        <button type="button" className="roll-btn is-absent" aria-pressed={status === 'absent'} onClick={() => press('absent')}>
          결석
        </button>
      </div>
      {status === 'absent' && (
        <div className="roll-extra">
          <input
            className="input"
            value={memo}
            maxLength={100}
            autoComplete="off"
            aria-label={`${student.name} 결석 사유`}
            placeholder="결석 사유 (예: 감기)"
            onChange={(event) => setMemo(event.target.value)}
            onBlur={() => setAttendanceMemo(view.cls.id, view.date, student.id, memo.trim())}
          />
          {makeup ? (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => onOpenMakeup([makeup.id])}>
              보강 {makeupLabel}
              {makeup.status === 'open' && !makeup.scheduledOn && makeup.deadline && (
                <span className="muted">{describeDeadline(makeup.deadline, todayStr).replace(/,.*$/, '')}</span>
              )}
            </button>
          ) : (
            <span className="muted">이 반은 결석 보강을 하지 않아요.</span>
          )}
        </div>
      )}
    </li>
  )
}

/** 보강으로 온 학생 한 줄: 출석을 누르면 보강을 끝낸 것으로 적습니다. */
function GuestRow({ guest, view, onOpenMakeup }: { guest: GuestEntry; view: LessonView; onOpenMakeup(ids: string[]): void }) {
  const { complete, uncomplete } = useMakeups()
  const { student, makeup, homeClass } = guest
  const done = makeup.status === 'done'
  return (
    <li className="roll-row">
      <span className="roll-name">
        <Link className="roll-name" to={`/students/${student.id}`}>
          {student.name}
        </Link>
        <span className="tag">보강</span>
        {homeClass && homeClass.id !== view.cls.id && <span className="tag is-neutral">{homeClass.name}</span>}
      </span>
      <div className="roll-buttons" role="group" aria-label={`${student.name} 보강 출결`}>
        <button
          type="button"
          className="roll-btn is-present"
          aria-pressed={done}
          onClick={() =>
            void (done
              ? uncomplete([makeup.id])
              : complete([makeup.id], { date: view.date, start: view.start, end: view.end, joinClassId: makeup.joinClassId }, makeup.memo))
          }
        >
          출석
        </button>
        <button type="button" className="roll-btn" onClick={() => onOpenMakeup([makeup.id])}>
          날짜
        </button>
      </div>
    </li>
  )
}
