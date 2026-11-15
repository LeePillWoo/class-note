import type { ReactNode } from 'react'

interface EmptyProps {
  title: string
  /** 무엇을 하면 되는지 한두 줄 */
  children?: ReactNode
  /** 바로 할 수 있는 일 (단추) */
  action?: ReactNode
  /** 카드 테두리 없이 (다른 카드 안에 넣을 때) */
  plain?: boolean
}

/** 아직 아무것도 없을 때의 안내. 로고 그림의 고양이가 다음에 할 일을 알려줍니다. */
export default function Empty({ title, children, action, plain }: EmptyProps) {
  return (
    <div className={plain ? 'empty' : 'card empty'}>
      <img className="empty-art" src="./brand/cat-face.png" alt="" width={72} height={72} />
      <h2 className="empty-title">{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}
