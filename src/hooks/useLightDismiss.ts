import { useEffect, type RefObject } from 'react'

/**
 * 창 바깥(어두운 부분)을 누르면 닫히게 합니다.
 * 브라우저가 지원하면 closedby="any"에 맡기고, 지원하지 않으면 누른 자리가 창 밖인지 직접 확인합니다.
 * (눌렀다 뗀 자리가 모두 창 밖일 때만 닫습니다. 글자를 끌어 고르다 바깥에서 손을 떼도 닫히지 않습니다)
 */
export function useLightDismiss(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.setAttribute('closedby', 'any')
    if ('closedBy' in HTMLDialogElement.prototype) return

    let pressedOutside = false
    // 창 안의 다른 창(날짜 고르기)에서 올라온 것은 그 창이 처리하므로 건너뜁니다.
    const outside = (event: PointerEvent) => {
      if (event.target !== dialog) return false
      const rect = dialog.getBoundingClientRect()
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
    }
    const onDown = (event: PointerEvent) => {
      pressedOutside = outside(event)
    }
    const onUp = (event: PointerEvent) => {
      if (pressedOutside && outside(event)) dialog.close()
      pressedOutside = false
    }
    dialog.addEventListener('pointerdown', onDown)
    dialog.addEventListener('pointerup', onUp)
    return () => {
      dialog.removeEventListener('pointerdown', onDown)
      dialog.removeEventListener('pointerup', onUp)
    }
  }, [ref])
}
