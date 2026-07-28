import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTerm } from "@/context/TermContext";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Header() {
  const { term, setTerm, terms } = useTerm();
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "GS";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
      <Select items={terms} value={term} onValueChange={(value) => value && setTerm(value)}>
        <SelectTrigger className="w-40 border-none text-lg font-semibold shadow-none cursor-pointer">
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
        {user ? (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {getInitials(user.displayName)}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.email}</span>
          </>
        ) : (
          <Link to="/settings">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
