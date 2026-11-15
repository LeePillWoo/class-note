import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { useData } from '../../data/DataProvider'
import { useSampleData } from '../../data/sampleActions'
import { collectionNames } from '../../data/storage'

/** 설정 > 데이터 관리: 예시 데이터 넣기, 모든 데이터 지우기 */
export default function DataPage() {
  const { data } = useData()
  const { loadSample, clearAll } = useSampleData()
  const [busy, setBusy] = useState(false)
  const [dataMessage, setDataMessage] = useState('')
  const total = collectionNames().reduce((sum, collection) => sum + data[collection].length, 0)

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true)
    setDataMessage('')
    try {
      await action()
      setDataMessage(done)
    } catch {
      setDataMessage('하지 못했어요. 다시 시도해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title="데이터 관리" subtitle={`지금 기록 ${total}개`} backTo="/settings" />
      <div className="card">
        <h2 className="card-title">예시 데이터</h2>
        <p>지어낸 학생 8명과 수업 5개(1:1 2개, 그룹 3개)로 채운 예시예요. 화면을 둘러볼 때 쓰고, 실제로 쓰기 전에 모두 지우세요.</p>
        <div className="row">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(loadSample, '예시 데이터를 넣었어요.')}>
            예시 데이터 넣기
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy || total === 0}
            onClick={() => {
              if (window.confirm(`기록 ${total}개를 모두 지울까요? 되돌릴 수 없어요.\n필요하면 먼저 백업 파일을 내보내세요.`)) void run(clearAll, '모두 지웠어요.')
            }}
          >
            모든 데이터 지우기
          </button>
        </div>
        {dataMessage && <p className="note" role="status">{dataMessage}</p>}
      </div>

      <div className="card">
        <h2 className="card-title">기록이 저장되는 곳</h2>
        <p className="muted">
          기록은 이 기기의 브라우저에만 저장하고 서버로 보내지 않아요. 브라우저의 사이트 데이터를 지우면 기록도 함께 지워지니, 백업 파일을 자주 내보내 두세요.
        </p>
      </div>
    </section>
  )
}
