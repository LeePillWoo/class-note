import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createIndexedDbStorage } from './indexedDbStorage'
import { buildIndex, type DataIndex } from './schedule'
import { normalizeDatabase } from './settings'
import { applyChanges, emptyDatabase, type DataStorage } from './storage'
import type { Change, Database } from './types'

interface DataContextValue {
  data: Database
  /** 자주 찾는 것들을 미리 묶어 둔 찾아보기 (schedule.ts) */
  index: DataIndex
  apply(changes: Change[]): Promise<void>
  /**
   * 바로 앞 저장이 끝난 뒤의 최신 데이터로 변경을 만들어 저장합니다. 저장은 하나씩 차례로 합니다.
   * 출석 단추를 빠르게 연달아 눌러도 앞의 변경이 사라지지 않습니다.
   */
  update(build: (data: Database) => Change[]): Promise<void>
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; storage: DataStorage }

const DataContext = createContext<DataContextValue | null>(null)

let storagePromise: Promise<DataStorage> | undefined

/** 기기의 저장소 (한 번만 엽니다). 화면이 멈췄을 때 비상 화면에서도 씁니다. */
export function getStorage(): Promise<DataStorage> {
  storagePromise ??= createIndexedDbStorage()
  return storagePromise
}

/** 시작할 때 모든 데이터를 불러와 메모리에 두고, 바꿀 때는 저장에 성공한 뒤 화면에 반영합니다. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [data, setData] = useState<Database>(emptyDatabase)
  // update()가 쓰는 최신 데이터와 저장 차례
  const latest = useRef(data)
  latest.current = data
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    getStorage()
      .then(async (storage) => {
        const loaded = await storage.loadAll()
        if (cancelled) return
        setData(normalizeDatabase(loaded))
        setLoad({ status: 'ready', storage })
        unsubscribe = storage.subscribe?.((remote) => {
          if (!cancelled) setData(remote)
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const index = useMemo(() => buildIndex(data), [data])

  const value = useMemo<DataContextValue | null>(() => {
    if (load.status !== 'ready') return null
    return {
      data,
      index,
      async apply(changes) {
        if (changes.length === 0) return
        await load.storage.apply(changes)
        latest.current = applyChanges(latest.current, changes)
        setData((prev) => applyChanges(prev, changes))
      },
      update(build) {
        const run = queue.current.then(async () => {
          const changes = build(latest.current)
          if (changes.length === 0) return
          await load.storage.apply(changes)
          latest.current = applyChanges(latest.current, changes)
          setData((prev) => applyChanges(prev, changes))
        })
        queue.current = run.catch(() => undefined)
        return run
      },
    }
  }, [load, data, index])

  if (load.status === 'loading') {
    return (
      <div className="status-screen">
        <img className="status-art" src="./brand/witch-face.png" alt="" width={96} height={96} />
        <p>불러오는 중…</p>
      </div>
    )
  }
  if (load.status === 'error' || !value) {
    return (
      <div className="status-screen">
        <p>데이터를 불러오지 못했어요.</p>
        {load.status === 'error' && <p className="muted">{load.message}</p>}
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    )
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData는 DataProvider 안에서만 쓸 수 있습니다.')
  return value
}
