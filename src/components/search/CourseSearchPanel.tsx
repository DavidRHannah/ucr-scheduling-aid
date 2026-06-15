import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseResultCard } from "./CourseResultCard";
import { requirementTypes } from "@/data/requirementTypes";
import { searchResults, totalSearchResults, type Section } from "@/data/mockSchedule";

const ALL = "all";

const departments = [
  { value: ALL, label: "All Departments" },
  { value: "CS", label: "Computer Science" },
  { value: "STAT", label: "Statistics" },
  { value: "PHYS", label: "Physics" },
];

const levels = [
  { value: ALL, label: "All Levels" },
  { value: "lower", label: "Lower Division (1-99)" },
  { value: "upper", label: "Upper Division (100-199)" },
];

function isUpperDivision(courseNumber: string): boolean {
  const num = parseInt(courseNumber, 10);
  return num >= 100;
}

export function CourseSearchPanel() {
  const [query, setQuery] = useState("");
  const [requirementType, setRequirementType] = useState(ALL);
  const [department, setDepartment] = useState(ALL);
  const [courseLevel, setCourseLevel] = useState(ALL);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const filtered = useMemo(() => {
    return searchResults.filter((section) => {
      if (onlyOpen && section.status !== "Open") return false;

      if (department !== ALL && section.courseId.subject !== department) return false;

      if (requirementType !== ALL && section.reqCode !== requirementType) return false;

      if (courseLevel !== ALL) {
        const upper = isUpperDivision(section.courseId.courseNumber);
        if (courseLevel === "upper" && !upper) return false;
        if (courseLevel === "lower" && upper) return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${section.courseId.subject} ${section.courseId.courseNumber} ${section.courseId.title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [query, requirementType, department, courseLevel, onlyOpen]);

  function clearFilters() {
    setQuery("");
    setRequirementType(ALL);
    setDepartment(ALL);
    setCourseLevel(ALL);
    setOnlyOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-4 border-l border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900">Course Search</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search courses..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Requirement Type</label>
        <Select value={requirementType} onValueChange={(value) => value && setRequirementType(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Requirements</SelectItem>
            {requirementTypes.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Department</label>
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Course Level</label>
        <Select value={courseLevel} onValueChange={(value) => value && setCourseLevel(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(v === true)} />
        Only Show Open Sections
      </label>

      <div className="flex gap-2">
        <Button className="flex-1">Search</Button>
        <Button variant="outline" className="flex-1" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Search Results
          <span className="ml-1 font-normal text-gray-400">
            {totalSearchResults} results found
          </span>
        </div>
        <div className="space-y-2">
          {filtered.map((section: Section) => (
            <CourseResultCard key={section._id} section={section} />
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No results match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
