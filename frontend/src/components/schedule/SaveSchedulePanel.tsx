import { Link } from "react-router-dom";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SaveSchedulePanelProps {
  isSignedIn: boolean;
  saveName: string;
  isSaving: boolean;
  onSaveNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SaveSchedulePanel({
  isSignedIn,
  saveName,
  isSaving,
  onSaveNameChange,
  onSubmit,
}: SaveSchedulePanelProps) {
  if (isSignedIn) {
    return (
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <Input
          required
          type="text"
          placeholder="Plan Name (e.g. Schedule A)"
          className="w-[200px]"
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
        />
        <Button type="submit" disabled={isSaving} className="gap-1.5 cursor-pointer">
          <BookmarkPlus className="h-4 w-4" />
          <span>Save</span>
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
      <span className="text-xs text-gray-500 font-medium">Sign in to save:</span>
      <Link to="/settings">
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs cursor-pointer">
          Sign In
        </Button>
      </Link>
    </div>
  );
}
