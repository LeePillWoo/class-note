import { describe, expect, it } from 'vitest'
import { CENTER_CROP, MAX_ZOOM, clampCrop, cropRect } from './image'

describe('clampCrop', () => {
  it('가로로 긴 사진: 확대가 없으면 위아래는 못 움직이고 좌우만 움직임', () => {
    // 400×200 사진에서 동그라미는 200px을 보여 줌
    expect(clampCrop({ cx: 0, cy: 0, zoom: 1 }, 400, 200)).toEqual({ cx: 0.25, cy: 0.5, zoom: 1 })
    expect(clampCrop({ cx: 1, cy: 1, zoom: 1 }, 400, 200)).toEqual({ cx: 0.75, cy: 0.5, zoom: 1 })
  })

  it('확대하면 움직일 수 있는 범위가 넓어짐', () => {
    expect(clampCrop({ cx: 0, cy: 0, zoom: 2 }, 400, 200)).toEqual({ cx: 0.125, cy: 0.25, zoom: 2 })
  })

  it('배율은 1부터 최대까지만', () => {
    expect(clampCrop({ cx: 0.5, cy: 0.5, zoom: 0.2 }, 100, 100).zoom).toBe(1)
    expect(clampCrop({ cx: 0.5, cy: 0.5, zoom: 99 }, 100, 100).zoom).toBe(MAX_ZOOM)
  })
})

describe('cropRect', () => {
  it('처음 자리는 가운데 정사각형', () => {
    expect(cropRect(CENTER_CROP, 400, 200)).toEqual({ sx: 100, sy: 0, side: 200 })
    expect(cropRect(CENTER_CROP, 300, 600)).toEqual({ sx: 0, sy: 150, side: 300 })
  })

  it('2배로 키우면 한 변이 절반이고, 사진 밖으로 나가지 않음', () => {
    expect(cropRect({ cx: 0.5, cy: 0.5, zoom: 2 }, 400, 200)).toEqual({ sx: 150, sy: 50, side: 100 })
    const rect = cropRect({ cx: 1, cy: 1, zoom: 2 }, 400, 200)
    expect(rect.sx + rect.side).toBe(400)
    expect(rect.sy + rect.side).toBe(200)
  })
})
