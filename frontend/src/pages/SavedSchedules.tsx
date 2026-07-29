import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type SavedSchedule } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import { ScheduleListSidebar } from "@/components/saved/ScheduleListSidebar";

export default function SavedSchedules() {
  const { term: termCode } = useTerm();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getSchedules(termCode);
      setSchedules(data || []);
      if (data.length > 0) {
        setSelectedSchedule(data[0]);
      } else {
        setSelectedSchedule(null);
      }
    } catch (err) {
      console.error("Failed fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [user, termCode]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await api.deleteSchedule(id);
      fetchSchedules();
    } catch (err) {
      console.error("Failed deleting schedule:", err);
    }
  };

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to Saved Schedules"
        message="You must create an account or sign in to save, analyze, and export your academic schedules."
      />
    );
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_280px]">
      {/* Main schedule preview */}
      {selectedSchedule ? (
        <div className="space-y-6 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedSchedule.name}</h1>
              <p className="text-sm text-gray-500">Term: {selectedSchedule.termCode}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={api.getIcsExportUrl(selectedSchedule._id)} download>
                <Button variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </a>
              <Link to={`/?scheduleId=${selectedSchedule._id}`}>
                <Button variant="outline">Edit in Builder</Button>
              </Link>
              <Button variant="destructive" onClick={() => handleDelete(selectedSchedule._id)}>
                Delete Plan
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <WeeklyCalendar sections={selectedSchedule.sectionIds} />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
          Select or save a schedule to view preview and sync configurations.
        </div>
      )}

      {/* Schedules list sidebar */}
      <ScheduleListSidebar
        schedules={schedules}
        selectedSchedule={selectedSchedule}
        loading={loading}
        onSelect={setSelectedSchedule}
      />
    </div>
  );
}
