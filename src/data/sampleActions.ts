import { today } from '../utils/date'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { buildSampleDatabase } from './sample'
import { allPutChanges, allRemovalChanges } from './storage'

/** 예시 데이터를 넣거나 모든 데이터를 지우는 기능 (설정, 처음 화면) */
export function useSampleData() {
  const { data, apply } = useData()
  return {
    /** 지금 데이터에 예시 데이터를 더합니다. 이름과 전화번호는 모두 지어낸 것입니다. */
    loadSample: () => apply(allPutChanges(buildSampleDatabase(today(), newId, nowIso()))),
    clearAll: () => apply(allRemovalChanges(data)),
  }
}
