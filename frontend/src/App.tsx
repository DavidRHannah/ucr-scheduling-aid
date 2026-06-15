import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ScheduleBuilder from "@/pages/ScheduleBuilder";
import CourseSearchPage from "@/pages/CourseSearchPage";
import Combos from "@/pages/Combos";
import Requirements from "@/pages/Requirements";
import SavedSchedules from "@/pages/SavedSchedules";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule-builder" element={<ScheduleBuilder />} />
          <Route path="/course-search" element={<CourseSearchPage />} />
          <Route path="/combos" element={<Combos />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/saved-schedules" element={<SavedSchedules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
