import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Section } from "@/lib/api";

interface ScheduleActionBarProps {
  sections: Section[];
  isSignedIn: boolean;
  saveName: string;
  isSaving: boolean;
  onSaveNameChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export function ScheduleActionBar({
  sections,
  isSignedIn,
  saveName,
  isSaving,
  onSaveNameChange,
  onSave,
}: ScheduleActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const crns = sections.map((section) => section.crn).join(", ");
    try {
      await navigator.clipboard.writeText(crns);
    } catch {
      // Clipboard access can be denied or unavailable outside a secure context.
      window.prompt("Copy these CRNs", crns);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
      <Button variant="outline" className="cursor-pointer gap-1.5" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy CRNs"}
      </Button>

      {isSignedIn ? (
        <form onSubmit={onSave} className="flex items-center gap-2">
          <Input
            required
            type="text"
            placeholder="Plan name"
            className="w-[200px]"
            value={saveName}
            onChange={(e) => onSaveNameChange(e.target.value)}
          />
          <Button type="submit" disabled={isSaving} className="cursor-pointer">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-500">Sign in to save:</span>
          <Link to="/settings">
            <Button size="sm" variant="outline" className="h-7 cursor-pointer px-2.5 text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
