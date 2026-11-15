import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { PALETTE } from '../data/colors'
import { CENTER_CROP, MAX_ZOOM, clampCrop, cropToDataUrl, loadImage, type CropView } from '../utils/image'
import Avatar from './Avatar'
import { CameraIcon, MinusIcon, PlusIcon } from './icons'

interface PhotoFieldProps {
  name: string
  photo?: string
  color: string
  onPhoto(photo: string | undefined): void
  onColor(color: string): void
}

/** 자리를 맞추는 중인 사진 */
interface Editing {
  image: HTMLImageElement
  /** 맞추기 전의 사진. 취소하면 이것으로 돌아갑니다. */
  before: string | undefined
}

/**
 * 사진 고르기. 사진을 고르면 그 자리에서 크게 보여 주고, 끌어서 옮기거나 키워서 프로필에 들어갈 자리를 맞춥니다.
 * 사진이 없으면 고른 색 동그라미에 이름 첫 글자가 들어갑니다.
 */
export default function PhotoField({ name, photo, color, onPhoto, onColor }: PhotoFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [error, setError] = useState('')
  // 고른 파일의 임시 주소. 다 쓰면 놓아 줍니다.
  const objectUrl = useRef('')

  function release() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = ''
  }
  useEffect(() => release, [])

  /** 사진을 열어 자리 맞추기를 시작합니다. fresh: 새로 고른 사진인지 (이미 넣은 사진을 다시 맞추는 것이 아닌지) */
  async function open(src: string, fresh: boolean) {
    setError('')
    try {
      const image = await loadImage(src)
      // 맞추는 중에 다른 사진을 골라도, 취소하면 맨 처음 사진으로 돌아갑니다.
      setEditing((current) => ({ image, before: current ? current.before : photo }))
      // 자리를 맞추지 않고 저장해도 사진이 들어가도록 가운데로 먼저 넣어 둡니다.
      if (fresh) onPhoto(cropToDataUrl(image, CENTER_CROP))
    } catch {
      release()
      setError('사진을 읽지 못했어요. 다른 사진을 골라 주세요.')
    }
  }

  function pick(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file) return
    release()
    objectUrl.current = URL.createObjectURL(file)
    void open(objectUrl.current, true)
  }

  function close() {
    setEditing(null)
    release()
  }

  const fileInput = (
    <input ref={input} type="file" accept="image/*" className="file-input" aria-label="사진 고르기" onChange={(event) => pick(event.target.files?.[0])} />
  )

  if (editing) {
    return (
      <div className="photo-field is-editing">
        <PhotoCropper
          key={editing.image.src}
          image={editing.image}
          onChange={(view) => onPhoto(cropToDataUrl(editing.image, view))}
          onDone={close}
          onCancel={() => {
            onPhoto(editing.before)
            close()
          }}
          onPickOther={() => input.current?.click()}
        />
        {fileInput}
      </div>
    )
  }

  return (
    <div className="photo-field">
      <Avatar name={name || '?'} color={color} photo={photo} size="xl" />
      <div className="photo-controls">
        <div className="row">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => input.current?.click()}>
            <CameraIcon />
            {photo ? '사진 바꾸기' : '사진 넣기'}
          </button>
          {photo && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => void open(photo, false)}>
              자리 맞추기
            </button>
          )}
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
      {fileInput}
    </div>
  )
}

/** 사진을 동그라미 안에 view대로 놓습니다. 크기를 %로 정해서 큰 미리 보기와 작은 미리 보기가 같은 모양입니다. */
function CropImage({ image, view }: { image: HTMLImageElement; view: CropView }) {
  const short = Math.min(image.naturalWidth, image.naturalHeight)
  const width = (image.naturalWidth / short) * view.zoom * 100
  const height = (image.naturalHeight / short) * view.zoom * 100
  return (
    <img
      className="crop-image"
      src={image.src}
      alt=""
      draggable={false}
      style={{ width: `${width}%`, height: `${height}%`, left: `${50 - view.cx * width}%`, top: `${50 - view.cy * height}%` }}
    />
  )
}

interface PhotoCropperProps {
  image: HTMLImageElement
  /** 자리가 바뀌면 (손을 떼고 잠깐 뒤) */
  onChange(view: CropView): void
  onDone(): void
  onCancel(): void
  onPickOther(): void
}

interface Point {
  x: number
  y: number
}

/** 프로필 사진 자리 맞추기: 끌어서 옮기고, 두 손가락·휠·막대로 크기를 조절합니다. */
function PhotoCropper({ image, onChange, onDone, onCancel, onPickOther }: PhotoCropperProps) {
  const { naturalWidth: width, naturalHeight: height } = image
  const [view, setView] = useState<CropView>(CENTER_CROP)
  const stage = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  const pointers = useRef(new Map<number, Point>())
  // 손가락을 대거나 뗄 때마다 그 순간을 기준으로 다시 잡습니다.
  const gesture = useRef<{ view: CropView; center: Point; spread: number } | null>(null)
  const committed = useRef(view)

  function update(next: CropView) {
    const fitted = clampCrop(next, width, height)
    viewRef.current = fitted
    setView(fitted)
  }

  // 손을 떼고 잠깐 뒤에 사진을 잘라 저장할 값에 넣습니다. (끄는 동안 계속 자르지 않게)
  useEffect(() => {
    if (committed.current === view) return
    const timer = window.setTimeout(() => {
      committed.current = view
      onChange(view)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [view, onChange])

  function flush() {
    if (committed.current !== viewRef.current) onChange(viewRef.current)
    committed.current = viewRef.current
  }

  /** 지금 화면에서 사진이 차지하는 크기 (px) */
  function shownSize(zoom: number): { w: number; h: number } {
    const side = stage.current?.clientWidth ?? 1
    const short = Math.min(width, height)
    return { w: (side * width * zoom) / short, h: (side * height * zoom) / short }
  }

  function rebase() {
    const points = [...pointers.current.values()]
    if (points.length === 0) {
      gesture.current = null
      return
    }
    const center = { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length }
    const spread = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0
    gesture.current = { view: viewRef.current, center, spread }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    rebase()
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.current.values()]
    const start = gesture.current
    const center = { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length }
    let zoom = start.view.zoom
    if (points.length > 1 && start.spread > 0) {
      zoom = Math.min(MAX_ZOOM, Math.max(1, (start.view.zoom * Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)) / start.spread))
    }
    const size = shownSize(zoom)
    update({ zoom, cx: start.view.cx - (center.x - start.center.x) / size.w, cy: start.view.cy - (center.y - start.center.y) / size.h })
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    rebase()
  }

  // 휠로 크기 조절. 화면이 함께 밀리지 않게 막아야 해서 직접 붙입니다. (React의 onWheel은 막을 수 없음)
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const current = viewRef.current
      const fitted = clampCrop({ ...current, zoom: current.zoom * Math.exp(-event.deltaY * 0.0015) }, width, height)
      viewRef.current = fitted
      setView(fitted)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [width, height])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = viewRef.current
    // 한 번에 보이는 범위의 5%씩
    const step = 0.05 / current.zoom
    const short = Math.min(width, height)
    const moves: Record<string, Partial<CropView>> = {
      ArrowLeft: { cx: current.cx - (step * short) / width },
      ArrowRight: { cx: current.cx + (step * short) / width },
      ArrowUp: { cy: current.cy - (step * short) / height },
      ArrowDown: { cy: current.cy + (step * short) / height },
      '+': { zoom: current.zoom * 1.1 },
      '=': { zoom: current.zoom * 1.1 },
      '-': { zoom: current.zoom / 1.1 },
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    update({ ...current, ...move })
  }

  const zoomBy = (factor: number) => update({ ...viewRef.current, zoom: viewRef.current.zoom * factor })

  return (
    <div className="crop">
      <div
        ref={stage}
        className="crop-stage"
        tabIndex={0}
        role="group"
        aria-label="사진 자리. 끌어서 옮기거나 화살표 키로 옮겨요"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <CropImage image={image} view={view} />
      </div>
      <div className="crop-side">
        <p className="muted">사진을 끌어서 자리를 맞추고, 막대로 크기를 조절해요</p>
        <div className="crop-zoom">
          <button type="button" className="icon-btn" aria-label="사진 작게" disabled={view.zoom <= 1} onClick={() => zoomBy(1 / 1.25)}>
            <MinusIcon />
          </button>
          <input
            type="range"
            className="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            aria-label="사진 크기"
            onChange={(event) => update({ ...viewRef.current, zoom: Number(event.target.value) })}
          />
          <button type="button" className="icon-btn" aria-label="사진 크게" disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomBy(1.25)}>
            <PlusIcon />
          </button>
        </div>
        <div className="crop-previews" aria-hidden="true">
          <span className="crop-mini crop-mini-md"><CropImage image={image} view={view} /></span>
          <span className="crop-mini crop-mini-sm"><CropImage image={image} view={view} /></span>
          <span className="muted">목록에서는 이렇게 보여요</span>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary btn-small" onClick={() => { flush(); onDone() }}>
            이대로 쓰기
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onPickOther}>
            다른 사진
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
