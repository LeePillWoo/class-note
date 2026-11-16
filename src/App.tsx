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
import BackupPage from './pages/settings/BackupPage'
import DataPage from './pages/settings/DataPage'
import { AttendanceSettingsPage, LessonDefaultsPage, PaymentSettingsPage } from './pages/settings/RulePages'
import { usePaymentsEnabled } from './data/settings'
import StudentsPage from './pages/settings/StudentsPage'
import SettingsLayout, { SettingsIndex } from './pages/settings/SettingsLayout'
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
        <Route path="payments" element={<PaymentsRoute />} />
        {/* 설정: 메뉴를 누르면 들어가는 화면들. 넓은 화면은 메뉴 + 화면 두 칸 */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsIndex />} />
          <Route path="defaults" element={<LessonDefaultsPage />} />
          <Route path="payments" element={<PaymentSettingsPage />} />
          <Route path="attendance" element={<AttendanceSettingsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="data" element={<DataPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/** 납부 화면은 납부 기능을 켰을 때만. 꺼져 있으면 홈으로 */
function PaymentsRoute() {
  return usePaymentsEnabled() ? <PaymentsPage /> : <Navigate to="/" replace />
}
