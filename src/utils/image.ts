/**
 * 사진에서 프로필로 쓸 자리.
 * 동그라미 가운데에 오는 점(cx, cy: 사진 너비·높이의 0~1)과 확대 배율(1이면 짧은 변이 동그라미에 꽉 참)로 적습니다.
 */
export interface CropView {
  cx: number
  cy: number
  zoom: number
}

export const MAX_ZOOM = 4

/** 처음 자리: 가운데, 확대 없음 */
export const CENTER_CROP: CropView = { cx: 0.5, cy: 0.5, zoom: 1 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 동그라미 밖으로 사진의 빈 곳이 보이지 않게 자리와 배율을 맞춥니다. */
export function clampCrop(view: CropView, width: number, height: number): CropView {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM)
  // 동그라미에 보이는 범위의 절반 (사진 픽셀)
  const half = Math.min(width, height) / (2 * zoom)
  return {
    zoom,
    cx: clamp(view.cx, half / width, 1 - half / width),
    cy: clamp(view.cy, half / height, 1 - half / height),
  }
}

/** 잘라 낼 정사각형 (사진 픽셀): 왼쪽 위와 한 변 */
export function cropRect(view: CropView, width: number, height: number): { sx: number; sy: number; side: number } {
  const fitted = clampCrop(view, width, height)
  const side = Math.min(width, height) / fitted.zoom
  return { sx: fitted.cx * width - side / 2, sy: fitted.cy * height - side / 2, side }
}

/** 사진 파일이나 저장된 사진(data URL)을 그림으로 읽습니다. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => (image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve(image) : reject(new Error('사진을 읽지 못했어요.')))
    image.onerror = () => reject(new Error('사진을 읽지 못했어요.'))
    image.src = src
  })
}

/** 고른 자리를 정사각형으로 잘라 작게(기본 320px) 줄인 JPEG로 바꿉니다. 기기에 저장하므로 작게 만듭니다. */
export function cropToDataUrl(image: HTMLImageElement, view: CropView, size = 320): string {
  const { sx, sy, side } = cropRect(view, image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('사진을 읽지 못했어요.')
  // 투명한 그림(PNG)은 흰 바탕 위에 올립니다. (JPEG에는 투명이 없어 검게 나옵니다)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, sx, sy, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}
