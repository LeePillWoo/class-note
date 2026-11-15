/** 글자를 클립보드에 복사합니다. 주소가 https가 아니어서 막히면(같은 와이파이로 연 개발 서버) 예전 방식으로 복사합니다. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    // 열려 있는 창(dialog) 안에 넣어야 글자를 고를 수 있습니다.
    const host = document.querySelector('dialog[open]') ?? document.body
    host.appendChild(area)
    area.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    area.remove()
    return copied
  }
}
