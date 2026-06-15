import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const terms = [
  { value: "202620", label: "Spring 2026" },
  { value: "202610", label: "Fall 2025" },
];

export function Header() {
  const [term, setTerm] = useState(terms[0].value);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
      <Select value={term} onValueChange={(value) => value && setTerm(value)}>
        <SelectTrigger className="w-40 border-none text-lg font-semibold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {terms.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          JA
        </div>
        <span className="text-sm font-medium text-gray-700">jonathan.a@ucr.edu</span>
      </div>
    </header>
  );
}
