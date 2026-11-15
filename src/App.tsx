import { Navigate, Route, Routes } from 'react-router'
import AppShell from './layout/AppShell'
import HomePage from './pages/HomePage'
import GroupFormPage from './pages/lessons/GroupFormPage'
import LessonDetailPage from './pages/lessons/LessonDetailPage'
import LessonsLayout, { LessonsIndex } from './pages/lessons/LessonsLayout'
import SoloFormPage from './pages/lessons/SoloFormPage'
import { StudentDetailPage } from './pages/lessons/StudentDetail'
import StudentFormPage from './pages/lessons/StudentFormPage'
import MakeupsPage from './pages/MakeupsPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/settings/SettingsPage'
import { LessonEditPage } from './pages/lessons/LessonEditPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        {/* 수업: 1:1 레슨과 그룹 수업을 한 목록에서. 넓은 화면은 목록 + 자세히 두 칸, 좁은 화면은 한 칸씩 (같은 주소) */}
        <Route path="lessons" element={<LessonsLayout />}>
          <Route index element={<LessonsIndex />} />
          <Route path="new/solo" element={<SoloFormPage />} />
          <Route path="new/group" element={<GroupFormPage />} />
          <Route path="student/:studentId" element={<StudentDetailPage />} />
          <Route path="student/:studentId/edit" element={<StudentFormPage />} />
          <Route path=":classId" element={<LessonDetailPage />} />
          <Route path=":classId/edit" element={<LessonEditPage />} />
        </Route>
        <Route path="makeups" element={<MakeupsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
