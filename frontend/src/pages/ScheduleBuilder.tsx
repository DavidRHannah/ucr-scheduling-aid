import { useState, useEffect, useCallback } from "react";
import { StatusBanner } from "@/components/schedule/StatusBanner";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { CombinationsList } from "@/components/schedule/CombinationsList";
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type GeneratedSchedule, type Section } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Unlock, BookmarkPlus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function ScheduleBuilder() {
  const { user } = useAuth();
  const { term: termCode } = useTerm();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected courses basket
  const [selectedCourses, setSelectedCourses] = useState<CourseInfo[]>([]);
  
  // Generated configurations
  const [combinations, setCombinations] = useState<GeneratedSchedule[]>([]);
  const [selectedComboIndex, setSelectedComboIndex] = useState<number | null>(null);
  
  // Locked section criteria
  const [lockedSections, setLockedSections] = useState<Section[]>([]);

  // Load course from URL parameters if requested
  useEffect(() => {
    const addCourseId = searchParams.get("addCourseId");
    if (addCourseId) {
      const loadAndAdd = async () => {
        try {
          const course = await api.getCourseDetails(addCourseId);
          if (course && !selectedCourses.some((c) => c._id === course._id)) {
            setSelectedCourses((prev) => [...prev, course]);
          }
        } catch (err) {
          console.error("Failed adding course from query param:", err);
        }
      };
      loadAndAdd();
      searchParams.delete("addCourseId");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // States
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generationTimeMs, setGenerationTimeMs] = useState(0);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  const handleAddCourse = (course: CourseInfo) => {
    if (!selectedCourses.some((c) => c._id === course._id)) {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses(selectedCourses.filter((c) => c._id !== courseId));
    // Clear lock references if course removed
    setLockedSections(lockedSections.filter((s) => s.courseId._id !== courseId));
  };

  const handleGenerate = useCallback(async () => {
    if (selectedCourses.length === 0) return;
    setIsGenerating(true);
    setHasGenerated(true);
    setSelectedComboIndex(null);
    setSaveSuccess("");
    setSaveError("");
    const startTime = performance.now();
    try {
      const res = await api.generateSchedules({
        courseIds: selectedCourses.map((c) => c._id),
        termCode,
        lockedSectionIds: lockedSections.map((s) => s._id),
      });
      const endTime = performance.now();
      setGenerationTimeMs(endTime - startTime);
      setCombinations(res.schedules || []);
      if (res.schedules && res.schedules.length > 0) {
        setSelectedComboIndex(0);
      }
    } catch (err) {
      console.error("Combinations generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedCourses, termCode, lockedSections]);

  // Re-trigger generation whenever locked sections change
  useEffect(() => {
    if (selectedCourses.length > 0) {
      handleGenerate();
    }
  }, [lockedSections, handleGenerate]);

  // Reset page state when selected term code changes
  useEffect(() => {
    setSelectedCourses([]);
    setCombinations([]);
    setSelectedComboIndex(null);
    setLockedSections([]);
    setHasGenerated(false);
    setSaveSuccess("");
    setSaveError("");
  }, [termCode]);

  const handleSelectCombo = (idx: number) => {
    setSelectedComboIndex(idx);
  };

  // Toggle locking a section
  const handleToggleLock = (section: Section) => {
    const isLocked = lockedSections.some((s) => s._id === section._id);
    if (isLocked) {
      setLockedSections(lockedSections.filter((s) => s._id !== section._id));
    } else {
      // Remove other locked sections for the same course component (e.g. can't lock two CS10 Lectures)
      const cleanLocks = lockedSections.filter(
        (s) => !(s.courseId._id === section.courseId._id && s.scheduleType.code === section.scheduleType.code)
      );
      setLockedSections([...cleanLocks, section]);
    }
  };

  // Save the currently previewed schedule combination
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComboIndex === null || !combinations[selectedComboIndex]) return;
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const activeSections = combinations[selectedComboIndex].groups.flatMap((g) => g.sections);
    
    try {
      await api.createSchedule({
        name: saveName.trim() || "My Target Schedule",
        termCode,
        sectionIds: activeSections.map((s) => s._id),
      });
      setSaveSuccess("Schedule saved successfully!");
      setSaveName("");
    } catch (err: any) {
      setSaveError(err.message || "Failed saving schedule configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  // Active sections showing on WeeklyCalendar
  const activeSections = selectedComboIndex !== null && combinations[selectedComboIndex]
    ? combinations[selectedComboIndex].groups.flatMap((g) => g.sections)
    : lockedSections;

  const activeTermLabel = termCode === "202620" ? "Spring 2026" : "Fall 2025";

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* Calendar and results display */}
      <div className="space-y-6 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Schedule Builder</h1>
            <p className="text-sm text-gray-500">
              Interactive combination planner for {activeTermLabel}.
            </p>
          </div>
          {/* Save Schedule Trigger */}
          {selectedComboIndex !== null && (
            <div>
              {user ? (
                <form onSubmit={handleSaveSchedule} className="flex items-center gap-2">
                  <Input
                    required
                    type="text"
                    placeholder="Plan Name (e.g. Schedule A)"
                    className="w-[200px]"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <Button type="submit" disabled={isSaving} className="gap-1.5 cursor-pointer">
                    <BookmarkPlus className="h-4 w-4" />
                    <span>Save</span>
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Sign in to save:</span>
                  <Link to="/settings">
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs cursor-pointer">Sign In</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {saveSuccess && (
          <div className="rounded bg-green-50 p-3 text-sm text-green-700 flex items-center justify-between border border-green-100">
            <span>{saveSuccess}</span>
            <Link to="/saved-schedules" className="underline font-semibold hover:text-green-900 transition ml-2">
              View Saved Schedules
            </Link>
          </div>
        )}
        {saveError && (
          <div className="rounded bg-red-50 p-2 text-sm text-red-700">{saveError}</div>
        )}

        {hasGenerated && (
          <StatusBanner
            combinationCount={combinations.length}
            generationTimeSeconds={generationTimeMs / 1000}
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6">
          {/* Calendar Grid */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Calendar Grid</h2>
            <WeeklyCalendar sections={activeSections} />
          </div>

          {/* Active section list & locks */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Section Control</h2>
            {activeSections.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {activeSections.map((sec) => {
                  const isLocked = lockedSections.some((s) => s._id === sec._id);
                  return (
                    <div
                      key={sec._id}
                      className={`rounded-lg border p-3 flex flex-col gap-1 transition ${
                        isLocked ? "border-blue-600 bg-blue-50/10" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600">
                          {sec.subject} {sec.courseNumber}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-gray-400 hover:text-blue-600 cursor-pointer"
                          onClick={() => handleToggleLock(sec)}
                        >
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {sec.courseTitle}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {sec.scheduleType.code} {sec.sectionNumber} • {sec.instructor}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No sections are previewed. Add courses in the side panel and click Generate.
              </p>
            )}
          </div>
        </div>

        {combinations.length > 0 && (
          <CombinationsList
            combinations={combinations}
            selectedComboIndex={selectedComboIndex}
            onSelectCombo={handleSelectCombo}
          />
        )}
      </div>

      {/* Side search selection panel */}
      <CourseSearchPanel
        selectedCourses={selectedCourses}
        onAddCourse={handleAddCourse}
        onRemoveCourse={handleRemoveCourse}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}
