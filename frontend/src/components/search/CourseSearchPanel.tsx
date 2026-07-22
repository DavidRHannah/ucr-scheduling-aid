import { useEffect, useState } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type CourseInfo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const ALL = "all";

const departments = [
  { value: ALL, label: "All Departments" },
  { value: "CS", label: "Computer Science" },
  { value: "MATH", label: "Mathematics" },
  { value: "PHYS", label: "Physics" },
  { value: "STAT", label: "Statistics" },
  { value: "ENGL", label: "English" }
];

interface CourseSearchPanelProps {
  selectedCourses: CourseInfo[];
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function CourseSearchPanel({
  selectedCourses,
  onAddCourse,
  onRemoveCourse,
  onGenerate,
  isGenerating,
}: CourseSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchLoading(true);
    try {
      const res = await api.getCourses({
        page: 1,
        limit: 15,
        search: query,
        subject: department
      });
      setCourses(res.courses || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [department]);

  return (
    <div className="flex h-full flex-col gap-4 border-l border-gray-200 bg-white p-4">
      {/* Selected Courses Basket */}
      <div>
        <h2 className="text-md font-bold text-gray-900 mb-2">Selected Course Cart</h2>
        <div className="min-h-[80px] rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-2">
          {selectedCourses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedCourses.map((course) => (
                <Badge key={course._id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                  <span>{course.subject} {course.courseNumber}</span>
                  <button
                    onClick={() => onRemoveCourse(course._id)}
                    className="rounded-full p-0.5 hover:bg-gray-200 transition text-gray-400 hover:text-gray-900"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-6">
              Cart is empty. Search and add courses below.
            </div>
          )}
        </div>

        <Button
          disabled={selectedCourses.length === 0 || isGenerating}
          onClick={onGenerate}
          className="w-full mt-3"
        >
          {isGenerating ? "Computing Schedules..." : "Generate Combinations"}
        </Button>
      </div>

      <hr className="border-gray-100" />

      {/* Search Forms */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Add Courses to Plan</h3>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search catalog..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</label>
          <Select value={department} onValueChange={(value) => value && setDepartment(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Results List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Search Results
        </div>
        
        {searchLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Searching courses...</div>
        ) : (
          <div className="space-y-2">
            {courses.map((course) => {
              const isAdded = selectedCourses.some((c) => c._id === course._id);
              return (
                <div key={course._id} className="rounded-lg border border-gray-100 bg-white p-3 hover:border-gray-200 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-blue-600">
                        {course.subject} {course.courseNumber}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">{course.title}</h4>
                    </div>
                    <Button
                      size="icon"
                      variant={isAdded ? "secondary" : "outline"}
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => (isAdded ? onRemoveCourse(course._id) : onAddCourse(course))}
                    >
                      {isAdded ? <Trash2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 font-medium">
                    Credits: {course.creditHours.low} units
                  </div>
                </div>
              );
            })}

            {courses.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 leading-relaxed">
                No catalog records found. Make sure to run ingestion sync on Settings to load data.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
