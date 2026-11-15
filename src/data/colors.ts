/** 학생과 반의 표시 색상. 로고 그림과 어울리는 그림책 빛깔로, 흰 바탕에서 잘 보이는 색입니다. */
export const PALETTE = [
  { name: '호박', value: '#d98324' },
  { name: '자두', value: '#8e5a9b' },
  { name: '올리브', value: '#7d8f2e' },
  { name: '청록', value: '#2f8f89' },
  { name: '하늘', value: '#4f8fca' },
  { name: '분홍', value: '#d9708a' },
  { name: '벽돌', value: '#b9533f' },
  { name: '밤색', value: '#8a5a2b' },
] as const

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}

/** 색을 흰색(amount > 0)이나 검정(amount < 0) 쪽으로 섞습니다. */
function mix(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0
  const ratio = Math.abs(amount)
  return `rgb(${rgb(hex).map((c) => Math.round(c + (target - c) * ratio)).join(' ')})`
}

/**
 * 칩, 수업 카드, 이름 동그라미에 쓰는 색 값: 옅은 바탕(--chip-bg), 테두리(--chip-border), 진한 글자(--chip-fg), 원래 색(--chip-solid).
 */
export function softColorVars(hex: string): Record<string, string> {
  const [r, g, b] = rgb(hex)
  return {
    '--chip-bg': `rgb(${r} ${g} ${b} / 0.14)`,
    '--chip-border': `rgb(${r} ${g} ${b} / 0.28)`,
    '--chip-fg': mix(hex, -0.35),
    '--chip-solid': hex,
  }
}

/** 아직 쓰지 않은 첫 번째 색을 고릅니다. 모두 쓰였으면 첫 색을 고릅니다. */
export function nextUnusedColor(usedColors: string[]): string {
  return PALETTE.find((color) => !usedColors.includes(color.value))?.value ?? PALETTE[0].value
}
