import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { MESSAGE_FIELDS, MESSAGE_HINTS, MESSAGE_KINDS, MESSAGE_LABELS, defaultMessages, fillMessage, type MessageKind } from '../../data/messages'
import { useSettings } from '../../data/settings'
import { SavedNote } from './RulePages'

/** 미리 보기에 넣는 지어낸 값 */
const EXAMPLE: Record<string, string> = {
  이름: '김하늘',
  수업: '우쿨렐레 레슨',
  횟수: '4',
  금액: '16만 원',
  날짜: '11월 20일 (금)',
  빠진날: '11월 13일 (금)',
  시각: '17:00',
}

/** 안내 문구: 수강료, 결석, 보강을 보호자에게 알릴 때 복사해 쓰는 문구 */
export default function MessagesPage() {
  return (
    <section className="narrow">
      <PageHeader title="안내 문구" subtitle="보호자에게 보낼 문구를 미리 정해 두고, 받을 돈·출석부·보강 창에서 복사해요" backTo="/settings" />
      {MESSAGE_KINDS.map((kind) => (
        <MessageEditor key={kind} kind={kind} />
      ))}
      <SavedNote />
    </section>
  )
}

function MessageEditor({ kind }: { kind: MessageKind }) {
  const { settings, save } = useSettings()
  const [text, setText] = useState(settings.messages[kind])
  const initial = defaultMessages()[kind]
  const id = `message-${kind}`

  function change(value: string) {
    setText(value)
    void save({ messages: { ...settings.messages, [kind]: value } })
  }

  /** 누른 칸을 글 끝에 붙입니다. */
  function addField(field: string) {
    change(`${text}${text && !text.endsWith(' ') ? ' ' : ''}{${field}}`)
  }

  return (
    <div className="card form-section">
      <div className="field">
        <label className="field-label" htmlFor={id}>{MESSAGE_LABELS[kind]}</label>
        <textarea id={id} className="input textarea message-input" value={text} maxLength={500} onChange={(event) => change(event.target.value)} />
        <div className="chip-row" role="group" aria-label={`${MESSAGE_LABELS[kind]}에 넣을 칸`}>
          {MESSAGE_FIELDS[kind].map((field) => (
            <button key={field} type="button" className="chip-btn" onClick={() => addField(field)}>
              {`{${field}}`}
            </button>
          ))}
        </div>
        <p className="muted">{MESSAGE_HINTS[kind]}. 칸을 누르면 글 끝에 들어가고, 보낼 때 학생의 값으로 바뀌어요</p>
      </div>
      <div className="field">
        <span className="field-label">미리 보기</span>
        <p className="message-text">{fillMessage(text, EXAMPLE) || '문구를 적어 주세요'}</p>
      </div>
      {text !== initial && (
        <div className="row">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => change(initial)}>
            처음 문구로
          </button>
        </div>
      )}
    </div>
  )
}
