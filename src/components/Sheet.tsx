import { useEffect, useRef, type ReactNode } from 'react'
import { useLightDismiss } from '../hooks/useLightDismiss'

interface SheetProps {
  open: boolean
  onClose(): void
  /** 화면 읽기 프로그램에 읽어줄 창 이름 */
  label: string
  children: ReactNode
}

/**
 * 휴대폰에서는 아래에서 올라오고, 넓은 화면에서는 가운데 뜨는 창.
 * 바깥(어두운 부분)을 누르거나 뒤로 가기(Esc)를 누르면 닫힙니다.
 * 창은 화면 크기가 바뀌어도(폴드를 접거나 펴도) 열린 채로 남고, 적던 내용도 그대로입니다.
 */
export default function Sheet({ open, onClose, label, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useLightDismiss(ref)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // 창 안의 다른 창(날짜 고르기 등)이 닫힐 때도 close 알림이 전달되므로, 이 창이 닫힐 때만 반응합니다.
    <dialog ref={ref} className="sheet" aria-label={label} onClose={(event) => event.target === ref.current && onClose()}>
      {open && <div className="sheet-body">{children}</div>}
    </dialog>
  )
}
