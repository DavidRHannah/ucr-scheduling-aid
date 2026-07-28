import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type Section, type PrerequisiteGroup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CatalogSearchForm } from "@/components/catalog/CatalogSearchForm";
import { CourseListItem } from "@/components/catalog/CourseListItem";
import { CourseDetailPanel } from "@/components/catalog/CourseDetailPanel";

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

        <CatalogSearchForm
          search={search}
          subject={subject}
          onSearchChange={setSearch}
          onSubjectChange={setSubject}
          onSubmit={handleSearchSubmit}
        />

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading catalog items...</div>
        ) : (
          <div className="flex-1 space-y-4">
            {courses.map((course) => (
              <CourseListItem
                key={course._id}
                course={course}
                isSelected={selectedCourse?._id === course._id}
                onSelect={selectCourse}
              />
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
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
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
      <CourseDetailPanel
        course={selectedCourse}
        prereqGroups={prereqGroups}
        sections={sections}
        loading={detailLoading}
        sectionTermLabel="Spring 2026"
        onAddToBuilder={(course) => navigate(`/?addCourseId=${course._id}`)}
      />
    </div>
  );
}
