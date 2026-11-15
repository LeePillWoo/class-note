import { useParams } from 'react-router'
import PageHeader from '../../components/PageHeader'
import { useData } from '../../data/DataProvider'
import GroupFormPage from './GroupFormPage'
import SoloFormPage from './SoloFormPage'

/** /lessons/:classId/edit — 1:1 레슨이면 학생과 수업을 함께, 그룹이면 수업만 고칩니다. */
export function LessonEditPage() {
  const { classId = '' } = useParams()
  const { index } = useData()
  const cls = index.classes.get(classId)
  if (!cls) {
    return (
      <section className="narrow">
        <PageHeader title="수업을 찾을 수 없어요" backTo="/lessons" />
      </section>
    )
  }
  return cls.kind === 'solo' ? <SoloFormPage /> : <GroupFormPage />
}
