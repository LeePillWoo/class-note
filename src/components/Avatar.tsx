import type { CSSProperties } from 'react'
import { softColorVars } from '../data/colors'

interface AvatarProps {
  name: string
  color: string
  large?: boolean
  /** 반은 둥근 네모로 보여줍니다. */
  square?: boolean
}

/** 이름 첫 글자를 넣은 색 동그라미. 옆에 이름이 함께 나오므로 화면 읽기 프로그램에는 읽히지 않습니다. */
export default function Avatar({ name, color, large, square }: AvatarProps) {
  const className = `avatar${large ? ' is-large' : ''}${square ? ' is-class' : ''}`
  return (
    <span className={className} style={softColorVars(color) as CSSProperties} aria-hidden="true">
      {name.trim().charAt(0) || '?'}
    </span>
  )
}
