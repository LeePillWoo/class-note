import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'

interface SplitViewProps {
  /** 왼쪽 목록 */
  list: ReactNode
  /** 목록에서 고른 것이 있는지 (자세히 화면의 주소인지) */
  detailActive: boolean
  /** 오른쪽 자세히 */
  children: ReactNode
}

/**
 * 목록 + 자세히 배치.
 * - 넓은 자리(폴드 펼친 화면, 태블릿, PC): 두 칸으로 나란히
 * - 좁은 자리(휴대폰, 폴드 접은 화면): 한 칸. 고른 것이 있으면 자세히만, 없으면 목록만
 *
 * 어느 쪽을 보여줄지는 CSS가 정합니다(app.css의 .split). 두 칸 모두 늘 그려 두기 때문에,
 * 폴드를 접거나 펴서 칸 수가 바뀌어도 적던 내용과 고른 것이 그대로 남습니다.
 */
export default function SplitView({ list, detailActive, children }: SplitViewProps) {
  const location = useLocation()
  const listRef = useRef<HTMLDivElement>(null)
  // 한 칸 화면에서 목록을 누르는 순간의 스크롤 위치. 자세히에서 돌아오면 그 자리로 돌려놓습니다.
  const savedScroll = useRef(0)

  useLayoutEffect(() => {
    const list = listRef.current
    // 두 칸일 때 목록은 따로 밀리는 상자(sticky)입니다.
    const twoPanes = list !== null && getComputedStyle(list).position === 'sticky'
    window.scrollTo(0, detailActive || twoPanes ? 0 : savedScroll.current)
  }, [location.pathname, detailActive])

  return (
    <div className="split" data-detail={detailActive}>
      <div className="split-panes">
        <div
          ref={listRef}
          className="split-list"
          onClickCapture={() => {
            savedScroll.current = window.scrollY
          }}
        >
          {list}
        </div>
        <div className="split-detail">{children}</div>
      </div>
    </div>
  )
}
