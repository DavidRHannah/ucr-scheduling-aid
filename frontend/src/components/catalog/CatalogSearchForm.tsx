import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "CS", label: "Computer Science" },
  { value: "MATH", label: "Mathematics" },
  { value: "PHYS", label: "Physics" },
  { value: "STAT", label: "Statistics" },
  { value: "ENGL", label: "English" },
];

interface CatalogSearchFormProps {
  search: string;
  subject: string;
  onSearchChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CatalogSearchForm({
  search,
  subject,
  onSearchChange,
  onSubjectChange,
  onSubmit,
}: CatalogSearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search course numbers, titles, or subjects..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={subject} onValueChange={(val) => onSubjectChange(val || "all")}>
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
  );
}
