import { Navigate, Route, Routes } from 'react-router'
import AppShell from './layout/AppShell'
import AttendancePage from './pages/AttendancePage'
import ClassDetailPage from './pages/classes/ClassDetailPage'
import ClassFormPage from './pages/classes/ClassFormPage'
import ClassesLayout, { ClassesIndex } from './pages/classes/ClassesLayout'
import HomePage from './pages/HomePage'
import MakeupsPage from './pages/MakeupsPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/settings/SettingsPage'
import StudentDetailPage from './pages/students/StudentDetailPage'
import StudentFormPage from './pages/students/StudentFormPage'
import StudentsLayout, { StudentsIndex } from './pages/students/StudentsLayout'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        {/* 학생과 반은 목록 + 자세히 배치. 넓은 화면은 두 칸, 좁은 화면은 한 칸씩 (같은 주소) */}
        <Route path="students" element={<StudentsLayout />}>
          <Route index element={<StudentsIndex />} />
          <Route path="new" element={<StudentFormPage />} />
          <Route path=":studentId" element={<StudentDetailPage />} />
          <Route path=":studentId/edit" element={<StudentFormPage />} />
        </Route>
        <Route path="classes" element={<ClassesLayout />}>
          <Route index element={<ClassesIndex />} />
          <Route path="new" element={<ClassFormPage />} />
          <Route path=":classId" element={<ClassDetailPage />} />
          <Route path=":classId/edit" element={<ClassFormPage />} />
        </Route>
        <Route path="makeups" element={<MakeupsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
