import type { CSSProperties } from 'react'
import { softColorVars } from '../data/colors'

interface AvatarProps {
  name: string
  color: string
  /** 사진 (data URL). 있으면 사진, 없으면 이름 첫 글자 */
  photo?: string
  size?: 'sm' | 'md' | 'lg'
  /** 그룹 수업은 둥근 네모 */
  square?: boolean
}

/** 사진이나 이름 첫 글자. 옆에 이름이 함께 나오므로 화면 읽기 프로그램에는 읽히지 않습니다. */
export default function Avatar({ name, color, photo, size = 'md', square }: AvatarProps) {
  const className = `avatar avatar-${size}${square ? ' is-square' : ''}`
  if (photo) return <img className={className} src={photo} alt="" />
  return (
    <span className={className} style={softColorVars(color) as CSSProperties} aria-hidden="true">
      {name.trim().charAt(0) || '?'}
    </span>
  )
}
