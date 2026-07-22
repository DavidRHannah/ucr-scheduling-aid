import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { TermProvider } from "@/context/TermContext";
import ScheduleBuilder from "@/pages/ScheduleBuilder";
import CourseSearchPage from "@/pages/CourseSearchPage";
import SavedSchedules from "@/pages/SavedSchedules";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <TermProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ScheduleBuilder />} />
              <Route path="/course-search" element={<CourseSearchPage />} />
              <Route path="/saved-schedules" element={<SavedSchedules />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TermProvider>
    </AuthProvider>
  );
}
