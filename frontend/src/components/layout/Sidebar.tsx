import { NavLink } from "react-router-dom";
import {
  CalendarRange,
  Search,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Schedule Builder", icon: CalendarRange },
  { to: "/course-search", label: "Course Search", icon: Search },
  { to: "/saved-schedules", label: "Saved Schedules", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col bg-[#003DA5] text-white">
      <div className="px-6 py-6">
        <div className="text-lg font-bold leading-tight">UCR</div>
        <div className="text-sm font-semibold tracking-wide text-blue-200">SCHEDULING AID</div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-white text-[#003DA5]" : "text-blue-100 hover:bg-blue-900/40"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="space-y-1 px-3 pb-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}

      <div className="m-3 rounded-md bg-blue-900/40 p-3 text-xs text-blue-100">
        <div className="mb-1 flex items-center gap-2 font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          System Active
        </div>
        <div>UCR Spring 2026 Catalog</div>
        <div>Version 1.0.0</div>
      </div>
    </aside>
  );
}
