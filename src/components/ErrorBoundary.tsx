import { Component, type ErrorInfo, type ReactNode } from 'react'
import { backupFileName, createBackup, serializeBackup } from '../data/backup'
import { getStorage } from '../data/DataProvider'
import { allRemovalChanges } from '../data/storage'
import { exportTextFile } from '../native/files'

interface State {
  error: Error | null
  message: string
  busy: boolean
}

/**
 * 화면을 그리다 문제가 생기면(예: 잘못된 기록) 하얀 화면 대신 비상 화면을 보여줍니다.
 * 기록을 백업 파일로 꺼내거나, 다시 열거나, 마지막 수단으로 모두 지울 수 있습니다.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, message: '', busy: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private async exportAll() {
    this.setState({ busy: true, message: '' })
    try {
      const storage = await getStorage()
      const backup = createBackup(await storage.loadAll())
      const how = await exportTextFile(backupFileName(), serializeBackup(backup), '마녀의 출석부 백업')
      this.setState({ message: how === 'shared' ? '백업 파일을 보냈어요.' : '백업 파일을 내려받았어요. (내려받기 폴더)' })
    } catch {
      this.setState({ message: '기록을 꺼내지 못했어요.' })
    }
    this.setState({ busy: false })
  }

  private async clearAll() {
    if (!window.confirm('기록을 모두 지울까요? 지운 기록은 되돌릴 수 없어요.\n먼저 "기록 꺼내기"로 백업 파일을 만들어 두세요.')) return
    if (!window.confirm('정말 모두 지울까요?')) return
    this.setState({ busy: true })
    try {
      const storage = await getStorage()
      await storage.apply(allRemovalChanges(await storage.loadAll()))
      window.location.hash = '#/'
      window.location.reload()
    } catch {
      this.setState({ busy: false, message: '지우지 못했어요.' })
    }
  }

  render() {
    const { error, message, busy } = this.state
    if (!error) return this.props.children
    return (
      <div className="status-screen" role="alert">
        <img className="status-art" src="./brand/witch-face.png" alt="" width={96} height={96} />
        <p>화면을 그리다 문제가 생겼어요.</p>
        <p className="muted">기록은 그대로 있어요. 다시 열어도 같으면 기록을 백업 파일로 꺼내 두세요.</p>
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={busy}
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}>
            다시 열기
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void this.exportAll()}>
            기록 꺼내기
          </button>
        </div>
        <button type="button" className="link-btn is-danger" disabled={busy} onClick={() => void this.clearAll()}>
          기록 모두 지우기
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    )
  }
}
