import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type GeneratedSchedule, type Section } from "@/lib/api";
import { DEFAULT_PREFERENCES, type RankingPreferences } from "@/lib/scheduleRanking";
import { useScheduleRanking } from "@/hooks/useScheduleRanking";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { AsyncSectionTray } from "@/components/schedule/AsyncSectionTray";
import { SchedulePreferences } from "@/components/schedule/SchedulePreferences";
import { CoursePickerRail } from "@/components/schedule/CoursePickerRail";
import { RankedResultHeader } from "@/components/schedule/RankedResultHeader";
import { AlternativesStrip } from "@/components/schedule/AlternativesStrip";
import { ScheduleSectionTable } from "@/components/schedule/ScheduleSectionTable";
import { ScheduleActionBar } from "@/components/schedule/ScheduleActionBar";
import { NoResultsPanel } from "@/components/schedule/NoResultsPanel";
import { SaveStatusBanner } from "@/components/schedule/SaveStatusBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Wait this long after a course or pin change before regenerating. */
const GENERATE_DEBOUNCE_MS = 400;

export default function ScheduleBuilder() {
  const { user } = useAuth();
  const { term: termCode } = useTerm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCourses, setSelectedCourses] = useState<CourseInfo[]>([]);
  const [pinnedSections, setPinnedSections] = useState<Section[]>([]);
  const [combinations, setCombinations] = useState<GeneratedSchedule[]>([]);
  const [nearMisses, setNearMisses] = useState<GeneratedSchedule[]>([]);
  const [preferences, setPreferences] = useState<RankingPreferences>(DEFAULT_PREFERENCES);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  /** Guards against a slow earlier response overwriting a newer one. */
  const requestIdRef = useRef(0);

  const ranked = useScheduleRanking(combinations, preferences);
  const current = ranked[selectedIndex];
  const currentSections = current
    ? current.schedule.groups.flatMap((group) => group.sections)
    : pinnedSections;

  useEffect(() => {
    const addCourseId = searchParams.get("addCourseId");
    if (!addCourseId) return;
    const loadAndAdd = async () => {
      try {
        const course = await api.getCourseDetails(addCourseId);
        setSelectedCourses((prev) =>
          prev.some((c) => c._id === course._id) ? prev : [...prev, course],
        );
      } catch (err) {
        console.error("Failed adding course from query param:", err);
      }
    };
    loadAndAdd();
    searchParams.delete("addCourseId");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const generate = useCallback(async () => {
    if (selectedCourses.length === 0) {
      requestIdRef.current += 1;
      setCombinations([]);
      setNearMisses([]);
      setHasGenerated(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);
    setSaveSuccess("");
    setSaveError("");

    const body = {
      courseIds: selectedCourses.map((c) => c._id),
      termCode,
      lockedSectionIds: pinnedSections.map((s) => s._id),
    };

    try {
      const res = await api.generateSchedules(body);
      if (requestId !== requestIdRef.current) return;

      const schedules = res.schedules || [];
      setCombinations(schedules);
      setSelectedIndex(0);
      setHasGenerated(true);

      if (schedules.length === 0) {
        const nearRes = await api.generateNearMissSchedules(body);
        if (requestId !== requestIdRef.current) return;
        setNearMisses(nearRes.schedules || []);
      } else {
        setNearMisses([]);
      }
    } catch (err) {
      console.error("Combinations generation failed:", err);
      if (requestId === requestIdRef.current) {
        setCombinations([]);
        setHasGenerated(true);
      }
    } finally {
      if (requestId === requestIdRef.current) setIsGenerating(false);
    }
  }, [selectedCourses, termCode, pinnedSections]);

  useEffect(() => {
    const timer = window.setTimeout(generate, GENERATE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [generate]);

  useEffect(() => {
    requestIdRef.current += 1;
    setSelectedCourses([]);
    setPinnedSections([]);
    setCombinations([]);
    setNearMisses([]);
    setSelectedIndex(0);
    setHasGenerated(false);
    setSaveSuccess("");
    setSaveError("");
  }, [termCode]);

  const handleAddCourse = (course: CourseInfo) => {
    setSelectedCourses((prev) =>
      prev.some((c) => c._id === course._id) ? prev : [...prev, course],
    );
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c._id !== courseId));
    setPinnedSections((prev) => prev.filter((s) => s.courseId._id !== courseId));
  };

  const handleTogglePin = (section: Section) => {
    setPinnedSections((prev) => {
      if (prev.some((s) => s._id === section._id)) {
        return prev.filter((s) => s._id !== section._id);
      }
      // One pin per course component: pinning a second lecture replaces the first.
      const cleaned = prev.filter(
        (s) =>
          !(
            s.courseId._id === section.courseId._id &&
            s.scheduleType.code === section.scheduleType.code
          ),
      );
      return [...cleaned, section];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");
    try {
      await api.createSchedule({
        name: saveName.trim() || "My Target Schedule",
        termCode,
        sectionIds: currentSections.map((s) => s._id),
      });
      setSaveSuccess("Schedule saved successfully!");
      setSaveName("");
    } catch (err: any) {
      setSaveError(err.message || "Failed saving schedule configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTermLabel = termCode === "202620" ? "Spring 2026" : "Fall 2025";

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_300px]">
      <main className="space-y-5 overflow-y-auto p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Schedule Builder</h1>
          <p className="text-sm text-gray-500">Ranked schedules for {activeTermLabel}.</p>
        </div>

        <SaveStatusBanner success={saveSuccess} error={saveError} />

        {selectedCourses.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <h2 className="font-semibold text-gray-900">Add courses to get started</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Pick the courses you need this term. Every conflict-free schedule is generated and
              ranked against your preferences.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-3">
            <div className="h-6 w-56 animate-pulse rounded bg-gray-100" />
            <div className="h-[420px] animate-pulse rounded-lg bg-gray-100" />
          </div>
        )}

        {!isGenerating && hasGenerated && combinations.length === 0 && (
          <NoResultsPanel nearMisses={nearMisses} isLoading={false} />
        )}

        {!isGenerating && current && (
          <>
            <RankedResultHeader
              result={current}
              position={selectedIndex + 1}
              total={ranked.length}
              onPrevious={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              onNext={() => setSelectedIndex((i) => Math.min(ranked.length - 1, i + 1))}
            />

            <WeeklyCalendar sections={currentSections} />
            <AsyncSectionTray sections={currentSections} />

            <AlternativesStrip
              results={ranked}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />

            <ScheduleSectionTable
              sections={currentSections}
              pinnedSections={pinnedSections}
              onTogglePin={handleTogglePin}
            />

            <ScheduleActionBar
              sections={currentSections}
              isSignedIn={!!user}
              saveName={saveName}
              isSaving={isSaving}
              onSaveNameChange={setSaveName}
              onSave={handleSave}
            />
          </>
        )}
      </main>

      <aside className="overflow-y-auto border-l border-gray-200 bg-white p-4">
        <Tabs defaultValue="courses">
          <TabsList className="w-full">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="courses" className="mt-4">
            <CoursePickerRail
              selectedCourses={selectedCourses}
              onAddCourse={handleAddCourse}
              onRemoveCourse={handleRemoveCourse}
            />
          </TabsContent>
          <TabsContent value="preferences" className="mt-4">
            <SchedulePreferences preferences={preferences} onChange={setPreferences} />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
