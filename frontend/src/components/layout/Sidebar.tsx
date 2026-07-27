import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarRange,
  Search,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Schedule Builder", icon: CalendarRange },
  { to: "/course-search", label: "Course Search", icon: Search },
  { to: "/saved-schedules", label: "Saved Schedules", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true",
  );

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return (
    <aside
      className={`flex h-screen flex-col bg-[#003DA5] text-white flex-shrink-0 transition-[width] duration-200 ${
        isCollapsed ? "w-16" : "w-[260px]"
      }`}
    >
      <div
        className={`flex items-center px-3 py-6 ${isCollapsed ? "justify-center" : "justify-between"}`}
      >
        {!isCollapsed && (
          <div>
            <div className="text-lg font-bold leading-tight">UCR</div>
            <div className="text-sm font-semibold tracking-wide text-blue-200">
              SCHEDULING AID
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-blue-100 hover:bg-blue-900/40"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-md py-2 text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${isActive ? "bg-white text-[#003DA5]" : "text-blue-100 hover:bg-blue-900/40"}`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="space-y-1 px-3 pb-4">
          <button
            type="button"
            onClick={logout}
            aria-label={isCollapsed ? "Sign Out" : undefined}
            className={`flex w-full items-center rounded-md py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40 cursor-pointer ${
              isCollapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      )}
    </aside>
  );
}
