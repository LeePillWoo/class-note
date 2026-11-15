/** 사진을 가운데 정사각형으로 잘라 작게(기본 256px) 줄인 JPEG로 바꿉니다. 기기에 저장하므로 작게 만듭니다. */
export async function photoToDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('사진을 읽지 못했어요.')
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
