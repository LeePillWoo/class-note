import { useRef, useState, type CSSProperties } from 'react'
import { PALETTE } from '../data/colors'
import { photoToDataUrl } from '../utils/image'
import Avatar from './Avatar'

interface PhotoFieldProps {
  name: string
  photo?: string
  color: string
  onPhoto(photo: string | undefined): void
  onColor(color: string): void
}

/** 사진 고르기. 사진이 없으면 고른 색 동그라미에 이름 첫 글자가 들어갑니다. */
export default function PhotoField({ name, photo, color, onPhoto, onColor }: PhotoFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  async function pick(file: File | undefined) {
    setError('')
    if (!file) return
    try {
      onPhoto(await photoToDataUrl(file))
    } catch {
      setError('사진을 읽지 못했어요. 다른 사진을 골라 주세요.')
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="photo-field">
      <Avatar name={name || '?'} color={color} photo={photo} size="lg" />
      <div className="photo-controls">
        <div className="row">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => input.current?.click()}>
            {photo ? '사진 바꾸기' : '사진 넣기'}
          </button>
          {photo && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => onPhoto(undefined)}>
              사진 지우기
            </button>
          )}
        </div>
        {!photo && (
          <div className="swatches" role="radiogroup" aria-label="사진이 없을 때 색">
            {PALETTE.map((item) => (
              <input
                key={item.value}
                type="radio"
                className="swatch"
                name="photo-color"
                checked={color === item.value}
                onChange={() => onColor(item.value)}
                aria-label={item.name}
                title={item.name}
                style={{ '--swatch': item.value } as CSSProperties}
              />
            ))}
          </div>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="file-input" aria-label="사진 고르기" onChange={(event) => void pick(event.target.files?.[0])} />
    </div>
  )
}
