import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type GeneratedSchedule, type Section } from "@/lib/api";
import { DEFAULT_PREFERENCES, type RankingPreferences } from "@/lib/scheduleRanking";
import { getTermLabel } from "@/lib/terms";
import {
  loadBuilderState,
  saveBuilderState,
  loadPreferences,
  savePreferences,
} from "@/lib/builderStorage";
import { useScheduleRanking } from "@/hooks/useScheduleRanking";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { AsyncSectionTray } from "@/components/schedule/AsyncSectionTray";
import { SchedulePreferences } from "@/components/schedule/SchedulePreferences";
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import { CourseDetailSheet } from "@/components/schedule/CourseDetailSheet";
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
  const { term: termCode, setTerm } = useTerm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCourses, setSelectedCourses] = useState<CourseInfo[]>(
    () => loadBuilderState(termCode)?.courses ?? [],
  );
  const [pinnedSections, setPinnedSections] = useState<Section[]>(
    () => loadBuilderState(termCode)?.pins ?? [],
  );
  const [combinations, setCombinations] = useState<GeneratedSchedule[]>([]);
  const [nearMisses, setNearMisses] = useState<GeneratedSchedule[]>([]);
  const [preferences, setPreferences] = useState<RankingPreferences>(
    () => loadPreferences() ?? DEFAULT_PREFERENCES,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailCourse, setDetailCourse] = useState<CourseInfo | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  /** Set when the builder is editing a saved schedule loaded via ?scheduleId=. */
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  /** Guards against a slow earlier response overwriting a newer one. */
  const requestIdRef = useRef(0);

  /**
   * The term that selectedCourses and pinnedSections belong to. Guards the
   * write effect from persisting one term's selection under another term's key
   * during the render where termCode has changed but the loaded state has not
   * committed yet. This must be state, not a ref: a ref would mutate
   * synchronously in the load effect below and the guard would already agree
   * with termCode by the time the write effect ran.
   */
  const [stateTerm, setStateTerm] = useState(termCode);

  /** The lazy initializers already loaded the mount-time term. */
  const isFirstTermRun = useRef(true);

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
    if (isFirstTermRun.current) {
      isFirstTermRun.current = false;
      return;
    }
    requestIdRef.current += 1;
    const restored = loadBuilderState(termCode);
    setSelectedCourses(restored?.courses ?? []);
    setPinnedSections(restored?.pins ?? []);
    setStateTerm(termCode);
    setCombinations([]);
    setNearMisses([]);
    setSelectedIndex(0);
    setHasGenerated(false);
    setSaveSuccess("");
    setSaveError("");
    setDetailCourse(null);
    setSaveName("");
    setEditingScheduleId(null);
  }, [termCode]);

  /**
   * Loads a saved schedule for editing when navigated here with ?scheduleId=.
   * Runs after the term-load effect above so a hydration here overrides
   * whatever that effect just restored from local storage. If the schedule's
   * term differs from the active term, it switches the term context and
   * relies on this effect re-running (termCode is a dependency) once that
   * change lands, rather than trying to hydrate and switch in one pass.
   */
  useEffect(() => {
    const scheduleId = searchParams.get("scheduleId");
    if (!scheduleId) return;

    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const schedule = await api.getScheduleById(scheduleId);
        if (cancelled) return;

        if (schedule.termCode !== termCode) {
          setTerm(schedule.termCode);
          return;
        }

        const courseMap = new Map<string, CourseInfo>();
        for (const section of schedule.sectionIds) {
          if (!courseMap.has(section.courseId._id)) {
            courseMap.set(section.courseId._id, section.courseId);
          }
        }

        requestIdRef.current += 1;
        setSelectedCourses(Array.from(courseMap.values()));
        setPinnedSections(schedule.sectionIds);
        setStateTerm(termCode);
        setSaveName(schedule.name);
        setEditingScheduleId(schedule._id);
        setCombinations([]);
        setNearMisses([]);
        setSelectedIndex(0);
        setHasGenerated(false);
        setSaveSuccess("");
        setSaveError("");
        setDetailCourse(null);

        searchParams.delete("scheduleId");
        setSearchParams(searchParams, { replace: true });
      } catch (err) {
        console.error("Failed loading schedule for edit:", err);
      }
    };

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [searchParams, termCode, setSearchParams, setTerm]);

  useEffect(() => {
    if (stateTerm !== termCode) return;
    saveBuilderState(termCode, { courses: selectedCourses, pins: pinnedSections });
  }, [termCode, stateTerm, selectedCourses, pinnedSections]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

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

  const handleClearPins = () => setPinnedSections([]);

  const handleSaveNew = async () => {
    if (!current) return;
    const wasEditing = editingScheduleId !== null;
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");
    try {
      const created = await api.createSchedule({
        name: saveName.trim() || "My Target Schedule",
        termCode,
        sectionIds: currentSections.map((s) => s._id),
      });
      setEditingScheduleId(created._id);
      setSaveSuccess("Schedule saved successfully!");
      if (!wasEditing) setSaveName("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed saving schedule configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!current || !editingScheduleId) return;
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");
    try {
      await api.updateSchedule(editingScheduleId, {
        name: saveName.trim() || "My Target Schedule",
        sectionIds: currentSections.map((s) => s._id),
      });
      setSaveSuccess("Schedule updated successfully!");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed updating schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingScheduleId) {
      handleUpdate();
    } else {
      handleSaveNew();
    }
  };

  const activeTermLabel = getTermLabel(termCode);

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

        {isGenerating && !hasGenerated && (
          <div className="space-y-3">
            <div className="h-6 w-56 animate-pulse rounded bg-gray-100" />
            <div className="h-[420px] animate-pulse rounded-lg bg-gray-100" />
          </div>
        )}

        {hasGenerated && (
          <>
            {isGenerating && (
              <div
                role="status"
                aria-label="Updating schedule"
                className="h-1 w-full overflow-hidden rounded bg-gray-100"
              >
                <div className="h-full w-1/3 animate-pulse rounded bg-blue-500" />
              </div>
            )}

            {combinations.length === 0 && (
              <NoResultsPanel
                nearMisses={nearMisses}
                isLoading={false}
                pinnedCount={pinnedSections.length}
                onClearPins={handleClearPins}
              />
            )}

            {current && (
              <div
                className={
                  isGenerating ? "space-y-5 opacity-60 transition-opacity" : "space-y-5"
                }
              >
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
                  isEditing={editingScheduleId !== null}
                  onSaveNameChange={setSaveName}
                  onSave={handleSubmitSave}
                  onSaveAsNew={handleSaveNew}
                />
              </div>
            )}
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
            <CourseSearchPanel
              termCode={termCode}
              selectedCourses={selectedCourses}
              onAddCourse={handleAddCourse}
              onRemoveCourse={handleRemoveCourse}
              onSelectCourse={setDetailCourse}
            />
          </TabsContent>
          <TabsContent value="preferences" className="mt-4">
            <SchedulePreferences preferences={preferences} onChange={setPreferences} />
          </TabsContent>
        </Tabs>
      </aside>

      <CourseDetailSheet
        course={detailCourse}
        termCode={termCode}
        isAdded={selectedCourses.some((c) => c._id === detailCourse?._id)}
        pinnedSections={pinnedSections}
        onClose={() => setDetailCourse(null)}
        onAddCourse={handleAddCourse}
        onRemoveCourse={handleRemoveCourse}
        onTogglePin={handleTogglePin}
      />
    </div>
  );
}
