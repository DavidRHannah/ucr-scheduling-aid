import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type Section, type PrerequisiteGroup } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "CS", label: "Computer Science" },
  { value: "MATH", label: "Mathematics" },
  { value: "PHYS", label: "Physics" },
  { value: "STAT", label: "Statistics" },
  { value: "ENGL", label: "English" }
];

export default function CourseSearchPage() {
  const navigate = useNavigate();
  const { term: termCode } = useTerm();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Detail View State
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [prereqGroups, setPrereqGroups] = useState<PrerequisiteGroup[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getCourses({ page, limit: 10, search, subject });
      setCourses(data.courses || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [page, subject]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCatalog();
  };

  const selectCourse = async (course: CourseInfo) => {
    setSelectedCourse(course);
    setDetailLoading(true);
    setPrereqGroups([]);
    setSections([]);
    try {
      // Fetch prerequisites
      const pRes = await api.getCoursePrereqs(course._id);
      setPrereqGroups(pRes.groups || []);

      // Fetch sections for active term
      const sRes = await api.getSectionsByCourse(course._id, termCode);
      setSections(sRes || []);
    } catch (err) {
      console.error("Failed fetching course details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_400px]">
      {/* Catalog Search List */}
      <div className="flex flex-col gap-6 overflow-y-auto p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Catalog</h1>
          <p className="mt-2 text-gray-500">Explore course descriptions, prerequisites, and schedules.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search course numbers, titles, or subjects..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={subject} onValueChange={(val) => setSubject(val || "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading catalog items...</div>
        ) : (
          <div className="flex-1 space-y-4">
            {courses.map((course) => (
              <div
                key={course._id}
                onClick={() => selectCourse(course)}
                className={`cursor-pointer rounded-lg border p-5 transition hover:shadow-md ${
                  selectedCourse?._id === course._id
                    ? "border-blue-600 bg-blue-50/30"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-semibold text-blue-600">
                      {course.subject} {course.courseNumber}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                  </div>
                  <Badge variant="secondary">
                    {course.creditHours.low === course.creditHours.high
                      ? `${course.creditHours.low} units`
                      : `${course.creditHours.low}-${course.creditHours.high} units`}
                  </Badge>
                </div>
                {course.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{course.description}</p>
                )}
              </div>
            ))}

            {courses.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No courses match your search criteria. Trigger a Banner ingestion sync in Settings to load database records.
              </div>
            )}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Details Side Panel */}
      <div className="border-l border-gray-200 bg-white p-6 overflow-y-auto">
        {selectedCourse ? (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {selectedCourse.subject} {selectedCourse.courseNumber}
              </span>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h2>
              <div className="mt-2 flex gap-2">
                {selectedCourse.college && <Badge variant="outline">{selectedCourse.college}</Badge>}
                {selectedCourse.department && (
                  <Badge variant="outline">{selectedCourse.department}</Badge>
                )}
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => navigate(`/?addCourseId=${selectedCourse._id}`)}
                  className="w-full cursor-pointer"
                >
                  Add to Schedule Builder
                </Button>
              </div>
            </div>

            {selectedCourse.description && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">Course Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedCourse.description}</p>
              </div>
            )}

            {/* Prerequisites */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Academic Prerequisites</h4>
              {detailLoading ? (
                <div className="text-sm text-gray-400">Checking prerequisites...</div>
              ) : prereqGroups.length > 0 ? (
                <div className="space-y-3">
                  {prereqGroups.map((group, idx) => (
                    <div key={idx} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                      <div className="font-semibold text-gray-500 uppercase text-xs">
                        Rule Group {idx + 1}
                      </div>
                      <div className="mt-1">
                        Must pass one of the following:
                        <ul className="mt-1 list-disc pl-5 space-y-1">
                          {group.options.map((opt, oIdx) => (
                            <li key={oIdx}>
                              <span className="font-medium text-gray-900">
                                {opt.course?.subject} {opt.course?.courseNumber}
                              </span>{" "}
                              ({opt.course?.title || "Unknown Title"}) with a grade of {opt.minGrade} or better
                              {opt.concurrentAllowed && " (concurrent enrollment allowed)"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No prerequisites registered for this course.</p>
              )}
            </div>

            {/* Section schedule options */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Offered Sections (Spring 2026)</h4>
              {detailLoading ? (
                <div className="text-sm text-gray-400">Loading section schedules...</div>
              ) : sections.length > 0 ? (
                <div className="space-y-2">
                  {sections.map((sec) => (
                    <div key={sec._id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-blue-600">
                          {sec.scheduleType.code} {sec.sectionNumber}
                        </span>
                        <span className="text-xs text-gray-400">CRN: {sec.crn}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {sec.meetingTimes.map((m, mIdx) => (
                          <div key={mIdx}>
                            {m.weekDays.join("/")} {m.startTime} - {m.endTime}{" "}
                            {m.buildingDescription && `(${m.buildingDescription} ${m.room})`}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Instructor: {sec.instructor}</span>
                        <span
                          className={`font-semibold ${
                            sec.status === "Open" ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {sec.status} ({sec.enrollmentCurrent}/{sec.enrollmentMax})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No sections scheduled for this term.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
            Select a course from the catalog search list to inspect detailed prerequisites and available class sections.
          </div>
        )}
      </div>
    </div>
  );
}
