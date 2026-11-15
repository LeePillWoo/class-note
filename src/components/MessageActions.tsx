import { useEffect, useState } from 'react'
import { MESSAGE_LABELS, defaultMessages, fillMessage, type MessageKind } from '../data/messages'
import { copyText } from '../utils/clipboard'
import { CheckIcon, CopyIcon } from './icons'

interface MessageActionsProps {
  kind: MessageKind
  /** 문구의 {칸}에 넣을 값 */
  values: Record<string, string>
  /** 문자를 보낼 번호. 없으면 복사만 */
  phone?: string
  /** 문구를 펼쳐 보여주지 않고 복사 단추만 (출석부의 좁은 줄) */
  compact?: boolean
}

/** 전화·문자 주소에 넣을 번호 (숫자와 +만) */
function dial(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

/** 보호자 안내 문구: 정해 둔 문구에 이 학생의 값을 채워 보여주고, 복사하거나 문자 앱으로 넘깁니다. */
export default function MessageActions({ kind, values, phone, compact }: MessageActionsProps) {
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const text = fillMessage(defaultMessages()[kind], values)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyButton = (
    <button type="button" className="btn btn-secondary btn-small" onClick={() => void copyText(text).then((ok) => setCopied(ok ? 'done' : 'failed'))}>
      {copied === 'done' ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{copied === 'done' ? '복사했어요' : copied === 'failed' ? '복사하지 못했어요' : compact ? MESSAGE_LABELS[kind] : '문구 복사'}</span>
    </button>
  )
  if (compact) return copyButton

  return (
    <details className="message-box">
      <summary>{MESSAGE_LABELS[kind]} 문구</summary>
      <p className="message-text">{text}</p>
      <div className="row">
        {copyButton}
        {phone && (
          <a className="btn btn-ghost btn-small" href={`sms:${dial(phone)}?body=${encodeURIComponent(text)}`}>
            문자로 보내기
          </a>
        )}
      </div>
    </details>
  )
}
