import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type SavedSchedule, type AnalysisReport } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SavedSchedules() {
  const navigate = useNavigate();
  const { term: termCode } = useTerm();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);

  // ICS Export Options State
  const [reminderMins, setReminderMins] = useState("10");
  const [titleCase, setTitleCase] = useState(false);
  const [includeInstructor, setIncludeInstructor] = useState(true);
  const [includeCrn, setIncludeCrn] = useState(true);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getSchedules(termCode);
      setSchedules(data || []);
      if (data.length > 0) {
        selectSchedule(data[0]);
      } else {
        setSelectedSchedule(null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error("Failed fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectSchedule = async (sched: SavedSchedule) => {
    setSelectedSchedule(sched);
    setAnalysis(null);
    try {
      const report = await api.analyzeSchedule(sched._id);
      setAnalysis(report);
    } catch (err) {
      console.error("Failed analyzing schedule:", err);
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

  const getExportLink = () => {
    if (!selectedSchedule) return "";
    const options = {
      reminder: {
        primary: reminderMins === "none" ? null : parseInt(reminderMins, 10),
      },
      titleFormat: {
        titleCase,
      },
      description: {
        includeInstructor,
        includeCrn,
      },
    };
    return api.getIcsExportUrl(selectedSchedule._id, options);
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Sign in to Saved Schedules</h2>
        <p className="mt-2 max-w-sm text-gray-500">
          You must create an account or sign in to save, analyze, and export your academic schedules.
        </p>
        <Button className="mt-4 cursor-pointer" onClick={() => navigate("/settings")}>
          Go to Sign In Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_1fr]">
      {/* Schedules list sidebar */}
      <div className="border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Configurations</h2>
        {loading ? (
          <div className="text-sm text-gray-400">Loading saved plans...</div>
        ) : (
          <div className="space-y-2">
            {schedules.map((sched) => (
              <div
                key={sched._id}
                onClick={() => selectSchedule(sched)}
                className={`w-full cursor-pointer rounded-md p-3 text-left transition hover:bg-gray-50 border ${
                  selectedSchedule?._id === sched._id
                    ? "border-blue-600 bg-blue-50/20"
                    : "border-transparent"
                }`}
              >
                <div className="font-semibold text-gray-900 truncate">{sched.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Term Code: {sched.termCode} • {sched.sectionIds.length} classes
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">
                No saved schedules found. Use the Schedule Builder to save a combination.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main schedule preview */}
      {selectedSchedule ? (
        <div className="grid h-full grid-cols-1 xl:grid-cols-[1fr_320px] overflow-y-auto">
          {/* Calendar Grid */}
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedSchedule.name}</h1>
                <p className="text-sm text-gray-500">Term: {selectedSchedule.termCode}</p>
              </div>
              <Button variant="destructive" onClick={() => handleDelete(selectedSchedule._id)}>
                Delete Plan
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <WeeklyCalendar sections={selectedSchedule.sectionIds} />
            </div>
          </div>

          {/* Stats, Analysis, and Export Control Panel */}
          <div className="border-l border-gray-200 bg-white p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Schedule Analytics</h3>
              <p className="text-xs text-gray-400">Generated from actual class meeting boundaries.</p>
            </div>

            {analysis ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-gray-50 p-3 text-center">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Total Credits</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analysis.totalUnits}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3 text-center">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Active Days</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analysis.activeDays.length}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span>Earliest Start Time:</span>
                    <span className="font-semibold text-gray-900">{analysis.earliestStart}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span>Latest End Time:</span>
                    <span className="font-semibold text-gray-900">{analysis.latestEnd}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span>Total Gap Minutes:</span>
                    <span className="font-semibold text-gray-900">{analysis.totalGapMinutes} mins</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>Days Off:</span>
                    <span className="font-semibold text-gray-900">
                      {analysis.daysOff.length > 0 ? analysis.daysOff.join(", ") : "None"}
                    </span>
                  </div>
                </div>

                {/* Overlaps and Conflicts Warning */}
                {analysis.conflicts.length > 0 ? (
                  <div className="rounded-md bg-red-50 p-3 text-red-700 space-y-1">
                    <div className="font-bold text-sm">Schedule Conflicts Detected!</div>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {analysis.conflicts.map((conf, idx) => (
                        <li key={idx}>
                          Classes conflict on {conf.day} between {conf.overlapStart} and {conf.overlapEnd}.
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-md bg-green-50 p-3 text-green-700 font-medium text-sm">
                    No time overlaps or conflicts.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400">Loading analysis reports...</div>
            )}

            {/* ICS Feed Export Options */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">iCalendar Export Customization</h3>
                <p className="text-xs text-gray-400 mt-1">Customize details before syncing to Google Calendar.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Event Alarm Reminder</label>
                  <Select value={reminderMins} onValueChange={(val) => setReminderMins(val || "none")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No reminder alert</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="10">10 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox checked={titleCase} onCheckedChange={(v) => setTitleCase(v === true)} />
                  Force Title Case (CS100 - Software Construction)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox checked={includeInstructor} onCheckedChange={(v) => setIncludeInstructor(v === true)} />
                  Include Instructor in Description
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox checked={includeCrn} onCheckedChange={(v) => setIncludeCrn(v === true)} />
                  Include Class CRN in Description
                </label>
              </div>

              <a href={getExportLink()} target="_blank" rel="noopener noreferrer" className="block w-full mt-4">
                <Button className="w-full">
                  Export to Google/Apple Calendar
                </Button>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
          Select or save a schedule to view preview and sync configurations.
        </div>
      )}
    </div>
  );
}
